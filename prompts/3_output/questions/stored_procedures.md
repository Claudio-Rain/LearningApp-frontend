# Interview Questions: Stored Procedures

## Coverage map

| Item | Type | Level |
|------|------|-------|
| What is a stored procedure? | Knowledge (inferred) | Level 1 — Definition & Basics |
| Creating and executing stored procedures | Skill (inferred) | Level 3 — Practical Usage |
| Input/output parameters | Skill (inferred) | Level 3 — Practical Usage |
| Error handling inside stored procedures | Skill (inferred) | Level 4 — Common Pitfalls |
| Transactions within stored procedures | Skill (inferred) | Level 3 — Practical Usage |
| Performance and execution plans | Knowledge (inferred) | Level 5 — Internals & Deep Mechanics |
| Security and SQL injection | Knowledge (inferred) | Level 4 — Common Pitfalls |
| Stored procedures vs. ORM vs. inline SQL | Knowledge (inferred) | Level 6 — Trade-offs & Design Decisions |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate knows what stored procedures are and the vocabulary around them._

### What They Are
- ❓ What is a stored procedure? How is it different from a regular SQL query? `[INFERRED]`
- ❓ In what kinds of databases can you write stored procedures? Is the syntax standard across vendors? `[INFERRED]`
- ❓ What is the difference between a stored procedure and a user-defined function (UDF)? `[INFERRED]`
- ❓ What does it mean for a stored procedure to be "precompiled"? `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Test understanding of parameters, return values, and transaction fundamentals._

### Parameters and Return Values
- ❓ What types of parameters can a stored procedure have — IN, OUT, INOUT? How do they differ? `[INFERRED]`
- ❓ How does a stored procedure return data — via `SELECT`, output parameters, or return codes? What are the trade-offs? `[INFERRED]`
- ❓ What is a return code in a stored procedure and when do you use it vs. a result set? `[INFERRED]`

### Transactions
- ❓ How do transactions work inside a stored procedure? What happens if you don't wrap a multi-step operation in a transaction? `[INFERRED]`
- ❓ What is the difference between `COMMIT` and `ROLLBACK`? Where would you place them in a stored procedure? `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Test ability to write and call stored procedures correctly._

### Writing Stored Procedures
- ❓ Write a stored procedure (SQL Server T-SQL) that accepts a customer ID, fetches their orders, and returns the total order value. `[INFERRED]`
- ❓ How do you define an output parameter in a SQL Server stored procedure? `[INFERRED]`
- ❓ How do you call a stored procedure with output parameters from T-SQL? `[INFERRED]`
- ❓ How do you execute a stored procedure from C# using `SqlCommand`? `[INFERRED]`
- ❓ How do you pass a table-valued parameter (TVP) to a stored procedure from C#? `[INFERRED]`

### Transactions in Practice
- ❓ Write a stored procedure that transfers money between two accounts and rolls back both debits and credits if either operation fails. `[INFERRED]`
- ❓ What is a savepoint in a transaction and when would you use one inside a stored procedure? `[INFERRED]`

---

## Level 4 — Common Pitfalls
_Goal: Expose common mistakes and misuse patterns._

### Error Handling
- ❓ How do you handle errors inside a stored procedure in SQL Server? What is `TRY...CATCH`? `[INFERRED]`
- ❓ What is `XACT_STATE()` and why is it important inside a `CATCH` block? `[INFERRED]`
- ❓ A stored procedure catches an error but still commits the transaction. What is the problem? `[INFERRED]`

### Security
- ❓ Does using a stored procedure automatically protect against SQL injection? Explain your reasoning. `[INFERRED]`
- ❓ What is dynamic SQL inside a stored procedure and why is it dangerous? `[INFERRED]`
- ❓ How do ownership chaining and EXECUTE AS affect permissions in stored procedures? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Test understanding of how stored procedures are compiled and executed._

### Execution Plans
- ❓ What is an execution plan? How does SQL Server cache execution plans for stored procedures? `[INFERRED]`
- ❓ What is parameter sniffing and why can it cause performance problems? `[INFERRED]`
- ❓ What is `OPTION (RECOMPILE)` and when should you use it? `[INFERRED]`
- ❓ What is plan cache bloat and how do stored procedures help or hurt it compared to ad-hoc SQL? `[INFERRED]`

### Statistics and Indexes
- ❓ How do out-of-date statistics affect stored procedure performance? `[INFERRED]`
- ❓ What is a covering index and how can it dramatically speed up a stored procedure that queries a large table? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate the decision of when to use stored procedures at all._

### Stored Procedures vs. Alternatives
- ❓ What are the arguments for putting business logic in stored procedures vs. in the application layer? `[INFERRED]`
- ❓ What are the drawbacks of heavily relying on stored procedures in a modern application? `[INFERRED]`
- ❓ When would you choose stored procedures over an ORM like Entity Framework? When would you choose an ORM? `[INFERRED]`
- ❓ How do stored procedures interact with database migrations in a CI/CD pipeline? What challenges arise? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Probe architecture-level and production scenarios._

### Advanced Use Cases
- ❓ How would you version and test stored procedures in a team environment? `[INFERRED]`
- ❓ What is the difference between row-by-row processing in a cursor vs. set-based operations in a stored procedure? Why does it matter for performance? `[INFERRED]`
- ❓ How do you profile and debug a slow stored procedure in production? What tools or techniques do you use? `[INFERRED]`
- ❓ What are CLR stored procedures (in SQL Server) and when would you actually use them? `[INFERRED]`
