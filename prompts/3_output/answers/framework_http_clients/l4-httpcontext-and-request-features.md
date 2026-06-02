# L4 How do you work with `HttpContext` and Request Features directly in a custom component?

## Answer

`HttpContext` is the high-level API most code uses. Under the hood it is backed by `IFeatureCollection`, a dictionary of feature interfaces that the server (Kestrel, IIS, TestServer) populates. You reach into `IFeatureCollection` directly only when `HttpContext` doesn't expose what you need, or when you are writing low-level infrastructure code.

### Accessing features from `HttpContext`

```csharp
// Inside middleware, a filter, or any component that has HttpContext
public async Task InvokeAsync(HttpContext context, RequestDelegate next)
{
    // Via HttpContext properties (the normal way)
    string method = context.Request.Method;
    string path   = context.Request.Path;

    // Directly from the feature collection (low-level)
    var requestFeature = context.Features.Get<IHttpRequestFeature>();
    string rawTarget = requestFeature?.RawTarget;  // not exposed on HttpContext.Request

    await next(context);
}
```

### Accessing `HttpContext` in a custom service

Inject `IHttpContextAccessor` — do not capture `HttpContext` in a field, as it is scoped to one request:

```csharp
public class AuditService
{
    private readonly IHttpContextAccessor _accessor;

    public AuditService(IHttpContextAccessor accessor)
        => _accessor = accessor;

    public string GetClientIp()
    {
        var context = _accessor.HttpContext;
        return context?.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
```

Register in `Program.cs`:

```csharp
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AuditService>();
```

### When to use `IFeatureCollection` instead of `HttpContext` properties

| Situation | Use |
|---|---|
| Need `RawTarget`, `Protocol`, or raw headers not on `HttpContext.Request` | `IHttpRequestFeature` |
| Need to swap the response body stream (e.g., for compression) | `IHttpResponseBodyFeature` |
| Need connection info beyond `HttpContext.Connection` | `IHttpConnectionFeature` |
| Writing a middleware that must work across Kestrel and IIS with different capabilities | Feature presence check (`Features.Get<T>() != null`) |
| Normal application code | Always prefer `HttpContext` properties |

### Setting a feature (advanced)

```csharp
// Replace the response body with a custom stream
var responseBodyFeature = context.Features.Get<IHttpResponseBodyFeature>();
// wrap or replace as needed
```

### Key rule

Prefer `HttpContext` for everything readable through its properties. Drop down to `IFeatureCollection` only for capabilities that `HttpContext` doesn't surface or when writing infrastructure that must be server-agnostic.
