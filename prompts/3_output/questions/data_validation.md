# Interview Questions: Data Validation

## Coverage map

| Item | Type | Level |
|------|------|-------|
| What are the most common validation types? | Knowledge | Level 1 — Definition & Basics |
| Why is it important to validate user inputs? | Knowledge | Level 1 — Definition & Basics |
| Pros and cons of using third-party validation libraries? | Knowledge | Level 6 — Trade-offs & Design Decisions |
| Performs initial validation for method arguments | Skill | Level 2 — Core Concepts |
| Validates emails | Skill | Level 3 — Practical Usage |
| Validates date and time strings | Skill | Level 3 — Practical Usage |
| Validates IP addresses | Skill | Level 3 — Practical Usage |
| Validates domains | Skill | Level 3 — Practical Usage |
| Parses, formats, and validates phone numbers | Skill | Level 3 — Practical Usage |
| Validates currency strings | Skill | Level 3 — Practical Usage |
| Validates credit card numbers | Skill | Level 3 — Practical Usage |
| Validates IBANs | Skill | Level 3 — Practical Usage |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate knows what data validation is and why it matters._

### Purpose and Types
- ❓ What is data validation and why is it necessary in software applications? `[FROM JD]`
- ❓ What are the most common categories of validation? (e.g., format, range, presence, business-rule) `[FROM JD]`
- ❓ What is the difference between client-side and server-side validation? Which one can you skip? `[INFERRED]`
- ❓ What is the difference between validation and sanitization? `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Test understanding of guard clauses and argument validation patterns._

### Method Argument Validation
- ❓ How do you validate method arguments in C#? What would you check before proceeding with business logic? `[FROM JD]`
- ❓ What is a guard clause? How does it improve readability compared to nested `if` blocks? `[INFERRED]`
- ❓ What exceptions should you throw for invalid arguments — `ArgumentException`, `ArgumentNullException`, or `ArgumentOutOfRangeException`? When do you use each? `[INFERRED]`
- ❓ How does `ArgumentNullException.ThrowIfNull()` in .NET 6+ improve argument validation code? `[INFERRED]`
- ❓ What does the `[NotNull]` attribute and nullable reference types feature offer for validation at compile time? `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Test ability to implement specific validation scenarios correctly._

### Email Validation
- ❓ How would you validate an email address in C#? What are the edge cases to consider? `[FROM JD]`
- ❓ Is using a regex for email validation sufficient? What can it miss? `[INFERRED]`

### Phone Number Validation
- ❓ How do you validate an international phone number? What format variations must you handle? `[FROM JD]`
- ❓ What library would you use to parse and format phone numbers reliably, and why? `[FROM JD]`

### Date and Time Validation
- ❓ How do you validate that a string is a valid date in a specific format (e.g., `yyyy-MM-dd`) in C#? `[FROM JD]`
- ❓ What is the difference between `DateTime.Parse`, `DateTime.TryParse`, and `DateTime.ParseExact`? Which should you prefer in validation scenarios? `[INFERRED]`

### IP Address Validation
- ❓ How would you validate both IPv4 and IPv6 addresses in C#? `[FROM JD]`

### Domain Validation
- ❓ How do you validate a domain name? What constitutes a valid domain? `[FROM JD]`

### Currency Validation
- ❓ How do you validate a currency string (e.g., "$1,234.56" or "€1.234,56")? What locale-specific issues arise? `[FROM JD]`

### Credit Card Validation
- ❓ What is the Luhn algorithm and how does it help validate credit card numbers? `[FROM JD]`
- ❓ Does a passing Luhn check guarantee the card number is real and active? `[INFERRED]`

### IBAN Validation
- ❓ How do you validate an IBAN? Walk through the steps. `[FROM JD]`

---

## Level 4 — Common Pitfalls
_Goal: Surface common mistakes in validation logic._

### Mistakes and Misconceptions
- ❓ A developer uses `string.IsNullOrEmpty` everywhere but never checks for whitespace-only strings. What problems can this cause? `[INFERRED]`
- ❓ Your regex for email validation rejects a valid address with a `+` in it. How would you diagnose and fix this? `[INFERRED]`
- ❓ What is over-validation and why can it be harmful? Give an example. `[INFERRED]`
- ❓ A form accepts a date as "13/13/2024" — how would you catch this with `TryParseExact`, and what format string would you use? `[INFERRED]`
- ❓ Why is trusting client-side validation alone a security risk? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Test understanding of how validation mechanisms work under the hood._

### Regex and Parsing Internals
- ❓ How does `Regex` work under the hood — what is a finite automaton and how does it relate to pattern matching? `[INFERRED]`
- ❓ What is catastrophic backtracking in regex and how do you avoid it in validation patterns? `[INFERRED]`
- ❓ How does `Regex.IsMatch` differ from `Regex.Match` in terms of performance? When would you cache a compiled `Regex` instance? `[INFERRED]`

### Luhn and IBAN Algorithms
- ❓ Walk through the Luhn algorithm step by step for the number `4532015112830366`. `[INFERRED]`
- ❓ Walk through IBAN validation: what is the modulo-97 check and why does it work? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate library vs. DIY decisions and architectural placement of validation._

### Libraries vs. Custom Code
- ❓ What are the pros and cons of using a third-party validation library like FluentValidation vs. writing your own validators? `[FROM JD]`
- ❓ When would you reach for `libphonenumber` (or a C# wrapper) instead of a regex for phone validation? `[INFERRED]`
- ❓ Where in the application stack should validation live — domain model, service layer, controller/API boundary, or all three? `[INFERRED]`

### Design
- ❓ How would you design a reusable, composable validation pipeline? What design pattern would you use? `[INFERRED]`
- ❓ How do Data Annotations compare to FluentValidation for ASP.NET Core model validation? When would you prefer one over the other? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Probe architecture-level validation thinking._

### Advanced Scenarios
- ❓ How do you handle cross-field validation (e.g., `EndDate` must be after `StartDate`) in a clean way? `[INFERRED]`
- ❓ In a microservices architecture, how do you avoid duplicating validation logic across services? `[INFERRED]`
- ❓ How do you validate inputs against business rules that require a database query (e.g., "this email is not already registered")? Where should that logic live? `[INFERRED]`
- ❓ What is the Specification pattern and how does it help model complex validation rules? `[INFERRED]`
