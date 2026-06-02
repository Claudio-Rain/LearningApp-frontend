# L1 What control-flow constructs are available inside a stored procedure (IF/ELSE, WHILE, CASE, etc.)?

## Answer

T-SQL provides the following control-flow constructs inside stored procedures:

---

### IF / ELSE

```sql
IF @Discount > 0
BEGIN
    UPDATE Orders SET Total = Total * (1 - @Discount) WHERE OrderId = @OrderId;
END
ELSE
BEGIN
    PRINT 'No discount applied.';
END
```

---

### WHILE

The only loop construct in T-SQL. Use a `BREAK` to exit early and `CONTINUE` to skip to the next iteration.

```sql
DECLARE @Counter INT = 1;
WHILE @Counter <= 10
BEGIN
    INSERT INTO Log (Message) VALUES ('Iteration ' + CAST(@Counter AS VARCHAR));
    SET @Counter += 1;
    IF @Counter = 5 BREAK;   -- early exit
END
```

---

### CASE expression

`CASE` is an expression (not a statement), usable in `SELECT`, `WHERE`, `ORDER BY`, and `SET`.

```sql
-- Searched CASE
SELECT OrderId,
       CASE
           WHEN Total > 1000 THEN 'High'
           WHEN Total > 500  THEN 'Medium'
           ELSE                   'Low'
       END AS ValueBand
FROM Orders;

-- Simple CASE
SELECT CASE @Status
           WHEN 1 THEN 'Active'
           WHEN 2 THEN 'Suspended'
           ELSE        'Unknown'
       END;
```

---

### RETURN

Exits the procedure immediately and returns an optional integer status code (convention: 0 = success, non-zero = error).

```sql
IF @CustomerId IS NULL
BEGIN
    RETURN -1;   -- signal missing argument
END
```

---

### GOTO (rare / discouraged)

Jumps to a label. Exists but generally avoided — use structured error handling instead.

```sql
IF @SomeCondition GOTO CleanUp;
-- ... normal logic ...
CleanUp:
    -- cleanup code
```

---

### TRY / CATCH

Structured error handling (covered fully in the error-handling question).

```sql
BEGIN TRY
    -- risky statements
END TRY
BEGIN CATCH
    -- handle error
END CATCH
```

---

### WAITFOR

Pauses execution for a duration or until a specific time.

```sql
WAITFOR DELAY '00:00:05';   -- wait 5 seconds
WAITFOR TIME  '14:00:00';   -- wait until 2 PM
```

---

### Summary

| Construct | Purpose |
|---|---|
| `IF / ELSE` | Conditional branching |
| `WHILE` | Looping (only loop type) |
| `BREAK / CONTINUE` | Loop control |
| `CASE` | Conditional expression |
| `RETURN` | Exit procedure with status |
| `TRY / CATCH` | Structured error handling |
| `GOTO` | Unconditional jump (avoid) |
| `WAITFOR` | Delay / time-based pause |

### C# note

There is no special C# consideration for the control flow inside a stored procedure — the caller simply executes the procedure and reads results:

```csharp
using var cmd = new SqlCommand("dbo.ProcessOrder", conn)
{
    CommandType = CommandType.StoredProcedure
};
cmd.Parameters.Add("@OrderId", SqlDbType.Int).Value    = orderId;
cmd.Parameters.Add("@Discount", SqlDbType.Decimal).Value = 0.10m;

await conn.OpenAsync();
int returnCode = (int)await cmd.ExecuteScalarAsync(); // if SP returns via SELECT
// or check cmd.Parameters["@ReturnValue"].Value for RETURN value
```
