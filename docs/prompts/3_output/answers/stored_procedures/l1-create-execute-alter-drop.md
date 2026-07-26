# L1 How do you create, execute, alter, and drop a stored procedure in SQL Server?

## Answer

### CREATE
Use `CREATE PROCEDURE` (or `CREATE PROC`) to define a new procedure. Best practice: always schema-qualify the name and add `SET NOCOUNT ON`.

```sql
CREATE PROCEDURE dbo.UpsertProduct
    @ProductId   INT,
    @Name        NVARCHAR(200),
    @Price       DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Products WHERE ProductId = @ProductId)
        UPDATE Products SET Name = @Name, Price = @Price WHERE ProductId = @ProductId;
    ELSE
        INSERT INTO Products (ProductId, Name, Price) VALUES (@ProductId, @Name, @Price);
END;
```

### EXECUTE
Use `EXEC` / `EXECUTE` with either positional or named parameters:

```sql
-- Named parameters (recommended — order-independent)
EXEC dbo.UpsertProduct @ProductId = 1, @Name = N'Widget', @Price = 9.99;

-- Positional (fragile if signature changes)
EXEC dbo.UpsertProduct 1, N'Widget', 9.99;
```

### ALTER
`ALTER PROCEDURE` replaces the body while preserving existing permissions, dependencies, and metadata. Drop + re-create would lose GRANTs.

```sql
ALTER PROCEDURE dbo.UpsertProduct
    @ProductId   INT,
    @Name        NVARCHAR(200),
    @Price       DECIMAL(10,2),
    @IsActive    BIT = 1          -- new parameter with default
AS
BEGIN
    SET NOCOUNT ON;
    MERGE Products AS tgt
    USING (SELECT @ProductId, @Name, @Price, @IsActive) AS src (ProductId, Name, Price, IsActive)
    ON tgt.ProductId = src.ProductId
    WHEN MATCHED THEN
        UPDATE SET Name = src.Name, Price = src.Price, IsActive = src.IsActive
    WHEN NOT MATCHED THEN
        INSERT (ProductId, Name, Price, IsActive) VALUES (src.ProductId, src.Name, src.Price, src.IsActive);
END;
```

A common pattern is `CREATE OR ALTER PROCEDURE` (SQL Server 2016+), which works whether the procedure exists or not:

```sql
CREATE OR ALTER PROCEDURE dbo.UpsertProduct ...
```

### DROP
```sql
DROP PROCEDURE IF EXISTS dbo.UpsertProduct;   -- SQL Server 2016+
-- or
IF OBJECT_ID('dbo.UpsertProduct', 'P') IS NOT NULL
    DROP PROCEDURE dbo.UpsertProduct;
```

### Calling from C#

```csharp
using var conn = new SqlConnection(connectionString);
using var cmd  = new SqlCommand("dbo.UpsertProduct", conn)
{
    CommandType = CommandType.StoredProcedure
};
cmd.Parameters.Add("@ProductId", SqlDbType.Int).Value    = 1;
cmd.Parameters.Add("@Name",      SqlDbType.NVarChar, 200).Value = "Widget";
cmd.Parameters.Add("@Price",     SqlDbType.Decimal).Value = 9.99m;
cmd.Parameters["@Price"].Precision = 10;
cmd.Parameters["@Price"].Scale     = 2;

await conn.OpenAsync();
await cmd.ExecuteNonQueryAsync();
```
