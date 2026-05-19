# Interview Questions: Stored Procedures

## Coverage map

| Item | Type | Level |
|---|---|---|
| Definition and purpose of stored procedures | Concept | 1 |
| Syntax and basic creation | Concept | 1 |
| Stored procedure vs. ad-hoc query | Trade-off | 1 |
| Parameters: IN, OUT, INOUT | Concept | 2 |
| Control flow: conditionals and loops | Concept | 2 |
| Transaction management inside procedures | Concept | 2 |
| Error handling and exception blocks | Concept | 2 |
| Calling procedures from application code | Practical | 3 |
| Dynamic SQL inside stored procedures | Practical | 3 |
| Cursors and row-by-row processing | Practical | 3 |
| Debugging a misbehaving stored procedure | Debug | 3 |
| N+1 and cursor anti-patterns | Pitfall | 4 |
| SQL injection via dynamic SQL | Pitfall | 4 |
| Implicit vs. explicit transactions and deadlocks | Pitfall | 4 |
| Recompilation storms and plan cache thrashing | Pitfall | 4 |
| Execution plan caching and parameter sniffing | Internals | 5 |
| Compilation, optimization, and plan reuse | Internals | 5 |
| Procedure metadata and system catalog | Internals | 5 |
| Stored procedures vs. functions vs. triggers | Trade-off | 6 |
| Stored procedures vs. ORM / application logic | Trade-off | 6 |
| Versioning, deployment, and migration strategies | Design | 6 |
| Testability and mocking database procedures | Design | 6 |
| Partitioning business logic: DB vs. service layer | Expert | 7 |
| CLR / external language stored procedures | Expert | 7 |
| Natively compiled stored procedures (in-memory OLTP) | Expert | 7 |
| Multi-tenant and security boundary design | Expert | 7 |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate knows what stored procedures are, why they exist, and can describe their basic anatomy._

### What They Are
- ❓ In your own words, what is a stored procedure and how does it differ from a regular SQL query you send from application code? `[INFERRED]`
- ❓ What does it mean that a stored procedure is "stored" — where exactly does the database engine keep it, and what is stored alongside the SQL text? `[INFERRED]`
- ❓ Why did stored procedures become a mainstream pattern in the 1990s, and what problems were they originally designed to solve? `[INFERRED]`

### Basic Anatomy
- ❓ Walk me through the minimum SQL you need to write to create a stored procedure that accepts a user ID and returns that user's full name. `[INFERRED]`
- ❓ How do you execute a stored procedure, and how does calling it differ between at least two database systems you have worked with (e.g., SQL Server, PostgreSQL, MySQL, Oracle)? `[INFERRED]`

### First Trade-off
- ❓ A junior engineer on your team says "stored procedures are always faster than sending queries from the app." What is true about that claim, what is misleading, and when might it actually be wrong? `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Probe understanding of parameters, control flow, transactions, and error handling — the building blocks of real procedures._

### Parameters
- ❓ Explain the difference between IN, OUT, and INOUT parameters. When would you choose an OUT parameter over simply returning a result set? `[INFERRED]`
- ❓ How do default parameter values work in stored procedures, and what subtle bug can arise when a caller omits a parameter that has a default? `[INFERRED]`
- ❓ What is the risk of using NVARCHAR(MAX) or TEXT as a parameter type for every string argument? How would you advise the team to handle this? `[INFERRED]`

### Control Flow
- ❓ Describe the looping constructs available in at least one database procedural language (e.g., T-SQL, PL/pgSQL, PL/SQL). When is a loop inside a stored procedure a red flag, and when is it justified? `[INFERRED]`
- ❓ How do conditional branches (IF/ELSE, CASE) inside a stored procedure interact with the query optimizer? Does branching prevent a single cached plan from being reused? `[INFERRED]`

### Transactions
- ❓ Can a stored procedure participate in a caller-initiated transaction? Walk me through what happens to atomicity if an outer BEGIN TRANSACTION wraps a procedure call that itself issues a COMMIT. `[INFERRED]`
- ❓ What is a savepoint, and how would you use one inside a stored procedure to implement partial rollback without unwinding the entire outer transaction? `[INFERRED]`

### Error Handling
- ❓ Compare error handling in T-SQL (TRY/CATCH) versus PL/pgSQL (EXCEPTION blocks). What information is available inside the handler, and what is lost if you simply ROLLBACK and re-raise? `[INFERRED]`
- ❓ Trade-off: A procedure catches every exception, logs it, and always returns a success code to the caller. What are the operational risks of this pattern? `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Assess ability to write, call, and debug real stored procedures in a production context._

