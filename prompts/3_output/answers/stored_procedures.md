# Interview Answers: Stored Procedures

## Level 1 — Definition & Basics

---

**Q: In your own words, what is a stored procedure and how does it differ from a regular SQL query you send from application code?**

> **Bottom line:** A stored procedure is a named, precompiled block of SQL (and procedural logic) that lives in the database and is invoked by name rather than by sending SQL text over the wire.

**Elaboration:** When you send a raw query from app code, the database parses, binds, and optimizes it on every execution — or relies on a prepared statement cache that is scoped to your connection. A stored procedure does that work once at creation (or first call, depending on the engine) and stores the result. The bigger practical difference is encapsulation: the procedure is a first-class database object with its own permissions, version history, and signature contract, whereas inline SQL is just a string your app owns.

---

**Q: What does it mean that a stored procedure is "stored" — where exactly does the database engine keep it, and what is stored alongside the SQL text?**

> **Bottom line:** The procedure definition is stored in the system catalog, and depending on the engine, a compiled execution plan may also be cached separately in memory.

**Elaboration:** In SQL Server, the source lives in `sys.sql_modules` and the compiled plan goes into the plan cache (buffer pool). In PostgreSQL, source is in `pg_proc` and plans are cached per-session on first execution. What gets stored alongside the text is metadata: parameter names and types, owner, creation timestamp, dependency information (which tables and objects it touches), and in some engines the normalized parse tree. That dependency metadata is what makes impact analysis possible — you can query which procedures touch a given table before you rename a column.

---

**Q: Why did stored procedures become a mainstream pattern in the 1990s, and what problems were they originally designed to solve?**

> **Bottom line:** They were the answer to three concrete problems of that era: network round-trip cost, repeated parse/optimize overhead, and the need for a security layer between application users and raw tables.

**Elaboration:** In the early client-server world, bandwidth was expensive and databases ran on powerful dedicated servers while clients were thin. Sending a 3KB query string for every page load was wasteful when you could send a 20-byte `EXEC GetCustomer @id=42`. Equally important was the security model — DBAs could grant EXECUTE on a procedure without granting SELECT on the underlying tables, which was a clean way to enforce data access policy without trusting the application. The performance argument was also stronger then because query optimizers were simpler and ad-hoc plan reuse was less reliable.

---

**Q: Walk me through the minimum SQL you need to write to create a stored procedure that accepts a user ID and returns that user's full name.**

> **Bottom line:** It is a CREATE PROCEDURE statement with an input parameter and a SELECT — roughly five lines.

**Elaboration:** The syntax varies by engine but the structure is always: declare the procedure name, declare parameters with types, and write the body. In SQL Server you'd use `CREATE PROCEDURE`, in PostgreSQL `CREATE OR REPLACE FUNCTION` with `RETURNS TABLE` or a `RETURNS SETOF` type. The key thing to get right is matching the parameter type to the column type exactly, because implicit casting can silently kill index usage.

```sql
-- SQL Server
CREATE PROCEDURE dbo.GetUserFullName
    @UserId INT
AS
BEGIN
    SELECT FirstName + ' ' + LastName AS FullName
    FROM dbo.Users
    WHERE UserId = @UserId;
END;

-- PostgreSQL
CREATE OR REPLACE PROCEDURE get_user_full_name(p_user_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    SELECT first_name || ' ' || last_name AS full_name
    FROM users
    WHERE user_id = p_user_id;
END;
$$;
```

---

**Q: How do you execute a stored procedure, and how does calling it differ between at least two database systems you have worked with?**

> **Bottom line:** The syntax and semantics differ enough between engines that you have to know which one you're on — SQL Server uses `EXEC`, PostgreSQL uses `CALL` for procedures and `SELECT` for functions.

**Elaboration:** In SQL Server you call `EXEC dbo.GetUserFullName @UserId = 42` or just `EXEC dbo.GetUserFullName 42` with positional args. In PostgreSQL, what most people think of as stored procedures are actually functions, so you call them with `SELECT * FROM get_user_full_name(42)` — the `CALL` syntax only applies to procedures added in PostgreSQL 11, which don't return result sets. MySQL uses `CALL procedure_name(args)` with OUT parameters retrieved separately. The practical gotcha is that PostgreSQL functions that return `SETOF` or `TABLE` compose into queries, which is more powerful but means your application driver has to handle them as a result set, not a void call.

---

**Q: A junior engineer says "stored procedures are always faster than sending queries from the app." What is true about that claim, what is misleading, and when might it actually be wrong?**

> **Bottom line:** Plan reuse and reduced network overhead are real advantages, but they don't automatically make procedures faster, and several scenarios make them slower.

**Elaboration:** The true part is that a well-tuned stored procedure avoids repeated parse and optimize cycles and can reduce round trips. The misleading part is that modern databases with prepared statements and plan caches close most of that gap for simple queries. Where a stored procedure can actually be *slower* is parameter sniffing: the plan compiled for the first call gets reused for all subsequent calls, and if the first caller happened to have an unusual parameter distribution, everyone else runs with a bad plan. A raw parameterized query from the app might get a fresh plan more often. The other scenario is that a procedure with complex branching may generate a single plan that is a compromise — not optimal for any path.

---

## Level 2 — Core Concepts

---

**Q: Explain the difference between IN, OUT, and INOUT parameters. When would you choose an OUT parameter over simply returning a result set?**

> **Bottom line:** IN passes a value to the procedure, OUT passes a value back to the caller, and INOUT does both — and you choose OUT over a result set when you need to return a small number of scalar values without the overhead of a row buffer.

**Elaboration:** The classic use case for OUT is returning a status code alongside a result set: you want the main data as rows, but you also want to hand back a rowcount or error code without a second query. In SQL Server this is often done with an OUTPUT parameter; in PostgreSQL you'd use INOUT or a function returning a composite type. The practical downside of OUT parameters is that they make the calling code more verbose — you have to declare variables to receive them, whereas a result set maps naturally to whatever object your ORM produces.

---

**Q: How do default parameter values work in stored procedures, and what subtle bug can arise when a caller omits a parameter that has a default?**

> **Bottom line:** Defaults let callers omit arguments, but in SQL Server you must use named parameter syntax to skip a middle parameter — positional omission silently uses the wrong default.

