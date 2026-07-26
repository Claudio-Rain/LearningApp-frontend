# L2 What is the difference between RAISERROR and THROW, and when would you choose one over the other?

## Answer

### RAISERROR

The older error-raising mechanism, available since SQL Server 2000.

```sql
-- Syntax
RAISERROR (message_string | message_id, severity, state [, argument [, ...]])
    [WITH LOG | NOWAIT | SETERROR]

-- Example with a format string
RAISERROR(N'Account %d not found. Amount: %.2f', 16, 1, @AccountId, @Amount);

-- Using a pre-defined message (sys.messages)
RAISERROR(50001, 16, 1);
```

### THROW

Introduced in SQL Server 2012. Simpler syntax, always severity 16+, and preserves the original error context when used inside a CATCH block without arguments.

```sql
-- Raise a new ad-hoc error
THROW 50001, N'Account not found.', 1;

-- Re-throw the current error (no arguments) — preferred in CATCH blocks
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;   -- re-raises with original number, message, severity, state, and line
END CATCH
```

### Key differences

| Feature | RAISERROR | THROW |
|---|---|---|
| Syntax | Complex (severity, state, format string) | Simple (error_number, message, state) |
| Minimum severity | Any (1–25); only ≥ 11 goes to CATCH | Always treated as error (≥ 11) |
| Re-throw in CATCH | Must copy ERROR_* functions manually | `THROW;` (no args) re-raises original perfectly |
| Terminates batch? | No (unless severity ≥ 20 or WITH SETERROR) | Yes — statements after THROW in the same block don't run |
| Statement terminator | No requirement | Must have `;` before THROW (or be first in block) |
| Custom message formatting | Yes (`%d`, `%s`, etc.) | No built-in formatting |
| Sets @@ERROR | Yes | Yes |
| Available since | SQL Server 7 | SQL Server 2012 |

### When to choose THROW

- **Default choice** for SQL Server 2012+. Cleaner, less error-prone, and perfectly preserves error context when re-throwing.
- Re-raising inside CATCH: `THROW;` (no arguments) is far superior to manually copying `ERROR_NUMBER()`, `ERROR_MESSAGE()`, etc.

### When to keep RAISERROR

- **Legacy compatibility**: code targeting SQL Server 2008 or earlier.
- **Formatted error messages**: `RAISERROR` supports `printf`-style format strings; `THROW` does not (you must pre-build the message string).
- **Informational messages** (severity < 11): `RAISERROR` can send messages that do not raise an exception but appear as info in the client.

```sql
-- Informational message (severity 0) — won't trip CATCH
RAISERROR(N'Processing batch %d of %d...', 0, 1, @Batch, @TotalBatches) WITH NOWAIT;
```

### C# perspective

Both ultimately surface as `SqlException` in ADO.NET:

```csharp
try
{
    await cmd.ExecuteNonQueryAsync();
}
catch (SqlException ex)
{
    // ex.Number   == the error number (50001, etc.)
    // ex.Message  == the message text
    // ex.Class    == severity
    // ex.State    == state
    Console.WriteLine($"SQL error {ex.Number}: {ex.Message}");
}
```

> **Recommendation**: use `THROW` for all new code. Reserve `RAISERROR` only for legacy scripts or when you need formatted strings or low-severity informational output.
