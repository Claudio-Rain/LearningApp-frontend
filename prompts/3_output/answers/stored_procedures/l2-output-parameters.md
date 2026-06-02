# L2 How do output parameters work, and how do you read their values from the calling code?

## Answer

### Defining output parameters

Add the `OUTPUT` keyword after the data type. The parameter can be both read (as input) and written (as output) inside the procedure.

```sql
CREATE PROCEDURE dbo.InsertCustomer
    @Name        NVARCHAR(200),
    @Email       NVARCHAR(256),
    @NewId       INT     OUTPUT,   -- value set inside the procedure
    @ErrorMsg    NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM Customers WHERE Email = @Email)
    BEGIN
        SET @ErrorMsg = 'Email already registered.';
        SET @NewId    = -1;
        RETURN;
    END

    INSERT INTO Customers (Name, Email) VALUES (@Name, @Email);
    SET @NewId    = SCOPE_IDENTITY();
    SET @ErrorMsg = NULL;
END;
```

### Calling with OUTPUT in T-SQL

```sql
DECLARE @Id    INT;
DECLARE @ErrMsg NVARCHAR(500);

EXEC dbo.InsertCustomer
    @Name     = N'Alice',
    @Email    = N'alice@example.com',
    @NewId    = @Id     OUTPUT,
    @ErrorMsg = @ErrMsg OUTPUT;

SELECT @Id AS NewId, @ErrMsg AS ErrorMessage;
```

The `OUTPUT` keyword must appear on both the procedure definition **and** the call site.

### Reading output parameters in C#

```csharp
using var conn = new SqlConnection(connectionString);
using var cmd  = new SqlCommand("dbo.InsertCustomer", conn)
{
    CommandType = CommandType.StoredProcedure
};

cmd.Parameters.Add("@Name",  SqlDbType.NVarChar, 200).Value = "Alice";
cmd.Parameters.Add("@Email", SqlDbType.NVarChar, 256).Value = "alice@example.com";

// Declare output parameters — direction must be Output (or InputOutput)
var newIdParam = cmd.Parameters.Add("@NewId", SqlDbType.Int);
newIdParam.Direction = ParameterDirection.Output;

var errMsgParam = cmd.Parameters.Add("@ErrorMsg", SqlDbType.NVarChar, 500);
errMsgParam.Direction = ParameterDirection.Output;

await conn.OpenAsync();
await cmd.ExecuteNonQueryAsync();

int    newId  = newIdParam.Value  == DBNull.Value ? -1 : (int)newIdParam.Value;
string errMsg = errMsgParam.Value == DBNull.Value ? null : (string)errMsgParam.Value;

Console.WriteLine($"New customer ID: {newId}");
if (errMsg != null) Console.WriteLine($"Error: {errMsg}");
```

### RETURN value vs OUTPUT parameter

`RETURN` sends a single integer status code; output parameters can carry any typed value(s). To read the `RETURN` value in C#:

```csharp
var returnParam = cmd.Parameters.Add("@ReturnValue", SqlDbType.Int);
returnParam.Direction = ParameterDirection.ReturnValue;

await cmd.ExecuteNonQueryAsync();
int status = (int)returnParam.Value;  // 0 = success by convention
```

### Key rules

- Output parameters must be consumed **after** `ExecuteNonQuery/ExecuteReader` completes (not before, and not while a reader is still open).
- Use `ParameterDirection.InputOutput` when the caller supplies an initial value and the procedure may modify it.
