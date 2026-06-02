# L1 What is the difference between a stored procedure and a view?

## Answer

### Core distinction

A **view** is a named, stored SELECT query — a virtual table. A **stored procedure** is a named, stored program that can contain any SQL statements, control flow, transactions, and parameter handling.

### Comparison table

| Feature | View | Stored Procedure |
|---|---|---|
| Definition | Single SELECT statement | Any SQL + control flow |
| Parameters | None (no parameters) | Input/output parameters |
| Used in | `FROM` / `JOIN` like a table | `EXEC` statement |
| Can modify data | Only through simple updatable views | Yes, full DML |
| Returns | Always a table-shaped result | Result sets, scalars, or nothing |
| Transactions | Cannot control | Can begin/commit/rollback |
| Indexable | Yes (indexed/materialized views) | No |
| Composable in queries | Yes (`SELECT * FROM vw_X`) | No (cannot embed EXEC in SELECT) |

### Views

```sql
-- Create a view
CREATE VIEW dbo.vw_ActiveCustomers AS
SELECT CustomerId, Name, Email
FROM   Customers
WHERE  IsActive = 1;

-- Use it like a table
SELECT * FROM dbo.vw_ActiveCustomers WHERE Name LIKE 'A%';

-- Indexed view (materialized) — persists result on disk
CREATE UNIQUE CLUSTERED INDEX IX_vw_ActiveCustomers
ON dbo.vw_ActiveCustomers (CustomerId);
```

### Stored procedure

```sql
CREATE PROCEDURE dbo.ArchiveOldOrders
    @CutoffDate DATE,
    @ArchivedCount INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
        INSERT INTO OrderArchive SELECT * FROM Orders WHERE OrderDate < @CutoffDate;
        DELETE FROM Orders WHERE OrderDate < @CutoffDate;
        SET @ArchivedCount = @@ROWCOUNT;
    COMMIT TRANSACTION;
END;
```

### When to choose which

- **View**: expose a filtered/joined subset of data as if it were a table; reuse complex joins; create security layers by hiding columns.
- **Stored procedure**: encapsulate multi-step logic, transactions, conditional processing, or any operation that requires parameters and side-effects.

### C# example

```csharp
// Querying a view — treated like a table
using var cmd = new SqlCommand(
    "SELECT * FROM dbo.vw_ActiveCustomers WHERE Name LIKE @Pattern", conn);
cmd.Parameters.AddWithValue("@Pattern", "A%");

// Calling a stored procedure
using var procCmd = new SqlCommand("dbo.ArchiveOldOrders", conn)
{
    CommandType = CommandType.StoredProcedure
};
procCmd.Parameters.AddWithValue("@CutoffDate", new DateTime(2023, 1, 1));
var countParam = procCmd.Parameters.Add("@ArchivedCount", SqlDbType.Int);
countParam.Direction = ParameterDirection.Output;

await conn.OpenAsync();
await procCmd.ExecuteNonQueryAsync();
Console.WriteLine($"Archived: {countParam.Value}");
```