**Elaboration:** In SQL Server, if you have `@StartDate DATE = '2000-01-01', @EndDate DATE = GETDATE()` and call `EXEC MyProc '2024-01-01'`, you've assigned your value to `@StartDate` and `@EndDate` gets the default — which is what you want. But if you want only `@EndDate` to be specified and use positional syntax, there's no way to skip `@StartDate`. The subtle bug is calling `EXEC MyProc @EndDate = '2024-12-31'` expecting `@StartDate` to default, but a developer later adds a new first parameter with a default and shifts all positions — named parameters protect you, positional ones break silently. Always use named parameters when calling procedures with defaults.

---

**Q: What is the risk of using NVARCHAR(MAX) or TEXT as a parameter type for every string argument?**

> **Bottom line:** It prevents the optimizer from accurately estimating cardinality and disables certain index seeks, and it signals you haven't thought about your data contract.

**Elaboration:** For parameters that map to indexed columns, the type mismatch or oversized declaration can cause the engine to either scan instead of seek or add an implicit conversion that makes the index unusable. There's also a memory grant problem: the optimizer assumes MAX types need more working memory, which can cause queries to spill to disk when they don't need to. My guidance to the team is to type parameters to match the column exactly — if `Username` is `NVARCHAR(100)` in the table, the parameter should be `NVARCHAR(100)`. Use MAX only when the data genuinely has no meaningful upper bound, like a body of text or a JSON blob.

---

**Q: Describe the looping constructs available in at least one database procedural language. When is a loop inside a stored procedure a red flag, and when is it justified?**

> **Bottom line:** T-SQL has WHILE; PL/pgSQL has LOOP, WHILE, and FOR — and any loop that processes rows one at a time is a red flag because it throws away the set-based performance the database is designed for.

**Elaboration:** A WHILE loop in T-SQL that fetches one row, processes it, and repeats is essentially reimplementing what a cursor does with extra steps, and both are slow for large datasets. The justified cases are genuinely procedural tasks: iterating over a list of database names to run the same DDL against each, chunking a large batch delete to avoid a massive transaction log growth, or implementing a retry loop around a transient deadlock. If I see a loop that builds up a result set row by row, that's always replaceable with a set-based query and I'll push back on it in review.

---

**Q: How do conditional branches inside a stored procedure interact with the query optimizer? Does branching prevent a single cached plan from being reused?**

> **Bottom line:** The optimizer compiles a single plan for the entire procedure, so branches do not prevent plan reuse, but they do mean the plan may be suboptimal for some execution paths.

**Elaboration:** When SQL Server compiles a procedure with an IF/ELSE, it generates one plan covering both branches at compilation time, using the parameter values sniffed at that moment. If branch A hits a large table with a parameter that has high selectivity and branch B hits it with low selectivity, the single cached plan is a compromise that may do full scans when it should seek, or vice versa. PostgreSQL behaves similarly for PL/pgSQL. The mitigation is either WITH RECOMPILE at the statement level in the hot branch, or splitting the procedure so each branch is its own procedure with its own independently optimized plan.

---

**Q: Can a stored procedure participate in a caller-initiated transaction? What happens to atomicity if an outer BEGIN TRANSACTION wraps a procedure call that itself issues a COMMIT?**

> **Bottom line:** Yes, a procedure participates in the caller's transaction, but if the procedure issues its own COMMIT it will commit the entire outer transaction prematurely, which is almost always a bug.

**Elaboration:** In SQL Server, nesting a COMMIT inside a called procedure while an outer transaction is active decrements the `@@TRANCOUNT` by one — if the outer transaction had `@@TRANCOUNT = 1`, the procedure's COMMIT actually commits everything the outer transaction had done so far. After that, any ROLLBACK in the outer code has nothing to roll back. The safe pattern is for procedures not to manage transaction boundaries unless they are specifically designed to be the outermost transaction owner. If a procedure needs to be callable both standalone and within a larger transaction, use `SAVE TRANSACTION` with a savepoint rather than issuing a bare COMMIT.

---

**Q: What is a savepoint, and how would you use one inside a stored procedure to implement partial rollback without unwinding the entire outer transaction?**

> **Bottom line:** A savepoint is a named marker within a transaction that you can roll back to without affecting work done before the marker.

**Elaboration:** In SQL Server you issue `SAVE TRANSACTION SavepointName` at the start of the procedure's work, and if something goes wrong you `ROLLBACK TRANSACTION SavepointName` — this undoes only what happened after the savepoint, leaving the outer transaction intact. PostgreSQL uses `SAVEPOINT name` and `ROLLBACK TO SAVEPOINT name`. The practical use case is a procedure that is one step in a larger workflow: if this step fails, undo its own changes but let the caller decide whether to commit the rest or roll back entirely. The gotcha in SQL Server is that you can only ROLLBACK to a savepoint, not COMMIT to one — the final COMMIT always comes from the outermost transaction owner.

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

**Q: Compare error handling in T-SQL (TRY/CATCH) versus PL/pgSQL (EXCEPTION blocks). What information is available inside the handler, and what is lost if you simply ROLLBACK and re-raise?**

> **Bottom line:** Both give you error code, message, and severity inside the handler, but a bare ROLLBACK before re-raise in SQL Server destroys the original stack context that THROW would have preserved.

**Elaboration:** In T-SQL, inside a CATCH block you get `ERROR_NUMBER()`, `ERROR_MESSAGE()`, `ERROR_SEVERITY()`, `ERROR_LINE()`, and `ERROR_PROCEDURE()`. If you do `ROLLBACK; THROW;` the THROW re-raises the original error with its original error number and message, which is good. If you do `ROLLBACK; RAISERROR(...)` you lose the original error number and line, which breaks upstream error handling that checks for specific error codes. In PL/pgSQL, the EXCEPTION block gives you `SQLERRM` and `SQLSTATE`, and `RAISE` re-raises — but what you lose with a naive ROLLBACK-then-raise is the savepoint context; PostgreSQL implicitly rolls back to the start of the block on exception, so you often don't need an explicit ROLLBACK, and adding one can cause confusing behavior.

---

**Q: A procedure catches every exception, logs it, and always returns a success code to the caller. What are the operational risks of this pattern?**

> **Bottom line:** Silent swallowing of errors means callers believe work succeeded when it didn't, leading to data inconsistency that is discovered late and is hard to trace.

