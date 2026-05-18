# Model Answers: Data Validation

---

**Q: What is data validation and why is it necessary?**

> **Bottom line:** Data validation is the process of ensuring input conforms to expected format, type, and business rules before processing it.

**Elaboration:** Without validation, malformed data corrupts your database, causes crashes, or creates security vulnerabilities. Even if you trust your own UI, you cannot trust what arrives at your API — validation is a contract enforcement mechanism at every system boundary.

---

**Q: What are the most common categories of validation?**

> **Bottom line:** Presence (not null/empty), format (regex, pattern), range (min/max, date bounds), type (parseable as expected type), and business-rule (email already registered, IBAN checksum).

**Elaboration:** Presence checks are the baseline — you validate format only if the value exists. Type validation ensures a string can be parsed as a date or number before you use it. Business-rule validation often requires a database call and lives at the service layer, not the model layer.

---

**Q: What is the difference between client-side and server-side validation? Which one can you skip?**

> **Bottom line:** Client-side validation improves UX; server-side validation is mandatory — you can never skip server-side.

**Elaboration:** Client-side validation runs in the browser and is easily bypassed with developer tools or a raw HTTP request. It's purely a convenience feature. Server-side validation is your actual security and data-integrity boundary. Skipping it because client-side "already checks" is a common and dangerous mistake.

---

**Q: What is the difference between validation and sanitization?**

> **Bottom line:** Validation checks whether input is acceptable and rejects it if not; sanitization transforms potentially dangerous input into a safe form.

**Elaboration:** You validate an email address format before accepting it. You sanitize HTML input by stripping or escaping tags before storing it. Both are necessary for different threat vectors — validation prevents bad data; sanitization prevents injection attacks. Prefer rejection over sanitization wherever possible, since sanitization logic can have gaps.

---

**Q: How do you validate method arguments in C#? What do you check before proceeding?**

> **Bottom line:** Check for null, empty strings, out-of-range values, and invalid states, throwing the appropriate `ArgumentException` subtype immediately.

```csharp
public void Process(string name, int age)
{
    ArgumentNullException.ThrowIfNull(name);
    ArgumentException.ThrowIfNullOrWhiteSpace(name);
    ArgumentOutOfRangeException.ThrowIfNegative(age);
}
```

---

**Q: What is a guard clause and how does it improve readability?**

> **Bottom line:** A guard clause exits a method early when a precondition fails, eliminating deep nesting and making the happy path obvious.

**Elaboration:** Instead of `if (value != null) { if (value.Length > 0) { ... } }`, you write `if (value == null) throw ...; if (value.Length == 0) throw ...;` and then the main logic at the same indentation level. Guard clauses reduce cyclomatic complexity and make preconditions explicit and scannable.

---

**Q: What does ArgumentNullException.ThrowIfNull() in .NET 6+ offer?**

> **Bottom line:** It's a one-liner that replaces a multi-line null check, throwing `ArgumentNullException` with the parameter name automatically captured via `CallerArgumentExpression`.

```csharp
ArgumentNullException.ThrowIfNull(customer); // replaces: if (customer is null) throw new ArgumentNullException(nameof(customer));
```

---

**Q: How would you validate an email address in C#?**

> **Bottom line:** Use a regex for basic format validation, but accept that regex cannot verify deliverability — for that, you need an actual send or a third-party service.

**Elaboration:** The edge cases are many: `user+tag@subdomain.domain.co.uk`, quoted local parts, international domains. A practical approach is a simple regex that rejects obviously wrong inputs, plus a `MailAddress` constructor try/catch for stricter RFC validation.

```csharp
bool IsValidEmail(string email)
{
    try { return new System.Net.Mail.MailAddress(email).Address == email; }
    catch { return false; }
}
```

---

**Q: How do you validate an international phone number? What library would you use?**

