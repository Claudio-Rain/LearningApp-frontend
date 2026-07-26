# L2 Third-party validation library vs. custom validation logic: pros and cons

## Overview

When building validation in a C# application you have two main approaches:

1. **Custom validation** — write guard clauses, helper methods, or dedicated validator classes by hand.
2. **Third-party library** — use a well-established package such as **FluentValidation**, **DataAnnotations**, or **Ardalis.GuardClauses**.

Neither approach is universally superior. The right choice depends on complexity, team size, and how much the domain evolves.

---

## Third-party validation library

### Pros

| Benefit | Detail |
|---|---|
| **Reduced boilerplate** | The library provides a DSL or attribute model so you write less repetitive code. |
| **Battle-tested rules** | Common rules (email, credit card, length, range) are already implemented and tested. |
| **Consistency** | All validation follows a single pattern; new team members learn one way to validate. |
| **Rich error messages** | Libraries produce structured error collections — useful for returning detailed API responses. |
| **Testability** | Validators are separate classes that are easy to unit-test in isolation. |
| **Composability** | Rules can be shared, inherited, and combined across validators. |
| **Async support** | Libraries like FluentValidation support async rule execution (e.g., database uniqueness checks). |

### Cons

| Drawback | Detail |
|---|---|
| **External dependency** | Adds a package that can have breaking changes, security advisories, or be abandoned. |
| **Learning curve** | Teams must learn the library's API and idioms before being productive. |
| **Magic / obscurity** | Complex rule chains can be harder to read at a glance than explicit `if` statements. |
| **Over-engineering risk** | For simple scripts or small utilities a full validation framework is overkill. |
| **Mismatch with domain** | Generic libraries may not express highly specific business rules as clearly as hand-written code. |

---

## Custom validation logic

### Pros

| Benefit | Detail |
|---|---|
| **No dependency** | The code has no external coupling and will not break due to a library upgrade. |
| **Full control** | Every rule is explicit; behaviour is exactly what you write. |
| **Readable intent** | A well-named guard clause (`EnsurePositive(quantity)`) can be clearer than a fluent chain. |
| **Domain alignment** | Complex domain rules are often simpler to express as plain C# than to map onto a generic API. |
| **Lightweight** | Zero overhead from reflection or expression trees used by some libraries. |

### Cons

| Drawback | Detail |
|---|---|
| **More code** | Common rules (email regex, range, null) must be written and maintained yourself. |
| **Inconsistency** | Different developers write validation differently, leading to mixed styles. |
| **Error aggregation is hard** | Collecting all validation errors (rather than failing on the first) requires manual plumbing. |
| **No structured error model** | Producing a machine-readable error response (field name + message) needs extra work. |
| **Reinventing the wheel** | You may reproduce bugs that existing libraries already fixed (e.g., edge cases in regex). |

---

## Practical guidance

| Scenario | Recommended approach |
|---|---|
| Simple CRUD API | Data Annotations (`[Required]`, `[MaxLength]`) + minimal guard clauses |
| Complex domain with many rules | FluentValidation — separate validator classes per command/request |
| Library / NuGet package | Custom guards (Ardalis.GuardClauses or hand-written) — avoid forcing consumers to take a validation framework |
| Performance-critical hot path | Custom inline checks — avoid reflection-heavy libraries |
| Large team with many models | FluentValidation — enforces a single validation pattern |

---

## Code comparison

### Custom guard clause approach

```csharp
public class OrderService
{
    public void PlaceOrder(string productId, int quantity, decimal unitPrice)
    {
        if (string.IsNullOrWhiteSpace(productId))
            throw new ArgumentException("Product ID is required.", nameof(productId));

        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be positive.");

        if (unitPrice < 0)
            throw new ArgumentOutOfRangeException(nameof(unitPrice), "Unit price must not be negative.");

        // business logic...
    }
}
```

### FluentValidation approach

```csharp
using FluentValidation;

public class PlaceOrderCommand
{
    public string ProductId { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class PlaceOrderValidator : AbstractValidator<PlaceOrderCommand>
{
    public PlaceOrderValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.UnitPrice).GreaterThanOrEqualTo(0);
    }
}

// Usage
var validator = new PlaceOrderValidator();
var result = await validator.ValidateAsync(command);

if (!result.IsValid)
{
    // result.Errors contains field names and messages — ideal for API responses
    throw new ValidationException(result.Errors);
}
```

### Data Annotations approach (ASP.NET Core model binding)

```csharp
public class PlaceOrderRequest
{
    [Required]
    [MaxLength(50)]
    public string ProductId { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be positive.")]
    public int Quantity { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Unit price must not be negative.")]
    public decimal UnitPrice { get; set; }
}
```

---

## Summary

Use a **third-party library** (FluentValidation) when you have many models, need structured error responses, or want a consistent pattern across a team. Use **custom validation** for simple guard clauses at the domain/service level, for performance-sensitive code, or when writing a library that should have minimal dependencies. In practice, most applications use **both**: Data Annotations or FluentValidation at the API layer, and hand-written guard clauses inside domain objects.