**Elaboration:** The application proceeds under the assumption that the database operation completed, so it might confirm an order to a customer while the inventory record was never updated. When the inconsistency surfaces days later, there's no exception in the application logs and no stack trace — just a log table row that might not even have been committed if the error happened mid-transaction. Beyond correctness, it makes alerting impossible: your monitoring sees zero errors while the system is silently corrupting data. The only safe version of this pattern is logging and then re-raising, or using a structured return code that the caller is contractually required to check — but even then, most callers won't.

---

## Level 3 — Practical Usage

---

**Q: Describe how your preferred language/ORM framework executes a stored procedure. What does the driver do under the hood that is different from sending a raw query string?**

> **Bottom line:** The driver sends an RPC call with typed parameters rather than a SQL text string, which means the server skips the parse phase and binds directly to the cached plan.

**Elaboration:** In .NET with Dapper, you call `connection.QueryAsync<User>("dbo.GetUser", new { UserId = 42 }, commandType: CommandType.StoredProcedure)`. Under the hood, the driver serializes this as a TDS RPC packet with the procedure name and parameters as typed values — not a SQL string. This is meaningfully different from `EXEC dbo.GetUser @UserId = 42` sent as text, because the text path still goes through the SQL parser. With JDBC, you use `CallableStatement`, which does the same thing. The practical benefit is that the typed parameter path has better plan cache hit rates because the cache key is the procedure name, not a normalized query hash, so there's no risk of cache bloat from slightly different whitespace or parameter literals.

---

**Q: When mapping a stored procedure's result set to application objects, what can go wrong with column ordering versus column naming, and how do you guard against it?**

> **Bottom line:** Mapping by column position is fragile — any column added or reordered in the procedure silently maps values to the wrong fields; always map by name.

**Elaboration:** Some older drivers and some DataReader-based code indexes columns by position: `reader[0]`, `reader[1]`. If someone adds a column to the SELECT list in the procedure, every subsequent column shifts and you get wrong data with no exception. ORMs like Dapper and EF map by column name by default, which is safe against reordering but still breaks if a column is renamed. The guard I always add is an integration test that calls the procedure through the actual driver and asserts on specific named fields with known values — that catches both naming and type mismatches before production.

---

**Q: When would you use dynamic SQL inside a stored procedure rather than static SQL? Write a brief pseudocode sketch of a procedure that builds a WHERE clause dynamically based on which filter parameters are non-null.**

> **Bottom line:** Use dynamic SQL when the query structure itself — not just the values — varies based on input, such as optional filter parameters or runtime-determined sort columns.

**Elaboration:** A static procedure with `WHERE (@City IS NULL OR City = @City) AND (@Status IS NULL OR Status = @Status)` works but produces a single plan that is often suboptimal because the optimizer has to assume both conditions might be active. Dynamic SQL builds only the predicates that are actually needed, so the optimizer can produce a plan tuned to exactly those columns. The mandatory discipline is always using `sp_executesql` with parameterized input, never string concatenation of user values.

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

**Q: What is the difference between sp_executesql and EXEC('string') in terms of plan reuse and security?**

> **Bottom line:** `sp_executesql` supports parameterization so the engine can cache and reuse the plan and safely separates data from code; `EXEC` with a string concatenation gets a fresh parse every time and opens the door to SQL injection.

**Elaboration:** When you call `sp_executesql` with a parameterized query, the plan is cached under a key that includes the query template — subsequent calls with different parameter values hit the same plan. `EXEC('SELECT * FROM Orders WHERE City = ''' + @City + '''')` produces a different query string for every distinct city value, so the plan cache fills up with single-use plans and you lose all reuse benefit. More critically, if `@City` comes from user input that string is injectable. In PostgreSQL the equivalent is `EXECUTE format('SELECT ... WHERE city = %L', p_city)` for safe literal quoting, or parameterized `EXECUTE` with the `USING` clause.

---

**Q: A colleague opens a CURSOR inside a stored procedure to process 500,000 rows one at a time. Walk me through the performance implications and rewrite the logic as a set-based operation.**

> **Bottom line:** A cursor on 500,000 rows is typically 10–100x slower than the equivalent set-based query because it incurs per-row fetch overhead, repeated lock acquisitions, and prevents the optimizer from choosing efficient join or aggregation strategies.

**Elaboration:** Each FETCH NEXT is a round trip through the execution engine, and the transaction log has to record each individual row change rather than a bulk operation. Tempdb usage spikes because the cursor materializes the result set. For the rewrite: if the loop is doing `UPDATE TableA SET col = computed_value WHERE key = cursor_key`, that collapses into a single `UPDATE TableA SET col = ... FROM TableA JOIN SourceData ON ...`. If it's doing conditional logic per row, that becomes a `CASE` expression or a filtered UPDATE with multiple passes.

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

**Q: Are there scenarios where a cursor inside a stored procedure is genuinely the right tool? Describe one.**

> **Bottom line:** Yes — when you need to execute a DDL statement or a dynamic administrative command once per database or object, row-by-row is the only option because DDL cannot be batched set-based.

**Elaboration:** The clearest example is a maintenance procedure that loops over all user databases: `SELECT name FROM sys.databases` into a cursor, then for each database builds and executes a dynamic SQL string like `ALTER INDEX ALL ON [dbname].[dbo].[TableName] REBUILD`. There's no set-based way to issue per-database DDL. Similarly, if you're sending a notification per row via `sp_send_dbmail` or calling a CLR method that has side effects, each call is inherently imperative and a cursor is the honest way to express it. The rule of thumb is: cursors for imperative-per-row side effects, set-based for data transformation.

---

**Q: A stored procedure that ran in under 50 ms for two years suddenly takes 45 seconds in production. No schema changes were made. Walk me through your diagnostic process step by step.**

> **Bottom line:** My first move is to check whether a bad cached plan is responsible, because that is the most common cause of sudden unexplained regression with no schema changes.

**Elaboration:** I start by running `EXEC sp_recompile 'dbo.ProcName'` or flushing the specific plan from cache with `DBCC FREEPROCCACHE (plan_handle)` and observing whether the next execution is fast — if yes, it was a bad cached plan, likely from parameter sniffing after a stats update or an atypical first call. If flushing the plan doesn't help, I pull the actual execution plan from `sys.dm_exec_query_stats` and look for index scans where seeks are expected, large spools, or missing index warnings. Next I check `sys.dm_os_wait_stats` and session waits during execution — PAGEIOLATCH_SH means it's waiting on disk reads, LCK_M_X means blocking. Then I look at whether statistics are stale with `DBCC SHOW_STATISTICS` and compare estimated versus actual row counts in the plan. Finally I check if data volume crossed a threshold that changed the optimizer's cost calculation.

