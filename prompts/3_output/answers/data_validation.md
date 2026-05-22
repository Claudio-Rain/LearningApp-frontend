# Interview Answers: Data Validation

---

## Level 1 — Definition & Basics

**Q: L1 Define data validation and distinguish it from sanitization.**

> Validation asks "is this input acceptable?" — sanitization asks "how do I make this input safe to use?"

Validation is a gate: you check whether the data meets your rules and reject it if it doesn't. Sanitization transforms data — stripping HTML tags, escaping quotes — so it can't cause harm even if it slips through. They solve different problems: validation protects business rules, sanitization protects execution contexts like databases and browsers. You almost always need both.

```csharp
public class ValidationAndSanitization
{
    // Validation: checks if data is acceptable
    public bool IsValidEmail(string email) => 
        !string.IsNullOrWhiteSpace(email) && email.Contains("@");

    // Sanitization: makes data safe to use
    public string SanitizeHtml(string input) =>
        System.Web.HttpUtility.HtmlEncode(input ?? "");

    public void Example()
    {
        string userInput = "<script>alert('xss')</script>";
        
        if (IsValidEmail(userInput))  // Fails validation
        {
            // Won't reach here
        }
        
        string safeSql = SanitizeHtml(userInput);  // Output: &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;
    }
}
```

---

**Q: L1 What are the most common validation categories and examples?**

> Presence (required?), Type (integer?), Format (pattern match?), Range (0-120?), Uniqueness (no duplicates?), Business-rule (end > start?).

Each catches a different failure mode. Miss one and you have production bugs.

```csharp
public class ValidationCategories
{
    public class User
    {
        public string Name { get; set; }
        public int Age { get; set; }
        public string Email { get; set; }
    }

    public List<string> ValidateUser(User user)
    {
        var errors = new List<string>();

        // Presence: required field
        if (string.IsNullOrWhiteSpace(user.Name))
            errors.Add("Name is required");

        // Type & Range: age should be 0-150
        if (user.Age < 0 || user.Age > 150)
            errors.Add("Age must be between 0 and 150");

        // Format: email pattern
        if (!user.Email?.Contains("@") ?? true)
            errors.Add("Email must be valid");

        // Uniqueness: check against database
        if (EmailExists(user.Email))
            errors.Add("Email already registered");

        return errors;
    }

    private bool EmailExists(string email) => false; // Database lookup
}
```

---

**Q: L1 Why validate input? What happens if you skip it?**

> Unvalidated input is the root cause of most injection attacks and data-integrity disasters.

Skipping validation opens you to SQL injection, XSS, and command injection. Worse, you end up with garbage in your database — negative inventory, orders with no customer, corrupt financial records — which is often harder to fix than a security breach. Validating early costs almost nothing compared to cleaning up corrupted production data.

```csharp
public class InputValidationExample
{
    // BAD: No validation — vulnerable to injection and bad data
    public void BadCreateOrder(string quantity, string customerId)
    {
        int qty = int.Parse(quantity);  // Crashes on non-numeric input
        var order = new Order { Quantity = qty, CustomerId = customerId };
        _db.Orders.Add(order);
        _db.SaveChanges();  // Stores negative quantities, null customers
    }

    // GOOD: Validate before processing
    public Result GoodCreateOrder(string quantity, string customerId)
    {
        if (!int.TryParse(quantity, out int qty))
            return Result.Fail("Quantity must be a number");
        
        if (qty <= 0)
            return Result.Fail("Quantity must be positive");
        
        if (string.IsNullOrWhiteSpace(customerId))
            return Result.Fail("Customer ID is required");

        var customer = _db.Customers.Find(customerId);
        if (customer == null)
            return Result.Fail("Customer not found");

        var order = new Order { Quantity = qty, CustomerId = customerId };
        _db.Orders.Add(order);
        _db.SaveChanges();
        return Result.Ok();
    }

    public class Order { public int Quantity { get; set; } public string CustomerId { get; set; } }
    public class Result { public bool Success { get; set; } public string Message { get; set; } public static Result Ok() => new() { Success = true }; public static Result Fail(string msg) => new() { Success = false, Message = msg }; }
}
```

---

**Q: L1 Where should validation occur in the application stack?**

> Validate at every boundary — frontend for UX, backend for correctness, database for last-resort integrity.

Frontend validation gives instant feedback but can be bypassed with curl or dev tools. Backend validation is authoritative and can't be skipped. Database constraints catch bugs in application code but produce cryptic errors. Defense in depth means trusting none of them individually.

```csharp
public class ValidationLayersExample
{
    // Database layer: Enforce constraints as last resort
    // CREATE TABLE Users (
    //     Id INT PRIMARY KEY,
    //     Email NVARCHAR(255) NOT NULL UNIQUE,
    //     Age INT CHECK (Age >= 0 AND Age <= 150)
    // );

    // API/Backend layer: Authoritative validation
    [HttpPost("users")]
    public IActionResult CreateUser([FromBody] CreateUserRequest request)
    {
        // Business validation
        var errors = ValidateUser(request);
        if (errors.Any())
            return BadRequest(new { errors });

        var user = new User { Email = request.Email, Age = request.Age };
        _db.Users.Add(user);
        _db.SaveChanges();
        return Ok(user);
    }

    private List<string> ValidateUser(CreateUserRequest req)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(req.Email)) errors.Add("Email required");
        if (req.Age < 0 || req.Age > 150) errors.Add("Age must be 0-150");
        if (_db.Users.Any(u => u.Email == req.Email)) errors.Add("Email taken");
        return errors;
    }

    public class CreateUserRequest { public string Email { get; set; } public int Age { get; set; } }
    public class User { public string Email { get; set; } public int Age { get; set; } }
}
```

---

**Q: L1 What is lenient validation?**

>  Lenient means flexible — you accept "Jan 5", "01/05", "2025-01-05", and "5 January" as valid dates instead of rejecting all but one format. 

It prioritizes user experience over strict rules. The opposite, strict validation, rejects anything that doesn't match exactly — only "2025-01-05" passes. Lenient is better for UI input (users type in many ways), strict is better for data storage (one canonical format prevents bugs).

```csharp
// Lenient: accepts many formats
public bool IsValidDateLenient(string input)
{
    // Accepts "Jan 5", "1/5/25", "01/05/2025", etc.
    return DateTime.TryParse(input, out _);  // TryParse is very forgiving
}

// Strict: accepts only one format
public bool IsValidDateStrict(string input)
{
    // Accepts ONLY "yyyy-MM-dd"
    return DateTime.TryParseExact(input, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
}

// Usage
string userInput = "Jan 5, 2025";
if (IsValidDateLenient(userInput))  // TRUE — good for UI
    Console.WriteLine("User sees: accepted!");

if (IsValidDateStrict(userInput))   // FALSE — good for API
    Console.WriteLine("This won't print");
```

---

**Q: L1 Strict vs. lenient validation — which do you prefer?**

> Strict at system boundaries (APIs, persistence), lenient only in the UI layer for UX.

Strict means no silent data corruption from ambiguity. Lenient at the API level shifts complexity to developers and hides bugs. But in the UI, accept "Jan 5" and "01/05", normalize before sending to the backend. Rule: be liberal in display, strict in persistence.

```csharp
public class StrictVsLenientExample
{
    // Lenient in UI: accept multiple formats
    public string ParseDateForDisplay(string input)
    {
        // Accept "Jan 5", "01/05", "2025-01-05", "1/5/25"
        if (DateTime.TryParse(input, out var date))
            return date.ToString("MMMM d, yyyy");
        return "Invalid date";
    }

    // Strict at API boundary: only ISO 8601
    [HttpPost("events")]
    public IActionResult CreateEvent([FromBody] CreateEventRequest req)
    {
        if (!DateTime.TryParseExact(req.Date, "yyyy-MM-dd", 
            CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            return BadRequest("Date must be ISO 8601 format (yyyy-MM-dd)");

        if (date < DateTime.UtcNow.Date)
            return BadRequest("Event date cannot be in the past");

        var @event = new Event { Date = date };
        _db.Events.Add(@event);
        _db.SaveChanges();
        return Ok();
    }

    public class CreateEventRequest { public string Date { get; set; } }
    public class Event { public DateTime Date { get; set; } }
}
```

