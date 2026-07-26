# L3 What is a cached execution plan, and how does SQL Server reuse it across multiple calls to the same stored procedure?

## What Is an Execution Plan?

When SQL Server receives a query or stored procedure call, the **Query Optimizer** compiles the T-SQL into an **execution plan** — a tree of physical operators (Index Seek, Hash Join, Sort, etc.) that describes exactly how to retrieve the data. Compilation is CPU-intensive.

To avoid recompiling on every call, SQL Server stores the plan in the **plan cache** (a region of the Buffer Pool).

---

## How Plan Caching Works for Stored Procedures

```
First call                         Subsequent calls
──────────────────────────────     ─────────────────────────────
1. Parse & bind                    1. Parse & bind
2. Optimize → generate plan        2. Look up plan cache  ──► HIT
3. Store plan in plan cache        3. Execute cached plan
4. Execute
```

SQL Server looks up a plan using a **cache key** derived from:
- The object (stored procedure name + database + schema)
- The SET options in effect for the session (ANSI_NULLS, QUOTED_IDENTIFIER, etc.)

If the key matches, the cached plan is reused **as-is**, skipping optimization.

---

## Parameter Sniffing

The optimizer compiles the plan using the **parameter values from the first call** (it "sniffs" them). This can be excellent or harmful:

- **Good**: First call uses typical values → plan is optimal for most callers.
- **Bad**: First call uses an outlier value → plan is suboptimal for all subsequent callers.

### Classic Problem

```sql
CREATE PROCEDURE dbo.usp_GetOrders @CustomerId INT AS
BEGIN
    SELECT * FROM dbo.Orders WHERE CustomerId = @CustomerId;
END
```

If the first call is for a VIP customer with 500,000 orders, SQL Server may choose a **Table Scan** plan. Every other customer (with 10 orders) then uses that expensive plan.

---

## Tools to Diagnose the Cached Plan

```sql
-- Find the cached plan for a stored procedure
SELECT  qs.execution_count,
        qs.total_elapsed_time / qs.execution_count AS avg_elapsed_us,
        qp.query_plan,
        qt.text
FROM    sys.dm_exec_procedure_stats AS ps
CROSS APPLY sys.dm_exec_sql_text(ps.plan_handle)  AS qt
CROSS APPLY sys.dm_exec_query_plan(ps.plan_handle) AS qp
WHERE   OBJECT_NAME(ps.object_id) = 'usp_GetOrders';
```

---

## Controlling Plan Reuse

### 1. `OPTIMIZE FOR` Hint — compile for a representative value

```sql
CREATE PROCEDURE dbo.usp_GetOrders @CustomerId INT AS
BEGIN
    SELECT * FROM dbo.Orders
    WHERE  CustomerId = @CustomerId
    OPTION (OPTIMIZE FOR (@CustomerId = 1000));  -- use value 1000 for compilation
END
```

### 2. `OPTIMIZE FOR UNKNOWN` — use column statistics, not the sniffed value

```sql
    OPTION (OPTIMIZE FOR (@CustomerId UNKNOWN));
```

### 3. `WITH RECOMPILE` on the procedure — never cache, always recompile

```sql
CREATE PROCEDURE dbo.usp_GetOrders @CustomerId INT
WITH RECOMPILE   -- plan is discarded after each call
AS ...
```

### 4. `OPTION (RECOMPILE)` on the statement — recompile just that query

```sql
SELECT * FROM dbo.Orders
WHERE  CustomerId = @CustomerId
OPTION (RECOMPILE);   -- recompile this statement only; rest of proc is cached
```

Use statement-level recompile when only one query in the procedure has sniffing issues.

---

## Plan Cache Invalidation

A cached plan is discarded (and recompiled on the next call) when:

| Trigger | Example |
|---------|---------|
| Schema change | `ALTER TABLE`, `ALTER PROCEDURE` |
| Statistics update | Auto-update stats threshold crossed |
| Index rebuild/reorganize | `ALTER INDEX ... REBUILD` |
| Server memory pressure | SQL Server evicts plans from cache |
| Explicit flush | `DBCC FREEPROCCACHE` |
| `sp_recompile` | Marks all plans for an object as stale |

---

## Key Takeaways

- Stored procedures are the primary beneficiary of plan caching because they are first-class objects with a stable cache key.
- Ad-hoc queries can also be cached but are more prone to cache bloat (use `OPTIMIZE FOR AD HOC WORKLOADS`).
- Parameter sniffing is a feature, not a bug — it becomes a problem only when parameter distributions are highly skewed.
- Prefer `OPTION (RECOMPILE)` at the statement level over `WITH RECOMPILE` at the procedure level to limit the recompilation scope.