---

**Q: You inherit a stored procedure with no comments that produces incorrect totals for a subset of customers. How do you isolate the bug without a debugger attachment to production?**

> **Bottom line:** I add instrumentation by extracting intermediate result sets into temp tables at each logical step and comparing them against expected values for the affected customer IDs.

**Elaboration:** First I identify a concrete example: one customer ID where the total is wrong and the correct value I expect. Then I run the procedure's body section by section in a read-only transaction (begin transaction, run queries, rollback), capturing intermediate aggregates into temp tables. I compare the temp table output against the source tables directly using the known customer ID to find where the numbers diverge. Common culprits in these situations are implicit INNER JOINs that drop customers with missing lookup records, double-counting from a one-to-many join before aggregation, or a WHERE clause that silently excludes certain date ranges. Once I find the step where numbers diverge, the bug is usually obvious from the JOIN condition.

---

## Level 4 — Common Pitfalls

---

**Q: What is "logic sprawl" in the context of stored procedures, and why can it create a maintenance nightmare?**

> **Bottom line:** Logic sprawl is when business rules are scattered across dozens of stored procedures with no clear ownership, making it impossible to change a rule without auditing every procedure that might implement it.

**Elaboration:** I've inherited systems where the same business rule — say, "a customer is eligible for a discount if their account is more than 90 days old and they've placed more than 5 orders" — was implemented slightly differently in seven different procedures, some of which had drifted over the years. When the rule changed, we had to find all seven implementations, and we missed two. The fix I applied was consolidating shared logic into scalar or table-valued functions that all procedures called, which at least made the rule live in one place. Long term, the better answer is moving that logic to the application layer where it can be tested and versioned with the rest of the domain code.

---

**Q: Explain the "God procedure" anti-pattern. What concrete problems does it create for the optimizer, for testing, and for deployments?**

> **Bottom line:** A God procedure that does INSERT, UPDATE, DELETE, and SELECT based on a mode parameter gets a single cached plan that is wrong for most of its modes, cannot be tested in isolation, and cannot be deployed with fine-grained permissions.

**Elaboration:** The optimizer generates one plan at compile time, and the statistics it uses are influenced by the parameter values sniffed then — for a multi-mode procedure that means the plan is tuned for whichever mode happened to run first. From a testing perspective, you cannot test the SELECT path without worrying that a test harness bug triggers the DELETE path. For deployments, you can't grant EXECUTE only for reads — callers get all modes or none. The fix is always the same: split by operation, one procedure per intent, and accept the minor overhead of more objects in the catalog.

---

**Q: Stored procedures are often cited as a defense against SQL injection. Is that fully accurate?**

> **Bottom line:** Static stored procedures with typed parameters do prevent injection, but dynamic SQL built with string concatenation inside a procedure reintroduces the vulnerability completely.

**Elaboration:** The protection comes from parameterization, not from the fact that it's a stored procedure. When you call `EXEC dbo.GetUser @UserId = 42`, the value 42 is passed as a typed integer and the SQL structure is fixed — there's nothing to inject. But if that procedure does `SET @sql = 'SELECT * FROM Users WHERE Name = ''' + @Name + ''''` and then `EXEC(@sql)`, any user who controls `@Name` can inject. The safe version uses `sp_executesql` with parameters. The takeaway is: stored procedures are injection-safe *if and only if* all SQL inside them is either static or properly parameterized dynamic SQL.

---

**Q: Two stored procedures A and B are called concurrently. A acquires a lock on Table1 then Table2; B acquires a lock on Table2 then Table1. Describe the deadlock, how the database resolves it, and how you would redesign.**

> **Bottom line:** This is a classic lock-ordering deadlock — each session holds a lock the other needs, the database kills the cheaper transaction as the deadlock victim, and the fix is enforcing a consistent lock acquisition order across all procedures.

**Elaboration:** The database's deadlock monitor detects the cycle and chooses a victim based on the cost of rollback — usually the transaction that has done less work or is configured with a lower deadlock priority. The victim gets error 1205 in SQL Server. The redesign is straightforward: both procedures must acquire locks in the same order, so if A locks Table1 before Table2, B must also lock Table1 before Table2. If the procedures don't have a natural ordering, you can force it by accessing a small coordination table first, or by using `sp_getapplock` to serialize at the application level. The deeper fix is often reducing lock duration by keeping transactions short — acquire, modify, commit, rather than holding locks while doing other work.

---

**Q: Using READ UNCOMMITTED (NOLOCK) inside a stored procedure — when is it acceptable and when is it dangerous?**

> **Bottom line:** NOLOCK is acceptable for approximate reporting queries on high-write tables where stale or phantom reads are tolerable, and dangerous for anything that drives business decisions or financial calculations.

**Elaboration:** The risk people underestimate is not just dirty reads — NOLOCK can also return the same row twice or skip rows entirely when a page split occurs during your scan, because you're reading without any structural consistency guarantee. I've seen NOLOCK used on an inventory query that showed available stock based on uncommitted inserts, leading to overselling. Where I'd consider it: a dashboard showing approximate active session counts, a monitoring query checking table sizes, or a read-heavy reporting procedure where the alternative is blocking critical OLTP writes. The safer alternative for most cases is READ COMMITTED SNAPSHOT ISOLATION (RCSI), which gives you non-blocking reads with actual committed data.

---

**Q: What is parameter sniffing, why does it make a procedure fast for one user and slow for another, and what are three mitigation strategies with their respective trade-offs?**

> **Bottom line:** Parameter sniffing is when the optimizer compiles a plan optimized for the parameter values present at first execution, and that plan is reused for all callers even when their parameters have very different selectivity.

**Elaboration:** The classic example: the first call is `EXEC GetOrders @CustomerId = 1` for a customer with 2 orders — the optimizer generates a seek plan. Customer 9999 has 500,000 orders, but gets the same seek plan, which is catastrophic at that scale. Three mitigations: first, `WITH RECOMPILE` on the procedure forces a fresh plan every call — best for procedures with extreme parameter variance, but you pay compile cost every execution. Second, `OPTIMIZE FOR UNKNOWN` tells the optimizer to use average statistics rather than sniffed values — eliminates sniffing but may produce mediocre plans for everyone. Third, local variable reassignment (`DECLARE @LocalId INT = @CustomerId; ... WHERE CustomerId = @LocalId`) tricks the optimizer into not sniffing, same effect as OPTIMIZE FOR UNKNOWN. The trade-off is always: sniffing gives you great plans for common cases, avoiding it gives you consistent plans that are good enough for all cases.

