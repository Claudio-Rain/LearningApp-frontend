# L1 What are the most common types of data validation?

Data validation ensures that input data meets the requirements of your system before it is processed or persisted. The most common types are:

## 1. Presence / Required validation
Checks that a required field is not null, empty, or whitespace. This is the most fundamental check — if a value must exist, confirm it does before processing.

## 2. Type validation
Ensures the data is of the expected type (e.g., an integer, a date, a boolean). Prevents type-mismatch errors deeper in the pipeline.

## 3. Format validation
Confirms that a string matches an expected pattern or structure, such as an email address, phone number, postal code, URL, or UUID. Often implemented with regular expressions.

## 4. Range / Boundary validation
Verifies that a numeric or date value falls within an acceptable range (e.g., age must be between 0 and 150, a discount percentage must be between 0 and 100).

## 5. Length validation
Checks that a string or collection does not exceed a maximum length or fall below a minimum length. Important for database column constraints and UI display limits.

## 6. Consistency / Cross-field validation
Validates that two or more fields are logically consistent with each other (e.g., `EndDate` must be after `StartDate`, `ConfirmPassword` must match `Password`).

## 7. Business-rule validation
Domain-specific rules that go beyond pure format or range checks (e.g., a user cannot place an order if their account is suspended, a coupon code must not be expired).

## 8. Uniqueness validation
Confirms that a value does not already exist in the data store where uniqueness is required (e.g., a username or email must be unique across all users).

## 9. Referential / Existence validation
Ensures that a referenced entity actually exists (e.g., a `CategoryId` on a product must correspond to an existing category record).

## 10. Checksum / Integrity validation
Uses an algorithm to verify that a value has not been corrupted or tampered with (e.g., the Luhn algorithm for credit card numbers, mod-97 for IBANs).

---

## Summary table

| Type | Example |
|---|---|
| Presence | `Name` must not be null or empty |
| Type | `Age` must be an integer |
| Format | `Email` must match `x@y.z` pattern |
| Range | `Score` must be 0–100 |
| Length | `Username` must be 3–50 characters |
| Consistency | `EndDate` > `StartDate` |
| Business rule | Order only allowed for active accounts |
| Uniqueness | `Email` must not already be registered |
| Referential | `CategoryId` must reference an existing row |
| Checksum | Credit card passes Luhn check |

---

Include short code examples in C#.

```csharp
// Presence
if (string.IsNullOrWhiteSpace(name))
    throw new ArgumentException("Name is required.", nameof(name));

// Type — TryParse pattern
if (!int.TryParse(input, out int age))
    throw new FormatException("Age must be an integer.");

// Format — regex
var emailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$");
if (!emailRegex.IsMatch(email))
    throw new FormatException("Invalid email format.");

// Range
if (score < 0 || score > 100)
    throw new ArgumentOutOfRangeException(nameof(score), "Score must be between 0 and 100.");

// Length
if (username.Length < 3 || username.Length > 50)
    throw new ArgumentException("Username must be 3–50 characters.", nameof(username));

// Cross-field consistency
if (endDate <= startDate)
    throw new ArgumentException("EndDate must be after StartDate.");
```
