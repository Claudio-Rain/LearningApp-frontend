# Interview Questions: Data Validation

## Coverage map

| Item | Type | Level |
|------|------|-------|
| What are the most common validation types? | `[FROM JD]` | 1 |
| Why is it important to validate user inputs? | `[FROM JD]` | 1 |
| Pros and cons of using third-party validation libraries | `[FROM JD]` | 6 |
| Validates phone numbers (parse, format, validate) | `[FROM JD]` | 3 |
| Validates date and time strings | `[FROM JD]` | 3 |
| Validates emails | `[FROM JD]` | 2 |
| Validates domains | `[FROM JD]` | 3 |
| Validates IP addresses (IPv4 / IPv6) | `[FROM JD]` | 3 |
| Validates currency strings | `[FROM JD]` | 3 |
| Validates credit card numbers | `[FROM JD]` | 4 |
| Validates IBANs | `[FROM JD]` | 4 |
| Method argument guards (null, empty, range, comparisons) | `[FROM JD]` | 2 |
| Client-side vs server-side validation | `[INFERRED]` | 2 |
| Validation vs sanitization distinction | `[INFERRED]` | 2 |
| Regex limitations and catastrophic backtracking | `[INFERRED]` | 5 |
| Schema-based vs imperative validation | `[INFERRED]` | 6 |
| Internationalisation challenges in validation | `[INFERRED]` | 5 |
| Validation in distributed / microservice systems | `[INFERRED]` | 7 |
| Designing a custom validation framework | `[INFERRED]` | 7 |
| Debugging a silent validation bypass scenario | `[INFERRED]` | 4 |

---

## Level 1 — Definition & Basics

_Goal: Confirm the candidate understands what data validation is, why it exists, and can name the primary categories._

### Foundations

- ❓ How would you define data validation to a junior developer joining your team? What distinguishes it from data sanitization? `[INFERRED]`
- ❓ What are the most common categories of validation (e.g., presence, format, type, range, uniqueness, business-rule)? Give a concrete example for each. `[FROM JD]`
- ❓ Why is it important to validate user inputs, and what are the consequences of skipping it — both from a security perspective and a data-integrity perspective? `[FROM JD]`
- ❓ Where in an application stack should validation occur — frontend, backend, database layer — and why might validating in only one place be risky? `[INFERRED]`

### Trade-off

- ❓ If you had to choose between strict validation that rejects any ambiguous input and lenient validation that tries to interpret it, which would you favour and why? What are the trade-offs for the end user versus the developer? `[INFERRED]`

---

## Level 2 — Core Concepts

_Goal: Probe understanding of how validation is structured in code and the key distinctions every practitioner must know._

### Client-side vs Server-side

- ❓ Explain the difference between client-side and server-side validation. Why is client-side validation insufficient on its own, even if it provides a better user experience? `[INFERRED]`
- ❓ What security vulnerabilities can arise if you rely solely on HTML5 `required` / `pattern` attributes without server-side checks? `[INFERRED]`

### Email Validation

- ❓ How would you validate an email address? Walk through the rules an email address must satisfy according to RFC 5321/5322 — and which of those rules are commonly ignored in practice. `[FROM JD]`
- ❓ What would happen if you used the regex `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$` to validate emails in production? Which valid addresses would it incorrectly reject? `[INFERRED]`

### Method Argument Guards

- ❓ What is a guard clause, and how does it differ from validation in a service layer? Write pseudocode for a method that receives a `userId` (integer), an `amount` (decimal), and a `currencyCode` (string), and performs appropriate argument validation before executing business logic. `[FROM JD]`
- ❓ How should you handle validation failures inside a library method that is called by both internal code and external consumers — throw an exception, return a result object, or something else? Justify your choice. `[FROM JD]`

### Trade-off

- ❓ Validation vs sanitization: a teammate argues "just sanitize inputs and you don't need to validate." How do you respond? Where does each technique fall short when used alone? `[INFERRED]`

---

## Level 3 — Practical Usage

