# L3 — Walk through what it takes to create a custom middleware component in ASP.NET Core that captures and logs request metadata such as method, path, and duration.

## Answer

There are three steps: define the middleware class, register it in the pipeline, and optionally create an extension method for clean registration.

## Step 1 — Define the Middleware Class

```csharp
using System.Diagnostics;
using Microsoft.Extensions.Logging;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    // Constructor — RequestDelegate and singleton-safe services are injected here
    public RequestLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestLoggingMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    // Must be named Invoke or InvokeAsync
    // Scoped services (e.g., ICurrentUserService) are injected as method parameters
    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();

        // --- Before downstream middleware ---
        var method      = context.Request.Method;
        var path        = context.Request.Path;
        var queryString = context.Request.QueryString;
        var requestId   = context.TraceIdentifier;

        _logger.LogInformation(
            "HTTP {Method} {Path}{Query} started  [RequestId={RequestId}]",
            method, path, queryString, requestId);

        try
        {
            await _next(context);   // run the rest of the pipeline
        }
        finally
        {
            // --- After downstream middleware (always runs, even on exception) ---
            sw.Stop();

            var statusCode = context.Response.StatusCode;

            _logger.LogInformation(
                "HTTP {Method} {Path} responded {StatusCode} in {Elapsed}ms  [RequestId={RequestId}]",
                method, path, statusCode, sw.ElapsedMilliseconds, requestId);
        }
    }
}
```

### Why `finally`?

Placing the post-processing code in a `finally` block ensures the duration is always logged even if an unhandled exception propagates out of `_next`. Without `finally`, exceptions would skip the logging.

### Why Inject `ILogger` in the Constructor, Not in `InvokeAsync`?

`ILogger<T>` is a singleton-safe service. Singleton services should be injected via the constructor. Scoped or transient services (e.g., database contexts, current-user services) **must** be injected as `InvokeAsync` parameters — injecting them via the constructor would cause captured-singleton issues because the middleware class itself is instantiated once.

```csharp
// Scoped service injected as a method parameter — correct
public async Task InvokeAsync(HttpContext context, ICurrentUserService currentUser)
{
    _logger.LogInformation("User: {UserId}", currentUser.UserId);
    await _next(context);
}
```

## Step 2 — Register the Middleware

```csharp
// Program.cs
var app = builder.Build();

// Register early so it wraps the entire pipeline
app.UseMiddleware<RequestLoggingMiddleware>();

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

## Step 3 — Extension Method for Clean Registration (Optional but Recommended)

```csharp
public static class RequestLoggingMiddlewareExtensions
{
    public static IApplicationBuilder UseRequestLogging(this IApplicationBuilder app)
        => app.UseMiddleware<RequestLoggingMiddleware>();
}

// Usage
app.UseRequestLogging();
```

## Enriching Logs with Structured Properties

Using `LogInformation` with named placeholders (not string interpolation) lets structured logging sinks (Serilog, Application Insights) index each field individually:

```csharp
// Good — structured, queryable
_logger.LogInformation(
    "HTTP {Method} {Path} {StatusCode} {ElapsedMs}ms",
    method, path, statusCode, elapsed);

// Bad — flat string, loses structure
_logger.LogInformation($"HTTP {method} {path} {statusCode} {elapsed}ms");
```

## Complete Example Output (Structured Log)

```json
{
  "Method": "POST",
  "Path": "/api/orders",
  "StatusCode": 201,
  "ElapsedMs": 47,
  "RequestId": "0HN2A7R8KDF4E:00000001"
}
```

## Key Takeaways

- Name the entry point `InvokeAsync` (or `Invoke`) — the framework discovers it by convention.
- Use `finally` to guarantee the completion log even when exceptions occur.
- Inject singleton-safe dependencies (loggers, config) via the constructor; inject scoped/transient dependencies via `InvokeAsync` parameters.
- Register the middleware **before** routing and auth to capture all requests, including those that fail authentication.
- Use structured logging placeholders, not string interpolation, to keep logs queryable.