---

## Level 2 — Core Concepts

**Q: L2 Client-side vs. server-side validation — why is client-side alone insufficient?**

> Client-side validation is a UX courtesy; server-side validation is the actual security control.

Client-side validation runs in the browser, which the user fully controls — they can disable JavaScript, use a proxy, or call your API directly. Server-side validation runs in an environment you control and can't be bypassed.

```csharp
public class ClientServerValidationExample
{
    // Client-side validation: UX feedback only (JavaScript in browser)
    // Can be bypassed: curl -X POST https://api.example.com/register -d "age=-50"

    // Server-side validation: ACTUAL security control
    [HttpPost("register")]
    public IActionResult Register([FromBody] RegisterRequest req)
    {
        // Never trust client-side validation
        if (string.IsNullOrWhiteSpace(req.Email))
            return BadRequest("Email required");
        
        if (req.Age < 18)
            return BadRequest("Must be 18 or older");
        
        if (_db.Users.Any(u => u.Email == req.Email))
            return BadRequest("Email already registered");

        var user = new User { Email = req.Email, Age = req.Age };
        _db.Users.Add(user);
        _db.SaveChanges();
        return Ok();
    }

    public class RegisterRequest { public string Email { get; set; } public int Age { get; set; } }
}
```

---

**Q: L2 What vulnerabilities arise from relying only on HTML5 validation attributes?**

> Any attacker who sends a raw HTTP request bypasses HTML5 constraints completely.

HTML5 attributes are enforced by the browser, not the server. A single `curl -d "email=notanemail"` call ignores them entirely. This means you're open to SQL injection, stored XSS, and business-logic abuse — submitting negative quantities, injecting script tags into a comment field, registering with someone else's email. Relying on client-side attributes alone is essentially having no server-side validation at all.

```csharp
public class HtmlValidationBypassExample
{
    // HTML5 form (browser enforces max="100")
    // <input type="number" name="quantity" max="100" />

    // Attacker bypasses browser with curl:
    // curl -X POST https://api.example.com/order -d "quantity=999999"

    [HttpPost("order")]
    public IActionResult CreateOrder([FromBody] OrderRequest req)
    {
        // MUST validate server-side, never trust HTML5 attributes
        if (req.Quantity < 1 || req.Quantity > 100)
            return BadRequest("Quantity must be 1-100");

        if (string.IsNullOrWhiteSpace(req.Comments))
            return BadRequest("Comments required");

        // Prevent XSS: don't store raw HTML
        var sanitized = System.Web.HttpUtility.HtmlEncode(req.Comments);
        
        var order = new Order { Quantity = req.Quantity, Comments = sanitized };
        _db.Orders.Add(order);
        _db.SaveChanges();
        return Ok();
    }

    public class OrderRequest { public int Quantity { get; set; } public string Comments { get; set; } }
}
```

---

**Q: L2 How do you validate an email address? Which RFC rules do you actually need?**

> Full RFC compliance is impractical — use a simple regex (non-empty local, @, domain with dot) plus MX lookup for critical flows.

RFC 5321 allows quoted strings and IP literals that real mail servers don't use. Your regex can ignore those edge cases. For registration, add an MX check. The only true test is a confirmation email.

```csharp
using System.Text.RegularExpressions;

public class EmailValidatorExample
{
    // Practical email regex (90% of valid emails, 0% false positives)
    private static readonly Regex EmailRegex = new(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$");

    public bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;
        
        email = email.Trim();
        return EmailRegex.IsMatch(email);
    }

    // For critical flows: check MX record exists
    public async Task<bool> HasValidMxRecord(string email)
    {
        var domain = email.Split('@')[1];
        try
        {
            // Use MXLookup library in production
            // var mxRecords = await MXLookup.FindMxRecordsAsync(domain);
            // return mxRecords.Any();
            return true; // Placeholder
        }
        catch
        {
            return false;
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> RegisterUser([FromBody] RegisterRequest req)
    {
        if (!IsValidEmail(req.Email))
            return BadRequest("Invalid email format");

        if (!await HasValidMxRecord(req.Email))
            return BadRequest("Email domain is not valid");

        // Send confirmation email
        await SendConfirmationEmail(req.Email);
        return Ok("Check your email");
    }

    private Task SendConfirmationEmail(string email) => Task.CompletedTask;
    public class RegisterRequest { public string Email { get; set; } }
}
```

---

**Q: L2 What issues does this regex have for production email validation?**

> It rejects quoted local parts, IP-literal domains, and non-ASCII characters — edge cases that affect ~0.1% of users.

For 99.9% of legitimate addresses it works fine. The risk is alienating users who can't register (e.g., someone with a Punycode domain) and fielding support tickets. If your user base is primarily US/EU with ASCII emails, this is acceptable. For international products, add a secondary validation path for non-ASCII characters.

---

**Q: L2 What are guard clauses? How do they differ from service-layer validation?**

> A guard clause is a fast-fail check at the top of a method that enforces preconditions on arguments, separate from business-rule validation in a service layer.

Guard clauses protect a method from being called incorrectly — they check for nulls, wrong types, or obviously illegal values and throw immediately. Service-layer validation enforces business rules like "this user has permission" or "this amount doesn't exceed the account balance." Mixing them conflates contract enforcement with business logic.

```typescript
function processPayment(userId: number, amount: Decimal, currencyCode: string): void {
  // Guard clauses — argument contract
  if (!Number.isInteger(userId) || userId <= 0) throw new ArgumentError("userId must be a positive integer");
  if (amount == null || amount.lessThanOrEqualTo(0)) throw new ArgumentError("amount must be positive");
  if (!currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) throw new ArgumentError("currencyCode must be an ISO 4217 code");

  // Business logic follows
  const account = accountRepo.find(userId);
  if (account.balance.lessThan(amount)) throw new InsufficientFundsError();
  // ...
}
```

```csharp
public class PaymentService
{
    public void ProcessPayment(int userId, decimal amount, string currencyCode)
    {
        // Guard clauses — argument contract
        if (userId <= 0)
            throw new ArgumentException("userId must be a positive integer");
        if (amount <= 0)
            throw new ArgumentException("amount must be positive");
        if (string.IsNullOrEmpty(currencyCode) || !Regex.IsMatch(currencyCode, @"^[A-Z]{3}$"))
            throw new ArgumentException("currencyCode must be an ISO 4217 code");

        // Business logic follows
        var account = _accountRepo.Find(userId);
        if (account.Balance < amount)
            throw new InsufficientFundsException();
    }
}
```

---

**Q: L2 How should library methods handle validation failures?**

> Throw typed exceptions for argument violations (null userId, malformed input); return a result object for business-rule failures.

Exceptions signal programming errors that callers should fix. Result objects let callers handle field-level errors gracefully. Document the contract clearly so consumers know which failure mode they're handling.

---

**Q: L2 A teammate says "just sanitize inputs; validation isn't needed." Your response?**

> Sanitization and validation solve different problems and can't substitute for each other.

Sanitization makes data safe to process but doesn't enforce correctness. A sanitized random string will pass as a credit card until the first charge fails. Conversely, validation without sanitization passes malicious payloads. Use both: validation enforces correctness, sanitization neutralizes dangerous content.

---

## Level 3 — Practical Usage

**Q: L3 How do you validate international phone numbers? Why is regex inadequate?**

> Use Google's `libphonenumber` — phone number rules are country-specific and change over time, making regex-based validation a maintenance nightmare.

The regex `^\+?[0-9]{7,15}$` accepts numbers that are structurally plausible but invalid in every real country — a 15-digit number starting with +1 is impossible since NANP numbers are exactly 11 digits in E.164. Country dial plans have varying lengths, area code rules, and reserved prefixes that no static regex can encode. `libphonenumber` encodes the actual ITU-T metadata and is updated when countries change their numbering plans. The overhead is worth it for any user-facing phone field.

