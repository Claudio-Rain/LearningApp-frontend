# L3 How do you read the request body inside middleware without consuming it for downstream handlers?

## Answer

`Request.Body` is a forward-only `Stream`. Reading it in middleware advances the stream position to the end, leaving nothing for model binders downstream. To safely read the body without consuming it you must enable buffering and then reset the stream position after reading.

### Step 1 — Enable Buffering

Call `Request.EnableBuffering()` before reading. This replaces the non-seekable network stream with a `FileBufferingReadStream` (backed by memory up to a threshold, then a temp file) that supports `Seek`.

```csharp
public class AuditLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditLoggingMiddleware> _logger;

    public AuditLoggingMiddleware(RequestDelegate next, ILogger<AuditLoggingMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 1. Enable buffering so the body stream becomes seekable
        context.Request.EnableBuffering();

        // 2. Read the body
        var body = await ReadBodyAsync(context.Request);

        _logger.LogInformation("Request body: {Body}", body);

        // 3. Reset the stream position so downstream handlers can read from the start
        context.Request.Body.Position = 0;

        await _next(context);
    }

    private static async Task<string> ReadBodyAsync(HttpRequest request)
    {
        // LeaveOpen: true — do NOT close the underlying stream when the reader is disposed
        using var reader = new StreamReader(
            request.Body,
            encoding: Encoding.UTF8,
            detectEncodingFromByteOrderMarks: false,
            leaveOpen: true);   // <-- critical

        return await reader.ReadToEndAsync();
    }
}
```

### Why `leaveOpen: true`?

`StreamReader` disposes the underlying stream by default when it is disposed. Disposing `Request.Body` here would close the stream entirely, not just reset the position. `leaveOpen: true` prevents this.

### Why Reset `Position` to 0?

After reading, the stream position is at the end. The MVC model binder also reads from position 0. Without resetting, it would read an empty stream and bind `null` or a default value.

```csharp
// After reading, always reset:
context.Request.Body.Position = 0;
```

### Step 2 — Register the Middleware Early

```csharp
// Program.cs
app.UseMiddleware<AuditLoggingMiddleware>();   // before routing and MVC

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

Registering it early ensures it wraps the model-binding stage.

### Alternative — `IMiddleware` with Dependency Injection

For scoped dependencies, implement `IMiddleware` and register it as a scoped service:

```csharp
public class AuditLoggingMiddleware : IMiddleware
{
    private readonly IAuditService _audit;

    public AuditLoggingMiddleware(IAuditService audit) => _audit = audit;

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        context.Request.EnableBuffering();

        using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        context.Request.Body.Position = 0;

        await _audit.LogAsync(context.Request.Path, body);

        await next(context);
    }
}

// Registration
builder.Services.AddScoped<AuditLoggingMiddleware>();
app.UseMiddleware<AuditLoggingMiddleware>();
```

### Important Caveats

| Concern | Detail |
|---|---|
| Large bodies | `EnableBuffering` uses memory up to 30 KB by default, then spills to a temp file. Tune via `BufferingThreshold`. |
| Binary/multipart bodies | Avoid reading raw bytes as a string. For file uploads, use `IFormFile` instead. |
| Performance | Buffering every request body adds I/O overhead. Apply selectively (e.g., only for POST/PUT on specific paths). |
| Cancellation | Pass `context.RequestAborted` to `ReadToEndAsync` for cooperative cancellation. |

```csharp
var body = await reader.ReadToEndAsync(context.RequestAborted);
```

### Key Takeaways

- Call `Request.EnableBuffering()` before reading to make the stream seekable.
- Use `StreamReader` with `leaveOpen: true` to avoid closing the underlying stream.
- Always reset `Request.Body.Position = 0` after reading so downstream handlers see the full body.
- Register body-reading middleware early in the pipeline, before model binding occurs.
- Be mindful of memory and performance — buffering all request bodies is expensive at scale.
