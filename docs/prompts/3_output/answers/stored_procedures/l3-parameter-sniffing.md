# L3 What is parameter sniffing, and how can it lead to suboptimal query plans? What strategies exist to mitigate it?

## Answer

### What is parameter sniffing?

When SQL Server compiles a stored procedure for the first time, it looks at the **actual parameter values** provided on that first call to estimate the number of rows the query will return, and chooses the execution plan accordingly. This is called **parameter sniffing** — the optimizer "sniffs" the values to make a better plan.

The problem: the cached plan is then reused for **all subsequent calls**, even if those calls have very different parameter values that would benefit from a completely different plan.

### Classic example

```sql
CREATE PROCEDURE dbo.GetOrders @CustomerId INT
AS
BEGIN
    SELECT * FROM Orders WHERE CustomerId = @CustomerId;
END;
```

- Customer 1 has 10 orders → first call compiles an **Index Seek** plan (small result, seek is optimal).
- Customer 2 has 5,000,000 orders → reuses the Index Seek plan, but a **Table Scan** or **Clustered Index Scan** would be far faster.
- Or vice versa: first call sniffs a large customer → full scan plan reused for a tiny customer, performing many unnecessary I/Os.

### Mitigation strategies

#### 1. OPTIMIZE FOR hint — specific value

```sql
CREATE PROCEDURE dbo.GetOrders @CustomerId INT
AS
BEGIN
    SELECT * FROM Orders WHERE CustomerId = @CustomerId
    OPTION (OPTIMIZE FOR (@CustomerId = 1000));  -- optimize for a "typical" value
END;
```

#### 2. OPTIMIZE FOR UNKNOWN

Tells the optimizer to ignore the sniffed value and use average statistics instead:

```sql
SELECT * FROM Orders WHERE CustomerId = @CustomerId
OPTION (OPTIMIZE FOR (@CustomerId UNKNOWN));
```

#### 3. Local variable copy (old workaround)

Copy the parameter into a local variable; SQL Server cannot sniff local variables and falls back to average statistics:

```sql
CREATE PROCEDURE dbo.GetOrders @CustomerId INT
AS
BEGIN
    DECLARE @LocalId INT = @CustomerId;
    SELECT * FROM Orders WHERE CustomerId = @LocalId;
END;
```

Side effect: the optimizer uses average cardinality estimates, which may not be optimal for extreme values either.

#### 4. WITH RECOMPILE on the procedure

Recompile every execution — eliminates sniffing but adds compile overhead on every call:

```sql
CREATE PROCEDURE dbo.GetOrders @CustomerId INT
WITH RECOMPILE
AS BEGIN ... END;
```

#### 5. RECOMPILE query hint — per statement

Selectively recompile only the problematic statement, not the entire procedure:

```sql
SELECT * FROM Orders WHERE CustomerId = @CustomerId
OPTION (RECOMPILE);
```

This is a good balance: only the affected query pays the compile cost.

#### 6. Multiple procedures or conditional logic

For highly skewed distributions, separate paths per scenario:

```sql
IF @CustomerId IN (SELECT TopCustomerId FROM HighVolumeCustomers)
    EXEC dbo.GetOrders_HighVolume @CustomerId;
ELSE
    EXEC dbo.GetOrders_Standard   @CustomerId;
```

#### 7. Query Store plan forcing (SQL Server 2016+)

After identifying a good plan in Query Store, force it:

```sql
EXEC sys.sp_query_store_force_plan @query_id = 42, @plan_id = 7;
```

### Diagnosing parameter sniffing

```sql
-- Find procedures with high variance between min and max elapsed time
SELECT TOP 20
    OBJECT_NAME(ps.object_id) AS ProcName,
    qs.execution_count,
    qs.min_elapsed_time,
    qs.max_elapsed_time,
    qs.max_elapsed_time - qs.min_elapsed_time AS elapsed_variance
FROM sys.dm_exec_procedure_stats ps
JOIN sys.dm_exec_query_stats     qs ON ps.plan_handle = qs.plan_handle
ORDER BY elapsed_variance DESC;
```

Large variance between `min_elapsed_time` and `max_elapsed_time` is a classic sniffing symptom.

### C# note

There is no client-side fix for parameter sniffing — it is resolved entirely in T-SQL or through database configuration (Query Store, Adaptive Query Processing in SQL Server 2017+). From C#, continue to use typed parameters normally:

```csharp
using var cmd = new SqlCommand("dbo.GetOrders", conn)
    { CommandType = CommandType.StoredProcedure };
cmd.Parameters.Add("@CustomerId", SqlDbType.Int).Value = customerId;
```

SQL Server 2022 and Azure SQL Database include **Parameter Sensitive Plan Optimization (PSP)**, which automatically generates multiple plans for the same procedure when it detects high-skew parameters — largely automating the mitigation.
