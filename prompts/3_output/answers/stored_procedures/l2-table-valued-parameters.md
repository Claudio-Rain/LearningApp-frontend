# L2 What are table-valued parameters (TVPs), and when are they preferable to comma-separated string parameters or temporary tables?

## Answer

### What is a TVP?

A **table-valued parameter (TVP)** lets you pass a set of rows as a single parameter to a stored procedure or function. The type is defined in the database as a `TABLE TYPE`, and the caller populates a `DataTable` (or equivalent) that the server receives as a read-only table variable.

### Setup: define the type

```sql
-- Step 1: create the user-defined table type
CREATE TYPE dbo.OrderLineList AS TABLE
(
    ProductId INT           NOT NULL,
    Quantity  INT           NOT NULL,
    UnitPrice DECIMAL(10,2) NOT NULL
);
```

### Using the TVP in a procedure

```sql
-- Step 2: use the type as a READONLY parameter
CREATE PROCEDURE dbo.CreateOrderWithLines
    @CustomerId INT,
    @Lines      dbo.OrderLineList READONLY
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @OrderId INT;
    INSERT INTO Orders (CustomerId, OrderDate)
    VALUES (@CustomerId, GETUTCDATE());
    SET @OrderId = SCOPE_IDENTITY();

    INSERT INTO OrderLines (OrderId, ProductId, Quantity, UnitPrice)
    SELECT @OrderId, ProductId, Quantity, UnitPrice
    FROM   @Lines;
END;
```

`READONLY` is **required** — the procedure cannot modify the TVP contents.

### Calling from C#

```csharp
var lines = new DataTable();
lines.Columns.Add("ProductId", typeof(int));
lines.Columns.Add("Quantity",  typeof(int));
lines.Columns.Add("UnitPrice", typeof(decimal));

lines.Rows.Add(101, 2, 29.99m);
lines.Rows.Add(205, 1, 59.00m);

using var conn = new SqlConnection(connectionString);
using var cmd  = new SqlCommand("dbo.CreateOrderWithLines", conn)
{
    CommandType = CommandType.StoredProcedure
};

cmd.Parameters.Add("@CustomerId", SqlDbType.Int).Value = 42;

var tvpParam = cmd.Parameters.AddWithValue("@Lines", lines);
tvpParam.SqlDbType = SqlDbType.Structured;
tvpParam.TypeName  = "dbo.OrderLineList";   // must match the TYPE name in the DB

await conn.OpenAsync();
await cmd.ExecuteNonQueryAsync();
```

### TVPs vs alternatives

| Approach | Pros | Cons |
|---|---|---|
| **TVP** | Typed, set-based, no parsing, single round-trip | Requires DDL type, READONLY only |
| **Comma-separated string** | Simple to pass | Must parse with `STRING_SPLIT` or UDF; loses type safety; injection risk if not parameterized |
| **XML / JSON parameter** | Flexible schema | Parsing overhead; verbose in T-SQL |
| **Temp table** | Flexible, indexable | Two round-trips (INSERT then EXEC); session-scoped; cannot be passed as parameter |
| **Bulk insert / `SqlBulkCopy`** | Best for very large sets | More complex; bypasses SP |

### When TVPs are preferable

- **Multi-row DML in one round-trip**: inserting/updating/deleting many rows as a batch.
- **Type safety**: avoid string splitting and the associated errors.
- **Set-based joins**: join the TVP directly against base tables rather than iterating in a cursor.
- **Moderate data size**: TVPs work well for hundreds to tens of thousands of rows. For millions of rows, `SqlBulkCopy` to a staging table is faster.

### Limitations

- TVP parameters are always `READONLY` — you cannot `INSERT`/`UPDATE` the TVP inside the SP.
- The type must be pre-created in the database (a deployment step).
- Cannot be used with output parameters or return values — they are strictly input.
