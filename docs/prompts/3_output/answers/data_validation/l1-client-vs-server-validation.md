# L1 What is the difference between client-side and server-side validation, and why do you always need both?

## Overview

**Client-side validation** runs in the user's browser (or mobile app) before data is sent to the server. **Server-side validation** runs on the backend after the data arrives. Both layers are required — they serve different purposes and neither can fully replace the other.

---

## Client-Side Validation

Runs in the UI layer (JavaScript, HTML5 attributes, framework validators, etc.).

**Purpose:** Improve user experience by giving immediate feedback without a round-trip to the server.

**Characteristics:**
- Fast — no network call required
- Reduces unnecessary server load
- Can be bypassed (browser DevTools, `curl`, Postman, etc.)
- Not a security boundary

**Example (HTML5):**
```html
<input type="email" required maxlength="100" />
```

---

## Server-Side Validation

Runs in the backend (e.g., ASP.NET Core, middleware, domain logic).

**Purpose:** Enforce correctness, security, and business rules. This is the authoritative validation layer.

**Characteristics:**
- Cannot be bypassed by the client
- Has access to the database and business context
- Slower (involves a network round-trip), but necessary
- Must always exist, regardless of what the client does

**Example (ASP.NET Core Data Annotations):**
```csharp
public class CreateUserRequest
{
    [Required]
    [MaxLength(100)]
    [EmailAddress]
    public string Email { get; set; }

    [Required]
    [MinLength(8)]
    public string Password { get; set; }
}
```

ASP.NET Core automatically validates this model and returns a `400 Bad Request` if the model state is invalid (when using `[ApiController]`).

---

## Why You Always Need Both

| Concern                  | Client-Side | Server-Side |
|--------------------------|-------------|-------------|
| User experience (UX)     | Yes         | No          |
| Security enforcement     | No          | Yes         |
| Business rule validation | Partial     | Yes         |
| Bypassable               | Yes         | No          |
| Database access          | No          | Yes         |

**Security rule:** Never trust client-sent data. A malicious user can:
- Disable JavaScript in the browser
- Send raw HTTP requests with arbitrary payloads
- Manipulate DOM elements to remove validation attributes

Even if client-side validation is perfect, server-side validation must independently verify every piece of incoming data.

---

## Key Takeaway

Client-side validation is a **UX feature**. Server-side validation is a **security and correctness requirement**. Skipping server-side validation is a critical security vulnerability. Skipping client-side validation results in poor usability.
