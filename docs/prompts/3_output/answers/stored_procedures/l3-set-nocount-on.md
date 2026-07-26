# L3 What does SET NOCOUNT ON do, and why is it considered a best practice inside stored procedures?

## Answer

`SET NOCOUNT ON` suppresses the "rows affected" messages that SQL Server sends to the client after every DML statement (`INSERT`, `UPDATE`, `DELETE`, `MERGE`). By default (`SET NOCOUNT OFF`), SQL Server returns a message like `(1 row(s) affected)` after each statement.

### Why it is a best practice

1. **Reduces network traffic** — each "rows affected" message is a result set sent back to the client. In a stored procedure with many DML statements, this adds up to significant unnecessary round-trips.
2. **Prevents interference with ADO.NET** — in older ADO.NET code, `RecordsAffected` is set by these messages. If a procedure executes multiple statements, the client may see an unexpected `RecordsAffected` value and misinterpret it.
3. **Avoids breaking ORMs** — some ORMs (Entity Framework, Dapper) interpret the rows-affected count to detect optimistic concurrency conflicts. Extra counts from intermediate statements can falsely trigger concurrency exceptions.
4. **Slight performance gain** — eliminating unnecessary TDS packets reduces server-side overhead under high load.

### Usage

```sql
CREATE PROCEDURE dbo.UpdateOrderStatus
    @OrderId INT,
    @NewStatus NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;  -- suppress "X row(s) affected" messages

    UPDATE dbo.Orders
    SET    Status = @NewStatus,
           UpdatedAt = GETUTCDATE()
    WHERE  OrderId = @OrderId;

    INSERT INTO dbo.OrderAudit (OrderId, OldStatus, NewStatus, ChangedAt)
    SELECT @OrderId, Status, @NewStatus, GETUTCDATE()
    FROM   dbo.Orders
    WHERE  OrderId = @OrderId;
END;
```

### What it does NOT suppress

- Explicit `SELECT` result sets (your stored procedure's actual output).
- `PRINT` and `RAISERROR` messages.
- Return codes from `RETURN`.

### Placement

Always place `SET NOCOUNT ON` as the **first statement** inside the procedure body, before any other logic.
