# L1 What is the difference between a stored procedure and a function (scalar or table-valued)?

## Answer

### Key differences at a glance

| Feature | Stored Procedure | Scalar Function (UDF) | Table-Valued Function (TVF) |
|---|---|---|---|
| Return value | None, scalar via OUTPUT, or result sets | Exactly one scalar value | A table (inline or multi-statement) |
| Called with | `EXEC` / `EXECUTE` | In expressions (`SELECT`, `WHERE`) | In `FROM` / `JOIN` clauses |
| Can modify data | Yes (INSERT/UPDATE/DELETE) | No (only deterministic reads; some exceptions) | No |
| Transactions | Can start/commit/rollback | Cannot manage transactions | Cannot manage transactions |
| TRY/CATCH | Yes | No (scalar UDFs) | No |
| Error raising | `THROW` / `RAISERROR` | Cannot `THROW` | Cannot `THROW` |
| Used in queries | Cannot be embedded in SELECT | Can appear in SELECT list | Can appear in FROM |

### Scalar function

Returns a single value; can be called inline inside any SQL expression.

```sql
CREATE FUNCTION dbo.CalculateTax(@Amount DECIMAL(10,2))
RETURNS DECIMAL(10,2)
AS
BEGIN
    RETURN @Amount * 0.15;
END;

-- Usage
SELECT dbo.CalculateTax(100.00);   -- returns 15.00
SELECT OrderId, dbo.CalculateTax(Total) AS Tax FROM Orders;
```

Warning: scalar UDFs executed per-row can be severe performance bottlenecks. Prefer inline TVFs or computed columns where possible.

### Inline table-valued function (iTVF)

Returns a table; the optimizer can expand it like a view.

```sql
CREATE FUNCTION dbo.GetOrdersByCustomer(@CustomerId INT)
RETURNS TABLE
AS
RETURN (
    SELECT OrderId, OrderDate, Total
    FROM   Orders
    WHERE  CustomerId = @CustomerId
);

-- Usage
SELECT o.* FROM dbo.GetOrdersByCustomer(42) AS o;
```

### Multi-statement table-valued function (MSTVF)

Returns a declared table variable populated with imperative logic; harder for the optimizer to estimate row counts.

```sql
CREATE FUNCTION dbo.GetTopOrders(@CustomerId INT, @Top INT)
RETURNS @Result TABLE (OrderId INT, Total DECIMAL(10,2))
AS
BEGIN
    INSERT @Result
    SELECT TOP (@Top) OrderId, Total
    FROM   Orders
    WHERE  CustomerId = @CustomerId
    ORDER  BY Total DESC;
    RETURN;
END;
```

### When to use each

- **Stored procedure**: multi-step logic, data modification, transaction management, returning multiple result sets.
- **Scalar UDF**: simple calculations reused across queries (watch for row-mode overhead).
- **Inline TVF**: parameterized views; composable, optimizer-friendly.
- **MSTVF**: complex set-building logic that must return a table, but cannot be expressed as a single SELECT.

### C# example calling each

```csharp
// Stored procedure
using var cmd = new SqlCommand("dbo.MyProc", conn) { CommandType = CommandType.StoredProcedure };

// Scalar function via inline SQL
using var cmd2 = new SqlCommand("SELECT dbo.CalculateTax(@Amount)", conn);
cmd2.Parameters.AddWithValue("@Amount", 100m);
var tax = (decimal)await cmd2.ExecuteScalarAsync();

// Table-valued function via inline SQL
using var cmd3 = new SqlCommand(
    "SELECT * FROM dbo.GetOrdersByCustomer(@CustomerId)", conn);
cmd3.Parameters.AddWithValue("@CustomerId", 42);
using var reader = await cmd3.ExecuteReaderAsync();
```