_Goal: Assess hands-on ability to implement common validation routines correctly and handle edge cases._

### Phone Numbers

- ❓ How would you parse, format, and validate an internationally dialled phone number? What library or standard would you reach for, and why is a simple regex like `^\+?[0-9]{7,15}$` dangerous to rely on? `[FROM JD]`
- ❓ A user submits the string `"(800) 555-0199"`. Walk through every step your code would take to normalise it to E.164 format (`+18005550199`). What are the possible failure modes? `[FROM JD]`

### Date and Time Strings

- ❓ What are the key challenges when validating a date/time string submitted by a user (consider format ambiguity, time zones, leap years, and locale)? How would you approach validating `"02/03/2025"` when users can be from the US or Europe? `[FROM JD]`
- ❓ How would you validate that a booking end-date is after the start-date while also ensuring neither is in the past — and that the validation logic stays consistent across a React frontend and a Node.js backend? `[INFERRED]`

### Domains and IP Addresses

- ❓ What rules define a valid fully-qualified domain name (FQDN)? How would your validation differ between accepting a user-supplied hostname for a DNS record versus accepting a URL typed into a browser? `[FROM JD]`
- ❓ How do you validate an IPv4 address versus an IPv6 address? Why is the regex `\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}` insufficient for IPv4 validation? `[FROM JD]`
- ❓ A user enters `"2001:db8::1"` as an IP address. Is this valid? What edge cases does IPv6 introduce that IPv4 does not? `[FROM JD]`

### Currency Strings

- ❓ How would you validate a currency amount string like `"$1,234.56"` or `"1.234,56 €"`? What locale-specific considerations must you account for, and how would you normalise the value before storing it? `[FROM JD]`
- ❓ What is the risk of using floating-point arithmetic after parsing a currency string, and what data type or technique should you use instead? `[INFERRED]`

### Trade-off

- ❓ For validating phone numbers you could write your own regex or use a library like `libphonenumber`. What are the concrete pros and cons of each approach in a high-throughput production system? `[FROM JD]`

---

## Level 4 — Common Pitfalls

_Goal: Surface awareness of subtle bugs and dangerous assumptions practitioners frequently make._

### Credit Card Numbers

- ❓ How does the Luhn algorithm work, and why is passing the Luhn check a necessary but not sufficient condition for a credit card number to be valid? What additional checks are required? `[FROM JD]`
- ❓ A QA engineer reports that the credit card validator accepts `"4111 1111 1111 1111"` but rejects `"4111111111111111"`. Where is the bug most likely located, and how would you fix it? `[FROM JD]`
- ❓ Should you store raw credit card numbers after validation? If not, what must happen immediately after validation succeeds? `[INFERRED]`

### IBANs

- ❓ Describe the structure of an IBAN and the validation algorithm (MOD 97). Why can't you validate an IBAN with a single regex? `[FROM JD]`
- ❓ A user from Germany submits `"DE89 3704 0044 0532 0130 00"`. Walk through every step of the validation: length check, character set, rearrangement, and MOD 97 calculation. `[FROM JD]`
- ❓ What is the difference between a structurally valid IBAN and a real, active bank account — and how does this affect what you communicate to the user after validation? `[INFERRED]`

### Debugging Scenario

- ❓ A production bug report states: "Some users are bypassing email validation and registering with clearly invalid addresses." You inspect the signup endpoint and the validation looks correct. What are the five most likely root causes, and how would you diagnose each one systematically? `[INFERRED]`

### Trade-off

- ❓ Your team debates whether to validate on the domain model (always enforce invariants in the object constructor) versus validating in a dedicated application-service layer. What are the architectural trade-offs of each approach? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics

_Goal: Test deep understanding of how validation tools work under the hood and where they break down._

### Regex Internals

- ❓ What is catastrophic backtracking in a regular expression engine, and how can a poorly written email or URL validation regex become a denial-of-service vector (ReDoS)? Construct a minimal example. `[INFERRED]`
- ❓ How do possessive quantifiers and atomic groups prevent catastrophic backtracking? Are these features available in the regex engine of your primary language? `[INFERRED]`