```csharp
using PhoneNumbers;

public class PhoneValidator
{
    private readonly PhoneNumberUtil _phoneUtil = PhoneNumberUtil.GetInstance();

    public bool IsValidPhone(string phoneNumber, string countryCode)
    {
        try
        {
            var number = _phoneUtil.Parse(phoneNumber, countryCode);
            return _phoneUtil.IsValidNumber(number);
        }
        catch
        {
            return false;
        }
    }

    public string NormalizeToE164(string phoneNumber, string countryCode)
    {
        try
        {
            var number = _phoneUtil.Parse(phoneNumber, countryCode);
            return _phoneUtil.Format(number, PhoneNumberFormat.E164);
        }
        catch
        {
            return null;
        }
    }

    [HttpPost("users")]
    public IActionResult CreateUser([FromBody] CreateUserRequest req)
    {
        if (!IsValidPhone(req.Phone, req.CountryCode))
            return BadRequest("Invalid phone number");

        var normalized = NormalizeToE164(req.Phone, req.CountryCode);
        var user = new User { Phone = normalized, Country = req.CountryCode };
        _db.Users.Add(user);
        _db.SaveChanges();
        return Ok();
    }

    public class CreateUserRequest { public string Phone { get; set; } public string CountryCode { get; set; } }
}
```

---

**Q: L3 Normalize `"(800) 555-0199"` to E.164 format. Walk through the steps.**

> Strip formatting, infer country code from context, parse with libphonenumber, then format as E.164.

Strip non-digits → `8005550199`. Infer country code (stored locale, GeoIP, or UI selector). Pass `("8005550199", "US")` to `libphonenumber.parse()`, call `isValidNumber()` to confirm it's real, and `format(E164)` → `+18005550199`. Common pitfalls: missing country context, or the number is valid format but unassigned (e.g., 555 numbers).

---

**Q: L3 What's the core challenge validating ambiguous dates like `"02/03/2025"`?**

> `02/03` is Feb 3 in the US, March 2 in Europe — you can't know which without user context.

Never accept ambiguous dates without a declared locale. Require ISO 8601 from APIs or use a date picker in the UI. If you parse free text, validate leap years correctly — `02/29/2025` is invalid.

```csharp
using System.Globalization;

public class DateValidationExample
{
    [HttpPost("bookings")]
    public IActionResult CreateBooking([FromBody] BookingRequest req)
    {
        // GOOD: ISO 8601 from API (no ambiguity)
        if (!DateTime.TryParseExact(req.Date, "yyyy-MM-dd",
            CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            return BadRequest("Date must be yyyy-MM-dd format");

        // Validate it's not in the past
        if (date.Date < DateTime.UtcNow.Date)
            return BadRequest("Booking date cannot be in the past");

        // Check leap year automatically via DateTime
        if (date.Month == 2 && date.Day == 29)
        {
            if (!DateTime.IsLeapYear(date.Year))
                return BadRequest("Invalid date: not a leap year");
        }

        var booking = new Booking { Date = date };
        _db.Bookings.Add(booking);
        _db.SaveChanges();
        return Ok();
    }

    // For display: format based on user's locale
    public string FormatDateForUser(DateTime date, string userLocale)
    {
        var culture = new CultureInfo(userLocale);
        return date.ToString("d", culture); // Respects user's date format
    }

    public class BookingRequest { public string Date { get; set; } }
}
```

---

**Q: L3 How do you share booking-date validation logic between React and Node.js?**

> Create a shared TypeScript module in a monorepo (`packages/validation`) that both frontend and backend import.

One gotcha: "not in the past" must be rechecked server-side with the server's clock — client clocks are unreliable. Frontend checks are UX feedback only.

---

**Q: L3 How does FQDN validation differ between DNS records and browser URLs?**

> FQDN rules (each label 1–63 chars, no leading hyphens) differ from URL rules (must handle schemes, ports, paths, IDN).

For DNS records, enforce FQDN rules strictly. For browser URLs, use a URL parser (WHATWG URL API) instead of regex.

```csharp
using System.Text.RegularExpressions;

public class DomainValidatorExample
{
    // FQDN validation: strict DNS rules
    public bool IsValidFqdn(string fqdn)
    {
        if (string.IsNullOrWhiteSpace(fqdn) || fqdn.Length > 253)
            return false;

        // Each label 1-63 chars, no leading/trailing hyphens
        var labels = fqdn.Split('.');
        return labels.Length >= 2 && labels.All(label =>
            label.Length > 0 && label.Length <= 63 &&
            !label.StartsWith("-") && !label.EndsWith("-") &&
            Regex.IsMatch(label, @"^[a-zA-Z0-9-]+$"));
    }

    // URL validation: use Uri class for full parsing
    public bool IsValidUrl(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var uri) &&
               (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    [HttpPost("domains")]
    public IActionResult RegisterDomain([FromBody] DomainRequest req)
    {
        if (!IsValidFqdn(req.Domain))
            return BadRequest("Invalid domain name");

        var domain = new Domain { Name = req.Domain };
        _db.Domains.Add(domain);
        _db.SaveChanges();
        return Ok();
    }

    [HttpPost("webhooks")]
    public IActionResult CreateWebhook([FromBody] WebhookRequest req)
    {
        if (!IsValidUrl(req.Url))
            return BadRequest("Invalid webhook URL");

        var webhook = new Webhook { Url = req.Url };
        _db.Webhooks.Add(webhook);
        _db.SaveChanges();
        return Ok();
    }

    public class DomainRequest { public string Domain { get; set; } }
    public class WebhookRequest { public string Url { get; set; } }
}
```

---

**Q: L3 Why is the IPv4 regex `\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}` insufficient?**

> The regex matches structurally but accepts octets like `999`, so you must also verify each octet is 0–255 after splitting.

For IPv4, parse the four segments and check each is an integer between 0 and 255 — the regex alone passes `999.999.999.999`. For IPv6, regex becomes impractical because of the `::` zero-compression notation, mixed IPv4-mapped addresses (`::ffff:192.0.2.1`), and zone IDs. The right approach is to use the platform's built-in address parser — `inet_pton` in C, `ipaddress` module in Python, or `net.parseIP` in Go — and let it fail on invalid input rather than reimplementing the spec in regex.

```csharp
using System.Net;
using System.Net.Sockets;

public class IpValidator
{
    public bool IsValidIpAddress(string input)
    {
        return IPAddress.TryParse(input, out _);
    }

    public bool IsValidIPv4(string input)
    {
        if (!IPAddress.TryParse(input, out var address))
            return false;
        return address.AddressFamily == AddressFamily.InterNetwork;
    }

    public bool IsValidIPv6(string input)
    {
        if (!IPAddress.TryParse(input, out var address))
            return false;
        return address.AddressFamily == AddressFamily.InterNetworkV6;
    }

    [HttpPost("whitelist")]
    public IActionResult AddIpWhitelist([FromBody] IpWhitelistRequest req)
    {
        if (!IsValidIpAddress(req.IpAddress))
            return BadRequest("Invalid IP address");

        var rule = new IpRule { IpAddress = req.IpAddress, Version = DetermineVersion(req.IpAddress) };
        _db.IpRules.Add(rule);
        _db.SaveChanges();
        return Ok();
    }

    private string DetermineVersion(string ip)
    {
        return IsValidIPv4(ip) ? "IPv4" : "IPv6";
    }

    public class IpWhitelistRequest { public string IpAddress { get; set; } }
}
```

---

**Q: L3 Is `"2001:db8::1"` valid? What IPv6 edge cases exist?**

> Yes, it's valid — `::` is legal zero compression, and `2001:db8::/32` is a documented example range.

IPv6 edge cases that IPv4 doesn't have: `::` can appear at most once and expands to fill the remaining groups with zeros; the total must expand to exactly 8 groups of 16 bits. IPv4-mapped addresses like `::ffff:192.168.1.1` are syntactically valid IPv6. Zone IDs (`fe80::1%eth0`) are valid in some contexts but invalid in others — e.g., you can't use them in a URL without percent-encoding. Link-local addresses (`fe80::/10`) and loopback (`::1`) may need special handling depending on your use case.

---

**Q: L3 How do you validate IBAN (International Bank Account Number)?**

> Validate structure: 2-letter country code, 2 check digits, then country-specific BBAN. Use a library or lookup table for country-specific lengths.

