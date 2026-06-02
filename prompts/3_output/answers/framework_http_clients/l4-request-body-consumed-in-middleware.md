# L4 A developer writes middleware that reads `Request.Body` for audit logging, but downstream action methods always receive an empty model. What is the root cause and how do you fix it?

## Answer

### Root Cause

`Request.Body` is a **forward-only, non-seekable stream** by default in ASP.NET Core. Reading it in middleware advances the stream position to the end of the content. When the MVC model binder later tries to read the same stream to deserialize the request payload, it finds a stream at position EOF — reads zero bytes — and binds `null` (or a default value) to the action parameter.

```
Stream position:  0 ──► middleware reads ──► EOF
                                               │
                            MVC model binder reads here ──► empty → null model
```

### Reproducing the Bug

```csharp
// BROKEN middleware
public class BrokenAuditMiddleware
{
    private readonly RequestDelegate _next;

    public BrokenAuditMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        // Reads the entire body — stream is now at EOF
        using var reader = new StreamReader(context.Request.Body);
        var body = await reader.ReadToEndAsync();

        Console.WriteLine($"[Audit] Body: {body}");

        // Position is at EOF; MVC will read an empty stream → null model
        await _next(context);
    }
}
```

```csharp
[HttpPost]
public IActionResult CreateOrder(CreateOrderRequest request)
{
    // request is always null because model binding read an empty stream
    Console.WriteLine(request?.Item ?? "NULL");
    return Ok();
}
```

### The Fix — Three Required Changes

#### 1. Call `Request.EnableBuffering()` before reading

`EnableBuffering` swaps the raw network stream for a `FileBufferingReadStream`, which is seekable and rewindable. Without this call, `Body.Position` is not settable.

```csharp
context.Request.EnableBuffering();
```

#### 2. Use `StreamReader` with `leaveOpen: true`

`StreamReader` disposes the underlying stream when it is itself disposed. Disposing `Request.Body` closes the stream completely — resetting position afterward would throw. `leaveOpen: true` prevents disposal of the underlying stream.

```csharp
using var reader = new StreamReader(
    context.Request.Body,
    encoding: Encoding.UTF8,
    detectEncodingFromByteOrderMarks: false,
    leaveOpen: true);   // do NOT close the underlying stream
```

#### 3. Reset `Body.Position` to 0 after reading

```csharp
context.Request.Body.Position = 0;
```

### Corrected Middleware

```csharp
public class FixedAuditMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<FixedAuditMiddleware> _logger;

    public FixedAuditMiddleware(RequestDelegate next, ILogger<FixedAuditMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // FIX 1: make the stream seekable
        context.Request.EnableBuffering();

        string body;

        // FIX 2: leaveOpen prevents closing the underlying stream
        using (var reader = new StreamReader(
            context.Request.Body,
            Encoding.UTF8,
            detectEncodingFromByteOrderMarks: false,
            leaveOpen: true))
        {
            body = await reader.ReadToEndAsync(context.RequestAborted);
        }

        _logger.LogInformation("[Audit] {Method} {Path} body: {Body}",
            context.Request.Method,
            context.Request.Path,
            body);

        // FIX 3: rewind so MVC model binder reads from the start
        context.Request.Body.Position = 0;

        await _next(context);
    }
}
```

### Why These Three Changes Work Together

| Without | Effect |
|---|---|
| No `EnableBuffering` | Stream is non-seekable; setting `Position = 0` throws `NotSupportedException` |
| No `leaveOpen: true` | `StreamReader.Dispose()` closes `Request.Body`; subsequent reads throw `ObjectDisposedException` |
| No `Position = 0` | Stream left at EOF; model binder reads zero bytes; model is `null` |

All three are required. Applying only one or two still results in a broken pipeline.

### Additional Considerations

**Selective buffering** — Buffering all request bodies adds memory and I/O overhead. Apply the middleware only to the paths that need it:

```csharp
app.MapWhen(
    ctx => ctx.Request.Method is "POST" or "PUT" or "PATCH",
    branch => branch.UseMiddleware<FixedAuditMiddleware>());
```

**Large payloads** — `EnableBuffering` buffers up to ~30 KB in memory; larger bodies spill to a temp file. Set a maximum acceptable body size to prevent abuse:

```csharp
context.Features.Get<IHttpMaxRequestBodySizeFeature>()!.MaxRequestBodySize = 1_048_576; // 1 MB
```

**Multipart/form-data** — Avoid raw body reading for file uploads. Use `IFormFile` or `HttpRequest.Form` instead, as the multipart parser handles stream positioning internally.

**Registration order** — The fixed middleware must be registered before routing and MVC so it wraps the model-binding stage:

```csharp
app.UseMiddleware<FixedAuditMiddleware>();  // first
app.UseRouting();
app.UseAuthorization();
app.MapControllers();
```

### Key Takeaways

- The root cause is reading a non-seekable `Request.Body` without rewinding it, leaving the MVC model binder with an empty stream.
- The fix requires all three steps: `EnableBuffering()`, `leaveOpen: true`, and `Position = 0`.
- This is a common interview and production bug because the failure is silent — no exception is thrown, only a `null` model.
- Apply body-buffering middleware selectively to avoid unnecessary overhead on all requests.
