# L3 How do stored procedures help prevent SQL injection compared to ad-hoc queries?

## Answer

Stored procedures reduce SQL injection risk primarily by **separating SQL code from data** — but they are not automatically immune. The protection depends on how they are written.

### Why parameterised stored procedures prevent injection

When a stored procedure uses parameters, the SQL engine compiles the query structure **once** at creation (or first execution). When the procedure is called, user-supplied values are passed as typed parameters — they are never interpreted as SQL syntax.

```sql
-- Safe: user input is a parameter, not concatenated into SQL
CREATE PROCEDURE dbo.GetCustomer
    @CustomerId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CustomerId, Name, Email
    FROM   dbo.Customers
    WHERE  CustomerId = @CustomerId;
END;

-- Called from application code
EXEC dbo.GetCustomer @CustomerId = 42;
-- Even if @CustomerId contained "42; DROP TABLE Customers;--",
-- it would be treated as an integer and the call would simply fail type validation.
```

An attacker cannot escape the parameter context to inject additional SQL — the parameter value is data, not code.

### Contrast with vulnerable ad-hoc queries

```sql
-- Dangerous: string concatenation in application code
string sql = "SELECT * FROM Customers WHERE Name = '" + userInput + "'";
-- If userInput = "' OR '1'='1", the query becomes:
-- SELECT * FROM Customers WHERE Name = '' OR '1'='1'
-- → returns all rows
```

### When stored procedures are NOT safe

A procedure is still vulnerable if it constructs SQL strings internally via concatenation:

```sql
-- UNSAFE: dynamic SQL with concatenation
CREATE PROCEDURE dbo.SearchCustomers
    @SearchTerm NVARCHAR(100)
AS
BEGIN
    DECLARE @sql NVARCHAR(500);
    SET @sql = 'SELECT * FROM Customers WHERE Name LIKE ''%' + @SearchTerm + '%''';
    EXEC(@sql);  -- injection possible if @SearchTerm is not sanitised
END;
```

### Safe dynamic SQL with `sp_executesql`

```sql
CREATE PROCEDURE dbo.SearchCustomers
    @SearchTerm NVARCHAR(100)
AS
BEGIN
    DECLARE @sql  NVARCHAR(500);
    DECLARE @term NVARCHAR(102) = '%' + @SearchTerm + '%';

    SET @sql = N'SELECT * FROM Customers WHERE Name LIKE @term';

    EXEC sp_executesql @sql, N'@term NVARCHAR(102)', @term = @term;
    -- @term is passed as a parameter; injection is not possible
END;
```

### Summary

| Approach | SQL injection risk |
|---|---|
| Stored proc with typed parameters | None (parameters are data, not code) |
| Stored proc with string concatenation | High (same risk as ad-hoc) |
| Stored proc using `sp_executesql` with params | None |
| Ad-hoc query with concatenation | High |
| Ad-hoc query with parameterised command | None |

The key principle: **parameters, not concatenation**, regardless of whether the code is in a stored procedure or the application layer.