An IBAN has a fixed length per country (15–34 characters total). The simplest approach: regex to reject obviously wrong formats, then use a library like `iban-js` to verify the checksum. Don't implement MOD-97 arithmetic yourself — the libraries are battle-tested and handle country rules correctly. For production payment systems, validate format then confirm the account exists with your payment processor before attempting a transfer.

```csharp
using System.Text.RegularExpressions;

public class IbanValidator
{
    // Quick structural check
    public bool IsValidIbanFormat(string iban)
    {
        if (string.IsNullOrWhiteSpace(iban)) return false;
        iban = iban.Replace(" ", "").ToUpper();
        
        // 2 letters, 2 digits, then 1-30 alphanumeric
        return Regex.IsMatch(iban, @"^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$");
    }

    [HttpPost("transfers")]
    public async Task<IActionResult> CreateTransfer([FromBody] TransferRequest req)
    {
        if (!IsValidIbanFormat(req.ToAccount))
            return BadRequest("Invalid IBAN format");

        // In production: use a real IBAN validation library (IBAN4j, etc.)
        // var validator = new IbanValidator();
        // if (!validator.Validate(req.ToAccount))
        //     return BadRequest("Invalid IBAN checksum");

        // Confirm account exists with payment processor
        var accountExists = await VerifyAccountWithBank(req.ToAccount);
        if (!accountExists)
            return BadRequest("Account not found");

        var transfer = new Transfer { ToAccount = req.ToAccount, Amount = req.Amount };
        _db.Transfers.Add(transfer);
        _db.SaveChanges();
        return Ok();
    }

    private Task<bool> VerifyAccountWithBank(string iban) => Task.FromResult(true);
    public class TransferRequest { public string ToAccount { get; set; } public decimal Amount { get; set; } }
}
```

---

**Q: L3 How do you validate locale-aware currency amounts?**

> Parse with locale awareness (US: 1,234.56; Germany: 1.234,56), then store as integers in the smallest currency unit, never as floats.

You must know the user's locale before parsing — `1.234` means different things in different regions. Use `Intl.NumberFormat` for display and `dinero.js` or `decimal.js` for parsing. Store as integers (cents, pence) to avoid floating-point rounding errors that accumulate in financial systems.

---

**Q: L3 Why is floating-point arithmetic dangerous for currency?**

> Floating-point can't represent most decimal fractions exactly, so rounding errors accumulate and you get incorrect financial totals.

`0.1 + 0.2 === 0.30000000000000004` in JavaScript — that error is tiny but unacceptable in finance. The standard solution is to convert amounts to integers in the smallest unit (cents, pence, etc.) immediately after parsing, do all arithmetic in integers, and only convert back to a formatted decimal string for display. Alternatively, use a `Decimal` type from a library like `decimal.js` or Java's `BigDecimal` that performs arbitrary-precision arithmetic.

```csharp
using System.Globalization;

public class CurrencyValidator
{
    // CORRECT: Use decimal type, not float/double
    public decimal CalculateTotal(List<decimal> amounts)
    {
        return amounts.Aggregate(decimal.Zero, (sum, amt) => sum + amt);
    }

    // Parse currency respecting locale
    public bool TryParseCurrency(string input, string locale, out long centAmount)
    {
        centAmount = 0;
        var culture = new CultureInfo(locale);
        
        if (!decimal.TryParse(input, NumberStyles.Currency, culture, out decimal amount))
            return false;
        
        // Convert to cents (smallest unit) — now only integers
        centAmount = (long)(amount * 100);
        return true;
    }

    public string FormatCurrency(long centAmount, string locale)
    {
        var culture = new CultureInfo(locale);
        decimal amount = centAmount / 100m;  // Convert back from cents
        return amount.ToString("C", culture);
    }

    [HttpPost("payments")]
    public IActionResult CreatePayment([FromBody] PaymentRequest req)
    {
        if (!TryParseCurrency(req.Amount, req.Locale, out long centAmount))
            return BadRequest("Invalid currency amount");

        if (centAmount <= 0)
            return BadRequest("Amount must be positive");

        // Store only integers
        var payment = new Payment { AmountInCents = centAmount, Currency = req.Currency };
        _db.Payments.Add(payment);
        _db.SaveChanges();
        return Ok();
    }

    public class PaymentRequest { public string Amount { get; set; } public string Locale { get; set; } public string Currency { get; set; } }
}
```

---

## Level 4 — Common Pitfalls

**Q: L4 How does Luhn work? Why isn't it enough for credit card validation?**

> Luhn catches transcription errors but passes ~10% of random 16-digit strings — it's not a security check.

After Luhn, you still need: BIN lookup (real issuer?), network check (Visa starts with 4), correct length, and an authorization call to the bank.

```csharp
public class CreditCardValidator
{
    public bool IsValidLuhn(string cardNumber)
    {
        cardNumber = cardNumber.Replace(" ", "").Replace("-", "");
        if (!long.TryParse(cardNumber, out _)) return false;

        int sum = 0, isSecond = false;
        for (int i = cardNumber.Length - 1; i >= 0; i--)
        {
            int digit = cardNumber[i] - '0';
            if (isSecond)
            {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            isSecond = !isSecond;
        }
        return sum % 10 == 0;  // Luhn check: sum divisible by 10
    }

    public bool IsValidCard(string cardNumber)
    {
        cardNumber = cardNumber.Replace(" ", "").Replace("-", "");
        
        // Luhn is insufficient — need multiple checks
        if (!IsValidLuhn(cardNumber))
            return false;
        
        if (!IsValidLength(cardNumber))
            return false;
        
        if (!IsValidNetwork(cardNumber))
            return false;

        return true;
    }

    private bool IsValidNetwork(string cardNumber) =>
        cardNumber[0] switch
        {
            '4' => true,  // Visa
            '5' => true,  // Mastercard
            '3' => true,  // AmEx/Discover
            _ => false
        };

    private bool IsValidLength(string cardNumber) =>
        cardNumber.Length switch { 13 or 15 or 16 => true, _ => false };

    // Real validation: API call to payment processor
    public async Task<bool> IsValidCardWithProcessor(string cardNumber)
    {
        // Local checks first
        if (!IsValidCard(cardNumber))
            return false;

        // Then ask the payment processor
        try
        {
            var token = await _stripeClient.ValidateCard(cardNumber);
            return !string.IsNullOrEmpty(token);
        }
        catch
        {
            return false;
        }
    }
}
```

---

**Q: L4 Why does the validator accept `"4111 1111 1111 1111"` but reject `"4111111111111111"`?**

> The validator is not stripping spaces before running the Luhn check or length validation.

The fix is a single normalization step at the top: `cardNumber = input.replace(/\s+/g, "")`. The validator should never assume input format — users copy from physical cards, from emails, from autofill, and each source may include spaces, dashes, or nothing. Normalize first, validate second. This is a classic example of missing input normalization before applying rules.

```csharp
public class CreditCardNormalizationExample
{
    // BAD: Forgets to normalize
    public bool IsValidCardBad(string cardNumber)
    {
        if (cardNumber.Length != 16) return false;  // Rejects with spaces
        return IsValidLuhn(cardNumber);
    }

    // GOOD: Normalize first
    public bool IsValidCardGood(string cardNumber)
    {
        // Strip spaces and dashes
        cardNumber = cardNumber.Replace(" ", "").Replace("-", "");
        
        if (cardNumber.Length != 16) return false;
        if (!long.TryParse(cardNumber, out _)) return false;
        
        return IsValidLuhn(cardNumber);
    }

    private bool IsValidLuhn(string cardNumber)
    {
        int sum = 0, isSecond = false;
        for (int i = cardNumber.Length - 1; i >= 0; i--)
        {
            int digit = cardNumber[i] - '0';
            if (isSecond)
            {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            isSecond = !isSecond;
        }
        return sum % 10 == 0;
    }
}
```

---

**Q: L4 Should you store raw credit card numbers after validation?**

> Never store raw PANs — immediately tokenize through a PCI-DSS compliant vault like Stripe or Braintree.

