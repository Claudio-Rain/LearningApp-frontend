# L2 What is FluentValidation and how does it compare to Data Annotations in ASP.NET Core?

## Overview

ASP.NET Core supports two main approaches for validating models:

1. **Data Annotations** — attribute-based, built into the framework
2. **FluentValidation** — a third-party library that uses a fluent, code-based API

Both integrate with ASP.NET Core's model validation pipeline, but they differ significantly in flexibility and testability.

---

## Data Annotations

Validation rules are declared directly on the model class using attributes from `System.ComponentModel.DataAnnotations`.

```csharp
public class RegisterRequest
{
    [Required]
    [MaxLength(100)]
    [EmailAddress]
    public string Email { get; set; }

    [Required]
    [MinLength(8)]
    [MaxLength(64)]
    public string Password { get; set; }

    [Range(18, 120)]
    public int Age { get; set; }
}
```

**Pros:**
- Zero extra dependencies — built into .NET
- Simple and quick for basic scenarios
- Works automatically with `[ApiController]`

**Cons:**
- Rules are mixed into the model (violates Single Responsibility Principle)
- Complex conditional rules are awkward to express
- Hard to unit test in isolation
- Limited reuse across multiple models
- Cross-property validation (e.g., `EndDate > StartDate`) requires custom attributes

---

## FluentValidation

A separate library (`FluentValidation.AspNetCore`) where validation rules are defined in a dedicated validator class using a fluent API.

**Installation:**
```bash
dotnet add package FluentValidation.AspNetCore
```

**Registration (Program.cs):**
```csharp
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
```

**Validator class:**
```csharp
public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .MaximumLength(100)
            .EmailAddress();

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(64);

        RuleFor(x => x.Age)
            .InclusiveBetween(18, 120);
    }
}

public class RegisterRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
    public int Age { get; set; }
}
```

The model itself is now a clean POCO with no validation attributes.

---

## Conditional and Cross-Property Rules

FluentValidation makes complex rules straightforward:

```csharp
// Conditional rule
RuleFor(x => x.DiscountCode)
    .NotEmpty()
    .When(x => x.IsVipMember);

// Cross-property rule
RuleFor(x => x.EndDate)
    .GreaterThan(x => x.StartDate)
    .WithMessage("EndDate must be after StartDate.");
```

The same logic with Data Annotations would require a custom `ValidationAttribute` or `IValidatableObject` implementation.

---

## Comparison Table

| Feature                        | Data Annotations | FluentValidation |
|-------------------------------|------------------|------------------|
| Built-in, no extra package     | Yes              | No               |
| Separation of concerns         | No               | Yes              |
| Complex conditional rules      | Limited          | Full support     |
| Cross-property validation      | Awkward          | Easy             |
| Unit testable in isolation     | No               | Yes              |
| Async validation support       | No               | Yes              |
| Custom error messages per rule | Limited          | Full support     |
| Reusable rule sets             | No               | Yes              |

---

## Unit Testing a Validator

```csharp
[Fact]
public void Should_Fail_When_Email_Is_Empty()
{
    var validator = new RegisterRequestValidator();
    var request = new RegisterRequest { Email = "", Password = "Secret123", Age = 25 };

    var result = validator.Validate(request);

    Assert.False(result.IsValid);
    Assert.Contains(result.Errors, e => e.PropertyName == "Email");
}
```

---

## When to Use Each

- **Data Annotations** — simple CRUD models, small projects, or when you want zero extra dependencies.
- **FluentValidation** — complex business rules, conditional logic, cross-property constraints, or any project where testability and clean architecture matter.