### Calling from Application Code
- ❓ Describe how your preferred language/ORM framework (e.g., Entity Framework, JDBC, psycopg2, Dapper) executes a stored procedure. What does the driver do under the hood that is different from sending a raw query string? `[INFERRED]`
- ❓ When mapping a stored procedure's result set to application objects, what can go wrong with column ordering versus column naming, and how do you guard against it? `[INFERRED]`

### Dynamic SQL
- ❓ When would you use dynamic SQL inside a stored procedure rather than static SQL? Write a brief pseudocode sketch of a procedure that builds a WHERE clause dynamically based on which filter parameters are non-null. `[INFERRED]`
- ❓ What is the difference between sp_executesql (or EXECUTE format() in PostgreSQL) and EXEC('string') in terms of plan reuse and security? `[INFERRED]`

### Cursors
- ❓ A colleague opens a CURSOR inside a stored procedure to process 500,000 rows one at a time. Walk me through the performance implications and rewrite the logic as a set-based operation. `[INFERRED]`
- ❓ Are there scenarios where a cursor (or equivalent row-by-row construct) inside a stored procedure is genuinely the right tool? Describe one. `[INFERRED]`

### Debugging Scenario
- ❓ A stored procedure that ran in under 50 ms for two years suddenly takes 45 seconds in production. No schema changes were made. Walk me through your diagnostic process step by step. `[INFERRED]`
- ❓ You inherit a stored procedure with no comments that produces incorrect totals for a subset of customers. How do you isolate the bug without a debugger attachment to production? `[INFERRED]`

---

## Level 4 — Common Pitfalls
_Goal: Identify candidates who have been burned — or who have thought carefully about — the failure modes of stored procedures._

### Anti-patterns
- ❓ What is "logic sprawl" in the context of stored procedures, and why can it create a maintenance nightmare over time? Have you encountered it, and how did you address it? `[INFERRED]`
- ❓ Explain the "God procedure" anti-pattern — a single procedure that handles INSERT, UPDATE, DELETE, and SELECT based on a mode parameter. What are the concrete problems this creates for the optimizer, for testing, and for deployments? `[INFERRED]`

### SQL Injection
- ❓ Stored procedures are often cited as a defense against SQL injection. Is that claim fully accurate? Describe exactly how dynamic SQL inside a stored procedure can reintroduce injection vulnerability and how to prevent it. `[INFERRED]`

### Deadlocks and Locking
- ❓ Two stored procedures, A and B, are called concurrently. A acquires a lock on Table1 then Table2; B acquires a lock on Table2 then Table1. Describe the deadlock, how the database resolves it, and how you would redesign the procedures to eliminate it. `[INFERRED]`
- ❓ Trade-off: Using READ UNCOMMITTED (NOLOCK) inside a stored procedure to avoid blocking — when is it acceptable and when is it dangerous? `[INFERRED]`

### Plan Cache Issues
- ❓ What is parameter sniffing, why does it make a procedure fast for one user and slow for another, and what are three different mitigation strategies with their respective trade-offs? `[INFERRED]`
- ❓ What causes a stored procedure plan to be evicted from the cache or recompiled, and why can a recompilation storm under high concurrency be worse than a slightly suboptimal cached plan? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Separate engineers who use stored procedures from those who understand what the engine does with them._

### Compilation and Plan Caching
- ❓ Walk me through what the database engine does between receiving CREATE PROCEDURE and the point where the procedure is ready to execute — covering parsing, binding, optimization, and storage of the plan. `[INFERRED]`
- ❓ How does SQL Server's procedure plan cache differ from PostgreSQL's prepared statement plan cache in terms of scope, eviction policy, and how application connection pooling interacts with each? `[INFERRED]`
- ❓ What is the effect of WITH RECOMPILE on a stored procedure, when is it appropriate, and what is the performance cost of using it indiscriminately? `[INFERRED]`

### Parameter Sniffing — Deep Dive
- ❓ Explain why the execution plan compiled during the first call to a stored procedure can be catastrophically wrong for subsequent calls with different parameter distributions. What statistical information does the optimizer use, and where can it go wrong? `[INFERRED]`
- ❓ Compare OPTIMIZE FOR UNKNOWN, OPTIMIZE FOR (specific value), local variable workarounds, and query hints as solutions to parameter sniffing. Under what data distribution does each approach perform best or worst? `[INFERRED]`