Storing raw card numbers makes you subject to PCI-DSS SAQ D compliance, which is expensive and difficult, and creates catastrophic liability if you're breached. The pattern is: validate the number client-side with Luhn + BIN check for UX feedback, then pass it directly to the payment processor's SDK which tokenizes it before it ever hits your server. Your backend receives a token, never the PAN. This keeps your system out of PCI scope entirely.

```csharp
public class CreditCardStorageExample
{
    // BAD: Never do this
    public void BadCreatePayment(string cardNumber, string cvv)
    {
        // Storing raw PAN — now you're subject to PCI-DSS
        var payment = new Payment { CardNumber = cardNumber, CVV = cvv };
        _db.Payments.Add(payment);
        _db.SaveChanges();  // DANGER: Card data in database
    }

    // GOOD: Tokenize through payment processor
    public async Task<IActionResult> GoodCreatePayment(string cardNumber, string cvv)
    {
        // Validate locally for UX feedback
        cardNumber = cardNumber.Replace(" ", "").Replace("-", "");
        if (!IsValidCard(cardNumber)) return BadRequest("Invalid card");

        // Send card directly to Stripe/Braintree, never to your server
        try
        {
            var token = await _stripeClient.CreateTokenAsync(cardNumber, cvv);
            
            // Store only the token, not the card
            var payment = new Payment { StripeTokenId = token };
            _db.Payments.Add(payment);
            _db.SaveChanges();
            
            return Ok(new { tokenId = token });
        }
        catch (Exception ex)
        {
            return BadRequest("Payment processor rejected card");
        }
    }

    private bool IsValidCard(string cardNumber) => true; // Luhn check
    public class Payment { public string StripeTokenId { get; set; } }
}
```

---

**Q: L4 Users are registering with invalid emails. What are the five most likely causes?**

> A code path bypasses the validation layer — a direct DB call, legacy API version, feature flag, migration script, or race condition.

Debug by: (1) Query invalid records and correlate `created_at` with deployments. (2) Audit all write paths to the users table — find any that skip the service layer. (3) Check if an older API version without validation is still in use. (4) Look for disabled feature flags or environment checks in production. (5) Review recent migrations or seed scripts. Start with #1 and #2 — they're the most common.

```csharp
public class InvalidEmailDebugExample
{
    [HttpPost("v2/register")]  // Current API with validation
    public IActionResult RegisterV2([FromBody] RegisterRequest req)
    {
        if (!IsValidEmail(req.Email))
            return BadRequest("Invalid email");
        
        var user = new User { Email = req.Email };
        _db.Users.Add(user);
        _db.SaveChanges();
        return Ok();
    }

    [HttpPost("v1/register")]  // Legacy endpoint — LIKELY CULPRIT
    public IActionResult RegisterV1(string email, string password)
    {
        // Missing validation!
        var user = new User { Email = email };  // Stores invalid emails
        _db.Users.Add(user);
        _db.SaveChanges();
        return Ok();
    }

    // Direct database migration — another culprit
    public void SeedUsersFromLegacySystem()
    {
        var legacyUsers = _legacyDb.Users.ToList();
        foreach (var legacy in legacyUsers)
        {
            // Missing validation — bulk imports invalid emails
            _db.Users.Add(new User { Email = legacy.Email });
        }
        _db.SaveChanges();
    }

    // Debug script
    public void AuditInvalidEmails()
    {
        var invalid = _db.Users
            .Where(u => !u.Email.Contains("@"))
            .Select(u => new { u.Id, u.Email, u.CreatedAt })
            .ToList();

        foreach (var user in invalid)
        {
            Console.WriteLine($"User {user.Id}: {user.Email} created at {user.CreatedAt}");
            // Correlate CreatedAt with deployment timestamps
        }
    }

    private bool IsValidEmail(string email) => email?.Contains("@") ?? false;
}
```

---

**Q: L4 Domain model vs. service-layer validation — which approach and why?**

> Use both: enforce hard invariants (non-null ID, positive amounts) in the domain model; business rules (uniqueness, cross-field dependencies) in the service layer.

Domain model validation ensures invalid objects can never exist, but makes partial construction (like UI forms) awkward. Service-layer validation allows richer context and structured errors, but requires discipline to never skip. Split them: model owns structural correctness, service layer owns business correctness.

```csharp
// Domain model: enforce structural invariants
public class Order
{
    public int Id { get; private set; }
    public string CustomerId { get; private set; }
    public decimal Amount { get; private set; }

    // Private constructor — forces use of factory
    private Order(int id, string customerId, decimal amount)
    {
        if (id <= 0) throw new ArgumentException("Id must be positive");
        if (string.IsNullOrWhiteSpace(customerId)) throw new ArgumentException("CustomerId required");
        if (amount <= 0) throw new ArgumentException("Amount must be positive");

        Id = id;
        CustomerId = customerId;
        Amount = amount;
    }

    // Factory method for construction
    public static Result<Order> Create(int id, string customerId, decimal amount)
    {
        try
        {
            return Result<Order>.Ok(new Order(id, customerId, amount));
        }
        catch (ArgumentException ex)
        {
            return Result<Order>.Fail(ex.Message);
        }
    }
}

// Service layer: enforce business rules
public class OrderService
{
    public Result CreateOrder(CreateOrderRequest req)
    {
        // Domain-level validation
        var orderResult = Order.Create(req.Id, req.CustomerId, req.Amount);
        if (!orderResult.Success)
            return Result.Fail(orderResult.Error);

        var order = orderResult.Value;

        // Business-level validation (context-dependent)
        var customer = _db.Customers.Find(order.CustomerId);
        if (customer == null)
            return Result.Fail("Customer not found");

        if (order.Amount > customer.CreditLimit)
            return Result.Fail("Order exceeds credit limit");

        if (_db.Orders.Any(o => o.CustomerId == order.CustomerId && o.Amount == order.Amount && 
            o.CreatedAt > DateTime.UtcNow.AddMinutes(-5)))
            return Result.Fail("Duplicate order detected");

        _db.Orders.Add(order);
        _db.SaveChanges();
        return Result.Ok();
    }

    public class Result { public bool Success { get; set; } public string Error { get; set; } public static Result Ok() => new() { Success = true }; public static Result Fail(string err) => new() { Success = false, Error = err }; }
    public class Result<T> { public bool Success { get; set; } public T Value { get; set; } public string Error { get; set; } public static Result<T> Ok(T val) => new() { Success = true, Value = val }; public static Result<T> Fail(string err) => new() { Success = false, Error = err }; }
}
```

---

## Level 5 — Internals & Deep Mechanics

**Q: L5 What is catastrophic backtracking (ReDoS) and how does it become a DoS vector?**

> Catastrophic backtracking occurs when nested quantifiers cause a regex engine to explore exponentially many match paths, turning one request into a CPU spike.

The classic pattern is `(a+)+`. On input `"aaaaaaaaab"`, the engine tries every partition of the `a`s before failing, which is O(2^n). A malicious user can craft input to hang your server for seconds. Fix it with possessive quantifiers, atomic groups, or rewriting to eliminate ambiguity.

```csharp
using System.Text.RegularExpressions;
using System.Diagnostics;

public class ReDoSExample
{
    // VULNERABLE: Nested quantifiers allow catastrophic backtracking
    private static readonly Regex VulnerableEmail = 
        new(@"^([a-zA-Z0-9]+\.?)+@[a-z]+\.com$");

    // SAFE: Rewritten without nested quantifiers
    private static readonly Regex SafeEmail = 
        new(@"^[a-zA-Z0-9.]+@[a-z]+\.com$");

    public void DemonstrateReDoS()
    {
        string attack = new string('a', 50) + "!";  // 50 a's followed by !

        // Vulnerable version hangs for seconds
        var sw = Stopwatch.StartNew();
        try
        {
            var match = VulnerableEmail.IsMatch(attack);
            sw.Stop();
            Console.WriteLine($"Vulnerable: {sw.ElapsedMilliseconds}ms");  // ~10,000ms+
        }
        catch
        {
            Console.WriteLine("Vulnerable: Timeout or crash");
        }

        // Safe version completes instantly
        sw.Restart();
        var safeMatch = SafeEmail.IsMatch(attack);
        sw.Stop();
        Console.WriteLine($"Safe: {sw.ElapsedMilliseconds}ms");  // <1ms
    }

    // Best practice: validate regex patterns in CI
    [HttpPost("emails")]
    public IActionResult ValidateEmail([FromBody] string email)
    {
        // Use safe regex only
        if (SafeEmail.IsMatch(email))
            return Ok();

        return BadRequest("Invalid email");
    }
}
```