---

**Q: What causes a stored procedure plan to be evicted from the cache or recompiled, and why can a recompilation storm under high concurrency be worse than a slightly suboptimal cached plan?**

> **Bottom line:** Plans are evicted by memory pressure or explicit flushes and recompiled by schema changes, statistics updates, or SET option changes — and under high concurrency, simultaneous recompilations serialize on a compilation lock and can bring the server to its knees.

**Elaboration:** The triggers for recompilation include: `sp_recompile` called explicitly, an index being rebuilt, statistics being updated automatically, a table being dropped and recreated, or a session with different SET options (like ANSI_NULLS or QUOTED_IDENTIFIER) calling the procedure. Under 200 concurrent sessions, if a statistics update invalidates a popular plan, all 200 sessions try to recompile simultaneously. In SQL Server, only one thread compiles while others wait on the RESOURCE_SEMAPHORE_QUERY_COMPILE wait type — this looks like a sudden spike in CPU and wait time that can last 10–30 seconds. A slightly suboptimal cached plan executing stably is genuinely better than this scenario, which is why indiscriminate WITH RECOMPILE is dangerous on high-TPS procedures.

---

## Level 5 — Internals & Deep Mechanics

---

**Q: Walk me through what the database engine does between receiving CREATE PROCEDURE and the point where the procedure is ready to execute.**

> **Bottom line:** CREATE PROCEDURE parses and stores the source text but defers full optimization until first execution, at which point the engine parses, resolves object names, optimizes, and caches the plan.

**Elaboration:** In SQL Server, CREATE PROCEDURE does a syntax check and stores the definition in `sys.sql_modules` — it does not generate a full execution plan. On first EXEC, the engine parses the text into an abstract syntax tree, resolves object names against the catalog (binding), runs the query optimizer against the bound tree using the sniffed parameter values, and stores the resulting plan in the plan cache keyed by the procedure's object ID and the calling context's SET options. PostgreSQL with PL/pgSQL similarly compiles function bodies lazily on first call. The implication is that a procedure can be created successfully against tables that don't exist yet (deferred name resolution in SQL Server), and the first execution is always slightly slower than subsequent ones.

---

**Q: How does SQL Server's procedure plan cache differ from PostgreSQL's prepared statement plan cache in terms of scope, eviction policy, and connection pooling interaction?**

> **Bottom line:** SQL Server's plan cache is global across all connections; PostgreSQL's prepared statement cache is per-session, which means connection pooling with pool reset can silently discard all cached plans on checkout.

**Elaboration:** In SQL Server, once a procedure plan is cached, every connection on the server shares it — a cold start on one connection benefits all subsequent callers immediately. Eviction is LRU under memory pressure managed by the buffer pool. In PostgreSQL, `PREPARE` creates a plan that lives for the duration of the session, and `pg_prepared_statements` shows only the current session's plans. When PgBouncer in transaction pooling mode resets a connection, it may issue `DEALLOCATE ALL`, discarding all prepared statements. This means with aggressive connection pooling, PostgreSQL's plan cache effectively resets frequently, and you pay compilation cost more often than you'd expect. The mitigation is using session pooling mode or ensuring your pooler preserves prepared statements across checkouts.

---

**Q: What is the effect of WITH RECOMPILE on a stored procedure, when is it appropriate, and what is the performance cost of using it indiscriminately?**

> **Bottom line:** WITH RECOMPILE forces a fresh compilation on every execution, eliminating plan reuse entirely — appropriate when parameter distributions vary so wildly that any cached plan is wrong for most callers.

**Elaboration:** The performance cost is the compilation time itself, which for a complex query with many joins can be 5–50ms of CPU, plus any lock contention on the plan cache during compilation. On a procedure called 10,000 times per second, that is significant. The appropriate uses are: procedures with highly skewed parameter distributions where sniffing consistently produces bad plans, procedures that reference temp tables created outside the procedure (which force recompile anyway), and ad-hoc reporting procedures called infrequently enough that compile cost is irrelevant. A better targeted alternative is `OPTION (RECOMPILE)` on specific statements within the procedure rather than on the whole procedure, which lets the optimizer recompile only the expensive queries while reusing the plan for cheaper ones.

---

**Q: Explain why the execution plan compiled during the first call can be catastrophically wrong for subsequent calls with different parameter distributions.**

> **Bottom line:** The optimizer uses the sniffed parameter values to look up statistics and estimate row counts, so a plan that is perfect for 10 rows is physically wrong — wrong join algorithm, wrong index — for 10 million rows.

**Elaboration:** The optimizer's choice between a nested loop join and a hash join depends on estimated row counts — nested loops are better for small outer sets, hash joins for large ones. If the first call passes a parameter that selects 10 rows and the plan gets a nested loop, that plan is cached. A subsequent call that selects 5 million rows runs with a nested loop against 5 million rows, which is orders of magnitude slower than the hash join it would have gotten with accurate estimates. The statistics histogram is accurate — the problem is that the histogram reflects the *sniffed* value's selectivity, not the current call's. This is not a bug; it is a deliberate design choice to avoid recompilation overhead, and it works well for uniform distributions and poorly for skewed ones.

---

**Q: Compare OPTIMIZE FOR UNKNOWN, OPTIMIZE FOR (specific value), local variable workarounds, and query hints as solutions to parameter sniffing.**

> **Bottom line:** Each approach trades the risk of one bad plan for a different risk profile — UNKNOWN gives average-case plans, specific value gives plans tuned to the most common input, local variables are UNKNOWN in disguise, and hints are a maintenance liability.

**Elaboration:** `OPTIMIZE FOR UNKNOWN` uses the average selectivity from statistics, which is good when your data is roughly uniform but bad when you have a dominant value that accounts for 90% of calls — average selectivity will miss-estimate for that common case. `OPTIMIZE FOR (@CustomerId = 1)` pins the plan to a specific parameter's statistics, ideal when you know one value dominates and produces the representative plan, but wrong for all atypical callers. The local variable trick (`DECLARE @id INT = @CustomerId`) prevents sniffing entirely since the optimizer cannot inspect a local variable's value, behaving identically to OPTIMIZE FOR UNKNOWN. Query hints like `OPTION (HASH JOIN)` are the last resort — they override the optimizer's judgment permanently and become a maintenance debt as data evolves. My preference is OPTIMIZE FOR UNKNOWN as the default fix, with OPTION (RECOMPILE) on the specific statement for procedures with extreme variance.

