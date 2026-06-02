# L3 What does `EXECUTE AS` do, and what are the security implications of `EXECUTE AS OWNER` vs `EXECUTE AS CALLER`?

## What Is `EXECUTE AS`?

`EXECUTE AS` sets the **execution context** — the security identity SQL Server uses to resolve permissions — for the duration of a stored procedure (or function, trigger, or queue). It decouples the identity of the *caller* from the identity used to *check permissions on objects inside* the procedure.

```sql
CREATE PROCEDURE dbo.usp_GetSensitiveData
WITH EXECUTE AS OWNER          -- <── execution context clause
AS
BEGIN
    SELECT * FROM dbo.SalaryData;
END
```

---

## Available Options

| Option | Execution identity used |
|--------|------------------------|
| `EXECUTE AS CALLER` | The user who called the procedure (default) |
| `EXECUTE AS OWNER` | The owner of the procedure object |
| `EXECUTE AS SELF` | The user who created or last altered the procedure |
| `EXECUTE AS 'username'` | A specific, named database user |

---

## EXECUTE AS CALLER (Default)

The caller's permissions are checked on every object accessed inside the procedure.

```sql
CREATE PROCEDURE dbo.usp_GetOrders
-- No EXECUTE AS clause → defaults to CALLER
AS
BEGIN
    SELECT * FROM dbo.Orders;   -- caller must have SELECT on dbo.Orders
END
```

**Security model**: Least-privilege by default. The caller can do inside the procedure exactly what they can do directly against the tables.

**Use when**: You want full, transparent permission enforcement — no privilege escalation.

---

## EXECUTE AS OWNER

SQL Server switches to the procedure owner's identity for the duration of the call. The caller only needs `EXECUTE` permission on the procedure.

```sql
-- dbo.usp_GetSensitiveData is owned by dbo (the schema owner)
CREATE PROCEDURE dbo.usp_GetSensitiveData
WITH EXECUTE AS OWNER
AS
BEGIN
    SELECT SSN, Salary FROM dbo.SalaryData;  -- checked against dbo's permissions
END
```

The caller (`ReportUser`) only needs:
```sql
GRANT EXECUTE ON dbo.usp_GetSensitiveData TO ReportUser;
-- ReportUser does NOT need SELECT on dbo.SalaryData directly
```

**Security model**: Controlled privilege escalation through a well-defined API surface (the procedure).

**Use when**:
- You want to expose a subset of data through a procedure without granting direct table access.
- Implementing a *principle-of-least-privilege* data access layer.
- The procedure validates, filters, or audits access before returning data.

---

## Security Implications Side-by-Side

| Concern | EXECUTE AS CALLER | EXECUTE AS OWNER |
|---------|-------------------|------------------|
| Direct table access required | Yes | No |
| Privilege escalation possible | No | Yes (intentional) |
| Audit trail | Tracks original caller | May lose original caller context |
| Cross-database calls | Straightforward | Requires ownership chaining or explicit trust |
| Risk if procedure has a bug | Low (caller's own perms) | Higher (owner perms used for any flaw) |

---

## Ownership Chaining

`EXECUTE AS OWNER` works cleanly when the procedure and the tables it touches share the **same owner** (ownership chain). If they don't (e.g., procedure in `dbo`, table in `sales` schema with a different owner), SQL Server breaks the chain and falls back to checking the caller's permissions on the table.

```sql
-- Ownership chain intact: both owned by dbo → EXECUTE AS OWNER works
CREATE TABLE dbo.SalaryData (...);
CREATE PROCEDURE dbo.usp_GetSensitiveData WITH EXECUTE AS OWNER AS ...

-- Chain broken: table owned by different principal → permission check falls through
CREATE TABLE hr.SalaryData (...);   -- owned by hr_owner, not dbo
CREATE PROCEDURE dbo.usp_GetSensitiveData WITH EXECUTE AS OWNER AS
    SELECT * FROM hr.SalaryData;   -- may fail for caller
```

---

## Named User Option (`EXECUTE AS 'username'`)

For cross-database or cross-server scenarios, or when you need a specific, auditable service account:

```sql
CREATE PROCEDURE dbo.usp_SyncData
WITH EXECUTE AS 'svc_DataSync'    -- a specific low-privilege database user
AS
BEGIN
    -- runs as svc_DataSync regardless of caller
END
```

The named user must exist in the database, and the procedure creator must have `IMPERSONATE` permission on that user.

---

## Best Practices

1. **Prefer `EXECUTE AS OWNER`** over `EXECUTE AS 'username'` when possible — it avoids hard-coded user dependencies.
2. **Never use `EXECUTE AS` as a substitute for proper schema design** — use it to enforce a clean API layer.
3. **Audit sensitive procedures** — use `ORIGINAL_LOGIN()` inside the procedure to log the real caller even when running as OWNER.
4. **Minimize the scope** — if only one statement needs elevated access, consider a separate helper procedure with `EXECUTE AS OWNER` rather than elevating the entire caller flow.

```sql
-- Log the real caller even under EXECUTE AS OWNER
INSERT INTO dbo.AccessLog (CalledBy, ProcedureName, AccessedAt)
VALUES (ORIGINAL_LOGIN(), 'usp_GetSensitiveData', GETUTCDATE());
```
