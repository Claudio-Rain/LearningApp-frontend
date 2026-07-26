# L4 How do you design a stored procedure to be idempotent, and why is this property valuable?

## What Is Idempotency?

A stored procedure is **idempotent** if calling it multiple times with the same inputs produces the same final state as calling it once. Repeated calls are safe — they do not create duplicates, cause errors, or leave data in an inconsistent state.

Formally: `f(f(x)) = f(x)`

---

## Why Idempotency Matters

| Scenario | Without Idempotency | With Idempotency |
|----------|--------------------|--------------------|
| Network retry after timeout | Duplicate record inserted | No-op on second call |
| Message queue redelivery | Order processed twice, double-charged | Safe, processed once |
| ETL pipeline re-run | Duplicate rows in data warehouse | Rows merged, no duplicates |
| Deployment script re-run | Error on object already existing | Script completes cleanly |
| Distributed saga compensation | Unknown state after partial failure | Safe to re-apply |

Idempotent procedures are a prerequisite for **at-least-once delivery** systems, retry-safe APIs, and reliable ETL pipelines.

---

## Technique 1: `MERGE` (Upsert) Instead of Blind INSERT

```sql
-- NOT idempotent: duplicate key error on second call
INSERT INTO dbo.Products (ProductId, Name, Price)
VALUES (@ProductId, @Name, @Price);

-- Idempotent: insert if missing, update if present
MERGE dbo.Products AS target
USING (SELECT @ProductId, @Name, @Price) AS source (ProductId, Name, Price)
ON    target.ProductId = source.ProductId
WHEN MATCHED THEN
    UPDATE SET Name = source.Name, Price = source.Price
WHEN NOT MATCHED THEN
    INSERT (ProductId, Name, Price) VALUES (source.ProductId, source.Name, source.Price);
```

---

## Technique 2: `IF NOT EXISTS` Guard

```sql
CREATE OR ALTER PROCEDURE dbo.usp_RegisterDevice
    @DeviceId   UNIQUEIDENTIFIER,
    @UserId     INT,
    @DeviceType NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Devices WHERE DeviceId = @DeviceId
    )
    BEGIN
        INSERT INTO dbo.Devices (DeviceId, UserId, DeviceType, RegisteredAt)
        VALUES (@DeviceId, @UserId, @DeviceType, GETUTCDATE());
    END
    -- If already exists: silently succeed — caller gets the same outcome
END
```

---

## Technique 3: Natural Key / Unique Constraint + Ignore Duplicate

When duplicate prevention can be enforced at the schema level, handle the violation gracefully:

```sql
-- Table has UNIQUE constraint on (OrderId, ProductId)
CREATE OR ALTER PROCEDURE dbo.usp_AddOrderLine
    @OrderId   INT,
    @ProductId INT,
    @Qty       INT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        INSERT INTO dbo.OrderLines (OrderId, ProductId, Qty)
        VALUES (@OrderId, @ProductId, @Qty);
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() = 2627    -- unique constraint violation
            RETURN;                 -- already exists → idempotent success
        THROW;                      -- re-raise unexpected errors
    END CATCH
END
```

---

## Technique 4: Idempotency Key / Request Deduplication Table

For operations with external side effects (payments, emails), store a **client-supplied idempotency key**:

```sql
CREATE TABLE dbo.IdempotencyLog (
    IdempotencyKey UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ProcedureName  NVARCHAR(200)    NOT NULL,
    ProcessedAt    DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    ResultPayload  NVARCHAR(MAX)    NULL     -- optional: cache the result
);

CREATE OR ALTER PROCEDURE dbo.usp_ChargePayment
    @IdempotencyKey UNIQUEIDENTIFIER,
    @CustomerId     INT,
    @Amount         DECIMAL(18, 2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Check if this request was already processed
    IF EXISTS (SELECT 1 FROM dbo.IdempotencyLog WHERE IdempotencyKey = @IdempotencyKey)
    BEGIN
        -- Return the previously computed result or simply succeed
        SELECT 'AlreadyProcessed' AS Status;
        RETURN;
    END

    BEGIN TRANSACTION;

    -- Perform the actual charge
    INSERT INTO dbo.Payments (CustomerId, Amount, ChargedAt)
    VALUES (@CustomerId, @Amount, GETUTCDATE());

    -- Record that we handled this key
    INSERT INTO dbo.IdempotencyLog (IdempotencyKey, ProcedureName)
    VALUES (@IdempotencyKey, 'usp_ChargePayment');

    COMMIT TRANSACTION;

    SELECT 'Success' AS Status;
END
```

The `IdempotencyLog` insert and the business operation are in the **same transaction** so the log is never written without the payment, and vice versa.

---

## Technique 5: Conditional UPDATE — Only Change What Differs

Make updates safe to re-run by filtering to rows that actually need changing:

```sql
UPDATE dbo.Orders
SET    Status    = @NewStatus,
       UpdatedAt = GETUTCDATE()
WHERE  OrderId   = @OrderId
  AND  Status   <> @NewStatus;   -- no-op if already in target state
```

This also avoids unnecessary log writes and trigger fires.

---

## Design Checklist

| Check | Question to ask |
|-------|----------------|
| INSERT | Is there a unique key? Use MERGE or IF NOT EXISTS. |
| UPDATE | Does the WHERE clause prevent re-applying the same change? |
| DELETE | Is the procedure safe if the row is already gone? Add `IF EXISTS`. |
| Side effects | Are external calls (email, API, ledger) guarded by an idempotency key? |
| Sequences/identities | Does the procedure generate a new ID each call? Consider accepting the ID as input. |
| Status transitions | Is the state machine checked before transitioning? (e.g., only ship if status = 'Packed') |

---

## Key Principle

Idempotency is not just a code pattern — it is a **contract** between the procedure and its callers. Document it explicitly, and design the schema (unique constraints, status columns, idempotency log tables) to enforce it at the database level rather than relying on application-layer logic alone.
