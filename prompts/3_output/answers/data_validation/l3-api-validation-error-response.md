# L3 How do you handle validation in an ASP.NET Core API and return structured, client-friendly error responses?

## Overview

A production-quality ASP.NET Core API needs a consistent, predictable validation error format. The standard approach combines the `[ApiController]` attribute (automatic model-state validation), RFC 7807 `ProblemDetails`, and optionally FluentValidation — all wired together so every validation failure returns the same shape regardless of where it originates.

---

## Default Behavior with `[ApiController]`

When a controller is decorated with `[ApiController]`, ASP.NET Core automatically validates the model and short-circuits the action with a `400 Bad Request` before your code runs. The response body is a `ValidationProblemDetails` object:

```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "traceId": "00-abc123...",
  "errors": {
    "Email": ["The Email field is not a valid e-mail address."],
    "Password": ["The Password field is required."]
  }
}
```

This requires zero configuration — it is on by default for `[ApiController]`.

---

## Customizing the Validation Response

You can override the default factory in `Program.cs` to add extra fields, change the format, or map errors differently:

```csharp
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(e => e.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors
                              .Select(e => e.ErrorMessage)
                              .ToArray()
                );

            var problem = new ValidationProblemDetails(context.ModelState)
            {
                Type    = "https://tools.ietf.org/html/rfc7807",
                Title   = "Validation failed.",
                Status  = StatusCodes.Status400BadRequest,
                Detail  = "One or more fields contain invalid data.",
                Instance = context.HttpContext.Request.Path
            };

            problem.Extensions["traceId"] =
                context.HttpContext.TraceIdentifier;

            return new BadRequestObjectResult(problem)
            {
                ContentTypes = { "application/problem+json" }
            };
        };
    });
```

---

## Integrating FluentValidation

```bash
dotnet add package FluentValidation.AspNetCore
```

```csharp
// Program.cs
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
```

FluentValidation populates `ModelState` with its errors, so the same `InvalidModelStateResponseFactory` handles them automatically — no separate error-handling path needed.

```csharp
public class CreateOrderValidator : AbstractValidator<CreateOrderRequest>
{
    private readonly IOrderRepository _repo;

    public CreateOrderValidator(IOrderRepository repo)
    {
        _repo = repo;

        RuleFor(x => x.ProductId)
            .NotEmpty()
            .MustAsync(async (id, ct) => await _repo.ExistsAsync(id, ct))
            .WithMessage("Product not found.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0)
            .LessThanOrEqualTo(100);
    }
}
```

Async rules (e.g., database existence checks) are fully supported and still flow through the same response pipeline.

---

## Global Exception Middleware for Unhandled Validation

For validation errors thrown from the service or domain layer (outside the controller boundary), add a global middleware:

```csharp
public class ValidationExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public ValidationExceptionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)   // FluentValidation.ValidationException
        {
            context.Response.StatusCode  = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/problem+json";

            var errors = ex.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(e => e.ErrorMessage).ToArray()
                );

            var problem = new ValidationProblemDetails(errors)
            {
                Title    = "Validation failed.",
                Status   = StatusCodes.Status400BadRequest,
                Instance = context.Request.Path
            };

            await context.Response.WriteAsJsonAsync(problem);
        }
    }
}

// Program.cs — register before UseRouting
app.UseMiddleware<ValidationExceptionMiddleware>();
```

Alternatively, use a global exception handler via `app.UseExceptionHandler` or a library like `ErrorOr` / `ProblemDetails` middleware in .NET 8+.

---

## .NET 8+ Built-in ProblemDetails Service

.NET 8 introduced `IProblemDetailsService`, which standardizes error responses across the pipeline:

```csharp
builder.Services.AddProblemDetails();

app.UseExceptionHandler();
app.UseStatusCodePages();
```

This catches unhandled exceptions and status codes (404, 500, etc.) and formats them as `ProblemDetails` automatically, reducing boilerplate.

---

## Consistent Error Response Shape

No matter where validation fails — model binding, FluentValidation, or domain logic — clients should always receive the same envelope:

```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Validation failed.",
  "status": 400,
  "instance": "/api/orders",
  "traceId": "00-4bf3a...",
  "errors": {
    "ProductId": ["Product not found."],
    "Quantity":  ["'Quantity' must be greater than '0'."]
  }
}
```

Keys in `errors` match property names exactly, so frontend code can map them directly to form fields without any transformation.

---

## Summary of the Stack

| Layer                         | Mechanism                                  |
|------------------------------|--------------------------------------------|
| Controller input              | `[ApiController]` + model binding          |
| Attribute-based rules         | Data Annotations                           |
| Code-based rules              | FluentValidation + `AutoValidation`        |
| Domain/service layer errors   | `ValidationException` + global middleware  |
| Response format               | `ValidationProblemDetails` (RFC 7807)      |
| Unhandled exceptions          | `UseExceptionHandler` / `AddProblemDetails`|

The key principle: **one response shape for all validation errors, at every layer**, so clients never need special-case handling.
