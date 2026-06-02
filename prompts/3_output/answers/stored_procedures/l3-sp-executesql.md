# L3 How do you use `sp_executesql` to pass parameters safely into dynamic SQL, and why is it safer than `EXEC(@sql)`?

## Answer

`sp_executesql` executes a dynamic SQL string with **typed parameters** — values are passed separately from the SQL text, so they can never be interpreted as SQL syntax. This eliminates SQL injection for value substitution and also enables plan caching.

### Syntax

```sql
EXEC sp_executesql
    @stmt   = N'<sql string with @param placeholders>',
    @params = N'<parameter declarations>',
    @param1 = <value>,
    @param2 = <value>;
```

### Example — safe dynamic search

```sql
CREATE PROCEDURE dbo.SearchOrders
    @CustomerId INT       = NULL,
    @MinTotal   DECIMAL(18,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @sql    NVARCHAR(1000) = N'SELECT OrderId, Total FROM dbo.Orders WHERE 1 = 1';
    DECLARE @params NVARCHAR(500)  = N'@cid INT, @min DECIMAL(18,2)';

    IF @CustomerId IS NOT NULL
        SET @sql = @sql + N' AND CustomerId = @cid';

    IF @MinTotal IS NOT NULL
        SET @sql = @sql + N' AND Total >= @min';

    EXEC sp_executesql @sql, @params,
        @cid = @CustomerId,
        @min = @MinTotal;
END;
```

The user-supplied values `@CustomerId` and `@MinTotal` are **never concatenated** into the SQL string — they flow through the parameter channel. An attacker cannot inject SQL through them.

### Why it is safer than `EXEC(@sql)`

| Feature | `sp_executesql` | `EXEC(@sql)` |
|---|---|---|
| Typed parameters | Yes — values passed separately | No — must concatenate into string |
| SQL injection for values | Not possible | Possible if user input is concatenated |
| Plan caching | Yes — same template reuses plan | Only if exact string matches |
| Output parameters | Supported | Not supported |

### Output parameters example

```sql
DECLARE @count INT;

EXEC sp_executesql
    N'SELECT @cnt = COUNT(*) FROM dbo.Orders WHERE CustomerId = @cid',
    N'@cid INT, @cnt INT OUTPUT',
    @cid   = 42,
    @cnt   = @count OUTPUT;

SELECT @count;
```

### What `sp_executesql` does NOT protect against

**Identifier injection** — table names, column names, and `ORDER BY` columns cannot be parameterized. These must be whitelisted before embedding:

```sql
-- Validate @SortColumn before use
IF @SortColumn NOT IN ('OrderId', 'Total', 'CreatedAt')
    THROW 50001, 'Invalid sort column.', 1;

SET @sql = N'SELECT * FROM dbo.Orders ORDER BY ' + @SortColumn; -- safe after whitelist
```
