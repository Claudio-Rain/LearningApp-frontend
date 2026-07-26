# L4 How do you implement retry logic for deadlock scenarios inside or around a stored procedure?

## What Is a Deadlock?

A **deadlock** occurs when two (or more) sessions each hold a lock the other needs, creating a circular wait. SQL Server's lock monitor detects the cycle and kills one session as the **deadlock victim**, raising error **1205** (`Transaction was deadlocked... and has been chosen as the deadlock victim`).

The victim's transaction is automatically rolled back. The correct response is to **retry** — deadlocks are transient by nature.

---

## Key Facts About Error 1205

- The transaction is **already rolled back** when error 1205 is raised inside a stored procedure.
- `XACT_STATE()` returns `0` after a deadlock (no active transaction to roll back).
- The error severity is 13 — it is catchable with `TRY/CATCH`.

---

## Pattern 1: Retry Loop Inside the Stored Procedure

Encapsulate the logic inside a `WHILE` loop with a max-retry counter.

```sql
CREATE OR ALTER PROCEDURE dbo.usp_TransferFunds
    @FromAccountId INT,
    @ToAccountId   INT,
    @Amount        DECIMAL(18, 2)
AS
BEGIN
    SET NOCOUNT  ON;
    SET XACT_ABORT OFF;   -- Keep OFF so we handle the error ourselves

    DECLARE @MaxRetries    INT = 3;
    DECLARE @RetryCount    INT = 0;
    DECLARE @WaitMs        INT = 50;   -- initial wait in milliseconds
    DECLARE @Succeeded     BIT = 0;

    WHILE @RetryCount <= @MaxRetries AND @Succeeded = 0
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            UPDATE dbo.Accounts
            SET    Balance = Balance - @Amount
            WHERE  AccountId = @FromAccountId;

            UPDATE dbo.Accounts
            SET    Balance = Balance + @Amount
            WHERE  AccountId = @ToAccountId;

            COMMIT TRANSACTION;
            SET @Succeeded = 1;

        END TRY
        BEGIN CATCH
            -- Roll back if there is an active transaction
            IF XACT_STATE() <> 0
                ROLLBACK TRANSACTION;

            IF ERROR_NUMBER() = 1205   -- deadlock victim
            BEGIN
                SET @RetryCount += 1;

                IF @RetryCount > @MaxRetries
                BEGIN
                    -- Exhausted retries — surface the error
                    THROW 50000, 'Transfer failed: maximum deadlock retries exceeded.', 1;
                END

                -- Exponential back-off: 50ms, 100ms, 200ms
                WAITFOR DELAY @WaitMs * POWER(2, @RetryCount - 1) * '00:00:00.001';
            END
            ELSE
            BEGIN
                -- Not a deadlock — re-raise immediately
                THROW;
            END
        END CATCH
    END
END
```

> Note: `WAITFOR DELAY` does not accept a variable directly in older SQL Server versions. In those cases, use dynamic SQL: `EXEC sp_executesql N'WAITFOR DELAY @d', N'@d VARCHAR(12)', @d = ...`

---

## Pattern 2: Retry Logic in the Application Layer (C#)

For procedures that cannot be modified, or when you want a consistent retry policy across all database calls, handle retries in the application:

```csharp
public async Task TransferFundsAsync(int fromAccountId, int toAccountId, decimal amount,
    CancellationToken ct = default)
{
    const int maxRetries = 3;
    const int baseDelayMs = 50;

    for (int attempt = 0; attempt <= maxRetries; attempt++)
    {
        try
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync(ct);

            await using var cmd = new SqlCommand("dbo.usp_TransferFunds", connection)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@FromAccountId", fromAccountId);
            cmd.Parameters.AddWithValue("@ToAccountId",   toAccountId);
            cmd.Parameters.AddWithValue("@Amount",        amount);

            await cmd.ExecuteNonQueryAsync(ct);
            return;   // success
        }
        catch (SqlException ex) when (ex.Number == 1205)   // deadlock
        {
            if (attempt == maxRetries)
                throw new InvalidOperationException("Transfer failed after maximum retries.", ex);

            int delay = baseDelayMs * (int)Math.Pow(2, attempt);   // exponential back-off
            await Task.Delay(delay, ct);
        }
        // All other SqlExceptions propagate immediately
    }
}
```

---

## Pattern 3: Reducing Deadlock Frequency (Prevention)

Retrying is a mitigation — reducing deadlocks is better. Common strategies:

### Access objects in a consistent order
```sql
-- Always lock the lower AccountId first to prevent lock-order reversal
UPDATE dbo.Accounts SET Balance = Balance - @Amount WHERE AccountId = MIN(@FromAccountId, @ToAccountId);
UPDATE dbo.Accounts SET Balance = Balance + @Amount WHERE AccountId = MAX(@FromAccountId, @ToAccountId);
```

### Use READ COMMITTED SNAPSHOT ISOLATION (RCSI)
```sql
ALTER DATABASE MyDb SET READ_COMMITTED_SNAPSHOT ON;
-- Readers no longer block writers; most reader-writer deadlocks disappear
```

### Keep transactions short
- Fetch all needed data *before* opening the transaction.
- Do not perform external I/O (API calls, file writes) inside a transaction.

### Use `UPDLOCK` hints to acquire write locks early
```sql
SELECT AccountId FROM dbo.Accounts WITH (UPDLOCK, ROWLOCK)
WHERE  AccountId IN (@FromAccountId, @ToAccountId);
-- Prevents upgrade deadlocks (shared → exclusive lock escalation)
```

---

## Deadlock Extended Events (Diagnosis)

Before tuning, capture the deadlock graph:

```sql
-- System health session captures deadlocks automatically (SQL Server 2008+)
SELECT  xdr.value('@timestamp', 'datetime2')            AS DeadlockTime,
        xdr.query('.')                                  AS DeadlockGraph
FROM (
    SELECT CAST(target_data AS XML) AS target_data
    FROM   sys.dm_xe_session_targets AS t
    JOIN   sys.dm_xe_sessions        AS s ON s.address = t.event_session_address
    WHERE  s.name = 'system_health'
      AND  t.target_name = 'ring_buffer'
) AS data
CROSS APPLY target_data.nodes('//RingBufferTarget/event[@name="xml_deadlock_report"]') AS x(xdr)
ORDER BY DeadlockTime DESC;
```

---

## Summary

| Strategy | Where | When to use |
|----------|-------|-------------|
| Retry loop in T-SQL | Inside the stored procedure | Self-contained procedures, no application change possible |
| Retry in application layer | C# / service code | Consistent cross-procedure policy, cleaner T-SQL |
| Consistent lock ordering | Schema/query design | Prevent symmetric deadlocks |
| RCSI isolation | Database setting | High-concurrency OLTP, many reader-writer conflicts |
| `UPDLOCK` hints | Query hints | Prevent lock upgrade deadlocks on hot rows |
