# Interview Questions: Stored Procedures

## Level 1

### Fundamentals
- L1 What is a stored procedure and what problems does it solve compared to writing raw SQL in application code?
- L1 How do you create, execute, alter, and drop a stored procedure in SQL Server?
- L1 What is the difference between a stored procedure and a function (scalar or table-valued)?
- L1 What is the difference between a stored procedure and a view?

### Parameters
- L1 How do you define input parameters in a stored procedure, and how do you pass values to them at call time?
- L1 How do you assign a default value to a stored procedure parameter?

### Control Flow
- L1 What control-flow constructs are available inside a stored procedure (IF/ELSE, WHILE, CASE, etc.)?

---

## Level 2

### Parameters (Advanced)
- L2 How do output parameters work, and how do you read their values from the calling code?
- L2 What are table-valued parameters (TVPs), and when are they preferable to alternatives?

### Error Handling & Transactions
- L2 How do you implement structured error handling inside a stored procedure using TRY/CATCH?
- L2 What is the difference between RAISERROR and THROW, and when would you choose one over the other?
- L2 How do you wrap stored procedure logic in a transaction, and what happens if an error occurs mid-transaction?
- L2 What are savepoints, and how do you use them inside a stored procedure to enable partial rollbacks?
- L2 How does the XACT_ABORT setting affect transaction behavior inside a stored procedure?

---

## Level 3

### Performance
- L3 What is a cached execution plan, and how does SQL Server reuse it across multiple calls to the same stored procedure?
- L3 What is parameter sniffing, and how can it lead to suboptimal query plans? What strategies exist to mitigate it?
- L3 What does SET NOCOUNT ON do, and why is it considered a best practice inside stored procedures?

### Security & Dynamic SQL
- L3 How do stored procedures help prevent SQL injection compared to ad-hoc queries?
- L3 How do you use `sp_executesql` to pass parameters safely into dynamic SQL, and why is it safer than `EXEC(@sql)`?
- L3 What does `EXECUTE AS` do, and what are the security implications of `EXECUTE AS OWNER` vs `EXECUTE AS CALLER`?

---

## Level 4

### Advanced Patterns
- L4 What is the difference between row-by-row cursor processing and set-based processing, and how would you refactor a cursor-heavy stored procedure to be set-based?
- L4 How do you design a stored procedure to be idempotent, and why is this property valuable?
- L4 How do you implement retry logic for deadlock scenarios inside or around a stored procedure?