---

**Q: L5 How do possessive quantifiers and atomic groups prevent ReDoS?**

> They prevent the engine from giving back already-matched characters, eliminating the backtracking paths that cause exponential behavior.

A possessive quantifier (`++`, `*+`) matches as much as possible and never backtracks — once consumed, those characters are gone. Atomic groups `(?>...)` do the same for a subpattern. Both are available in Java and PHP but not in JavaScript's built-in regex engine — JS doesn't support possessive quantifiers or atomic groups as of ES2023. In JavaScript, the practical mitigations are: restructure the regex to eliminate overlap, use the `safe-regex` npm package to detect dangerous patterns, or run regex in a worker thread with a timeout.

---

**Q: L5 Why is phone validation locale-dependent? Give a concrete example.**

> Phone number length, area code structure, and valid prefix ranges are defined per-country by ITU-T and national regulators.

`0800123456` is a valid freephone number in Germany but not in the US (US toll-free is 10 digits). `libphonenumber` encodes per-country metadata and updates when plans change — something no static regex can maintain.

---

**Q: L5 For 50k email submissions/day: regex validator or full RFC compliance?**

> Use regex — throughput is irrelevant at 0.6/second, and RFC compliance brings complexity without benefit.

Full RFC 5321 would accept quoted local parts that your mail server doesn't support. A regex rejects the same edge cases your mail server would. Use regex + MX check + confirmation email as ground truth. Add `safe-regex` to CI to catch ReDoS risks.

---

## Level 6 — Trade-offs & Design Decisions

**Q: L6 Third-party validation libraries vs. custom logic — advantages?**

> Libraries save days of work: declarative schemas, composability, structured errors, and type inference from a single source of truth.

Hand-writing means rebuilding error accumulation, nested validation, conditional rules, and type coercion. Zod eliminates duplicating interfaces and validators. Changing requirements is a schema one-liner, not refactoring 200 if/else chains.

```csharp
using FluentValidation;

// Custom logic approach — error-prone, verbose
public class ManualValidator
{
    public List<string> ValidateUser(User user)
    {
        var errors = new List<string>();
        
        if (string.IsNullOrWhiteSpace(user.Name)) errors.Add("Name required");
        if (user.Name.Length > 100) errors.Add("Name too long");
        if (string.IsNullOrWhiteSpace(user.Email)) errors.Add("Email required");
        if (!user.Email.Contains("@")) errors.Add("Email invalid");
        if (user.Age < 18) errors.Add("Must be 18+");
        if (user.Age > 120) errors.Add("Age implausible");
        if (string.IsNullOrWhiteSpace(user.Phone)) errors.Add("Phone required");
        
        return errors;
    }
}

// Library approach — declarative, maintainable
public class UserValidator : AbstractValidator<User>
{
    public UserValidator()
    {
        RuleFor(u => u.Name)
            .NotEmpty().WithMessage("Name required")
            .MaximumLength(100).WithMessage("Name too long");

        RuleFor(u => u.Email)
            .NotEmpty().WithMessage("Email required")
            .EmailAddress().WithMessage("Email invalid");

        RuleFor(u => u.Age)
            .GreaterThanOrEqualTo(18).WithMessage("Must be 18+")
            .LessThanOrEqualTo(120).WithMessage("Age implausible");

        RuleFor(u => u.Phone)
            .NotEmpty().WithMessage("Phone required");
    }
}

// Usage
public class UserController
{
    private readonly UserValidator _validator = new();

    [HttpPost]
    public IActionResult CreateUser([FromBody] User user)
    {
        var result = _validator.Validate(user);
        if (!result.IsValid)
            return BadRequest(result.Errors.Select(e => e.ErrorMessage));

        _db.Users.Add(user);
        _db.SaveChanges();
        return Ok();
    }
}
```

---

**Q: L6 What are the risks of third-party validation libraries and how do you mitigate them?**

> Breaking changes and abandonment — mitigate by wrapping the library behind an internal `validate` module instead of calling it directly everywhere.

If Joi breaks and you've called it across 200 files, migration is painful. Wrap it: create one internal module that uses the library. If it breaks or gets abandoned, you swap internals in one place. Maintain a comprehensive test suite for all rules.

```csharp
// BAD: Direct dependency on third-party library (FluentValidation)
public class BadUserValidator : AbstractValidator<User>
{
    public BadUserValidator()
    {
        RuleFor(u => u.Email).EmailAddress();  // Tightly coupled
    }
}

// Usage scattered everywhere
public class UserController
{
    [HttpPost]
    public IActionResult Create([FromBody] User user)
    {
        var validator = new BadUserValidator();  // Creates new instance everywhere
        var result = validator.Validate(user);
        return result.IsValid ? Ok() : BadRequest(result.Errors);
    }
}

// GOOD: Wrap library in internal module
// src/Validation/IValidator.cs (internal interface)
public interface IValidator<T>
{
    ValidationResult Validate(T item);
}

// src/Validation/UserValidator.cs (internal implementation)
public class UserValidator : IValidator<User>
{
    // Uses FluentValidation internally, but this is an implementation detail
    private readonly AbstractValidator<User> _fluentValidator;

    public UserValidator()
    {
        _fluentValidator = new InternalUserValidator();
    }

    public ValidationResult Validate(User user)
    {
        var result = _fluentValidator.Validate(user);
        return new ValidationResult
        {
            IsValid = result.IsValid,
            Errors = result.Errors.Select(e => e.ErrorMessage).ToList()
        };
    }

    private class InternalUserValidator : AbstractValidator<User>
    {
        public InternalUserValidator()
        {
            RuleFor(u => u.Email).EmailAddress();
        }
    }
}

// Usage: only depends on internal interface
public class UserController
{
    private readonly IValidator<User> _validator;

    public UserController(IValidator<User> validator)
    {
        _validator = validator;  // Injected
    }

    [HttpPost]
    public IActionResult Create([FromBody] User user)
    {
        var result = _validator.Validate(user);
        return result.IsValid ? Ok() : BadRequest(result.Errors);
    }
}

// Migration scenario: FluentValidation breaks or is abandoned
// Change: only update src/Validation/UserValidator.cs
// Benefit: application code remains unchanged

public class ValidationResult { public bool IsValid { get; set; } public List<string> Errors { get; set; } }
```

---

**Q: L6 Choosing between a popular stale library and an active smaller one — factors?**

> Maintenance activity matters more than download count — pick the actively maintained one.

Check: are issues being responded to? Is there responsible vulnerability disclosure? TypeScript support? API stability? A stale library with 10M downloads is less safe than active maintenance on a smaller package.

---

**Q: L6 Schema-based vs. imperative validation — when does each excel?**

> Schema-based for well-defined shapes (API bodies); imperative for context-dependent rules.

Zod/JSON Schema is readable, self-documenting, and handles errors. Imperative shines for "required if role=X and state=Y and weekday" — encoding that in a schema is harder to read than a named function. Use schema as the outer gate, imperative rules deeper in the call chain.

```csharp
using FluentValidation;

// Schema-based: good for fixed shapes
public class CreateOrderSchema : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderSchema()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Items).NotEmpty().Must(list => list.Count > 0);
    }
}

public class CreateOrderRequest
{
    public string CustomerId { get; set; }
    public decimal Amount { get; set; }
    public List<OrderItem> Items { get; set; }
}

// Imperative: good for context-dependent rules
public class OrderService
{
    public Result<Order> CreateOrder(CreateOrderRequest req, User currentUser)
    {
        // "Required if role=Manager and day=Friday"
        if (currentUser.Role == "Manager" && DateTime.UtcNow.DayOfWeek == DayOfWeek.Friday)
        {
            if (string.IsNullOrEmpty(req.ApprovalCode))
                return Result<Order>.Fail("ApprovalCode required for Friday manager orders");
        }

        // "Amount must not exceed customer's credit limit"
        var customer = _db.Customers.Find(req.CustomerId);
        if (req.Amount > customer.CreditLimit)
            return Result<Order>.Fail("Exceeds credit limit");

        // "Cannot order if customer has unpaid invoices over 30 days old"
        var hasOverdueInvoices = customer.Invoices
            .Where(inv => !inv.IsPaid && (DateTime.UtcNow - inv.DueDate).TotalDays > 30)
            .Any();

        if (hasOverdueInvoices)
            return Result<Order>.Fail("Cannot order with overdue invoices");

        var order = new Order { CustomerId = req.CustomerId, Amount = req.Amount };
        _db.Orders.Add(order);
        _db.SaveChanges();
        return Result<Order>.Ok(order);
    }
}
```

