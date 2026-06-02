# L1 How do you define input parameters in a stored procedure, and how do you pass values to them at call time?

## Answer

### Defining parameters

Parameters are declared in the procedure header after the procedure name, before `AS`. Each parameter requires a name (prefixed with `@`) and a data type. Multiple parameters are comma-separated.

```sql
CREATE PROCEDURE dbo.SearchProducts
    @CategoryId   INT,
    @MinPrice     DECIMAL(10,2),
    @MaxPrice     DECIMAL(10,2),
    @NameFilter   NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ProductId, Name, Price
    FROM   Products
    WHERE  CategoryId  = @CategoryId
      AND  Price       BETWEEN @MinPrice AND @MaxPrice
      AND  (@NameFilter IS NULL OR Name LIKE '%' + @NameFilter + '%');
END;
```

### Passing values at call time

**Named parameters** (recommended — order-independent, self-documenting):
```sql
EXEC dbo.SearchProducts
    @CategoryId  = 3,
    @MinPrice    = 10.00,
    @MaxPrice    = 99.99,
    @NameFilter  = N'widget';
```

**Positional parameters** (order must match the procedure signature):
```sql
EXEC dbo.SearchProducts 3, 10.00, 99.99, N'widget';
```

### Best practices

- Always use named parameters in `EXEC` calls — positional calls break silently if the signature changes.
- Use specific types (e.g., `NVARCHAR(100)` not `NVARCHAR(MAX)`) to allow plan caching to work optimally.
- Validate parameters at the start of the procedure (`IF @MinPrice < 0 THROW ...`).

### Calling from C#

```csharp
using var conn = new SqlConnection(connectionString);
using var cmd  = new SqlCommand("dbo.SearchProducts", conn)
{
    CommandType = CommandType.StoredProcedure
};

// Add parameters with explicit SqlDbType for type safety
cmd.Parameters.Add("@CategoryId",  SqlDbType.Int).Value              = 3;
cmd.Parameters.Add("@MinPrice",    SqlDbType.Decimal).Value          = 10.00m;
cmd.Parameters.Add("@MaxPrice",    SqlDbType.Decimal).Value          = 99.99m;
cmd.Parameters.Add("@NameFilter",  SqlDbType.NVarChar, 100).Value    = "widget";

await conn.OpenAsync();
using var reader = await cmd.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    Console.WriteLine($"{reader["ProductId"]}: {reader["Name"]} ${reader["Price"]}");
}
```

> Prefer `cmd.Parameters.Add(name, SqlDbType)` over `AddWithValue()` — `AddWithValue` infers type from the .NET value, which can lead to implicit conversions (e.g., `VARCHAR` vs `NVARCHAR`) and suboptimal plans.
