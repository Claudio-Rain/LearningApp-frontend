# L2 How do you validate complex or nested objects, and how do you aggregate multiple validation errors into a structured response?

## Overview

Real-world request models often contain nested objects, collections, and cross-property rules. Both Data Annotations and FluentValidation support nested validation, but FluentValidation gives you much more control. The goal is to collect **all** errors at once and return them as a structured response rather than failing on the first error.

---

## Nested Object Validation with Data Annotations

Data Annotations validates nested objects only if you apply `[ValidateNever]` exclusions carefully and — crucially — mark the nested property with `[Required]`. ASP.NET Core does **not** recurse into nested objects automatically unless you use `IValidatableObject` or enable recursive validation manually.

```csharp
public class OrderRequest
{
    [Required]
    public string OrderNumber { get; set; }

    [Required]
    public AddressDto ShippingAddress { get; set; }
}

public class AddressDto : IValidatableObject
{
    [Required]
    public string Street { get; set; }

    [Required]
    public string City { get; set; }

    [Required]
    [RegularExpression(@"^\d{5}$", ErrorMessage = "ZipCode must be 5 digits.")]
    public string ZipCode { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        // Additional cross-property logic can go here
        yield break;
    }
}
```

**Limitation:** `ModelState` collects errors for all annotated properties, but complex conditional or cross-property rules require `IValidatableObject`, which is cumbersome.

---

## Nested Object Validation with FluentValidation

FluentValidation handles nested objects cleanly with `SetValidator`:

```csharp
public class OrderRequestValidator : AbstractValidator<OrderRequest>
{
    public OrderRequestValidator()
    {
        RuleFor(x => x.OrderNumber)
            .NotEmpty()
            .MaximumLength(50);

        RuleFor(x => x.ShippingAddress)
            .NotNull()
            .SetValidator(new AddressDtoValidator());
    }
}

public class AddressDtoValidator : AbstractValidator<AddressDto>
{
    public AddressDtoValidator()
    {
        RuleFor(x => x.Street).NotEmpty().MaximumLength(200);
        RuleFor(x => x.City).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ZipCode)
            .NotEmpty()
            .Matches(@"^\d{5}$")
            .WithMessage("ZipCode must be 5 digits.");
    }
}
```

Errors from the nested validator are prefixed with the property path (e.g., `ShippingAddress.ZipCode`), giving clients precise error locations.

---

## Validating Collections

```csharp
public class CartRequest
{
    public List<CartItemDto> Items { get; set; }
}

public class CartRequestValidator : AbstractValidator<CartRequest>
{
    public CartRequestValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty()
            .WithMessage("Cart must have at least one item.");

        RuleForEach(x => x.Items)
            .SetValidator(new CartItemDtoValidator());
    }
}

public class CartItemDtoValidator : AbstractValidator<CartItemDto>
{
    public CartItemDtoValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0);
    }
}
```

Errors for collection items are keyed by index: `Items[0].Quantity`, `Items[2].ProductId`, etc.

---

## Aggregating All Errors — Not Failing on the First

By default, FluentValidation collects **all** rule failures before returning. You do not need to configure anything extra for this behavior.

If you want to stop after the first failure for a specific property, use `CascadeMode`:

```csharp
RuleFor(x => x.Email)
    .Cascade(CascadeMode.Stop)   // stop at first failure for this property
    .NotEmpty()
    .EmailAddress()
    .MaximumLength(100);
```

For overall validator behavior:

```csharp
public class MyValidator : AbstractValidator<MyModel>
{
    public MyValidator()
    {
        // Stop all rules after first failure (rarely desired for APIs)
        RuleLevelCascadeMode = CascadeMode.Stop;
    }
}
```

---

## Structured Error Response

When FluentValidation (or Data Annotations via `[ApiController]`) fails validation, ASP.NET Core returns a `ValidationProblemDetails` response automatically:

```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "ShippingAddress.ZipCode": ["ZipCode must be 5 digits."],
    "Items[0].Quantity": ["'Quantity' must be greater than '0'."],
    "OrderNumber": ["'Order Number' must not be empty."]
  }
}
```

Each key is the property path; each value is an array of error messages for that property. This structure lets clients display field-level errors directly in the UI.

---

## Manual Aggregation (Service Layer)

When validation happens inside a service rather than at the controller boundary:

```csharp
var validator = new OrderRequestValidator();
ValidationResult result = validator.Validate(order);

if (!result.IsValid)
{
    var errors = result.Errors
        .GroupBy(e => e.PropertyName)
        .ToDictionary(
            g => g.Key,
            g => g.Select(e => e.ErrorMessage).ToArray()
        );

    return BadRequest(new { errors });
}
```

---

## Key Takeaways

- Use `SetValidator` for nested objects and `RuleForEach` for collections.
- FluentValidation aggregates all errors by default — you get a complete picture in one request.
- Property paths (`Parent.Child[0].Field`) give clients precise error locations.
- The standard `ValidationProblemDetails` format is the expected shape for ASP.NET Core API validation errors.
