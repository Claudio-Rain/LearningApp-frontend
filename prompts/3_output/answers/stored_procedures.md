# Model Answers: Stored Procedures

---

**Q: What is a stored procedure? How is it different from a regular SQL query?**

> **Bottom line:** A stored procedure is a named, precompiled block of SQL stored in the database that you execute by name rather than sending raw SQL from the application.

**Elaboration:** Unlike ad-hoc queries, stored procedures are compiled and their execution plans can be cached by the database engine. They encapsulate logic on the database side, can accept parameters and return results, and support complex control flow (IF, WHILE, TRY/CATCH). The trade-off is that logic lives in the database rather than in the application, making version control and testing harder.

---

**Q: What is the difference between a stored procedure and a user-defined function (UDF)?**

> **Bottom line:** A UDF returns a value and can be used inline in a SELECT; a stored procedure can have multiple result sets, output parameters, and side effects like INSERT/UPDATE, but cannot be used inline in a query.

**Elaboration:** Functions must return a value (scalar or table) and cannot modify database state (in most databases). Stored procedures are more flexible — they can modify data, call other procedures, manage transactions explicitly, and return multiple result sets. In SQL Server, scalar UDFs in WHERE clauses can also kill query plan optimization, so use them carefully.

---

**Q: What does it mean for a stored procedure to be "precompiled"?**

> **Bottom line:** The database parses, validates, and generates a query execution plan for the procedure when it's first run, then caches that plan for reuse on subsequent calls.

**Elaboration:** Ad-hoc SQL must be parsed and planned on every execution. A stored procedure's plan is stored in the plan cache (in SQL Server) so subsequent calls skip the compilation step. This is a performance benefit for frequently called procedures, though parameter sniffing can sometimes cause a cached plan that's optimal for one parameter set to be suboptimal for another.

---

**Q: What types of parameters can a stored procedure have?**

> **Bottom line:** In SQL Server T-SQL: input parameters (default), output parameters (`OUTPUT`), and a return code (integer) via `RETURN`.

**Elaboration:** Input parameters pass values in; output parameters pass values back to the caller. The `RETURN` statement sends a single integer (typically used for status codes — 0 for success, negative for errors). Use output parameters for single values you need back; use a result set (SELECT) for multiple rows.

---

**Q: How does a stored procedure return data?**

> **Bottom line:** Via a `SELECT` statement (result set), `OUTPUT` parameters for single values, or `RETURN` for a status integer.

**Elaboration:** A result set is the most common and flexible — it returns rows that the caller can iterate. Output parameters are useful when you need exactly one value back without opening a result set reader. `RETURN` is only for status codes, not data. In C# you read result sets via `SqlDataReader`, output parameters via `SqlParameter.Direction = Output`.

---

**Q: Write a stored procedure that accepts a customer ID, fetches their orders, and returns the total order value.**

```sql
CREATE PROCEDURE GetCustomerOrderTotal
    @CustomerId INT,
    @TotalValue DECIMAL(18,2) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT @TotalValue = SUM(o.TotalAmount)
    FROM Orders o
    WHERE o.CustomerId = @CustomerId;

    SELECT o.OrderId, o.OrderDate, o.TotalAmount
    FROM Orders o
    WHERE o.CustomerId = @CustomerId
    ORDER BY o.OrderDate DESC;
END;
```

---

**Q: How do you execute a stored procedure from C# using SqlCommand?**

```csharp
await using var conn = new SqlConnection(connectionString);
await using var cmd = new SqlCommand("GetCustomerOrderTotal", conn)
    { CommandType = CommandType.StoredProcedure };

cmd.Parameters.AddWithValue("@CustomerId", customerId);
var totalParam = cmd.Parameters.Add("@TotalValue", SqlDbType.Decimal);
totalParam.Direction = ParameterDirection.Output;

await conn.OpenAsync();
await using var reader = await cmd.ExecuteReaderAsync();
while (await reader.ReadAsync())
    Console.WriteLine(reader["OrderId"]);

await reader.CloseAsync();
decimal total = (decimal)totalParam.Value;
```

---

**Q: Write a stored procedure that transfers money between two accounts and rolls back if either fails.**

```sql
CREATE PROCEDURE TransferFunds
    @FromAccount INT,
    @ToAccount   INT,
    @Amount      DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        UPDATE Accounts SET Balance = Balance - @Amount WHERE AccountId = @FromAccount;
        IF @@ROWCOUNT = 0 THROW 50001, 'Source account not found.', 1;

        UPDATE Accounts SET Balance = Balance + @Amount WHERE AccountId = @ToAccount;
        IF @@ROWCOUNT = 0 THROW 50002, 'Destination account not found.', 1;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
```

---

**Q: How do you handle errors inside a stored procedure in SQL Server?**

