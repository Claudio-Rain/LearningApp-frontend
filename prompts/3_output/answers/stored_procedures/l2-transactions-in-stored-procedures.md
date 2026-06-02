# L2 How do you wrap stored procedure logic in a transaction, and what happens if an error occurs mid-transaction?

## Answer

### Basic transaction pattern

```sql
CREATE PROCEDURE dbo.PlaceOrder
    @CustomerId INT,
    @Lines      dbo.OrderLineList READONLY
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;   -- automatically roll back on any error

    BEGIN TRANSACTION;

    BEGIN TRY
        DECLARE @OrderId INT;

        INSERT INTO Orders (CustomerId, OrderDate)
        VALUES (@CustomerId, GETUTCDATE());
        SET @OrderId = SCOPE_IDENTITY();

        INSERT INTO OrderLines (OrderId, ProductId, Quantity, UnitPrice)
        SELECT @OrderId, ProductId, Quantity, UnitPrice
        FROM   @Lines;

        -- Deduct inventory
        UPDATE Products
        SET    StockQty = StockQty - l.Quantity
        FROM   Products p
        JOIN   @Lines l ON p.ProductId = l.ProductId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;   -- propagate error to caller
    END CATCH
END;
```

### What happens if an error occurs mid-transaction?

Without `SET XACT_ABORT ON`:
- The statement that caused the error fails, but the transaction remains open.
- Subsequent statements in the same batch continue to execute.
- You must explicitly call `ROLLBACK` in the CATCH block.
- If the batch ends with an open transaction, SQL Server rolls it back and raises an error.

With `SET XACT_ABORT ON` (recommended):
- Any run-time error immediately marks the transaction as uncommittable (`XACT_STATE() = -1`).
- The transaction cannot be committed; it can only be rolled back.
- The CATCH block is still entered, allowing logging before the rollback.

```sql
BEGIN CATCH
    -- Check whether the transaction is in an uncommittable state
    IF XACT_STATE() = -1
        ROLLBACK TRANSACTION;
    ELSE IF XACT_STATE() = 1
        COMMIT TRANSACTION;   -- transaction is still valid (rare in error paths)

    THROW;
END CATCH
```

### @@TRANCOUNT and nested calls

`@@TRANCOUNT` tracks nesting depth. Each `BEGIN TRAN` increments it; each `COMMIT TRAN` decrements it. Only when it reaches 0 is the transaction truly committed.

```sql
-- Caller begins a transaction before calling the SP
BEGIN TRANSACTION;
    EXEC dbo.PlaceOrder @CustomerId = 1, @Lines = @myLines;
    EXEC dbo.SendConfirmationEmail @CustomerId = 1;
COMMIT TRANSACTION;
```

If the SP issues its own `BEGIN TRANSACTION`, it creates a nested "save point" conceptually (not a true nested transaction). A `ROLLBACK` inside the SP rolls back **all** levels to 0, regardless of nesting.

### C# example with TransactionScope

```csharp
using var scope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled);
using var conn  = new SqlConnection(connectionString);
await conn.OpenAsync();

using var cmd = new SqlCommand("dbo.PlaceOrder", conn)
    { CommandType = CommandType.StoredProcedure };
cmd.Parameters.Add("@CustomerId", SqlDbType.Int).Value = 42;
// ... add TVP parameter ...

await cmd.ExecuteNonQueryAsync();
scope.Complete();   // only commits if no exception was thrown
```

Alternatively, use `SqlTransaction` directly:

```csharp
await conn.OpenAsync();
using var tran = conn.BeginTransaction();
using var cmd  = new SqlCommand("dbo.PlaceOrder", conn, tran)
    { CommandType = CommandType.StoredProcedure };

try
{
    await cmd.ExecuteNonQueryAsync();
    await tran.CommitAsync();
}
catch
{
    await tran.RollbackAsync();
    throw;
}
```

> Best practice: let the stored procedure own its transaction boundaries when it encapsulates a complete unit of work. If multiple procedures must participate in a single atomic operation, start the transaction in the application and pass it to each command.