---

**Q: Where in the system catalog is procedure metadata stored, and what information is available there that is useful for auditing or dependency analysis?**

> **Bottom line:** In SQL Server, procedure metadata lives in `sys.procedures` and `sys.sql_modules`, with dependency information in `sys.sql_expression_dependencies` — enough to build a full dependency graph for impact analysis.

**Elaboration:** `sys.procedures` gives you name, object ID, creation and modification dates, and the schema. `sys.sql_modules` gives you the actual SQL text in `definition`, plus flags like `is_encrypted` and `uses_ansi_nulls`. For dependency analysis, `sys.sql_expression_dependencies` maps which procedures reference which tables, views, and functions — crucial before renaming a column or dropping a table. In PostgreSQL, `pg_proc` stores the function source, argument types, return type, language, and security model (definer vs invoker). For auditing, I'd query `sys.procedures` filtered by `modify_date` to find what changed recently, then diff the text against source control.

---

**Q: Encrypting stored procedure source code (WITH ENCRYPTION in SQL Server, wrapping in Oracle). What operational problems does this create, and when is it genuinely justified?**

> **Bottom line:** Encryption makes the procedure a black box — you cannot view, debug, script, or restore the source from the database alone, which creates serious operational risk.

**Elaboration:** The most common operational disaster is losing the source file and being left with an encrypted procedure you cannot read, modify, or reverse-engineer. Deployment tooling like SSDT and Liquibase cannot diff an encrypted object, so you lose automated deployment and drift detection. Debugging is impossible without the source, and third-party monitoring tools that parse procedure text for analysis are blind to it. The genuinely justified cases are narrow: an ISV shipping a licensed product where protecting proprietary algorithm IP is a contractual or competitive requirement. For internal enterprise systems, encryption solves no real problem — your DBAs and developers already have access to source control where the procedure text lives.

---

## Level 6 — Trade-offs & Design Decisions

---

**Q: You need to enforce a business rule that every INSERT into Orders recalculates the customer's credit exposure. Compare stored procedure, trigger, CHECK constraint, and application-layer validation.**

> **Bottom line:** A trigger is the only approach that enforces the rule for every INSERT regardless of who or what inserts the row, but it does so at the cost of hidden complexity and difficult testing.

**Elaboration:** A stored procedure enforces the rule only if all insertions flow through it — a direct INSERT from a reporting tool or a bulk load bypasses it. A CHECK constraint can only validate data against the current row, not aggregate state like credit exposure across rows. Application-layer validation is fast and testable but leaves the database unprotected against other callers. A trigger fires for every INSERT unconditionally, which is the strongest guarantee, but triggers are notoriously hard to test, debug, and reason about under concurrency — a recursive trigger scenario can destroy you. My recommendation is a trigger for the enforcement guarantee, combined with application-layer validation for UX (show the error before the round trip), and an explicit stored procedure as the preferred insertion path so most callers get a clean API.

---

**Q: When would you choose a table-valued function over a stored procedure, and what are the key limitations of functions that make procedures more appropriate for write operations?**

> **Bottom line:** Choose a table-valued function when you need to compose the result into a larger query with joins and filters; use a procedure when you need to write data, manage transactions, or use dynamic SQL.

**Elaboration:** The composability of TVFs is the killer feature — `SELECT o.* FROM Orders o JOIN dbo.GetActiveCustomers() c ON o.CustomerId = c.Id` lets the optimizer see through the function and push predicates into it. You cannot do that with a stored procedure's result set. The limitations are strict: functions cannot execute DML (no INSERT/UPDATE/DELETE), cannot call non-deterministic system procedures, cannot use transactions, and cannot execute dynamic SQL via `EXEC` in SQL Server. If your function needs to log something or touch another table, you're forced into a procedure. Inline table-valued functions (single SELECT, no BEGIN/END) are especially powerful because the optimizer inlines them completely, treating them as a view.

---

**Q: A startup wants to put all business logic in stored procedures for performance. What are the long-term trade-offs? Make a recommendation.**

> **Bottom line:** Don't do it — the performance gains are marginal for a startup's scale, and the costs in developer velocity, testability, and portability are severe and compound over time.

**Elaboration:** The performance argument is real at scale but irrelevant at startup stage, where you're handling hundreds or thousands of requests, not millions. What actually slows startups down is developer friction: every business logic change requires a database deployment, your unit tests need a live database, your CI pipeline gets complicated, and every developer needs DBA-level SQL skills. If you later want to switch databases or add a read replica with slightly different behavior, your logic is baked into the database. My recommendation is to put business logic in the application, use parameterized queries or an ORM, and add stored procedures surgically for genuinely complex reporting queries or performance-critical hot paths identified by profiling — not as the default.

---

**Q: How do stored procedures complicate a microservices migration? What migration path would you recommend for a 500-procedure legacy database?**

> **Bottom line:** Procedures complicate microservices migration because the logic and the data are tightly coupled in the database, so you cannot extract a service without also deciding what to do with the procedures that own its data.

**Elaboration:** In a microservices world, each service owns its data store. With 500 stored procedures in a shared database, you first need to understand which procedures belong to which domain — a dependency analysis against `sys.sql_expression_dependencies` is the starting point. My recommended path is strangler fig: identify one bounded context, extract its procedures' logic into the new service's application code, route new traffic through the service, keep the procedures alive for legacy callers during the transition, then deprecate them once all callers are migrated. Do not try to lift-and-shift 500 procedures into new microservices as-is — that recreates the same coupling in a distributed system, which is worse. The goal is that the procedures teach you the business rules, and the service reimplements them in testable code.

---

**Q: How would you version-control stored procedures in a team of 20 engineers using CI/CD? Compare migration-script versus state-based approaches.**

> **Bottom line:** For active feature development I prefer migration scripts (Flyway/Liquibase) because they are explicit about change history; state-based tools are better for drift detection and idempotent deployments.

