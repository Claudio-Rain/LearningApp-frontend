# L4 What is the difference between row-by-row cursor processing and set-based processing, and how would you refactor a cursor-heavy stored procedure to be set-based?

## Core Difference

| Dimension | Cursor (row-by-row) | Set-based |
|-----------|--------------------|-----------| 
| Unit of work | One row per iteration | Entire result set in one statement |
| Engine optimization | Minimal — plan fixed per row | Full query optimizer leverage |
| Network/locking overhead | High — row-level locks held longer | Lower — shorter lock duration |
| Code complexity | High (DECLARE, OPEN, FETCH, CLOSE, DEALLOCATE) | Low |
| Typical performance | O(n) round trips | O(1) statement executions |

SQL Server's Query Optimizer is designed around set algebra. Every cursor trades that advantage for an imperative loop, usually at a severe performance cost.

---

## Canonical Cursor Pattern (Before)

```sql
CREATE PROCEDURE dbo.usp_ApplyDiscount_Cursor
    @DiscountPct DECIMAL(5, 2)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @OrderId  INT;
    DECLARE @Amount   DECIMAL(18, 2);
    DECLARE @NewAmount DECIMAL(18, 2);

    DECLARE order_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT OrderId, Amount
        FROM   dbo.Orders
        WHERE  Status = 'Pending';

    OPEN order_cursor;
    FETCH NEXT FROM order_cursor INTO @OrderId, @Amount;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @NewAmount = @Amount * (1 - @DiscountPct / 100.0);

        UPDATE dbo.Orders
        SET    Amount    = @NewAmount,
               UpdatedAt = GETUTCDATE()
        WHERE  OrderId   = @OrderId;

        -- Imagine 100,000 pending orders: 100,000 single-row UPDATE statements
        FETCH NEXT FROM order_cursor INTO @OrderId, @Amount;
    END

    CLOSE      order_cursor;
    DEALLOCATE order_cursor;
END
```

**Problems**: 100,000 rows → 100,000 UPDATE statements → 100,000 lock acquisitions, 100,000 log writes, sequential execution with no parallelism.

---

## Refactored Set-Based Version (After)

```sql
CREATE OR ALTER PROCEDURE dbo.usp_ApplyDiscount_SetBased
    @DiscountPct DECIMAL(5, 2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    UPDATE dbo.Orders
    SET    Amount    = Amount * (1 - @DiscountPct / 100.0),
           UpdatedAt = GETUTCDATE()
    WHERE  Status    = 'Pending';
    -- One statement, one lock acquisition burst, optimizer can use parallelism
END
```

Same logical result. Typically 10x–100x faster on large datasets.

---

## Refactoring a More Complex Cursor: Running Totals

A common justification for cursors is "I need the previous row's result." The window function `SUM() OVER` eliminates this:

```sql
-- Cursor version: accumulates a running balance row by row
DECLARE @RunningBalance DECIMAL(18,2) = 0;
DECLARE @Amount DECIMAL(18,2);
DECLARE c CURSOR FOR SELECT Amount FROM dbo.Transactions ORDER BY TxDate;
OPEN c;
FETCH NEXT FROM c INTO @Amount;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @RunningBalance += @Amount;
    -- ... use @RunningBalance ...
    FETCH NEXT FROM c INTO @Amount;
END
CLOSE c; DEALLOCATE c;

-- Set-based version: window function
SELECT TxDate,
       Amount,
       SUM(Amount) OVER (ORDER BY TxDate ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
           AS RunningBalance
FROM   dbo.Transactions;
```

---

## Refactoring Conditional Row-by-Row Logic

Cursors are often used for "if this row then do X, else do Y." `CASE` expressions and `MERGE` handle this set-based:

```sql
-- Cursor: check each product, update differently based on category
-- Set-based equivalent:
UPDATE p
SET    p.Price = CASE
                    WHEN c.CategoryName = 'Electronics' THEN p.Price * 0.90
                    WHEN c.CategoryName = 'Clothing'    THEN p.Price * 0.85
                    ELSE p.Price * 0.95
                 END
FROM   dbo.Products      AS p
JOIN   dbo.Categories    AS c ON c.CategoryId = p.CategoryId
WHERE  p.IsActive = 1;
```

---

## When Cursors Are Legitimate

Cursors are appropriate for:

| Scenario | Reason |
|----------|--------|
| DDL operations per object | `ALTER TABLE` cannot be used in set-based statements |
| Dynamic SQL generated per database/schema | Iterating `sys.tables`, `sys.databases` |
| Calling a stored procedure once per row | No set-based equivalent |
| Sequential processing with external side effects | Sending emails, calling APIs per row |

Even in these cases, prefer a `WHILE` loop with a temp table over a cursor — it avoids cursor infrastructure overhead.

```sql
-- Lightweight WHILE-loop alternative to cursor
CREATE TABLE #Pending (RowNum INT IDENTITY(1,1), OrderId INT);
INSERT INTO #Pending (OrderId)
    SELECT OrderId FROM dbo.Orders WHERE Status = 'Pending';

DECLARE @i INT = 1, @Max INT = @@ROWCOUNT, @OrderId INT;
WHILE @i <= @Max
BEGIN
    SELECT @OrderId = OrderId FROM #Pending WHERE RowNum = @i;
    EXEC dbo.usp_ProcessSingleOrder @OrderId;
    SET @i += 1;
END
DROP TABLE #Pending;
```

---

## Refactoring Checklist

1. **Identify what the cursor computes** — is it an aggregation, a join, a conditional update, or a running calculation?
2. **Map to a set-based construct**:
   - Aggregation → `GROUP BY` / window functions
   - Conditional logic → `CASE` / `IIF`
   - Upsert → `MERGE`
   - Running totals → `SUM/ROW_NUMBER OVER (...)`
   - Cross-row comparisons → self-join or `LAG`/`LEAD`
3. **Batch large updates** if the set is very large (millions of rows) to limit log growth:
   ```sql
   WHILE 1 = 1
   BEGIN
       UPDATE TOP (10000) dbo.Orders
       SET    Amount = Amount * 0.90
       WHERE  Status = 'Pending' AND Amount > Amount * 0.90;  -- idempotent guard
       IF @@ROWCOUNT = 0 BREAK;
   END
   ```
4. **Verify results match** by running both versions on test data and comparing output with `EXCEPT`.
