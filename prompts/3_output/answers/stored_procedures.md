# Interview Answers: Stored Procedures

## Level 1 — Definition & Basics

---

**Q: L1 What is a stored procedure and how does it differ from a regular SQL query?**

> A stored procedure is a named, precompiled block of SQL (and procedural logic) that lives in the database and is invoked by name rather than by sending SQL text over the wire.

Raw queries parse, bind, and optimize on each execution (or hit a connection-scoped prepared statement cache). Procedures pre-optimize once. Bigger difference: procedures are first-class database objects with permissions, version history, and signature contracts; inline SQL is just a string your app owns.

---

**Q: L1 Where does a stored procedure live in the database, and what is stored alongside the SQL text?**

> The procedure definition is stored in the system catalog, and depending on the engine, a compiled execution plan may also be cached separately in memory.

SQL Server: `sys.sql_modules` (source), plan cache (compiled plan). PostgreSQL: `pg_proc` (source), per-session plans. Metadata stored: parameter names/types, owner, creation timestamp, dependencies (tables, objects touched). Dependencies enable impact analysis — query which procedures reference a table before renaming columns.

---

**Q: L1 Why did stored procedures become a mainstream pattern in the 1990s, and what problems were they originally designed to solve?**

> They were the answer to three concrete problems of that era: network round-trip cost, repeated parse/optimize overhead, and the need for a security layer between application users and raw tables.

Thin clients + expensive bandwidth: sending 20 bytes (`EXEC GetCustomer @id=42`) vs. 3KB query strings. Security: DBAs grant EXECUTE without granting SELECT on tables. Performance: simple optimizers, unreliable ad-hoc plan reuse.

---

**Q: L1 Is the claim "stored procedures are always faster than sending queries from the app" true? What's misleading about it?**

> Plan reuse and reduced network overhead are real advantages, but they don't automatically make procedures faster, and several scenarios make them slower.