### Internationalisation

- ❓ Why is phone-number validation inherently locale-dependent? Describe a case where the same digit string is a valid number in one country but invalid in another, and explain how a library like Google's `libphonenumber` resolves this. `[FROM JD]`
- ❓ Many validation libraries struggle with non-Latin scripts in domain names (IDN / Punycode). How does Punycode work, and what additional validation steps are needed when accepting internationalised domain names? `[FROM JD]`
- ❓ How would date validation behave differently for the Iranian Solar Hijri calendar versus the Gregorian calendar, and what does this imply about the assumptions baked into most validation libraries? `[INFERRED]`

### Trade-off

- ❓ A regex-based email validator runs in O(n) time and has zero dependencies. A full RFC 5321-compliant parser is accurate but significantly more complex. For a public-facing sign-up form with 50 k submissions per day, which would you recommend, and what exact trade-offs drive that decision? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions

_Goal: Evaluate the candidate's ability to reason about architectural decisions and library selection._

### Third-party Validation Libraries

- ❓ What are the main advantages of adopting a third-party validation library (e.g., Zod, Joi, Yup, FluentValidation) versus writing custom validation logic? `[FROM JD]`
- ❓ What are the risks and downsides of depending on a third-party validation library in a long-lived production system? How do you mitigate them? `[FROM JD]`
- ❓ You are evaluating two libraries: Library A has 10 M weekly downloads and was last updated two years ago; Library B has 500 k downloads and is actively maintained. What factors beyond download count and recency would guide your decision? `[INFERRED]`

### Schema-based vs Imperative Validation

- ❓ Compare schema-based validation (e.g., JSON Schema, Zod) with imperative validation (custom if/else/throw code). In what scenarios does each approach excel, and when does the other become a liability? `[INFERRED]`
- ❓ How would you design a validation layer that can be shared between a TypeScript frontend and a Node.js backend without duplicating rules? What are the trade-offs of that approach? `[INFERRED]`

### Trade-off

- ❓ Your team is building a public REST API consumed by third-party developers. Should validation error messages be verbose and descriptive, or terse and opaque? Discuss the security, usability, and developer-experience trade-offs. `[INFERRED]`

---

## Level 7 — Advanced & Expert

_Goal: Separate candidates who can architect validation at scale from those who can only implement it._

### Distributed Systems

- ❓ In a microservices architecture, multiple services each validate overlapping fields (e.g., email format, phone number). How do you prevent validation logic from drifting between services over time? What patterns — shared library, schema registry, API gateway validation — would you consider, and what are their trade-offs? `[INFERRED]`
- ❓ How does eventual consistency complicate uniqueness validation (e.g., "this email must not already be registered")? What strategies exist to handle race conditions, and what guarantees can each actually provide? `[INFERRED]`
- ❓ You are designing a validation pipeline for a financial platform that must validate IBANs, credit card numbers, and currency amounts at 100 k requests per second with a P99 latency budget of 10 ms. What would your architecture look like? Where would you cache, pre-compile, or parallelise? `[FROM JD]`

### Designing a Validation Framework

- ❓ Walk me through designing a composable, extensible validation framework from scratch. How would you model validators, composition (AND/OR/NOT), error messages, and context-dependent rules (e.g., a field is required only when another field has a specific value)? `[INFERRED]`
- ❓ How would you make the framework internationalisation-aware so that error messages and format rules adapt to the user's locale without spreading locale logic throughout the codebase? `[INFERRED]`

### Trade-off

- ❓ Some teams push all validation to the database layer (constraints, triggers, stored procedures) and skip application-level validation entirely. What are the advantages and the severe limitations of this approach, particularly around user-facing error messages, testability, and performance? `[INFERRED]`
- ❓ As a principal engineer, you must decide whether the organisation should standardise on a single validation library across all teams and languages or allow each team to choose their own. Make the case for both sides, then give your final recommendation with justification. `[INFERRED]`
