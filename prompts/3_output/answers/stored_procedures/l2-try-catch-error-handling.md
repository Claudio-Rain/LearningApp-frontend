# L2 How do you implement structured error handling inside a stored procedure using TRY/CATCH?

## Answer

### Basic structure

```sql
CREATE PROCEDURE dbo.TransferFunds
    @FromAccountId INT,
    @ToAccountId   INT,
    @Amount        DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;   -- auto-rollback on any error

    BEGIN TRY
        BEGIN TRANSACTION;

            UPDATE Accounts SET Balance = Balance - @Amount WHERE AccountId = @FromAccountId;
            IF @@ROWCOUNT = 0 THROW 50001, 'Source account not found.', 1;

            UPDATE Accounts SET Balance = Balance + @Amount WHERE AccountId = @ToAccountId;
            IF @@ROWCOUNT = 0 THROW 50002, 'Destination account not found.', 1;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        -- Re-throw the original error to the caller
        THROW;
    END CATCH
END;
```

### Error information functions inside CATCH

| Function | Returns |
|---|---|
| `ERROR_NUMBER()` | Error number (e.g. 50001) |
| `ERROR_MESSAGE()` | Error message text |
| `ERROR_SEVERITY()` | Severity level (1–25) |
| `ERROR_STATE()` | State number |
| `ERROR_LINE()` | Line number where error occurred |
| `ERROR_PROCEDURE()` | Procedure name where error occurred |

These functions return `NULL` outside a `CATCH` block.

### Logging and re-throwing

```sql
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

    -- Log to an error table
    INSERT INTO dbo.ErrorLog (ErrorNumber, ErrorMessage, ErrorSeverity, ErrorTime, ProcedureName)
    VALUES (
        ERROR_NUMBER(),
        ERROR_MESSAGE(),
        ERROR_SEVERITY(),
        GETUTCDATE(),
        ERROR_PROCEDURE()
    );

    -- Re-throw preserving the original error context
    THROW;
    -- Alternative (older): RAISERROR(ERROR_MESSAGE(), ERROR_SEVERITY(), ERROR_STATE());
END CATCH
```

### Nested TRY/CATCH

TRY/CATCH blocks can be nested. An inner CATCH can swallow errors and let the outer block continue:

```sql
BEGIN TRY
    BEGIN TRY
        EXEC dbo.OptionalStep;
    END TRY
    BEGIN CATCH
        -- swallow non-critical failure
        PRINT 'Optional step failed: ' + ERROR_MESSAGE();
    END CATCH

    -- continue with mandatory logic
    EXEC dbo.MandatoryStep;
END TRY
BEGIN CATCH
    THROW;
END CATCH
```

### What TRY/CATCH does NOT catch

- Errors with severity 20 or higher (these disconnect the session).
- Compile errors in the same batch (syntax errors prevent the batch from running at all).
- `RAISERROR` with severity < 11 (informational messages are not errors).

### Calling from C# and reading the error

```csharp
using var conn = new SqlConnection(connectionString);
using var cmd  = new SqlCommand("dbo.TransferFunds", conn)
{
    CommandType = CommandType.StoredProcedure
};
cmd.Parameters.Add("@FromAccountId", SqlDbType.Int).Value     = 1;
cmd.Parameters.Add("@ToAccountId",   SqlDbType.Int).Value     = 2;
cmd.Parameters.Add("@Amount",        SqlDbType.Decimal).Value = 250.00m;

try
{
    await conn.OpenAsync();
    await cmd.ExecuteNonQueryAsync();
}
catch (SqlException ex)
{
    // SQL Server errors surface as SqlException
    foreach (SqlError err in ex.Errors)
    {
        Console.WriteLine($"[{err.Number}] {err.Message} (Severity {err.Class}, State {err.State})");
    }
    throw; // re-throw or wrap
}
```