---

**Q: L6 How do you share validation rules between TypeScript frontend and Node.js backend?**

> Extract validation schemas into a shared TypeScript package in a monorepo and import it on both sides.

In a monorepo (Nx or Turborepo), create a `packages/validation` package that exports Zod schemas. The React app and the Express/Fastify backend both import from that package — same schema, same error messages, zero duplication. The trade-off is coupling: a breaking change to a schema touches both sides simultaneously, which can be good (forces you to update both) or annoying (blocks independent deployment). For teams with separate frontend and backend repos, publish the package to a private npm registry with semantic versioning.

```csharp
// Monorepo structure:
// packages/validation/UserSchema.ts — shared TypeScript
// apps/web/src/... — React frontend imports UserSchema
// apps/api/src/... — C# backend receives validated data

// packages/validation/UserSchema.ts (Zod TypeScript)
// export const userSchema = z.object({
//   email: z.string().email(),
//   age: z.number().min(18).max(120),
//   name: z.string().min(1).max(100)
// });

// apps/web/src/pages/Register.tsx (Frontend)
// import { userSchema } from '@myapp/validation';
// const form = useForm({ resolver: zodResolver(userSchema) });

// apps/api/src/Controllers/UserController.cs (C# Backend)
// The C# backend receives pre-validated JSON from the frontend
// Backend STILL validates independently (never trust client)

[HttpPost("users")]
public IActionResult CreateUser([FromBody] UserRequest req)
{
    // C# validation mirrors the shared TypeScript schema
    if (string.IsNullOrWhiteSpace(req.Email)) return BadRequest("Email required");
    if (!req.Email.Contains("@")) return BadRequest("Invalid email");
    if (req.Age < 18 || req.Age > 120) return BadRequest("Age must be 18-120");
    if (string.IsNullOrWhiteSpace(req.Name) || req.Name.Length > 100) 
        return BadRequest("Name required, max 100 chars");

    var user = new User { Email = req.Email, Age = req.Age, Name = req.Name };
    _db.Users.Add(user);
    _db.SaveChanges();
    return Ok();
}

public class UserRequest { public string Email { get; set; } public int Age { get; set; } public string Name { get; set; } }
```

---

**Q: L6 Should validation error messages be verbose or terse? Trade-offs?**

> Be verbose about what's wrong with the input, terse about internals — never leak schema details, server paths, or stack traces.

For developer experience, validation errors must be actionable: `{ "field": "email", "message": "must be a valid email address" }` lets the consuming developer fix their code in minutes. Terse errors like `"invalid input"` on a public API generate support tickets and negative reviews. The security concern is about revealing system internals — don't include SQL column names, regex patterns, or stack traces. The DX-security balance is: describe what the user submitted that was wrong, not how your system is built internally.

```csharp
public class ErrorMessageExample
{
    // BAD: Terse and unhelpful
    [HttpPost("bad")]
    public IActionResult BadError([FromBody] UserRequest req)
    {
        try
        {
            if (!ValidateUser(req))
                return BadRequest("Invalid input");  // User has no idea what's wrong
        }
        catch (Exception ex)
        {
            return BadRequest(ex.ToString());  // LEAKS internals!
        }
        return Ok();
    }

    // GOOD: Verbose about input, silent about internals
    [HttpPost("good")]
    public IActionResult GoodError([FromBody] UserRequest req)
    {
        var errors = new Dictionary<string, string>();

        if (string.IsNullOrWhiteSpace(req.Email))
            errors["email"] = "Email is required";
        else if (!req.Email.Contains("@"))
            errors["email"] = "Email must contain @ symbol";

        if (req.Age < 18)
            errors["age"] = "Must be at least 18 years old";

        if (errors.Any())
            return BadRequest(new { errors });  // User knows exactly what to fix

        // Internal error — never expose to client
        try
        {
            var user = CreateUser(req);
            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create user");  // Log internally
            return StatusCode(500, "An error occurred");  // Generic response to client
        }
    }

    private bool ValidateUser(UserRequest req) => true;
    private User CreateUser(UserRequest req) => new();
    public class UserRequest { public string Email { get; set; } public int Age { get; set; } }
}
```

---

## Level 7 — Advanced & Expert

**Q: L7 How do you prevent validation logic from drifting across microservices?**

> A shared library (tight coupling, consistent) or schema registry (loose coupling, language-agnostic) — never copy-paste.

For simple rules (email, phone), a shared library in your internal registry works well. For rules that evolve independently, use a schema registry like Confluent. Copy-pasting drifts within months.

```csharp
// Shared library approach: keeps validation consistent across services
// NuGet package: MyApp.Validation (published to private npm)

// packages/MyApp.Validation/UserValidator.cs
public static class UserValidator
{
    public static bool IsValidEmail(string email) => 
        !string.IsNullOrWhiteSpace(email) && email.Contains("@");

    public static bool IsValidAge(int age) => 
        age >= 18 && age <= 150;
}

// Service A: User Service
public class UserService
{
    [HttpPost("users")]
    public IActionResult CreateUser([FromBody] CreateUserRequest req)
    {
        if (!UserValidator.IsValidEmail(req.Email))
            return BadRequest("Invalid email");
        if (!UserValidator.IsValidAge(req.Age))
            return BadRequest("Invalid age");

        _db.Users.Add(new User { Email = req.Email, Age = req.Age });
        _db.SaveChanges();
        return Ok();
    }
}

// Service B: Order Service
public class OrderService
{
    [HttpPost("orders")]
    public IActionResult CreateOrder([FromBody] CreateOrderRequest req)
    {
        if (!UserValidator.IsValidEmail(req.CustomerEmail))
            return BadRequest("Invalid customer email");

        var order = new Order { CustomerEmail = req.CustomerEmail };
        _db.Orders.Add(order);
        _db.SaveChanges();
        return Ok();
    }
}

// Drift prevention:
// - Update UserValidator in one place
// - All services get consistent behavior via NuGet versioning
// - CI ensures validation tests pass before publishing
public class CreateUserRequest { public string Email { get; set; } public int Age { get; set; } }
public class CreateOrderRequest { public string CustomerEmail { get; set; } }
```

---

**Q: L7 How does eventual consistency complicate uniqueness validation?**

> Two requests can both pass "is this email taken?" checks simultaneously and both insert — only database constraints prevent duplicates.

The TOCTOU race is unavoidable in distributed systems. Use database unique constraints as the real safety net. For conflict resolution: optimize locking, idempotency keys, or post-hoc cleanup. Be honest: eventual consistency means accepting a small window of inconsistency.