> **Bottom line:** Use `libphonenumber-csharp` (a port of Google's libphonenumber) — regex is insufficient for international phone validation.

**Elaboration:** Phone formats vary enormously by country, include optional country codes, extensions, and formatting characters. A simple regex handles one country well and fails everywhere else. libphonenumber parses, validates, and formats numbers correctly for every country code and is the industry-standard solution.

```csharp
var phoneUtil = PhoneNumberUtil.GetInstance();
var number = phoneUtil.Parse("+14155552671", null);
bool isValid = phoneUtil.IsValidNumber(number); // true
```

---

**Q: How do you validate that a string is a valid date in a specific format in C#?**

> **Bottom line:** Use `DateTime.TryParseExact` with the expected format string and `CultureInfo.InvariantCulture` — it returns false for invalid dates without throwing.

```csharp
bool IsValidDate(string input) =>
    DateTime.TryParseExact(input, "yyyy-MM-dd",
        CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
```

---

**Q: What is the difference between DateTime.Parse, TryParse, and ParseExact?**

> **Bottom line:** `Parse` throws on failure; `TryParse` returns a bool (prefer this in validation); `ParseExact` requires an exact format string (use this when you control the format).

**Elaboration:** In validation code, always prefer `TryParse` or `TryParseExact` — throwing/catching exceptions for validation is slow and semantically wrong. `ParseExact` is the right choice when you expect a specific format (e.g., API input) and want to reject anything else without guessing.

---

**Q: How would you validate both IPv4 and IPv6 addresses in C#?**

> **Bottom line:** Use `IPAddress.TryParse` — it handles both IPv4 and IPv6 natively.

```csharp
bool IsValidIp(string input) => IPAddress.TryParse(input, out _);
```

---

**Q: How do you validate a domain name?**

> **Bottom line:** Check that the input matches a valid domain pattern: labels of 1–63 characters separated by dots, no leading/trailing hyphens, total length ≤ 253 characters.

```csharp
bool IsValidDomain(string domain) =>
    Uri.CheckHostName(domain) is UriHostNameType.Dns or UriHostNameType.IPv4 or UriHostNameType.IPv6;
```

---

**Q: How do you validate a currency string?**

> **Bottom line:** Use `decimal.TryParse` with a culture-specific `NumberStyles` and `CultureInfo` — the format varies by locale (decimal separator, thousands separator, currency symbol position).

**Elaboration:** `"$1,234.56"` is valid en-US but `"$1.234,56"` is the German format. Decide upfront whether you accept the user's locale or require a canonical format. For API input I prefer accepting a plain decimal string (no currency symbol) and handling symbol/formatting separately in the UI.

```csharp
bool IsValidCurrency(string input, CultureInfo culture) =>
    decimal.TryParse(input, NumberStyles.Currency, culture, out _);
```

---

**Q: What is the Luhn algorithm and how does it validate credit card numbers?**

> **Bottom line:** The Luhn algorithm is a simple checksum formula that detects single-digit errors and most transpositions in a credit card number.

**Elaboration:** Starting from the right, double every second digit; if doubling produces a number > 9, subtract 9. Sum all digits. If the total is divisible by 10, the number passes. It catches typos but not fraudulent numbers — a number that passes Luhn may still be invalid (wrong BIN, cancelled card).

```csharp
bool IsValidLuhn(string number)
{
    int sum = 0;
    bool alternate = false;
    for (int i = number.Length - 1; i >= 0; i--)
    {
        int n = number[i] - '0';
        if (alternate) { n *= 2; if (n > 9) n -= 9; }
        sum += n;
        alternate = !alternate;
    }
    return sum % 10 == 0;
}
```

---

**Q: Does a passing Luhn check guarantee the card number is real?**

> **Bottom line:** No — Luhn only detects transcription errors; the card may still not exist, be expired, or have been cancelled.

**Elaboration:** Luhn is a first-pass filter. Actual card validation requires calling a payment processor (Stripe, Braintree, etc.) which checks the card with the issuing bank. Never rely solely on Luhn for payment processing decisions.

---

**Q: How do you validate an IBAN?**

> **Bottom line:** Strip spaces, move the first 4 characters to the end, replace letters with digits (A=10…Z=35), then check that the resulting number mod 97 equals 1.

**Elaboration:** The length also varies by country (18–34 characters), so first validate the country code and expected length before running the checksum. Libraries like `IbanNet` handle all country-specific rules correctly and are the production-appropriate choice.

```csharp
// Simplified: production code should use IbanNet
bool IsValidIban(string iban)
{
    iban = iban.Replace(" ", "").ToUpper();
    string rearranged = iban[4..] + iban[..4];
    string digits = string.Concat(rearranged.Select(c => char.IsLetter(c) ? (c - 'A' + 10).ToString() : c.ToString()));
    return BigInteger.Parse(digits) % 97 == 1;
}
```

---

**Q: What are the pros and cons of using a third-party validation library like FluentValidation?**

> **Bottom line:** FluentValidation gives you expressive, composable, testable validators with rich error messages — the cost is a dependency and a learning curve.

**Elaboration:** Pros: rules are declared in plain English, composable across validators, easy to unit test in isolation, and integrate natively with ASP.NET Core model binding. Cons: it's an external dependency, validation logic lives in a separate class from the model (which some find unnatural), and it can be over-engineered for simple CRUD forms. Data Annotations are fine for simple cases; FluentValidation pays off as rules get complex or cross-field.

---

**Q: Where in the application stack should validation live?**

> **Bottom line:** At the API boundary (format/presence), at the service layer (business rules), and optionally in the domain model (invariants) — but never only in the UI.

**Elaboration:** API boundary validation catches malformed input before it touches any business logic. Service-layer validation enforces business rules that may require queries (e.g., uniqueness). Domain model validation guards invariants that must always hold regardless of how the model is created. Each layer validates what it knows about — don't push database-dependent rules into the model, and don't put business rules only in the controller.