**True:** Procedures avoid repeated parse/optimize cycles and can reduce round trips. **Misleading:** Modern databases with prepared statements close this gap for most queries. **Slower scenarios:** Parameter sniffing (first call's plan locks in for all callers, even with different selectivity), complex branching (single plan compromises all execution paths).

---

## Level 2 — Core Concepts

---

**Q: L2 What are IN, OUT, and INOUT parameters? When would you use OUT over a result set?**

> IN passes a value to the procedure, OUT passes a value back to the caller, and INOUT does both — and you choose OUT over a result set when you need to return a small number of scalar values without the overhead of a row buffer.

Use OUT for status codes alongside a result set (rowcount, error code without second query). Downside: requires variable declarations in calling code; result sets map naturally to ORM objects.

```sql
-- SQL Server
CREATE PROCEDURE InsertUser
    @Name NVARCHAR(100),      -- IN
    @UserId INT OUT,          -- OUT
    @ErrorCode INT OUT        -- OUT
AS
BEGIN
    INSERT INTO Users(Name) VALUES (@Name);
    SET @UserId = SCOPE_IDENTITY();
    SET @ErrorCode = 0;
END;

-- Call it
DECLARE @Id INT, @Error INT;
EXEC InsertUser 'Alice', @Id OUT, @Error OUT;
```

---

**Q: L2 How do default parameter values work? What bug can arise when omitting a parameter?**

> Defaults let callers omit arguments, but in SQL Server you must use named parameter syntax to skip a middle parameter — positional omission silently uses the wrong default.

Positional syntax binds to first parameter. Adding a new first parameter silently breaks all positional calls. Always use named parameters.

```sql
CREATE PROCEDURE GetUsers @Status NVARCHAR(20) = 'active', @Limit INT = 100 AS
    SELECT TOP (@Limit) * FROM Users WHERE Status = @Status;

-- Positional (breaks if @Status parameter added before @Limit)
EXEC GetUsers 'inactive', 50;    -- OK now, may break later

-- Named (safe, works regardless of parameter order)
EXEC GetUsers @Limit = 50, @Status = 'inactive';
```

---

**Q: L2 What is the risk of using NVARCHAR(MAX) or TEXT as a parameter type for every string argument?**

> It prevents the optimizer from accurately estimating cardinality and disables certain index seeks, and it signals you haven't thought about your data contract.

Disables index seeks, causes unnecessary memory grants and disk spills. Match parameter types to column types exactly. Use MAX only for unbounded data.

---

**Q: L2 What looping constructs exist? When is a loop in a stored procedure a red flag, and when is it justified?**

> T-SQL has WHILE; PL/pgSQL has LOOP, WHILE, and FOR — and any loop that processes rows one at a time is a red flag because it throws away the set-based performance the database is designed for.

Red flag: row-by-row loops (always replaceable). Justified: DDL per-database, chunking large deletes, retrying deadlocks.

---

**Q: L2 Do branches in a stored procedure prevent plan reuse?**

> The optimizer compiles a single plan for the entire procedure, so branches do not prevent plan reuse, but they do mean the plan may be suboptimal for some execution paths.

One plan covers all branches. If branches need different selectivity, plan compromises. Fix: `WITH RECOMPILE` on hot branch, or split into separate procedures.

```sql
CREATE PROCEDURE GetOrders @QuickPath BIT = 0 AS
BEGIN
    IF @QuickPath = 1
        SELECT * FROM Orders WHERE Status = 'shipped';  -- Few rows, wants index seek
    ELSE
        SELECT * FROM Orders;  -- All rows, wants scan
END;
-- Single plan can't optimize both paths. Fix: split into GetShippedOrders + GetAllOrders
```

---

**Q: L2 Can a procedure participate in a caller's transaction? What if it issues its own COMMIT?**

> Yes, a procedure participates in the caller's transaction, but if the procedure issues its own COMMIT it will commit the entire outer transaction prematurely, which is almost always a bug.

COMMIT decrements `@@TRANCOUNT` — if outer had count=1, procedure COMMIT commits everything. Use savepoints instead of COMMIT for procedures callable standalone or nested.

---

**Q: L2 What is a savepoint? How do you use it for partial rollback?**

> A savepoint is a named marker within a transaction that you can roll back to without affecting work done before the marker.

SQL Server: `SAVE TRANSACTION SavepointName`, then `ROLLBACK TRANSACTION SavepointName` to undo only that block. PostgreSQL: `SAVEPOINT name`, `ROLLBACK TO SAVEPOINT name`. Use case: procedure in larger workflow — fail this step, undo it, let caller decide on the rest. Gotcha: can only ROLLBACK to savepoint, not COMMIT — final commit is outermost owner's.

```sql
-- SQL Server example
CREATE PROCEDURE dbo.ProcessStep
AS
BEGIN
    SAVE TRANSACTION StepSavepoint;
    BEGIN TRY
        -- do work
        INSERT INTO StepLog(Status) VALUES ('done');
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION StepSavepoint;
        -- outer transaction still alive
        THROW;
    END CATCH
END;
```

---

**Q: L2 How does error handling differ between T-SQL and PL/pgSQL? What's lost if you ROLLBACK before re-raising?**

> Both give you error code, message, and severity inside the handler, but a bare ROLLBACK before re-raise in SQL Server destroys the original stack context that THROW would have preserved.

T-SQL: `ROLLBACK; THROW;` preserves error details. `ROLLBACK; RAISERROR()` loses error number. PostgreSQL: auto-rolls back on exception — explicit ROLLBACK causes issues.

---

**Q: L2 A procedure catches every exception, logs it, and always returns a success code to the caller. What are the operational risks of this pattern?**

> Silent swallowing of errors means callers believe work succeeded when it didn't, leading to data inconsistency that is discovered late and is hard to trace.

Silent corruption discovered days later with no trace. Only safe: log and re-raise, or structured return code (but callers rarely check).

---

## Level 3 — Practical Usage

---

**Q: L3 How does your ORM execute a stored procedure? What does the driver do differently than sending a raw query?**

> The driver sends an RPC call with typed parameters rather than a SQL text string, which means the server skips the parse phase and binds directly to the cached plan.

RPC packet with typed parameters, not SQL text. Skips parse, better cache hit rates (key is procedure name, not query hash).

---

**Q: L3 How do transactions in stored procedures differ from application-level transactions? What's the risk of mixing them?**

> Application transactions are explicit — BEGIN, COMMIT, ROLLBACK controlled by app code. Procedure transactions are implicit — procedures execute within whatever transaction the caller started, and can only create savepoints, not new transactions.

A procedure can't start its own transaction; it inherits the caller's. If caller has no transaction, procedure runs autocommit. Mixing: procedure issues COMMIT, it commits the outer transaction prematurely. Risk: partial updates from outer transaction persisted. Fix: procedure uses savepoints only; caller owns the transaction boundary.

```sql
-- Application code starts transaction
BEGIN TRANSACTION;
    EXEC InsertOrder @CustomerId = 1;      -- Inherits app's transaction
    EXEC InsertOrderLine @OrderId = 100;   -- Same transaction
    -- Procedure must NOT issue COMMIT — it would commit both!
    -- Only app code can COMMIT the whole thing
COMMIT;

-- Procedure should use savepoint, not COMMIT
CREATE PROCEDURE InsertOrder @CustomerId INT AS
BEGIN
    SAVE TRANSACTION StepSavepoint;
    BEGIN TRY
        INSERT INTO Orders(CustomerId) VALUES (@CustomerId);
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION StepSavepoint;
        THROW;
    END CATCH;
    -- Procedure doesn't COMMIT — leaves that to caller
END;
```

**Q: L3 When use dynamic SQL vs. static SQL? Sketch a procedure that builds WHERE clauses from optional filters.**

> Use dynamic SQL when the query structure itself — not just the values — varies based on input, such as optional filter parameters or runtime-determined sort columns.

Static `WHERE (@City IS NULL OR City = @City) AND ...` produces suboptimal single plan. Dynamic SQL builds only needed predicates. Always use `sp_executesql` with parameterized input.

```sql
CREATE PROCEDURE dbo.SearchOrders
    @City    NVARCHAR(100) = NULL,
    @Status  NVARCHAR(50)  = NULL
AS
BEGIN
    DECLARE @sql  NVARCHAR(MAX) = N'SELECT * FROM Orders WHERE 1=1';
    DECLARE @params NVARCHAR(500) = N'@City NVARCHAR(100), @Status NVARCHAR(50)';

    IF @City   IS NOT NULL SET @sql += N' AND City = @City';
    IF @Status IS NOT NULL SET @sql += N' AND Status = @Status';

    EXEC sp_executesql @sql, @params, @City = @City, @Status = @Status;
END;
```

---

**Q: L3 What is the difference between sp_executesql and EXEC('string') in terms of plan reuse and security?**

> `sp_executesql` supports parameterization so the engine can cache and reuse the plan and safely separates data from code; `EXEC` with a string concatenation gets a fresh parse every time and opens the door to SQL injection.

`sp_executesql`: caches by query template. String concatenation: unique plans per value, injects user input. PostgreSQL: `EXECUTE format(..., %L)` or parameterized `EXECUTE USING`.

---

**Q: L3 What are the performance implications of processing 500K rows with a cursor? Rewrite as a set-based operation.**

> A cursor on 500,000 rows is typically 10–100x slower than the equivalent set-based query because it incurs per-row fetch overhead, repeated lock acquisitions, and prevents the optimizer from choosing efficient join or aggregation strategies.

FETCH NEXT round-trips; log records individual changes; tempdb spikes. Rewrite row-by-row updates as single UPDATE with JOIN.

```sql
-- Cursor version (slow)
DECLARE cur CURSOR FOR SELECT OrderId, Amount FROM Orders;
OPEN cur;
FETCH NEXT FROM cur INTO @OrderId, @Amount;
WHILE @@FETCH_STATUS = 0
BEGIN
    UPDATE Orders SET Discount = @Amount * 0.1 WHERE OrderId = @OrderId;
    FETCH NEXT FROM cur INTO @OrderId, @Amount;
END;
CLOSE cur; DEALLOCATE cur;

-- Set-based rewrite
UPDATE Orders SET Discount = Amount * 0.1;
```

---

**Q: L3 A procedure that ran in 50ms takes 45 seconds. No schema changes. How would you diagnose?**

> My first move is to check whether a bad cached plan is responsible, because that is the most common cause of sudden unexplained regression with no schema changes.

Flush plan, rerun. If fast, parameter sniffing. If slow, check execution plan for bad scans/spools, check wait stats for I/O/locks, verify statistics are current.

---

**Q: L3 A procedure produces incorrect totals. How would you isolate the bug in production?**

> I add instrumentation by extracting intermediate result sets into temp tables at each logical step and comparing them against expected values for the affected customer IDs.

Run sections in read-only transaction. Compare intermediates to find divergence. Common: INNER JOINs dropping rows, double-counting from one-to-many joins, WHERE excluding date ranges.

---

## Level 4 — Common Pitfalls

---

**Q: L4 What is "logic sprawl" in the context of stored procedures, and why can it create a maintenance nightmare?**

> Logic sprawl is when business rules are scattered across dozens of stored procedures with no clear ownership, making it impossible to change a rule without auditing every procedure that might implement it.

Same rule in multiple places drifts over time, hard to change without missing some. Fix: consolidate into functions. Better: move to application code.

---

**Q: L4 What is the "God procedure" anti-pattern? What problems does it cause?**

> A God procedure that does INSERT, UPDATE, DELETE, and SELECT based on a mode parameter gets a single cached plan that is wrong for most of its modes, cannot be tested in isolation, and cannot be deployed with fine-grained permissions.

One plan compromises all modes. Can't test paths independently. Can't grant fine-grained permissions. Fix: split by operation.

---

**Q: L4 Stored procedures are often cited as a defense against SQL injection. Is that fully accurate?**

> Static stored procedures with typed parameters do prevent injection, but dynamic SQL built with string concatenation inside a procedure reintroduces the vulnerability completely.

Protection is from parameterization, not procedures. String concatenation is injectable. Use `sp_executesql` with parameters.

---

**Q: L4 Procedure A locks Table1 then Table2; B locks Table2 then Table1. Describe the deadlock and fix.**

> This is a classic lock-ordering deadlock — each session holds a lock the other needs, the database kills the cheaper transaction as the deadlock victim, and the fix is enforcing a consistent lock acquisition order across all procedures.

Both must lock in same order. If no natural order, use coordination table or `sp_getapplock`. Deeper fix: keep transactions short.

---

**Q: L4 Using READ UNCOMMITTED (NOLOCK) inside a stored procedure — when is it acceptable and when is it dangerous?**

> NOLOCK is acceptable for approximate reporting queries on high-write tables where stale or phantom reads are tolerable, and dangerous for anything that drives business decisions or financial calculations.

Can return same row twice or skip rows, not just dirty reads. OK for dashboards; dangerous for inventory. Use RCSI instead.

---

**Q: L4 What is parameter sniffing? What are three mitigation strategies?**

> Parameter sniffing is when the optimizer compiles a plan optimized for the parameter values present at first execution, and that plan is reused for all callers even when their parameters have very different selectivity.

First call with 2 rows gets seek; 500K rows call gets same plan. Mitigations: (1) `WITH RECOMPILE` — fresh plan, compile cost; (2) `OPTIMIZE FOR UNKNOWN` — average statistics, mediocre; (3) local variables — prevents sniffing.

```sql
-- Sniffed (plan locked to first caller's @CustomerId value)
CREATE PROCEDURE BadSniff @CustomerId INT AS
    SELECT * FROM Orders WHERE CustomerId = @CustomerId;

-- Fix: local variable prevents sniffing
CREATE PROCEDURE GoodSniff @CustomerId INT AS
    DECLARE @Id INT = @CustomerId;
    SELECT * FROM Orders WHERE CustomerId = @Id;  -- Uses average stats
```

---

**Q: L4 What causes plan eviction and recompilation? Why can a recompilation storm be worse than a bad cached plan?**

> Plans are evicted by memory pressure or explicit flushes and recompiled by schema changes, statistics updates, or SET option changes — and under high concurrency, simultaneous recompilations serialize on a compilation lock and can bring the server to its knees.

Triggers: schema changes, statistics updates, SET option changes. At 200 sessions, all try to recompile at once. Only one thread compiles; others wait — 10–30s CPU spikes. Stable bad plan beats recompilation storm.

---

## Level 5 — Internals & Deep Mechanics

---

**Q: L5 What happens between CREATE PROCEDURE and first execution?**

> CREATE PROCEDURE parses and stores the source text but defers full optimization until first execution, at which point the engine parses, resolves object names, optimizes, and caches the plan.

Syntax check only, no optimization. First EXEC: parse, resolve names, optimize, cache. Procedures can be created against nonexistent tables. First call is slower.

---

**Q: L5 Compare SQL Server's procedure cache to PostgreSQL's statement cache: scope, eviction, pooling.**

> SQL Server's plan cache is global across all connections; PostgreSQL's prepared statement cache is per-session, which means connection pooling with pool reset can silently discard all cached plans on checkout.

SQL Server: global, shared. PostgreSQL: per-session. Pooler may `DEALLOCATE ALL`, losing cache. Aggressive pooling raises compilation costs. Use session pooling mode.

---

**Q: L5 What does WITH RECOMPILE do? When is it appropriate? What's the cost?**

> WITH RECOMPILE forces a fresh compilation on every execution, eliminating plan reuse entirely — appropriate when parameter distributions vary so wildly that any cached plan is wrong for most callers.

Cost: 5–50ms per call. Use for skewed distributions or external temp tables. Better: `OPTION (RECOMPILE)` on specific statements only.

```sql
-- Recompile entire procedure every call
CREATE PROCEDURE GetOrders @Status NVARCHAR(20) WITH RECOMPILE AS
    SELECT * FROM Orders WHERE Status = @Status;

-- Better: recompile only the query that needs it
CREATE PROCEDURE GetOrdersOptimized @Status NVARCHAR(20) AS
    SELECT * FROM Orders WHERE Status = @Status
    OPTION (RECOMPILE);
```

---

**Q: L5 Why can a plan compiled for the first call be wrong for subsequent calls?**

> The optimizer uses the sniffed parameter values to look up statistics and estimate row counts, so a plan that is perfect for 10 rows is physically wrong — wrong join algorithm, wrong index — for 10 million rows.

First call (10 rows) gets nested loop. Next call (5M rows) uses same plan — orders of magnitude slower. Trade-off: avoids recompilation, works for uniform data, breaks for skewed.

---

**Q: L5 Compare OPTIMIZE FOR UNKNOWN, OPTIMIZE FOR (value), local variables, and hints.**

> Each approach trades the risk of one bad plan for a different risk profile — UNKNOWN gives average-case plans, specific value gives plans tuned to the most common input, local variables are UNKNOWN in disguise, and hints are a maintenance liability.

UNKNOWN: average statistics. OPTIMIZE FOR (value): tuned to dominant value. Local variables: same as UNKNOWN. Hints: override optimizer, rot over time. Default: OPTIMIZE FOR UNKNOWN.

---

## Level 6 — Trade-offs & Design Decisions

---

**Q: L6 How would you enforce a recalculation rule on every INSERT? Compare procedures, triggers, constraints, and application code.**

> A trigger is the only approach that enforces the rule for every INSERT regardless of who or what inserts the row, but it does so at the cost of hidden complexity and difficult testing.

Procedures: only if all flow through. Constraints: current row only. Application: testable, unprotected. Triggers: unconditional, hard to test. Recommendation: trigger + application validation + explicit procedure.

```sql
-- Trigger enforces rule for ALL inserts, even bulk loads
CREATE TRIGGER tr_Orders_RecalculateTotal ON Orders
AFTER INSERT AS
BEGIN
    UPDATE o SET TotalPrice = (i.Quantity * i.UnitPrice)
    FROM Orders o
    INNER JOIN inserted i ON o.OrderId = i.OrderId;
END;
```

---

**Q: L6 When use table-valued functions vs. procedures? What limits functions for writes?**

> Choose a table-valued function when you need to compose the result into a larger query with joins and filters; use a procedure when you need to write data, manage transactions, or use dynamic SQL.

TVF composability is the killer feature — optimizer sees through and pushes predicates. Procedures can't. Limitations: no DML, no non-deterministic functions, no transactions, no dynamic SQL. Use procedure if you need side effects.

---

**Q: L6 Should a startup put all business logic in procedures? Trade-offs and recommendation.**

> Don't do it — the performance gains are marginal for a startup's scale, and the costs in developer velocity, testability, and portability are severe and compound over time.

Performance gains irrelevant at startup scale. Real cost: deployment friction, DBA skills needed, locked into database. Recommendation: application logic with parameterized queries; use procedures only for reporting or proven bottlenecks.

---

**Q: L6 How do procedures complicate microservices? Migration path for 500 procedures?**

> Procedures complicate microservices migration because the logic and the data are tightly coupled in the database, so you cannot extract a service without also deciding what to do with the procedures that own its data.

Map to domains with `sys.sql_expression_dependencies`. Strangler fig: rewrite one domain at a time, route new traffic, keep procedures for legacy, deprecate. Don't lift-and-shift all 500.

---

**Q: L6 How do you version control procedures in a team? Migration scripts vs. state-based?**

> For active feature development I prefer migration scripts (Flyway/Liquibase) because they are explicit about change history; state-based tools are better for drift detection and idempotent deployments.

Scripts: ordered history, force conflict resolution. Risk: out-of-order. State-based: idempotent, can overwrite silently. Use scripts for deployments, state-based in CI for drift detection.

---

**Q: L6 How do you deploy a breaking change to a procedure signature used by 15 services?**

> The safest strategy is an expand-contract pattern: add a new procedure with the new signature, migrate callers incrementally, then drop the old one — never do a simultaneous cutover across 15 services.

Expand: create v2, deploy alongside old. Migrate one service at a time. Contract: drop v1 after all migrated. Never simultaneous cutover — no rollback path.

---

**Q: L6 How do you unit test procedures? What frameworks exist? Why are they hard to isolate?**

> tSQLt for SQL Server, pgTAP for PostgreSQL, and utPLSQL for Oracle are the main frameworks — they let you fake tables and assert on results, but the test/code co-location and database dependency make isolation fundamentally harder than application unit tests.

tSQLt: rolled-back transactions, `FakeTable`, assertions. Challenge: no in-memory mock, need live database. Result: slower, more coupled, more brittle.

---

**Q: L6 Test a procedure that calls others and sends email, without side effects?**

> Wrap the entire test in a transaction you roll back, and replace `sp_send_dbmail` with a tSQLt spy or a stub procedure that logs calls without sending.

Use `SpyProcedure` to redirect mail to a logging stub. Fake tables for dependencies. Transaction wrapping rolls back all DML.

```sql
-- Original procedure that sends email
CREATE PROCEDURE SendOrderConfirmation @OrderId INT AS
BEGIN
    INSERT INTO OrderLog(OrderId, Status) VALUES (@OrderId, 'confirmed');
    EXEC msdb.dbo.sp_send_dbmail @subject='Order Confirmed', @body='...';
END;

-- Test without side effects
CREATE PROCEDURE test_SendOrderConfirmation AS
BEGIN
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Spy on mail calls
        EXEC tSQLt.SpyProcedure 'msdb.dbo.sp_send_dbmail';
        
        -- Run procedure
        EXEC SendOrderConfirmation 123;
        
        -- Assert log was written
        ASSERT EXISTS(SELECT 1 FROM OrderLog WHERE OrderId = 123);
        
        -- Assert mail was called
        ASSERT EXISTS(SELECT 1 FROM tSQLt.SpyCalls WHERE ProcedureName = 'sp_send_dbmail');
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
    ROLLBACK TRANSACTION;  -- Undo all DML
END;
```

---


---