```csharp
public class UniquenessRaceConditionExample
{
    // VULNERABLE: Race condition window
    public IActionResult BadRegister([FromBody] RegisterRequest req)
    {
        // Check 1: Email exists?
        if (_db.Users.Any(u => u.Email == req.Email))
            return BadRequest("Email taken");  // Window: another request may insert here

        // Check 2: Insert
        var user = new User { Email = req.Email };
        _db.Users.Add(user);
        _db.SaveChanges();  // May throw duplicate key exception!
        return Ok();
    }

    // SAFE: Database enforces uniqueness
    public IActionResult GoodRegister([FromBody] RegisterRequest req)
    {
        var user = new User { Email = req.Email };
        
        try
        {
            _db.Users.Add(user);
            _db.SaveChanges();
            return Ok();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx && sqlEx.Number == 2601)
        {
            // Unique constraint violation — email already exists
            return BadRequest("Email already registered");
        }
    }

    // BEST: Idempotency key prevents duplicates from retries
    public IActionResult BestRegister([FromBody] RegisterRequest req, [FromHeader] string idempotencyKey)
    {
        // Check if request already processed
        var existing = _db.IdempotencyKeys.FirstOrDefault(k => k.Key == idempotencyKey);
        if (existing != null)
            return Ok(existing.Response);  // Replay previous response

        var user = new User { Email = req.Email };
        try
        {
            _db.Users.Add(user);
            _db.SaveChanges();

            // Record this idempotency key
            _db.IdempotencyKeys.Add(new() { Key = idempotencyKey, Response = user });
            _db.SaveChanges();

            return Ok(user);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx && sqlEx.Number == 2601)
        {
            return BadRequest("Email already registered");
        }
    }

    public class RegisterRequest { public string Email { get; set; } }
}
```

---

**Q: L7 How do you make a validation framework internationalization-aware?**

> Emit error code keys from validators, resolve them to locale strings at the boundary layer, and store locale-specific format rules separately from validation logic.

Validators return `{ code: "email.invalid", params: {} }` — never a human-readable string. The API response layer resolves codes to strings using the request's `Accept-Language` header. Format rules like date patterns and number separators are stored in locale configuration files, not hardcoded in validators. This means you can add a new locale by adding a config file, with zero changes to validation logic. The only discipline required is ensuring every new error code gets a translation entry before shipping — enforce this with a CI check.

```csharp
using System.Globalization;

public class I18nValidationExample
{
    // Validators emit error codes, not strings
    public class ValidationError
    {
        public string Code { get; set; }      // "email.invalid"
        public Dictionary<string, object> Params { get; set; }  // { "field": "email" }
    }

    public List<ValidationError> ValidateUser(UserRequest req)
    {
        var errors = new List<ValidationError>();

        if (string.IsNullOrWhiteSpace(req.Email))
            errors.Add(new() { Code = "field.required", Params = new() { { "field", "email" } } });
        else if (!req.Email.Contains("@"))
            errors.Add(new() { Code = "email.invalid", Params = new() { { "field", "email" } } });

        if (req.Age < 18)
            errors.Add(new() { Code = "age.minimum", Params = new() { { "min", 18 } } });

        return errors;
    }

    // At API boundary: resolve codes to locale-specific strings
    [HttpPost("users")]
    public IActionResult CreateUser([FromBody] UserRequest req)
    {
        var errors = ValidateUser(req);
        if (errors.Any())
        {
            var locale = Request.Headers["Accept-Language"].ToString() ?? "en-US";
            var localizedErrors = errors
                .Select(e => new { field = e.Params["field"], message = _i18n.Translate(e.Code, locale, e.Params) })
                .ToList();

            return BadRequest(new { errors = localizedErrors });
        }

        _db.Users.Add(new User { Email = req.Email });
        _db.SaveChanges();
        return Ok();
    }

    // Translation service
    private readonly I18nService _i18n = new();

    public class I18nService
    {
        private readonly Dictionary<string, Dictionary<string, string>> _translations = new()
        {
            { "en-US", new() { { "email.invalid", "Invalid email address" }, { "field.required", "{field} is required" }, { "age.minimum", "Must be at least {min} years old" } } },
            { "es-ES", new() { { "email.invalid", "Correo inválido" }, { "field.required", "{field} es obligatorio" }, { "age.minimum", "Debe tener al menos {min} años" } } },
            { "de-DE", new() { { "email.invalid", "Ungültige E-Mail" }, { "field.required", "{field} erforderlich" }, { "age.minimum", "Mindestens {min} Jahre alt" } } }
        };

        public string Translate(string code, string locale, Dictionary<string, object> @params)
        {
            if (!_translations.ContainsKey(locale))
                locale = "en-US";

            var message = _translations[locale].GetValueOrDefault(code, code);

            foreach (var param in @params)
                message = message.Replace($"{{{param.Key}}}", param.Value.ToString());

            return message;
        }
    }

    public class UserRequest { public string Email { get; set; } public int Age { get; set; } }
}
```

---

**Q: L7 Validating at the database layer only — advantages and limitations?**

> Database-layer validation is truly universal but produces cryptic errors and is hard to test in isolation.

Advantage: any app, script, or migration tool writes to the database with the rules applied. Limitations: constraint violations bubble up as codes that must be parsed and mapped to user-friendly messages per language. Triggers and stored procedures are hard to test, version-control, and add latency on every write. Use database constraints only for catastrophic invariants; put user-facing validation in the application layer where it's testable and produces useful error messages.

```csharp
// Database-layer validation (SQL)
// CREATE TABLE Users (
//     Id INT PRIMARY KEY IDENTITY,
//     Email NVARCHAR(255) NOT NULL UNIQUE,
//     Age INT CHECK (Age >= 0 AND Age <= 150),
//     CreatedAt DATETIME DEFAULT GETUTCDATE()
// );

// Application-layer validation
public class UserService
{
    // Advantages: testable, produces user-friendly errors
    public Result CreateUser(CreateUserRequest req)
    {
        // Validate before database hit
        if (string.IsNullOrWhiteSpace(req.Email))
            return Result.Fail("Email is required");

        if (req.Age < 0 || req.Age > 150)
            return Result.Fail("Age must be between 0 and 150");

        // Check uniqueness with application logic
        if (_db.Users.Any(u => u.Email == req.Email))
            return Result.Fail("Email is already registered");

        var user = new User { Email = req.Email, Age = req.Age };

        try
        {
            _db.Users.Add(user);
            _db.SaveChanges();
            return Result.Ok();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx)
        {
            // Catch database constraint violations and map to user messages
            if (sqlEx.Number == 2601)  // Unique constraint
                return Result.Fail("Email is already registered");
            if (sqlEx.Number == 547)   // Check constraint
                return Result.Fail("Data violates business rules");
            
            throw;  // Unexpected error
        }
    }

    public class Result { public bool Success { get; set; } public string Error { get; set; } public static Result Ok() => new() { Success = true }; public static Result Fail(string err) => new() { Success = false, Error = err }; }
    public class CreateUserRequest { public string Email { get; set; } public int Age { get; set; } }
}
```

---

**Q: L7 Single standardized validation library across teams or let teams choose?**

> Standardize per language but not across languages.

Within a language, standardization wins: shared knowledge, faster reviews, coordinated security patches. The worst outcome is five different libraries in one TypeScript codebase. Cross-language mandates don't fit — real-time bidding and admin tools have different needs. Publish an ADR and revisit every 18 months.

```csharp
// Architecture Decision Record (ADR): C# Validation Standard
// 
// Decision: All C# services use FluentValidation + custom guards
// Rationale: 
//   - Consistent across codebase
//   - Active maintenance & community
//   - Composable validators
//   - Good DX for developers
//
// Non-decision: 
//   - Frontend (TypeScript) uses Zod — different needs, different ecosystem
//   - Go services can use their own patterns — few services, slow churn

// Enforced: All new endpoints validate with AbstractValidator<T>
using FluentValidation;

public class RegisterUserValidator : AbstractValidator<RegisterUserRequest>
{
    public RegisterUserValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email required")
            .EmailAddress().WithMessage("Invalid email");

        RuleFor(x => x.Password)
            .MinimumLength(12).WithMessage("Password must be 12+ chars")
            .Must(HasSpecialChar).WithMessage("Password must include special character");

        RuleFor(x => x.Age)
            .GreaterThanOrEqualTo(18).WithMessage("Must be 18+");
    }

    private bool HasSpecialChar(string password) => 
        password.Any(c => !char.IsLetterOrDigit(c));
}

// All endpoints use this pattern
[HttpPost("register")]
public IActionResult Register([FromBody] RegisterUserRequest req)
{
    var validator = new RegisterUserValidator();
    var result = validator.Validate(req);

    if (!result.IsValid)
        return BadRequest(result.Errors.Select(e => new { field = e.PropertyName, message = e.ErrorMessage }));

    // ... create user
    return Ok();
}

public class RegisterUserRequest { public string Email { get; set; } public string Password { get; set; } public int Age { get; set; } }
```
