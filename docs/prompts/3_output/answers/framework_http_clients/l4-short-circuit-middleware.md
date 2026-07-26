# L4 How do you short-circuit the middleware pipeline, and what is the difference between short-circuiting and calling `next()`?

## Answer

### The Pipeline Model

ASP.NET Core builds the request pipeline as a chain of `RequestDelegate` instances. Each middleware receives the `HttpContext` and a `next` delegate pointing to the remainder of the chain. The middleware can either:

1. **Call `next(context)`** — pass control to the next component (pipeline continues).
2. **Not call `next(context)`** — handle the request itself and return (pipeline is short-circuited).

```
Request
  │
  ▼
[Middleware A] ──► calls next ──► [Middleware B] ──► calls next ──► [Endpoint]
                                        │
                               short-circuit here:
                               writes response, returns
                               (Middleware A after-next code still runs)
```

### Short-Circuiting vs. Calling `next()`

| Aspect | Calls `next()` | Short-circuits (no `next()`) |
|---|---|---|
| Downstream middleware | Runs | Does not run |
| Endpoint / action | Reached | Not reached |
| Response written by | Downstream (endpoint) | The short-circuiting middleware |
| Use case | Pass-through (logging, timing, auth header enrichment) | Gate / guard (auth failure, IP block, rate limit, cache hit) |
| After-`next` code in callers | Still executes on the way back | Still executes in outer middleware layers |

### Implementing a Short-Circuit

```csharp
public class ApiKeyMiddleware
{
    private readonly RequestDelegate _next;
    private const string ApiKeyHeader = "X-Api-Key";
    private const string ValidKey = "secret-key-123";

    public ApiKeyMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        // --- Gate check ---
        if (!context.Request.Headers.TryGetValue(ApiKeyHeader, out var key)
            || key != ValidKey)
        {
            // Short-circuit: write the response here, do NOT call next
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(
                """{"error":"Invalid or missing API key"}""");
            return;   // <-- returns without calling next
        }

        // Key is valid — continue the pipeline
        await _next(context);
    }
}
```

The `return` after writing the response prevents `_next` from being called. ASP.NET Core automatically stops the pipeline when `InvokeAsync` returns without calling `next`.

### Short-Circuiting with `app.Run` (Terminal Middleware)

`app.Run` never receives a `next` delegate — it is always terminal. Every request entering this branch is short-circuited:

```csharp
app.Use(async (context, next) =>
{
    Console.WriteLine("Before");
    await next(context);       // continues
    Console.WriteLine("After"); // still runs on the way back
});

app.Run(async context =>
{
    // Terminal — no next to call, pipeline ends here
    await context.Response.WriteAsync("Short-circuited by app.Run");
});
```

### Partial Short-Circuiting with `app.Map`

`app.Map` branches the pipeline. Requests matching the path enter the branch (which may be terminal) and never reach the main pipeline's remaining components:

```csharp
app.Map("/maintenance", branch =>
{
    branch.Run(async ctx =>
    {
        ctx.Response.StatusCode = 503;
        await ctx.Response.WriteAsync("Service under maintenance");
    });
});

app.MapControllers(); // only reached by requests that did NOT match /maintenance
```

### Outer Middleware Still Runs After a Short-Circuit

Short-circuiting only prevents **downstream** middleware from running. Middleware that was registered **before** the short-circuiting component still executes its after-`next` code:

```csharp
app.Use(async (context, next) =>
{
    Console.WriteLine("A: before");
    await next(context);          // calls B, which short-circuits
    Console.WriteLine("A: after"); // still runs — A is an outer layer
});

app.Use(async (context, next) =>
{
    Console.WriteLine("B: short-circuiting");
    context.Response.StatusCode = 429;
    await context.Response.WriteAsync("Rate limit exceeded");
    // next is NOT called
});
```

Output:
```
A: before
B: short-circuiting
A: after
```

This is important for cleanup code (e.g., timing, audit completion, `try/finally` blocks) in outer middleware — it always runs regardless of whether inner middleware short-circuits.

### Common Short-Circuit Use Cases

```csharp
// 1. Rate limiting
if (rateLimiter.IsExceeded(context))
{
    context.Response.StatusCode = 429;
    return;
}

// 2. Cache hit
if (cache.TryGet(context.Request.Path, out var cached))
{
    await context.Response.WriteAsync(cached);
    return;
}

// 3. IP blocklist
if (blocklist.Contains(context.Connection.RemoteIpAddress))
{
    context.Response.StatusCode = 403;
    return;
}

// 4. Maintenance mode
if (maintenanceMode.IsEnabled)
{
    context.Response.StatusCode = 503;
    await context.Response.WriteAsync("Down for maintenance");
    return;
}
```

### Key Takeaways

- **Short-circuiting** means the middleware writes a response and returns without calling `next` — no downstream middleware or endpoints run.
- **Calling `next()`** passes control down the chain; the current middleware can optionally run code after `next` returns (on the way back out).
- Outer middleware's after-`next` code always executes, even when an inner layer short-circuits.
- `app.Run` is always a short-circuit; `app.Use` can be either depending on whether `next` is called.
- Short-circuit early for cross-cutting concerns (auth, rate limiting, caching) to avoid unnecessary work in downstream components.