**Elaboration:** Migration scripts give you an ordered, auditable history of every change — you know exactly what ran in production and when. The failure mode is two engineers modifying the same procedure in different branches: you get a merge conflict in the script file, which is actually a good thing because it forces resolution before deployment. The subtler failure is out-of-order migrations if branch A's V23 is deployed before branch B's V22 that it depends on. State-based tools like Redgate compare the desired schema state to the current state and generate the diff script — great for idempotency but dangerous when two engineers change the same procedure because the generated diff may silently overwrite one of their changes. My pragmatic recommendation is migration scripts for application deployments, state-based comparison as a drift-detection check in CI to catch manual production changes.

---

**Q: Deploying a breaking change to a stored procedure signature when 15 different services call it. What deployment strategies exist?**

> **Bottom line:** The safest strategy is an expand-contract pattern: add a new procedure with the new signature, migrate callers incrementally, then drop the old one — never do a simultaneous cutover across 15 services.

**Elaboration:** The naive approach of modifying the signature and deploying all 15 services simultaneously requires perfect coordination and leaves no rollback path if two of them fail. The expand phase: create `dbo.GetOrder_v2` with the new signature, deploy it alongside the old one. Migrate services one at a time, each with its own deployment and rollback window. Once all 15 are on v2, contract phase: drop `dbo.GetOrder`. For non-breaking additions (adding an optional parameter with a default), you can often do a single in-place modification since existing callers continue to work. The rollback implication of simultaneous cutover is catastrophic — you'd have to redeploy all 15 services in reverse order under production pressure.

---

**Q: How do you write automated unit tests for a stored procedure? What frameworks exist, and what makes procedures harder to test in isolation?**

> **Bottom line:** tSQLt for SQL Server, pgTAP for PostgreSQL, and utPLSQL for Oracle are the main frameworks — they let you fake tables and assert on results, but the test/code co-location and database dependency make isolation fundamentally harder than application unit tests.

**Elaboration:** With tSQLt you wrap each test in a transaction that rolls back at the end, so tests don't persist data. You use `tSQLt.FakeTable` to substitute a real table with an empty copy, insert controlled test data, call the procedure, and assert with `tSQLt.AssertEqualsTable` or `tSQLt.AssertEquals`. What makes it hard is that you need a live database to run tests at all — there's no in-memory mock of the database engine. Dependency injection is clumsy: if your procedure calls another procedure, you either test them together (integration test) or replace the called procedure with a stub, which is possible with tSQLt's `SpyProcedure` but requires careful setup. The result is that database tests tend to be slower, more coupled, and more brittle than equivalent application tests.

---

**Q: A stored procedure calls three other procedures and sends an email via database mail. How do you test the orchestration logic without sending real emails or permanently modifying data?**

> **Bottom line:** Wrap the entire test in a transaction you roll back, and replace `sp_send_dbmail` with a tSQLt spy or a stub procedure that logs calls without sending.

**Elaboration:** With tSQLt's `SpyProcedure`, you redirect `msdb.dbo.sp_send_dbmail` to a do-nothing stub that records its parameters in a log table — your test then asserts that the stub was called with the expected recipient and subject without any actual email being sent. For the three called procedures, you can either let them run against faked tables (tSQLt.FakeTable on every table they touch) or spy them individually if you want to test only the orchestrator's logic. The transaction wrapping every test means even successful DML is rolled back — no permanent data modification. The limitation is stored procedures that use autonomous transactions or linked server calls, which escape the test transaction boundary and require more invasive isolation strategies.

---

## Level 7 — Advanced & Expert

---

**Q: What are natively compiled stored procedures? What constraints do they impose, and for which workload profiles do they provide the largest gains?**

> **Bottom line:** Natively compiled procedures in SQL Server's In-Memory OLTP are compiled directly to machine code at CREATE time and execute without interpreted T-SQL overhead — they deliver the largest gains for high-TPS OLTP workloads with hot, contention-prone tables.

**Elaboration:** The constraints are significant: tables accessed must be memory-optimized, the T-SQL subset is restricted (no OUTER JOIN, no subqueries in older versions, no dynamic SQL, limited data types), and you must declare `WITH NATIVE_COMPILATION, SCHEMABINDING`. The workload sweet spot is narrow but impactful: simple, frequent transactions like "increment a counter," "insert an event row," or "look up a session" where the overhead of the interpreted execution engine is a meaningful fraction of total execution time. For queries that are already I/O-bound or complex-plan-bound, native compilation helps little because the bottleneck isn't interpreter overhead.

---

**Q: Explain how natively compiled procedures bypass the interpreted execution engine. What does "compilation to machine code" mean here, and what are the deployment and memory management implications?**

> **Bottom line:** Natively compiled procedures are translated to C by SQL Server, compiled to a DLL via the host's C compiler, and loaded into the process — so execution is direct machine code with no per-row interpreter dispatch.

**Elaboration:** The traditional interpreted path runs the procedure through an execution engine that reads the compiled plan operator-by-operator at runtime, which has per-row function call overhead. Native compilation eliminates this by generating a C source file, compiling it to a `.dll` with the Visual C++ compiler at CREATE PROCEDURE time, and loading it into the SQL Server process. The deployment implication is that the DLL must be regenerated on server restart and is stored in a location on disk specified by the database's file path — if you move the database, you need to drop and recreate natively compiled objects. Memory management is tightly coupled to the memory-optimized filegroup's checkpoint files, and since everything is in-memory, you need to size the buffer pool appropriately and accept that cold restarts require reloading all in-memory data from checkpoint files.

---

**Q: When would you implement a stored procedure as a CLR procedure or external language procedure rather than T-SQL? What trade-offs does this introduce?**

> **Bottom line:** Use CLR or external language procedures for computations T-SQL cannot express well — complex string parsing, cryptography, calling external APIs, or statistical algorithms — not as a general-purpose escape hatch from SQL.

**Elaboration:** T-SQL has no native regular expression support, no easy way to call HTTP endpoints, and poor numeric precision options for some scientific computations — these are legitimate cases for CLR (.NET) or `pl/python`. The trade-offs are real: CLR procedures run inside SQL Server's process under strict resource governance but can still destabilize the server if they have memory leaks or infinite loops, since the AppDomain isolation is not a full process sandbox. Python/R via SQL Server Machine Learning Services runs out-of-process, which is safer but adds inter-process communication overhead. Both approaches require more specialized operational knowledge, make the procedure harder to port, and can be blocked by security policies (PERMISSION_SET = SAFE vs EXTERNAL_ACCESS vs UNSAFE for CLR). I use them sparingly and only when the alternative is bringing large datasets to the application tier for processing.

---

**Q: A CLR stored procedure works in development but causes an AppDomain unload in production under load. Walk through your debugging approach.**

