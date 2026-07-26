# L1 Why is it important to validate user inputs, and what risks does skipping validation introduce?

## Why validation matters

User input is the primary attack surface of any application. You can never assume that data arriving from a form, an API request, a file upload, or any external source is safe, well-formed, or honest. Validation acts as a gatekeeper that enforces your system's invariants before data can do harm.

Key reasons to validate:

- **Data integrity** — Garbage data stored in your database leads to incorrect calculations, broken reports, and hard-to-trace bugs.
- **Security** — Malicious inputs can be weaponised to attack your system or its users.
- **User experience** — Immediate, clear validation feedback helps users correct mistakes early instead of discovering them after a failed transaction.
- **Downstream safety** — Services, libraries, and databases that consume your data have their own constraints; feeding them invalid data causes unpredictable failures.

---

## Risks of skipping validation

### 1. Injection attacks
Unvalidated string input passed to a SQL query, shell command, or template engine allows an attacker to inject arbitrary commands.

- **SQL injection** — An attacker can read, modify, or delete database data.
- **Command injection** — Shell commands can be executed on the server.
- **XSS (Cross-Site Scripting)** — Malicious scripts injected into HTML pages can steal session tokens or redirect users.

### 2. Data corruption
Accepting out-of-range or wrongly typed values silently corrupts the database. A negative stock quantity or a date of birth set to the year 9999 will break business logic for the lifetime of that record.

### 3. Application crashes and unhandled exceptions
Passing a null where a non-null is expected, or a string where a number is required, causes runtime exceptions. Without validation these bubble up as 500 errors or, worse, silent data loss.

### 4. Business rule violations
Without validation, users can submit data that bypasses business constraints — for example, applying a discount that exceeds 100%, booking a room for dates that have already passed, or creating a user account with a duplicate email.

### 5. Denial of Service (DoS)
Accepting arbitrarily large files, strings, or collections without length limits can exhaust server memory or disk space, making the service unavailable.

### 6. Broken trust and compliance failures
Applications that handle personal or financial data (GDPR, PCI-DSS, HIPAA) are legally required to protect data integrity. Skipping validation can lead to regulatory fines and loss of customer trust.

---

## Defence-in-depth principle

Validation should happen at multiple layers:

| Layer | Example |
|---|---|
| Client (UI) | HTML `required`, `maxlength`, JavaScript checks |
| API / Controller | Model binding validation, data annotations |
| Service / Domain | Business rule checks, guard clauses |
| Database | NOT NULL constraints, CHECK constraints, foreign keys |

Client-side validation improves UX but **must never be trusted** for security — it can be bypassed with browser DevTools or raw HTTP requests.

---

Include short code examples in C#.

```csharp
// Without validation — dangerous
public void CreateUser(string email, string password)
{
    // Attacker can pass email = "' OR 1=1--" or an empty string
    _db.Execute($"INSERT INTO Users (Email, Password) VALUES ('{email}', '{password}')");
}

// With validation — safe
public void CreateUser(string email, string password)
{
    if (string.IsNullOrWhiteSpace(email))
        throw new ArgumentException("Email is required.", nameof(email));

    if (!IsValidEmail(email))
        throw new ArgumentException("Email format is invalid.", nameof(email));

    if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
        throw new ArgumentException("Password must be at least 8 characters.", nameof(password));

    // Use parameterised query — never string interpolation
    _db.Execute("INSERT INTO Users (Email, Password) VALUES (@Email, @Password)",
        new { Email = email, Password = HashPassword(password) });
}
```

```csharp
// ASP.NET Core — Data Annotations enforce validation automatically
public class RegisterRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;
}

// Controller rejects invalid models before the action body runs
[HttpPost]
public IActionResult Register([FromBody] RegisterRequest request)
{
    if (!ModelState.IsValid)
        return BadRequest(ModelState);

    _userService.CreateUser(request.Email, request.Password);
    return Ok();
}
```
