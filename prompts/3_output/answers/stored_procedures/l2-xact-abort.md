# L2 How does the XACT_ABORT setting affect transaction behavior inside a stored procedure?

## What Is XACT_ABORT?

`SET XACT_ABORT ON` is a session-level setting that controls what SQL Server does when a **run-time error** occurs inside a transaction.

| Setting | Behavior on run-time error |
|---------|---------------------------|
| `XACT_ABORT OFF` (default) | Only the **statement** that caused the error is rolled back; the transaction remains open and subsequent statements can still execute. |
| `XACT_ABORT ON` | The **entire transaction** is immediately rolled back and the batch is terminated. |

---

## Why It Matters in Stored Procedures

Without `XACT_ABORT ON`, a forgotten error check can leave a transaction in a partially-committed, inconsistent state. The caller may not realize the transaction is still open.

```sql
-- DANGEROUS — default behavior
BEGIN TRANSACTION;
    INSERT INTO dbo.Orders (...) VALUES (...);   -- succeeds
    INSERT INTO dbo.OrderLines (...) VALUES (...); -- fails (FK violation)
    -- transaction is still open! caller must explicitly ROLLBACK or COMMIT
COMMIT TRANSACTION;   -- this may commit the first INSERT alone
```

With `XACT_ABORT ON`:

```sql
SET XACT_ABORT ON;

BEGIN TRANSACTION;
    INSERT INTO dbo.Orders (...) VALUES (...);
    INSERT INTO dbo.OrderLines (...) VALUES (...);  -- fails → whole txn rolled back immediately
COMMIT TRANSACTION;                                  -- never reached
```

---

## Recommended Pattern

Best practice is to combine `XACT_ABORT ON` with structured `TRY/CATCH` so you can log errors and surface them cleanly.

```sql
CREATE OR ALTER PROCEDURE dbo.usp_CreateOrder
    @CustomerId INT,
    @Amount     DECIMAL(18, 2)
AS
BEGIN
    SET NOCOUNT  ON;
    SET XACT_ABORT ON;   -- ← always add this at the top

    BEGIN TRANSACTION;

    BEGIN TRY
        INSERT INTO dbo.Orders (CustomerId, Amount, CreatedAt)
        VALUES (@CustomerId, @Amount, GETUTCDATE());

        INSERT INTO dbo.OrderAudit (CustomerId, Action, OccurredAt)
        VALUES (@CustomerId, 'CREATE', GETUTCDATE());

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        -- With XACT_ABORT ON, the transaction is already doomed.
        -- XACT_STATE() = -1 means uncommittable; must roll back.
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        -- Re-raise the error to the caller
        THROW;
    END CATCH
END;
```

---

## XACT_ABORT and XACT_STATE()

After an error with `XACT_ABORT ON`, `XACT_STATE()` returns **-1** (uncommittable transaction). Attempting a `COMMIT` at that point raises error 3930. Always check `XACT_STATE()` in your `CATCH` block.

| `XACT_STATE()` | Meaning |
|----------------|---------|
| `1` | Active, committable transaction |
| `0` | No open transaction |
| `-1` | Open but uncommittable — must `ROLLBACK` |

---

## What XACT_ABORT Does NOT Catch

- **Compile errors** (e.g., object not found at parse time) — these abort the batch regardless of the setting.
- **RAISERROR with severity < 11** — these are informational and do not trigger the rollback.
- **Errors inside linked server calls** — behavior depends on the linked server's transaction enlistment.

---

## Summary

Use `SET XACT_ABORT ON` at the top of every stored procedure that contains a transaction. It prevents silent partial commits, makes error handling predictable, and works correctly alongside `TRY/CATCH`. Omitting it is a common source of data-integrity bugs.
