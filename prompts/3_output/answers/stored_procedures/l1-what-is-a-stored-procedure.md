# L1 What is a stored procedure and what problems does it solve compared to writing raw SQL in application code?

## Answer

A **stored procedure** is a named, precompiled batch of one or more SQL statements stored in the database server. It can accept input/output parameters, execute complex logic (loops, conditionals, transactions), and return result sets or scalar values. Once created, it is called by name rather than by sending the full SQL text from the application.

### Problems it solves over raw/inline SQL

| Problem with raw SQL | How stored procedures help |
|---|---|
| **Network overhead** | Only the procedure name + parameters are sent over the wire; the full SQL stays on the server. |
| **No plan reuse** | The server compiles and caches the execution plan once; subsequent calls reuse it without re-parsing. |
| **SQL injection surface** | Parameters are passed as typed values, not concatenated strings, eliminating classic injection vectors. |
| **Scattered business logic** | Logic lives in one place (the DB), making it easier to audit and change without redeploying application code. |
| **Permissions granularity** | You can GRANT EXECUTE on a procedure without exposing the underlying tables (ownership chaining). |
| **Repetition / DRY** | Multiple applications or services can call the same procedure instead of duplicating query logic. |

### When raw SQL is still acceptable
- Simple CRUD in ORMs (the ORM generates parameterized queries that mitigate injection).
- Applications that own the full stack and need flexibility to change queries without a DBA.
- Microservices that intentionally keep logic out of the database.

### Example (SQL Server)

```sql
-- Create
CREATE PROCEDURE dbo.GetOrdersByCustomer
    @CustomerId INT,
    @Since      DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT OrderId, OrderDate, Total
    FROM   Orders
    WHERE  CustomerId = @CustomerId
      AND  (@Since IS NULL OR OrderDate >= @Since);
END;

-- Execute
EXEC dbo.GetOrdersByCustomer @CustomerId = 42, @Since = '2024-01-01';
```

Calling from C# (ADO.NET):

```csharp
using var conn = new SqlConnection(connectionString);
using var cmd  = new SqlCommand("dbo.GetOrdersByCustomer", conn)
{
    CommandType = CommandType.StoredProcedure
};
cmd.Parameters.AddWithValue("@CustomerId", 42);
cmd.Parameters.AddWithValue("@Since", new DateTime(2024, 1, 1));

await conn.OpenAsync();
using var reader = await cmd.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    Console.WriteLine($"{reader["OrderId"]} - {reader["OrderDate"]}");
}
```
