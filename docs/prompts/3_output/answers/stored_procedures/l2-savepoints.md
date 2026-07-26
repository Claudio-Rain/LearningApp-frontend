# L2 What are savepoints, and how do you use them inside a stored procedure to enable partial rollbacks?

## What Is a Savepoint?

A **savepoint** is a named marker within a transaction that lets you roll back part of the work done in that transaction without rolling back the entire thing. In T-SQL, savepoints are created with `SAVE TRANSACTION` and rolled back to with `ROLLBACK TRANSACTION <savepoint_name>`.

Unlike a full `ROLLBACK`, rolling back to a savepoint does **not** end the transaction — the outer transaction remains open and can still be committed or fully rolled back.

---

## Syntax

```sql
SAVE TRANSACTION savepoint_name;

ROLLBACK TRANSACTION savepoint_name;  -- partial rollback, transaction stays open

COMMIT TRANSACTION;                   -- commits everything not rolled back
```

---

## Practical Example

The following stored procedure processes two independent operations. If the second fails, only that part is rolled back; the first part is preserved.

```sql
CREATE OR ALTER PROCEDURE dbo.usp_ProcessOrders
    @OrderId   INT,
    @AuditNote NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRANSACTION;

    BEGIN TRY
        -- ── Step 1: update order status ──────────────────────────────────
        UPDATE dbo.Orders
        SET    Status      = 'Processing',
               UpdatedAt   = GETUTCDATE()
        WHERE  OrderId     = @OrderId;

        SAVE TRANSACTION AfterOrderUpdate;   -- <── savepoint

        -- ── Step 2: write audit log (non-critical) ────────────────────────
        INSERT INTO dbo.AuditLog (OrderId, Note, CreatedAt)
        VALUES (@OrderId, @AuditNote, GETUTCDATE());

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        -- Was the failure after the savepoint?
        IF XACT_STATE() <> 0
        BEGIN
            -- Try to salvage Step 1 by rolling back only Step 2
            IF ERROR_NUMBER() NOT IN (1205)   -- not a deadlock
            BEGIN
                ROLLBACK TRANSACTION AfterOrderUpdate;   -- partial rollback
                COMMIT TRANSACTION;   -- commit Step 1
                PRINT 'Audit log failed; order update was preserved.';
                RETURN;
            END

            ROLLBACK TRANSACTION;    -- full rollback for anything more severe
        END

        THROW;
    END CATCH
END;
```

---

## Key Rules

| Rule | Detail |
|------|--------|
| Savepoint names are **not unique** by requirement | Multiple `SAVE TRANSACTION` calls with the same name are allowed; the last one wins for partial rollback. |
| Rolling back to a savepoint does **not** decrement `@@TRANCOUNT` | The outer transaction remains open. |
| A full `ROLLBACK` rolls back **past** all savepoints | There is no way to "re-enter" a savepoint after a full rollback. |
| Savepoints work inside **nested** transactions too | They let you protect an inner block without forcing the outer transaction to commit. |

---

## When to Use Savepoints

- **Non-critical side effects** — audit logs, notifications, or caching rows that should not block the core operation from succeeding.
- **Iterative batch processing** — loop over rows; on each row failure, roll back only that row's work and continue.
- **Gradual error recovery** — attempt an optimistic write, fall back to a cheaper path on conflict, without starting a brand-new transaction.

---

## Common Gotcha

Savepoints are **not supported in distributed transactions** (MSDTC). If your stored procedure is enlisted in a distributed transaction, `SAVE TRANSACTION` raises an error.