> **Bottom line:** An AppDomain unload under load almost always means an unhandled exception escaping a CLR procedure or a critical thread abort — start with the SQL Server error log and Windows Event Log for the unhandled exception type.

**Elaboration:** SQL Server hosts CLR assemblies in AppDomains isolated per database/owner combination. An unhandled exception that escapes managed code causes SQL Server to unload the AppDomain as a protective measure, which evicts all assemblies and requires reloading on the next call. The debugging path: first check `sys.dm_clr_appdomains` to observe unload counts, then look at the SQL Server error log for "AppDomain ... is marked for unload" entries alongside the managed exception type. In development, the load profile differs — race conditions, resource exhaustion under concurrent calls, or finalization-order bugs only manifest under production concurrency. I'd add try/catch around all unmanaged resource access in the CLR code, log the exception before rethrowing, and use `PERMISSION_SET = SAFE` to restrict what the assembly can do, which also forces better coding discipline.

---

**Q: Designing a SaaS platform where all tenants share the same schema — how do you use stored procedures as a security boundary?**

> **Bottom line:** Grant tenants EXECUTE permission only on procedures, never direct table access, and embed the tenant ID as a parameter that the procedure validates against the authenticated session context — so the tenant cannot request another tenant's data even with correct SQL.

**Elaboration:** The pattern is: application authenticates as a database user mapped to a specific tenant (or sets `SESSION_CONTEXT` with the tenant ID after login), all procedures read `SESSION_CONTEXT(N'TenantId')` and include it in every WHERE clause, and the procedure schema is the only access layer — no direct SELECT on base tables is granted. An application bug that passes the wrong tenant ID in application code would pass the wrong value to the procedure parameter, but the procedure's SESSION_CONTEXT check provides a second validation layer. Ownership chaining means the tenant's database user can execute the procedure and the procedure can read tables that the user has no direct permission on, which is exactly the access model you want.

---

**Q: Explain ownership chaining in SQL Server. How does it allow a stored procedure to access tables the calling user cannot directly access, and what security assumption does it break?**

> **Bottom line:** Ownership chaining means SQL Server skips permission checks on objects accessed by a procedure when the procedure and the object share the same owner — which is powerful for access control but dangerous if procedure ownership is not carefully managed.

**Elaboration:** When user Alice calls `dbo.GetSensitiveData`, SQL Server checks: does Alice have EXECUTE on the procedure? Yes. The procedure then accesses `dbo.SensitiveTable` — SQL Server checks: does the procedure owner have SELECT on the table? Since both are owned by `dbo`, the chain is unbroken and the permission check on the table is skipped entirely. Alice gets the data without ever having been granted SELECT on the table. The security assumption it breaks is the principle of least surprise: if you grant Alice EXECUTE on a new procedure without reviewing what tables it accesses, she may gain read access to data you never intended her to see. The control is: use schemas and ensure all procedures that should form a security boundary share an owner, and audit procedure ownership changes.

---

**Q: Describe a strangler-fig migration strategy for 800 stored procedures toward microservices. What risks exist at each phase?**

> **Bottom line:** Start by mapping procedures to domains, then extract one domain at a time by reimplementing its logic in a service while keeping the procedures alive for legacy callers, strangling the database dependency gradually rather than big-bang migrating.

**Elaboration:** Phase 1 is discovery: use `sys.sql_expression_dependencies` to build a table-to-procedure map, group procedures by the bounded contexts they serve, and identify cross-domain procedures (which are the hardest). Risk here is misidentifying domain boundaries, which creates tightly coupled services later. Phase 2 is extraction: pick the lowest-dependency domain first, rewrite its procedures as service-layer code, deploy the service behind a feature flag, run it in parallel with the old procedures verifying outputs match, then cut over traffic. Risk is behavioral drift — the new service may not replicate every edge case in the old procedures, so parallel running and output comparison is mandatory. Phase 3 is deprecation: once all callers are migrated off a procedure, drop it. Risk is undocumented callers — always check for direct database access from reporting tools or legacy batch jobs before dropping. Logic that is genuinely storage-adjacent (complex aggregations, data integrity rules) may legitimately stay in the database permanently as views or functions.

---

**Q: In a high-throughput OLTP system (50,000 TPS), is it better to push aggregation logic into stored procedures close to the data, or retrieve narrow sets and aggregate in the application tier?**

> **Bottom line:** Push filtering and aggregation to the database when the data reduction ratio is high — if a query returns 100 rows from 10 million, the database should do that work; if it returns 50,000 rows to aggregate them, you're better off in the app tier.

**Elaboration:** The database's advantage is data locality and set-based execution — aggregating 10 million rows to a count is faster in the database than shipping those rows over the network. But at 50,000 TPS, the database CPU and memory are the scarcest resources; offloading CPU-intensive aggregations to horizontally scalable application servers makes the database the fast I/O layer it's designed to be. The data characteristics that change my answer: if the aggregation is over highly selective indexed data, push it down; if it requires complex application-tier logic (business rules, conditional calculations based on external state), pull the raw data up. The sweet spot is stored procedures for filtering and joining close to the data, with final assembly and business logic in the application layer.

---

**Q: A stored procedure runs correctly in isolation but produces inconsistent results from 200 concurrent sessions. Walk me through the full spectrum of root causes.**

> **Bottom line:** Non-deterministic concurrent behavior points to one of four areas: read isolation level allowing dirty or phantom reads, parameter sniffing producing different plans per session, session-level SET option differences affecting query behavior, or implicit type conversions that behave differently depending on data already in the buffer cache.

**Elaboration:** I'd instrument in this order: first enable Extended Events to capture actual execution plans and parameter values per session — if different sessions get different plans due to concurrent compilation with different sniffed parameters, the plans themselves will differ. Second, check `sys.dm_exec_sessions` for SET option differences (ANSI_NULLS, QUOTED_IDENTIFIER) — these affect plan cache keys and query behavior. Third, look at isolation level: if the procedure uses READ COMMITTED and the table has hot rows, phantom reads or non-repeatable reads could explain non-deterministic aggregates. Fourth, look for implicit conversions in the execution plan (the yellow warning icon) — `NVARCHAR` parameter against a `VARCHAR` column can cause index scans whose results depend on buffer cache state. Finally, check for shared mutable state: global temp tables, context info (`CONTEXT_INFO`), or application locks that create hidden dependencies between sessions.

---