### System Catalog and Metadata
- ❓ Where in the system catalog (e.g., sys.procedures, pg_proc, ALL_SOURCE) is procedure metadata stored, and what information is available there that is useful for auditing or dependency analysis? `[INFERRED]`
- ❓ Trade-off: Encrypting stored procedure source code (WITH ENCRYPTION in SQL Server, wrapping in Oracle). What operational problems does this create, and when is it genuinely justified? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate judgment when choosing stored procedures as an architectural tool, and how candidates reason about competing approaches._

### Stored Procedures vs. Other Constructs
- ❓ You need to enforce a business rule that every INSERT into an Orders table recalculates the customer's credit exposure. Compare using a stored procedure, a trigger, a CHECK constraint, and application-layer validation. What does each approach protect, and what does each leave exposed? `[INFERRED]`
- ❓ When would you choose a table-valued function over a stored procedure, and what are the key limitations of functions that make procedures more appropriate for write operations? `[INFERRED]`

### Stored Procedures vs. Application Logic / ORMs
- ❓ A startup is building a new product with an ORM and wants to put all business logic in stored procedures for performance. What are the long-term trade-offs around developer velocity, portability, testability, and operational complexity? Make a recommendation and defend it. `[INFERRED]`
- ❓ How do stored procedures complicate a microservices migration compared to an application where all SQL is generated by an ORM? What migration path would you recommend for a 500-procedure legacy database? `[INFERRED]`

### Versioning and Deployment
- ❓ How would you version-control stored procedures in a team of 20 engineers using CI/CD? Compare a migration-script approach (Flyway/Liquibase) versus a state-based approach (Redgate/dacpac). What are the failure modes of each when two engineers modify the same procedure simultaneously? `[INFERRED]`
- ❓ Trade-off: Deploying a breaking change to a stored procedure signature (removing a parameter) when 15 different application services call it. What deployment strategies exist and what are the rollback implications of each? `[INFERRED]`

### Testability
- ❓ How do you write automated unit tests for a stored procedure? What frameworks exist (e.g., tSQLt, pgTAP, utPLSQL), and what makes stored procedures harder to test in isolation than application code? `[INFERRED]`
- ❓ A stored procedure calls three other procedures and sends an email via a database mail feature. How do you test the orchestration logic without sending real emails or permanently modifying data? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Distinguish senior engineers from true experts who understand edge cases, platform-specific features, and architectural boundaries._

### Natively Compiled Procedures
- ❓ What are natively compiled stored procedures (SQL Server In-Memory OLTP / Hekaton)? What constraints do they impose on T-SQL syntax, and for which workload profiles do they provide the largest gains? `[INFERRED]`
- ❓ Explain how natively compiled procedures bypass the interpreted execution engine. What does "compilation to machine code" mean in this context, and what are the deployment and memory management implications? `[INFERRED]`

### CLR and External Language Integration
- ❓ When would you implement a stored procedure as a CLR procedure (.NET) or an external language procedure (Python/R in SQL Server 2019+ or PostgreSQL pl/python) rather than in T-SQL or PL/pgSQL? What security and performance trade-offs does this introduce? `[INFERRED]`
- ❓ A CLR stored procedure works correctly in development but causes an AppDomain unload in production under load. Walk through your debugging approach, and explain what AppDomain isolation means in the context of SQL Server's SQLCLR hosting model. `[INFERRED]`

### Multi-tenancy and Security
- ❓ You are designing a SaaS platform where all tenants share the same database schema. How do you use stored procedures as a security boundary to ensure tenant A can never read or write tenant B's data, even if the application layer has a bug? `[INFERRED]`
- ❓ Explain ownership chaining in SQL Server. How does it allow a stored procedure to access tables that the calling user has no direct SELECT permission on, and what security assumption does this break if the procedure owner is not carefully controlled? `[INFERRED]`

### Partitioning Business Logic
- ❓ You are the architect for a system that currently has 800 stored procedures containing most of the business logic. The team wants to move to a domain-driven microservices architecture. Describe a strangler-fig migration strategy, the risks at each phase, and how you decide which logic belongs in the database versus the service layer permanently. `[INFERRED]`
- ❓ Trade-off: In a high-throughput OLTP system (50,000 TPS), is it better to push aggregation and filtering logic into stored procedures executed close to the data, or to retrieve narrow result sets and aggregate in a horizontally scalable application tier? What data characteristics change your answer? `[INFERRED]`

### Expert Debugging Scenario
- ❓ A stored procedure runs correctly in isolation but produces inconsistent results when called from 200 concurrent sessions. The inconsistency is non-deterministic and cannot be reproduced in a single-session test. Describe the full spectrum of root causes you would investigate — covering locking, plan caching, session state, and implicit data type conversions — and how you would instrument the system to capture the failure. `[INFERRED]`
