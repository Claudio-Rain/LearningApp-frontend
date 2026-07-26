# L1 How do you perform initial validation for method arguments?

Validating method arguments at the entry point of a method is called **guard clause** or **defensive programming**. It makes contracts explicit, fails fast, and produces clear error messages rather than cryptic exceptions later in the call stack.

## Null checks

```csharp
public void ProcessOrder(Order order)
{
    if (order is null)
        throw new ArgumentNullException(nameof(order));

    // Safe to use order here
}
```

In .NET 6+ you can use the one-liner:

```csharp
ArgumentNullException.ThrowIfNull(order);
```

## Empty or whitespace string checks

```csharp
public void SetUsername(string username)
{
    if (string.IsNullOrWhiteSpace(username))
        throw new ArgumentException("Username must not be empty or whitespace.", nameof(username));
}
```

## Range checks (numeric)

```csharp
public void SetDiscount(decimal percent)
{
    if (percent < 0 || percent > 100)
        throw new ArgumentOutOfRangeException(nameof(percent), percent,
            "Discount must be between 0 and 100.");
}
```

In .NET 8+ the `ArgumentOutOfRangeException` helper methods cover common patterns:

```csharp
ArgumentOutOfRangeException.ThrowIfNegative(percent);
ArgumentOutOfRangeException.ThrowIfGreaterThan(percent, 100m);
```

## Greater-than / Less-than constraints

```csharp
public DateRange(DateTime start, DateTime end)
{
    if (end <= start)
        throw new ArgumentException("End must be strictly after Start.", nameof(end));
}

public void SetAge(int age)
{
    ArgumentOutOfRangeException.ThrowIfLessThan(age, 0);
    ArgumentOutOfRangeException.ThrowIfGreaterThan(age, 150);
}
```

## Collection / string length checks

```csharp
public void SetTags(IReadOnlyList<string> tags)
{
    ArgumentNullException.ThrowIfNull(tags);

    if (tags.Count == 0)
        throw new ArgumentException("At least one tag is required.", nameof(tags));

    if (tags.Count > 20)
        throw new ArgumentException("No more than 20 tags are allowed.", nameof(tags));
}
```

## Reusable guard helper class

For larger codebases it is common to centralise guards in a static helper:

```csharp
public static class Guard
{
    public static T NotNull<T>(T? value, string paramName) where T : class
    {
        if (value is null)
            throw new ArgumentNullException(paramName);
        return value;
    }

    public static string NotNullOrWhiteSpace(string? value, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Value must not be null or whitespace.", paramName);
        return value;
    }

    public static T InRange<T>(T value, T min, T max, string paramName)
        where T : IComparable<T>
    {
        if (value.CompareTo(min) < 0 || value.CompareTo(max) > 0)
            throw new ArgumentOutOfRangeException(paramName, value,
                $"Value must be between {min} and {max}.");
        return value;
    }
}

// Usage
public Product(string name, decimal price, int stock)
{
    Name  = Guard.NotNullOrWhiteSpace(name, nameof(name));
    Price = Guard.InRange(price, 0m, 1_000_000m, nameof(price));
    Stock = Guard.InRange(stock, 0, int.MaxValue, nameof(stock));
}
```

## Using FluentValidation for complex argument validation

When validation logic is more involved, **FluentValidation** provides a clean, testable DSL:

```csharp
public class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0).LessThanOrEqualTo(1000);
        RuleFor(x => x.DeliveryDate).GreaterThan(DateTime.UtcNow);
    }
}

// In the service
var result = _validator.Validate(command);
if (!result.IsValid)
    throw new ValidationException(result.Errors);
```

## Key principles

- Always validate **at the entry point** of a method, before any logic runs.
- Throw the most specific exception type: `ArgumentNullException`, `ArgumentOutOfRangeException`, `ArgumentException`.
- Pass `nameof(parameter)` so the exception message names the offending parameter.
- Fail **fast and loudly** — silent failures are harder to debug than early exceptions.
