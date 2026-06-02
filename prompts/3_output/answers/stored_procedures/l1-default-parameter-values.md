# L1 How do you assign a default value to a stored procedure parameter?

## Answer

### Syntax

Append `= <default_value>` to the parameter declaration. The parameter then becomes optional at call time.

```sql
CREATE PROCEDURE dbo.GetOrders
    @CustomerId  INT,
    @Status      NVARCHAR(50) = N'Active',   -- string default
    @PageSize    INT          = 50,           -- numeric default
    @Since       DATE         = NULL          -- NULL as "no filter"
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (@PageSize) OrderId, OrderDate, Status
    FROM   Orders
    WHERE  CustomerId = @CustomerId
      AND  Status     = @Status
      AND  (@Since IS NULL OR OrderDate >= @Since)
    ORDER  BY OrderDate DESC;
END;
```

### Calling with defaults

```sql
-- Omit optional parameters entirely
EXEC dbo.GetOrders @CustomerId = 42;
-- Status='Active', PageSize=50, Since=NULL

-- Override selected parameters by name
EXEC dbo.GetOrders @CustomerId = 42, @PageSize = 10;

-- Cannot skip positional parameters; use DEFAULT keyword
EXEC dbo.GetOrders 42, DEFAULT, 10;  -- Status uses its default
```

### Using NULL as a "wildcard" default

A common pattern is to default optional filter parameters to `NULL` and treat `NULL` as "no constraint":

```sql
@CategoryId INT = NULL
-- In the WHERE clause:
AND (@CategoryId IS NULL OR CategoryId = @CategoryId)
```

### Calling from C#

```csharp
using var cmd = new SqlCommand("dbo.GetOrders", conn)
{
    CommandType = CommandType.StoredProcedure
};

// Required parameter
cmd.Parameters.Add("@CustomerId", SqlDbType.Int).Value = 42;

// Optional — omit to use the DB default, or supply DBNull to pass NULL
// Option A: just don't add the parameter → server uses default
// Option B: explicitly pass a value
cmd.Parameters.Add("@PageSize", SqlDbType.Int).Value = 10;

// Option C: pass DBNull for a nullable default
cmd.Parameters.Add("@Since", SqlDbType.Date).Value = DBNull.Value;

await conn.OpenAsync();
using var reader = await cmd.ExecuteReaderAsync();
```

> When a parameter is not added to `cmd.Parameters`, ADO.NET simply doesn't send it, so the server uses the declared default — exactly the same as omitting it in a `EXEC` call.
