# Interview Questions: Data Validation

## Level 1

### Concepts
- L1 What are the most common types of data validation (e.g. type, range, format, presence)? `[FROM JD]`
- L1 Why is it important to validate user inputs, and what risks does skipping validation introduce? `[FROM JD]`
- L1 What is the difference between client-side and server-side validation, and why do you always need both?

### Basic Validation
- L1 How do you perform initial validation for method arguments — for example, checking that a value is not null, not empty, within a valid range, or satisfies a greater-than / less-than constraint? `[FROM JD]`

### Format Validation
- L1 How do you validate that a string represents a valid date or time, and how do you handle different formats or time zones? `[FROM JD]`
- L1 How do you validate an email address, and what edge cases must you account for? `[FROM JD]`

---

## Level 2

### Libraries & Patterns
- L2 What are the pros and cons of using a third-party validation library versus writing custom validation logic? `[FROM JD]`
- L2 What is FluentValidation and how does it compare to Data Annotations in ASP.NET Core?
- L2 How do you validate complex or nested objects, and how do you aggregate multiple validation errors into a structured response?

### Format Validation
- L2 How do you parse, format, and validate a phone number, including handling international formats and country codes? `[FROM JD]`
- L2 How do you validate a domain name, and what rules must a valid domain satisfy? `[FROM JD]`
- L2 How do you validate an IPv4 and IPv6 address, and what are the differences in their validation rules? `[FROM JD]`
- L2 How do you validate a currency string (e.g. "$1,234.56" or "EUR 1.234,56"), and how do you handle locale-specific formatting? `[FROM JD]`

---

## Level 3

### Advanced Validation
- L3 How do you handle validation in an ASP.NET Core API and return structured, client-friendly error responses?
- L3 How do you validate a credit card number, and how does the Luhn algorithm work? `[FROM JD]`
- L3 How do you validate an IBAN, including the country-specific length rules and the mod-97 checksum? `[FROM JD]`