> **Bottom line:** Wrap the body in `BEGIN TRY...END TRY BEGIN CATCH...END CATCH` and use `THROW` or `RAISERROR` to surface the error to the caller.

**Elaboration:** `TRY/CATCH` was introduced in SQL Server 2005 and is the modern approach. Inside the `CATCH`, use `ERROR_MESSAGE()`, `ERROR_NUMBER()`, and `ERROR_LINE()` to access error details. Always check `XACT_STATE()` before rolling back — if it's -1, the transaction is doomed and you must roll back; if 0, there's no active transaction.

---

**Q: What is XACT_STATE() and why is it important inside a CATCH block?**

> **Bottom line:** `XACT_STATE()` returns 1 (active, committable), -1 (active, doomed — must roll back), or 0 (no transaction) — it tells you whether a ROLLBACK is safe or mandatory.

**Elaboration:** If `XACT_STATE() = -1`, attempting `COMMIT` will fail and the only valid action is `ROLLBACK`. If you omit the check and call `ROLLBACK` when `XACT_STATE() = 0`, you get an error. The safe pattern is `IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;` inside the CATCH block.

---

**Q: Does using a stored procedure automatically protect against SQL injection?**

> **Bottom line:** Parameterized stored procedures do protect against injection — but dynamic SQL built with string concatenation inside a procedure does not.

**Elaboration:** When you call a stored procedure with parameters, the parameter values are never interpreted as SQL — they're passed as data. However, if the procedure builds a query string with `EXEC('SELECT * FROM ' + @TableName)`, that dynamic SQL is vulnerable to injection just like any concatenated query. Use `sp_executesql` with parameters for dynamic SQL when you absolutely need it.

---

**Q: What is parameter sniffing and why can it cause performance problems?**

> **Bottom line:** Parameter sniffing is when SQL Server compiles a stored procedure's execution plan based on the first parameter values it sees, which can produce a plan that's optimal for those values but terrible for others.

**Elaboration:** SQL Server caches one execution plan per stored procedure. If the first call uses `@CustomerId = 1` (a customer with 5 orders), the plan uses a nested-loop join. Later calls with `@CustomerId = 999` (a customer with 500,000 orders) run that same plan, which is now catastrophically slow. Fix options: `OPTION (RECOMPILE)` on the statement (recompile per execution), `OPTIMIZE FOR UNKNOWN`, or separate procedures for different parameter distributions.

---

**Q: What are the arguments for putting business logic in stored procedures vs. in the application layer?**

> **Bottom line:** Stored procedures win on data proximity and performance for set-based operations; the application layer wins on testability, deployment agility, and keeping logic in version control alongside code.

**Elaboration:** Stored procedures excel when processing large datasets (avoiding round trips), enforcing consistency across multiple applications sharing the same DB, and leveraging query optimizer features. But they make CI/CD harder — you can't deploy a stored procedure change with the same pipeline as application code, and unit testing them requires a live database.

---

**Q: When would you choose stored procedures over an ORM like Entity Framework?**

> **Bottom line:** Choose stored procedures for complex reporting queries, bulk operations, or when you need fine-grained control over execution plans; use an ORM for standard CRUD in business logic.

**Elaboration:** EF Core can call stored procedures and map results, so these aren't mutually exclusive. I use EF for standard entity operations and stored procedures for batch imports, complex analytical queries that the ORM generates poorly, or operations that must be atomic at the database level with DBA-managed logic.

---

**Q: How do stored procedures interact with database migrations in a CI/CD pipeline?**

> **Bottom line:** Stored procedure changes must be scripted as migration steps (CREATE OR ALTER) and committed to source control alongside application code, then run as part of the deployment pipeline.

**Elaboration:** Tools like Flyway, Liquibase, or DbUp manage versioned SQL migration scripts. Each stored procedure change is a new migration file: `ALTER PROCEDURE ...` or `DROP AND RECREATE`. This makes SP changes reviewable in PRs, reproducible across environments, and rollback-able. The challenge is that SP changes are often coupled to application code changes — both must deploy atomically, which requires careful blue/green or expand/contract migration strategies.

---

**Q: What is the difference between cursor-based row-by-row processing and set-based operations?**

> **Bottom line:** Cursors process one row at a time in a loop (slow, O(n) round trips through the engine); set-based operations apply to all matching rows at once (fast, leverages the query optimizer).

**Elaboration:** SQL engines are designed to optimize set-based operations — they can parallelize, use indexes, and choose join strategies. A cursor defeats all of that by forcing a sequential scan through the result set. A loop that updates 10,000 rows one at a time with a cursor might take 10 seconds; a single `UPDATE ... WHERE` statement takes milliseconds. Reach for cursors only when you genuinely need row-by-row processing that cannot be expressed as a set operation.
