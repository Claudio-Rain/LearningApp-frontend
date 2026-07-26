# L1 How do you validate an email address, and what edge cases must you account for?

## What makes a valid email address?

An email address has the form `local-part@domain`. The rules come from RFC 5321 and RFC 5322 and are surprisingly complex:

- The **local part** can contain letters, digits, and special characters: `!#$%&'*+/=?^_`{|}~.-`. Periods are allowed but not at the start or end, and not consecutively (`a..b@x.com` is invalid).
- The **domain** must contain at least one dot, each label must be 1–63 characters, the total domain length must be ≤ 253 characters, and labels may only contain letters, digits, and hyphens (not at start or end).
- The **total length** of a valid address is ≤ 254 characters (RFC 5321).
- **Quoted local parts** are technically valid: `"john doe"@example.com`.
- **IP address domains** are valid: `user@[192.168.1.1]`.
- **Internationalised addresses** (IDN / Unicode) exist but require special handling.

---

## Practical validation strategies

### 1. Use a well-tested regex (good enough for most apps)

A perfect regex for RFC 5322 is enormous. The following pattern covers the vast majority of real-world addresses:

```csharp
using System.Text.RegularExpressions;

public static bool IsValidEmail(string email)
{
    if (string.IsNullOrWhiteSpace(email)) return false;
    if (email.Length > 254) return false;

    // Covers standard addresses; excludes quoted local parts and IP domains
    var regex = new Regex(
        @"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9]" +
        @"(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9]" +
        @"(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    return regex.IsMatch(email);
}
```

### 2. Use `System.Net.Mail.MailAddress` (built-in .NET)

.NET's `MailAddress` class performs structural parsing. It is not a complete RFC validator but it catches many common errors and is simpler than writing your own regex.

```csharp
using System.Net.Mail;

public static bool IsValidEmail(string email)
{
    if (string.IsNullOrWhiteSpace(email)) return false;

    try
    {
        var addr = new MailAddress(email);
        // MailAddress accepts "Display Name <email>" — verify only the address part
        return addr.Address == email.Trim();
    }
    catch (FormatException)
    {
        return false;
    }
}
```

### 3. Use a library for thorough validation

**EmailValidation** (NuGet) or **MimeKit** provide more rigorous parsing:

```csharp
// EmailValidation NuGet package
using EmailValidation;

bool valid = EmailValidator.Validate("user@example.com", allowTopLevelDomains: false);
```

### 4. DNS / MX record verification (server-side)

Structural validation cannot confirm the address actually exists. For sign-up flows you can:
- Check that the domain has an MX record (proves the domain can receive email).
- Send a confirmation email and require the user to click a link.

```csharp
using System.Net;

public static async Task<bool> DomainHasMxRecordAsync(string domain)
{
    try
    {
        var addresses = await Dns.GetHostAddressesAsync(domain);
        return addresses.Length > 0;
    }
    catch
    {
        return false; // Domain does not resolve
    }
}
```

---

## Edge cases to account for

| Edge case | Example | Handled by |
|---|---|---|
| Null or empty | `""` | Null/whitespace check |
| Too long (> 254 chars) | `aaa...@example.com` | Length check |
| Missing @ sign | `userexample.com` | Regex / MailAddress |
| Multiple @ signs | `a@b@c.com` | Regex / MailAddress |
| Leading/trailing dots in local part | `.user@x.com` | Regex |
| Consecutive dots | `user..name@x.com` | Regex |
| No TLD | `user@localhost` | Regex (if TLD required) |
| IP address domain | `user@[192.168.0.1]` | May need explicit support |
| Quoted local part | `"user name"@x.com` | MailAddress handles this |
| Internationalised (IDN) | `用户@例子.广告` | Requires IDN library |
| Subaddressing (plus addressing) | `user+tag@gmail.com` | Should be allowed |
| Whitespace around address | ` user@x.com ` | Trim before validating |
| Disposable / throwaway domains | `user@mailinator.com` | Block-list check |

---

## Data Annotation in ASP.NET Core

```csharp
public class RegisterRequest
{
    [Required]
    [EmailAddress]          // Uses MailAddress internally
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;
}
```

The built-in `[EmailAddress]` attribute is permissive — it accepts `a@b` (no TLD). Pair it with a custom attribute or FluentValidation rule when you need stricter checks.

---

## Recommended approach

1. **Trim** whitespace.
2. **Length check** (≤ 254 characters).
3. **Structural validation** with `MailAddress` or a well-tested regex.
4. **MX record check** (optional, server-side only).
5. **Confirmation email** for definitive verification.
