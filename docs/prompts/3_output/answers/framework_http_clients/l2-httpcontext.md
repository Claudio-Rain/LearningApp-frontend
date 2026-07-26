# L2 — What is `HttpContext` in ASP.NET Core, and how can it be accessed inside a custom component such as a service or a filter?

## Answer

`HttpContext` is the central object that represents a single HTTP request/response cycle in ASP.NET Core. It gives you access to:

| Property | What it contains |
|---|---|
| `Request` | Method, path, query string, headers, body, form data, cookies |
| `Response` | Status code, headers, body stream, cookies |
| `User` | The authenticated `ClaimsPrincipal` |
| `Items` | A per-request `IDictionary<object, object?>` for sharing data across middleware |
| `Features` | Low-level `IFeatureCollection` (Kestrel internals, upgrade features, etc.) |
| `RequestAborted` | A `CancellationToken` fired when the client disconnects |
| `TraceIdentifier` | A unique string ID for the request, useful in logs |
| `Connection` | Remote/local IP, port, client certificate |

### Accessing HttpContext in Different Component Types

#### 1. Middleware — injected directly

```csharp
public class MyMiddleware
{
    private readonly RequestDelegate _next;
    public MyMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)  // ← injected by the pipeline
    {
        var path = context.Request.Path;
        await _next(context);
    }
}
```

#### 2. Controller / Razor Page — available as `this.HttpContext`

```csharp
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    public IActionResult Get()
    {
        var userId = HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Ok(userId);
    }
}
```

#### 3. Action Filter — provided via `ActionExecutingContext`

```csharp
public class MyFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        var httpCtx = context.HttpContext;   // ← from the filter context
        // inspect or short-circuit
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
```

#### 4. Scoped / Transient Service — via `IHttpContextAccessor`

Services registered in DI do not receive `HttpContext` directly. Inject `IHttpContextAccessor` and access `HttpContext` through it.

```csharp
// Registration (Program.cs)
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IOrderService, OrderService>();

// Service
public class OrderService : IOrderService
{
    private readonly IHttpContextAccessor _accessor;

    public OrderService(IHttpContextAccessor accessor)
        => _accessor = accessor;

    public string GetCurrentUserId()
    {
        var ctx = _accessor.HttpContext
            ?? throw new InvalidOperationException("No active HTTP context.");
        return ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    }
}
```

> **Warning:** `IHttpContextAccessor` uses `AsyncLocal<T>` internally. Capturing `HttpContext` in a long-lived background task (e.g., `Task.Run`) is dangerous — the context may be recycled or nulled out by the time the task runs. Copy the needed data out of `HttpContext` before starting the background work.

### Key Takeaways

- In middleware, `HttpContext` is a method parameter — always prefer this over `IHttpContextAccessor` in middleware.
- In filters, use the context object provided by the filter stage.
- In controllers, `HttpContext` is a property of `ControllerBase`.
- In arbitrary services, use `IHttpContextAccessor` but be aware of its async-capture pitfalls.
- Never inject `IHttpContextAccessor` into a **singleton** service — the accessor is scoped to the request and calling it from a singleton can cause race conditions or stale context references.
