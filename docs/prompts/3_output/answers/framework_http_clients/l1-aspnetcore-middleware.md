# L1 — What is ASP.NET Core middleware, and what is its role in handling requests and responses in the pipeline?

## Answer

**Middleware** in ASP.NET Core is a piece of code that sits in the HTTP request processing pipeline. Each middleware component can:

1. Inspect or modify the incoming `HttpRequest`.
2. Call the **next** middleware in the pipeline (or short-circuit by not calling it).
3. Inspect or modify the outgoing `HttpResponse` after the rest of the pipeline has run.

The pipeline is assembled once at application startup (in `Program.cs` / `Startup.Configure`) and reused for every request. Middleware components form a **chain** — sometimes called an "onion" — where each layer wraps the next.

### The Role of Middleware

| Role | Example |
|---|---|
| Authentication & authorisation | `UseAuthentication()`, `UseAuthorization()` |
| Exception handling | `UseExceptionHandler()`, `UseDeveloperExceptionPage()` |
| Static file serving | `UseStaticFiles()` |
| Routing | `UseRouting()`, `UseEndpoints()` |
| HTTPS redirection | `UseHttpsRedirection()` |
| CORS | `UseCors()` |
| Custom cross-cutting concerns | Logging, correlation IDs, rate limiting |

### Minimal Example

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Middleware 1 — runs before and after everything below
app.Use(async (context, next) =>
{
    Console.WriteLine($"--> {context.Request.Method} {context.Request.Path}");
    await next(context);   // call the rest of the pipeline
    Console.WriteLine($"<-- {context.Response.StatusCode}");
});

// Middleware 2 — short-circuits for /health
app.Map("/health", healthApp =>
{
    healthApp.Run(async context =>
    {
        await context.Response.WriteAsync("Healthy");
    });
});

// Middleware 3 — terminal: MVC routing
app.MapControllers();

app.Run();
```

### Custom Middleware Class

```csharp
public class TimingMiddleware
{
    private readonly RequestDelegate _next;

    public TimingMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        await _next(context);
        sw.Stop();
        context.Response.Headers["X-Elapsed-Ms"] = sw.ElapsedMilliseconds.ToString();
    }
}

// Registration
app.UseMiddleware<TimingMiddleware>();
```

### Key Takeaways

- Order matters: middleware registered first runs first on the way **in** and last on the way **out**.
- `app.Use` passes control to the next component; `app.Run` is terminal and does not call `next`.
- Middleware is the correct place for cross-cutting concerns that must apply to all (or most) endpoints — authentication, logging, compression, etc.
- For concerns limited to MVC/Razor endpoints, filters (`IActionFilter`, `IResultFilter`) are usually a better fit.
