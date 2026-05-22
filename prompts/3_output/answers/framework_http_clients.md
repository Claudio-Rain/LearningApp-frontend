# Interview Answers: Framework HTTP Clients (ASP.NET)

---

## Level 1 — Definition & Basics

### HTTP Fundamentals

**Q: What are HTTP request headers?**

> Request headers are key-value metadata the client sends alongside the request to convey context about the payload, client capabilities, and authentication.

```csharp
// Reading request headers in ASP.NET Core
if (context.Request.Headers.TryGetValue("X-API-Key", out var apiKey))
{
    // apiKey contains the header value
}
```

---

**Q: Name five common HTTP request headers and explain their purpose.**

`Content-Type` (body format), `Accept` (desired response format), `Authorization` (credentials/token), `X-Correlation-Id` (trace ID), `User-Agent` (client identity/version). Getting `Content-Type` vs `Accept` wrong is the most common cause of 415/406 errors.

---

**Q: Explain the five HTTP status code classes (1xx–5xx) with one example each.**

> Status codes group by intent: informational, success, redirection, client error, and server error — each class tells the client who is responsible and what to do next.

`100 Continue` (check headers before sending body), `200 OK` (success), `301 Moved Permanently` (redirect), `400 Bad Request` (client error), `500 Internal Server Error` (server error). The class alone lets infrastructure react without parsing the body.

```csharp
// Returning different status codes in ASP.NET Core
[HttpPost]
public IActionResult CreateUser(UserDto dto)
{
    return StatusCode(201, user); // 2xx success
    // return StatusCode(400); // 4xx client error
    // return StatusCode(500); // 5xx server error
}
```

---

**Q: What's the difference between `Content-Type` and `Accept` headers?**

> `Content-Type` describes what you are sending; `Accept` describes what you want to receive — they flow in opposite directions.

Mismatches cause 415 (unsupported media type) or 406 (not acceptable) errors. Think of `Content-Type` as the "outbox label" and `Accept` as the "inbox preference."

```csharp
// Content-Type: what we're sending
request.Headers.Add("Content-Type", "application/json");

// Accept: what we want back
request.Headers.Add("Accept", "application/json");
```

---

**Q: Why should `Authorization` headers never be logged verbatim?**

> The `Authorization` header carries credentials or bearer tokens that grant access, so logging it verbatim means your log store becomes an attack surface equivalent to a leaked password file.

Redact it by omitting the header from structured logs or replacing its value with a placeholder before writing.

```csharp
// Redact Authorization header in logs
var headerValue = context.Request.Headers["Authorization"].ToString();
var redacted = string.IsNullOrEmpty(headerValue) ? "none" : "***";
logger.LogInformation("Request auth: {AuthHeader}", redacted);
```

---

### ASP.NET Pipeline Basics

**Q: What's the difference between `app.Use` and `app.Run`?**

> `app.Use` is non-terminal and calls `next()` to continue the pipeline; `app.Run` is terminal and short-circuits it.

If you accidentally use `app.Run` for something like CORS or authentication, everything registered after it is dead code and never executes. I treat `app.Run` as the last resort — typically only for a catch-all fallback or a health endpoint in a minimal setup. In practice, almost everything should use `app.Use`.

```csharp
app.Use(async (context, next) => await next()); // continues pipeline
app.Run(async context => await context.Response.WriteAsync("Done")); // terminal
```

---

**Q: Should cross-cutting concerns (logging, auth, CORS) go in middleware or action filters?**

> Use middleware for infrastructure concerns that apply to all requests; use action filters for concerns that need MVC context like model state, action descriptors, or controller metadata.

Middleware runs before MVC even knows which action will be invoked, so it cannot access route data or model-binding results — authentication and CORS belong there. Action filters run after routing and model binding, making them the right place for things like "log which action was called with what validated parameters" or "check a feature flag based on the route." Mixing them up creates either overly broad security holes or unnecessary MVC overhead for non-MVC requests.

```csharp
// Middleware: applies to all requests
app.UseAuthentication();

// Action filter: MVC-specific
[HttpPost]
[CustomAuthFilter]
public IActionResult MyAction() { }
```

---

## Level 2 — Core Concepts

### Middleware Pipeline

**Q: What happens in the middleware pipeline when `next()` is called vs when it's not?**

> The pipeline is a nested delegate chain — calling `next()` passes control inward toward the endpoint; not calling it short-circuits everything downstream.

Code before `await next(context)` runs on the request leg; code after runs on the response leg. Skipping `next()` is how authentication middleware rejects a request with a 401. Forgetting to call `next()` accidentally results in silent 200s with an empty body.

```csharp
app.Use(async (ctx, next) =>
{
    if (!IsAuthorized(ctx)) {
        ctx.Response.StatusCode = 401;
        return; // short-circuit, don't call next()
    }
    await next(); // continue to next middleware
});
```

---

**Q: Why does middleware registration order matter? Give a security example.**

> Order is execution order — registering authorization before authentication means you are checking permissions before you know who the user is, which always evaluates to "anonymous."

The canonical mistake is `app.UseAuthorization()` before `app.UseAuthentication()`. The auth middleware hasn't populated `HttpContext.User` yet, so every policy check sees an unauthenticated principal and either grants access by default or rejects everyone. Similarly, placing CORS after routing means the preflight OPTIONS request gets routed and rejected before CORS headers are ever added. In the ASP.NET Core docs, the recommended order is explicit for this reason.

```csharp
// WRONG order
app.UseAuthorization();
app.UseAuthentication(); // User is empty!

// CORRECT order
app.UseAuthentication();
app.UseAuthorization(); // User is populated
```

---

**Q: When should you use `IMiddleware` instead of convention-based middleware?**

> Use `IMiddleware` when your middleware has scoped or transient dependencies — it gets instantiated per-request from DI rather than once at startup.

Convention-based middleware is instantiated as a singleton, so constructor-injected scoped services like `DbContext` will be disposed before the next request. `IMiddleware` solves this by being resolved per-request by the DI container.

```csharp
// IMiddleware with scoped DbContext
public class MyMiddleware : IMiddleware
{
    public MyMiddleware(MyDbContext db) { } // per-request
    public Task InvokeAsync(HttpContext ctx, RequestDelegate next) => next(ctx);
}

app.UseMiddleware<MyMiddleware>();
```

---

**Q: What are the common request feature interfaces and when would you use them?**

> Feature interfaces like `IHttpRequestFeature`, `IHttpResponseFeature`, `IHttpConnectionFeature`, and `IHttpUpgradeFeature` provide direct access to low-level HTTP capabilities when you need to go beyond `HttpContext`'s convenience properties.

`IHttpRequestFeature` exposes the raw path, method, headers, and body stream. `IHttpResponseFeature` exposes status code, reason phrase, and response headers. `IHttpConnectionFeature` exposes local/remote IP and connection ID. `IHttpUpgradeFeature` enables protocol upgrades for WebSockets. You'd access these directly in middleware for custom request metadata handling, low-level response manipulation, or advanced scenarios like protocol upgrades.

```csharp
// Access feature from HttpContext
var connFeature = context.Features.Get<IHttpConnectionFeature>();
var remoteIp = connFeature?.RemoteIpAddress;

var responseFeature = context.Features.Get<IHttpResponseFeature>();
responseFeature?.ReasonPhrase = "Custom reason";
```

---

### HTTP Headers in ASP.NET

**Q: How do you safely read an optional request header in ASP.NET Core?**

> Headers are exposed via `HttpContext.Request.Headers` as an `IHeaderDictionary`, and the safe read pattern is `TryGetValue` or the indexer with a null/StringValues check.

The indexer returns `StringValues.Empty` rather than throwing, so check `StringValues.IsNullOrEmpty` before use — direct casting to `string` silently returns empty, which can mask missing required headers.

```csharp
if (context.Request.Headers.TryGetValue("X-Correlation-Id", out var correlationId)
    && !StringValues.IsNullOrEmpty(correlationId))
{
    // safe to use correlationId.ToString()
}
```

---

**Q: How does `HttpRequestHeaders` differ from `IHeaderDictionary`?**

> `HttpRequestHeaders` is the typed, strongly-validated header collection on an outgoing `HttpRequestMessage`; `IHeaderDictionary` is the raw key-value store on an incoming request.

`HttpRequestHeaders` has typed properties and enforces RFC rules; `IHeaderDictionary` is permissive and accepts whatever the client sends. Client side gets compile-time safety, server side gets raw fidelity and must validate.

```csharp
// Outgoing (client): typed HttpRequestHeaders
var request = new HttpRequestMessage();
request.Headers.Authorization = new("Bearer", token); // typed

// Incoming (server): raw IHeaderDictionary
var headerValue = context.Request.Headers["Authorization"]; // string/StringValues
```

---

**Q: Why can't you set restricted headers like `Host` or `Content-Length` via `DefaultRequestHeaders`?**

> Restricted headers are automatically computed or controlled by the HTTP stack itself — letting user code override them would produce invalid or inconsistent requests.

`Content-Length` is calculated from the body and `Host` is derived from the URI. Freely setting them would enable header injection. Use `TryAddWithoutValidation` on individual `HttpRequestMessage` instances if you need per-request overrides.

```csharp
// Can't set on DefaultRequestHeaders
// client.DefaultRequestHeaders.Add("Content-Length", "100"); // throws

// Per-request override
var msg = new HttpRequestMessage();
msg.Headers.TryAddWithoutValidation("Content-Length", "100");
```

---

### Status Codes

**Q: Why is tunneling errors through `200 OK` problematic?**

> Tunneling errors through 200 breaks every layer that relies on HTTP semantics — retry logic, caches, monitoring, and client error handling all become blind.

Load balancers and proxies use status codes to decide whether to retry or cache. If everything is 200, a failed payment or a validation error silently looks like a success to infrastructure. APM tools like Application Insights track error rates by status code — you'll show 0% errors in your dashboard while your users are getting failures. Every client must now parse the body before knowing if the call succeeded, which couples them to your private schema instead of a universal contract.

```csharp
// WRONG: error tunneled as 200
public IActionResult Transfer(TransferDto dto)
{
    return Ok(new { success = false, error = "Insufficient funds" });
}

// RIGHT: use semantic status code
return BadRequest(new { error = "Insufficient funds" });
```

---

**Q: When should you return `400` vs `422`?**

> `400` means the request was malformed (can't be parsed); `422` means it was syntactically valid but semantically invalid (failed business rules or validation).

Override `InvalidModelStateResponseFactory` in `AddControllers` to return `422` for model validation failures and `400` for deserialization errors.

```csharp
builder.Services.AddControllers(options =>
{
    options.InvalidModelStateResponseFactory = ctx =>
        new UnprocessableEntityResult(ctx.ModelState); // 422
});
```

---

## Level 3 — Practical Usage

### Manipulating Headers

**Q: Show how you would add a custom `X-Correlation-Id` header to every outgoing `HttpClient` request without duplicating code in each call site.**

> Implement a `DelegatingHandler` and register it with `IHttpClientFactory` — it intercepts every request transparently.

A delegating handler is the cleanest extension point because it runs in the `HttpClient` pipeline before the request hits the network, and you register it once per named or typed client. You can inject scoped services into it because `IHttpClientFactory` creates a fresh handler scope per request.

```csharp
public class CorrelationIdHandler : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        request.Headers.TryAddWithoutValidation(
            "X-Correlation-Id", Guid.NewGuid().ToString());
        return base.SendAsync(request, ct);
    }
}

// In Program.cs
builder.Services.AddHttpClient<MyApiClient>()
    .AddHttpMessageHandler<CorrelationIdHandler>();
```

---

**Q: How do you remove sensitive headers like `Server` from responses?**

> Use `app.UseSecurityHeaders()` or configure Kestrel directly via `KestrelServerOptions.AddServerHeader = false`.

For a one-liner fix, Kestrel's option is simplest. Use policy collections for declarative header management across multiple headers.

```csharp
// Remove Server header
builder.WebHost.UseKestrel(options =>
{
    options.AddServerHeader = false;
});
```

---

**Q: Why does `DefaultRequestHeaders` throw `InvalidOperationException` after the first request?**

> `DefaultRequestHeaders` cannot be mutated after the first request because `HttpClient` becomes "locked" — move per-request headers to `HttpRequestMessage.Headers` instead.

For dynamic headers, set them directly on `HttpRequestMessage` instances or use a `DelegatingHandler`.

```csharp
// WRONG after first request
var client = new HttpClient();
await client.GetAsync("..."); // client locked
client.DefaultRequestHeaders.Add("X-Custom", "val"); // throws

// RIGHT: per-request headers
var msg = new HttpRequestMessage();
msg.Headers.Add("X-Custom", "val");
```

---

### Content Negotiation & Formatters

**Q: What's the difference between `XmlSerializer` and `XmlDataContractSerializer` formatters?**

> It registers both XML formatters so the pipeline can serialize/deserialize XML — `XmlSerializer` uses public property convention while `XmlDataContractSerializer` uses `[DataContract]`/`[DataMember]` attributes.

`XmlSerializer` is annotation-free and works without modifying model classes. `XmlDataContractSerializer` requires attributes but gives control over element names, namespaces, and versioning.

```csharp
// XmlSerializer: convention-based (public properties)
public class User { public string Name { get; set; } }

// XmlDataContractSerializer: attribute-based
[DataContract]
public class User 
{ 
    [DataMember]
    public string Name { get; set; } 
}
```

---

**Q: What does `RespectBrowserAcceptHeader` do and when should it be `true`?**

> It controls whether the formatter pipeline honors a browser's `Accept: text/html` preference — it's `false` by default so browsers always get JSON from APIs instead of a 406.

Set it to `true` only for hypermedia or MVC apps where browsers should receive HTML.

```csharp
builder.Services.AddControllers(options =>
{
    options.RespectBrowserAcceptHeader = false; // default: JSON wins
    // options.RespectBrowserAcceptHeader = true; // honor browser Accept: text/html
});
```

---

**Q: How does content negotiation select a formatter based on `Accept` headers?**

> The selector scores each registered formatter against the Accept header by quality factor and picks the highest-scoring match; if nothing matches, it returns `406 Not Acceptable` by default.

Registration order is the tiebreaker — first matching formatter wins if q-values are equal. If no match and `ReturnHttpNotAcceptable` is `false`, it falls back to the first registered formatter.

```csharp
// Accept: application/json;q=0.9, application/xml;q=0.8
// First registered formatter with highest q-value wins
builder.Services.AddControllers(options =>
{
    options.ReturnHttpNotAcceptable = true; // 406 if no match
});
```

---

**Q: How do you force all responses to JSON regardless of `Accept` header?**

> Set `MvcOptions.RespectBrowserAcceptHeader = false` (already default) and remove all non-JSON formatters — or set `ReturnHttpNotAcceptable = false` to always fall back to JSON.

The cleanest approach is not registering non-JSON formatters: `options.OutputFormatters.RemoveType<XmlSerializerOutputFormatter>()`. This breaks the HTTP contract, so use only for internal APIs.

```csharp
builder.Services.AddControllers(options =>
{
    options.OutputFormatters.RemoveType<XmlSerializerOutputFormatter>();
    options.ReturnHttpNotAcceptable = false; // fall back to JSON
});
```

---

### Consume and Produce Filters

**Q: What's the difference between `[Consumes]` and `[Produces]`?**

> `[Consumes]` filters which actions match an incoming request by `Content-Type` and affects routing; `[Produces]` restricts the output formatter and signals to clients what the response will be.

`[Consumes]` participates in action selection — if two actions share a route but differ by Consumes, the right one is picked based on the request's Content-Type. If no action matches, you get a 415. `[Produces]` doesn't affect routing at all; it just constrains which formatters are tried for the response and sets the response Content-Type. They're symmetrical in purpose but operate at different pipeline stages.

```csharp
[HttpPost]
[Consumes("application/json")] // routing: only if Content-Type matches
[Produces("application/json")]  // response: signals what you'll get back
public IActionResult Create(UserDto dto) => CreatedAtAction(nameof(GetUser), user);
```

---

**Q: What status code is returned when `Content-Type` doesn't match `[Consumes]`?**

> `415 Unsupported Media Type` — ASP.NET Core's action selector rejects the request before the action method is ever invoked because no registered action accepts `text/plain`.

The MVC framework uses `[Consumes]` as a routing constraint, not just a documentation hint. The framework checks the request's Content-Type against all `[Consumes]` declarations during action selection. If there's no match, it short-circuits with 415 immediately. This is actually desirable behavior — it fails fast with a meaningful status code rather than letting the body reach a deserializer that will also fail.

```csharp
// Request: Content-Type: text/plain
// Action: [Consumes("application/json")]
// Result: 415 Unsupported Media Type (before action runs)
```

---

### File Uploads

**Q: How do you bind file uploads with `IFormFile` and what `Content-Type` is required?**

> Declare `IFormFile` as a parameter and the client must send `multipart/form-data` — the multipart boundary is what allows both file bytes and form fields to coexist in one body.

The model binder reads multipart sections and wraps each file part in `IFormFile`. For raw streams, read `Request.Body` directly instead.

```csharp
[HttpPost("upload")]
public async Task<IActionResult> Upload(IFormFile file)
{
    using var stream = file.OpenReadStream();
    // process stream
    return Ok();
}
```

---

**Q: How do you increase the max request body size for a specific endpoint?**

> Kestrel's default max request body size is 30 MB — override it per-endpoint with `[RequestSizeLimit]` or `[DisableRequestSizeLimit]`.

Use `[RequestSizeLimit(100_000_000)]` (in bytes) for a specific action. IIS also has `maxAllowedContentLength` in `web.config` — both must be raised.

```csharp
[HttpPost("upload-large")]
[RequestSizeLimit(500_000_000)] // 500 MB
public async Task<IActionResult> UploadLarge(IFormFile file)
{
    // process file
    return Ok();
}
```

---

## Level 4 — Common Pitfalls

### Middleware Pitfalls

**Q: Why does reading `Request.Body` in middleware cause downstream handlers to receive empty models?**

> `Request.Body` is a forward-only stream — once read, the position is at the end and downstream middleware reads nothing; fix it by either enabling buffering or copying and replacing the stream.

Call `Request.EnableBuffering()` before reading, then reset `Position = 0` after — it's idempotent and handles memory-to-disk spill for large bodies.

```csharp
app.Use(async (context, next) =>
{
    context.Request.EnableBuffering(); // allow re-reading
    var body = await new StreamReader(context.Request.Body).ReadToEndAsync();
    context.Request.Body.Position = 0; // reset for next middleware
    await next();
});
```

---

**Q: Why is capturing `HttpContext` in background tasks dangerous?**

> `HttpContext` is request-scoped and gets recycled after the response completes — accessing it from a background task after that point causes `ObjectDisposedException` or silently reads stale data from a recycled context.

Copy only the specific values you need (correlation ID, user ID) before the background task starts, then work with those primitives. Never store a reference to `HttpContext` itself in a long-lived object.

```csharp
// WRONG: captures HttpContext
_ = Task.Run(async () => { await Log(context); }); // dangerous

// RIGHT: copy values before task
var correlationId = context.TraceIdentifier;
_ = Task.Run(async () => { await Log(correlationId); });
```

---

**Q: Should you use `HttpContext.Items` or scoped services for per-request state?**

> Scoped services are strongly typed, DI-testable, and don't require magic string keys; `HttpContext.Items` is a weakly typed dictionary that couples middleware to shared key constants.

Prefer scoped services. Use `HttpContext.Items` only for middleware-to-middleware handoffs where DI scope isn't available.

```csharp
// Scoped service (preferred)
public class RequestContext { public string CorrelationId { get; set; } }
// Inject into any service/controller

// HttpContext.Items (avoid)
context.Items["CorrelationId"] = Guid.NewGuid().ToString();
```

---

### Custom Formatters

**Q: What base classes do you extend to create custom formatters?**

> Extend `InputFormatter` (or `TextInputFormatter`) for reading request bodies and `OutputFormatter` (or `TextOutputFormatter`) for writing responses.

For each, you must override `CanReadType`/`CanWriteType` to declare which CLR types you support, and `ReadRequestBodyAsync`/`WriteResponseBodyAsync` for the actual serialization. You also set `SupportedMediaTypes` in the constructor — without that, the formatter is never selected. `TextOutputFormatter` adds charset negotiation on top, so prefer it for text-based formats.

```csharp
public class CsvOutputFormatter : TextOutputFormatter
{
    public CsvOutputFormatter()
    {
        SupportedMediaTypes.Add("text/csv");
        SupportedEncodings.Add(Encoding.UTF8);
    }
    protected override bool CanWriteType(Type? type) => type == typeof(IEnumerable<MyModel>);
    public override async Task WriteResponseBodyAsync(OutputFormatterWriteContext ctx, Encoding enc)
    {
        // write CSV to ctx.HttpContext.Response.Body
    }
}
```

---

**Q: What three things do you check if a custom formatter isn't being selected?**

> Check that `SupportedMediaTypes` is populated, that the client's `Accept` header actually matches one of those types, and that the formatter is registered before the catch-all JSON formatter.

Empty `SupportedMediaTypes` is the most common mistake. Formatter order matters — place your formatter before JSON or ensure your media type is explicit enough to beat `*/*`.

```csharp
public class CsvFormatter : OutputFormatter
{
    public CsvFormatter()
    {
        SupportedMediaTypes.Add("text/csv"); // Must be populated!
    }
    // Register before JSON
    options.OutputFormatters.Insert(0, new CsvFormatter());
}
```

---

### File Upload Pitfalls

**Q: What layers enforce request body size limits (Kestrel, IIS, NGINX)?**

> Three independent layers enforce body size limits — Kestrel, IIS (via `web.config`), and NGINX (via `client_max_body_size`) — all three must be raised.

Kestrel's limit is `KestrelServerOptions.Limits.MaxRequestBodySize` (default 30 MB). IIS has `<requestLimits maxAllowedContentLength="30000000" />` in `web.config` under `<system.webServer>` (default ~28 MB, in bytes). NGINX defaults `client_max_body_size` to 1 MB. If the 413 only happens in production, it's almost always the reverse proxy. Use `[RequestSizeLimit]` on the action to raise Kestrel's per-endpoint limit without changing the global setting.

```csharp
// Kestrel
builder.WebHost.UseKestrel(opt => 
    opt.Limits.MaxRequestBodySize = 500_000_000);

// NGINX: client_max_body_size 500m;
// IIS web.config: <requestLimits maxAllowedContentLength="500000000" />
```

---

**Q: Why should you avoid `ReadToEnd()` for large file uploads?**

> `ReadToEnd()` buffers the entire file in memory, which exhausts server RAM under concurrency; stream the file in chunks or pipe it directly to storage.

Use `IFormFile.CopyToAsync(Stream)` for chunk-based copying. For truly large files, use `MultipartReader` or `System.IO.Pipelines.PipeReader` to avoid materializing the whole file in memory.

```csharp
// WRONG: buffers entire file in memory
var buffer = await file.OpenReadStream().ReadToEndAsync();

// RIGHT: stream directly
using var targetStream = File.Create("path/to/file");
await file.CopyToAsync(targetStream);
```

---

### Headers Pitfalls

**Q: Why is sharing a static `HttpClient` and mutating headers concurrently dangerous?**

> `DefaultRequestHeaders` is not thread-safe — concurrent mutations corrupt the header collection, causing intermittent wrong headers or exceptions under load.

Use `IHttpClientFactory` instead of a static `HttpClient`. Set static headers at registration time; for dynamic headers per request, set them on the `HttpRequestMessage` instance instead.

```csharp
// WRONG: static client with mutations
static HttpClient client = new();
client.DefaultRequestHeaders.Add("X-Token", token); // race condition

// RIGHT: IHttpClientFactory
services.AddHttpClient<MyClient>();
```

---

## Level 6 — Trade-offs & Design Decisions

### Pipeline Architecture

**Q: Where should request validation go: middleware, action filters, or domain models?**

> Middleware for format/auth validation, action filters for MVC-specific cross-cutting concerns, and domain models for business-rule validation — pushing too early sacrifices context; pushing too late sacrifices performance.

Middleware for format/auth (rate limiting, JWT, required headers). Action filters for "this controller requires a feature flag" (they have access to bound models). Domain models for business rules — avoid duplicating domain rules in middleware.

```csharp
// Middleware: format/auth validation
app.UseAuthentication();

// Action filter: MVC-specific
[HttpPost]
[ValidateFeature("premium-only")]
public IActionResult Create(UserDto dto) => Ok();

// Domain model: business rules
public class User
{
    public void SetEmail(string email)
    {
        if (!email.Contains("@")) throw new InvalidOperationException();
    }
}
```

---

**Q: How do you structure formatter registration for easy extensibility?**

> Register formatters in an extension method driven by feature flags or configuration, with a clear registration order, so adding a fourth format is a one-line addition.

Create an `AddApiFormatters()` extension that encapsulates registration logic. Toggle each formatter by config section so you can enable new formats in production without redeploying. Registration order encodes default preference.

```csharp
// Extension method for reusable config
public static IMvcBuilder AddApiFormatters(this IMvcBuilder mvc, IConfiguration config)
{
    mvc.AddControllers(options =>
    {
        if (config.GetValue<bool>("Formats:EnableXml"))
            options.OutputFormatters.Add(new XmlSerializerOutputFormatter());
        if (config.GetValue<bool>("Formats:EnableCsv"))
            options.OutputFormatters.Insert(0, new CsvOutputFormatter());
    });
    return mvc;
}

builder.Services.AddApiFormatters(builder.Configuration);
```

---

**Q: How do you strip PII from logs: middleware, sink, or enricher?**

> A structured-logging enricher is the right tool because PII scrubbing belongs in the logging pipeline, not in application code, and an enricher operates on structured properties before they reach any sink.

Use a Serilog/OpenTelemetry enricher or destructuring policy — it runs before any sink and covers all log sources consistently. A sink scrubs too late (PII already in memory); middleware can't intercept library logs.

```csharp
// Serilog enricher
Log.Logger = new LoggerConfiguration()
    .Enrich.With<PiiRedactionEnricher>()
    .WriteTo.Console()
    .CreateLogger();

public class PiiRedactionEnricher : ILogEventEnricher
{
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        // Scrub Authorization header before any sink
    }
}
```

---

### Streaming vs Buffering

**Q: What are the memory and latency trade-offs between buffering vs streaming file uploads?**

> Buffering enables seeking and re-reading at the cost of memory (and disk spill for large files); streaming minimizes memory footprint but requires single-pass processing.

Buffer for small files or when validation is needed first. Stream large files (video, backups) directly to storage to avoid materializing in memory. Streaming is single-pass — can't re-read without buffering.

```csharp
// Streaming: minimal memory for large files
using var target = File.Create("path/to/video.mp4");
await formFile.CopyToAsync(target); // single-pass

// Buffering: enables validation but uses memory
await Request.EnableBuffering();
var bytes = await Request.Body.ReadAsync(buffer, 0, buffer.Length);
Request.Body.Position = 0; // re-read
```

---

**Q: How does `EnableBuffering()` work and what are its memory implications?**

> `EnableBuffering()` replaces the raw request body stream with a `FileBufferingReadStream` that buffers in memory up to a threshold (default 30 KB) then spills to a temp file.

Enable buffering only in middleware that needs it (audit logger, signature verification); disable elsewhere to keep streaming behavior.

```csharp
// FileBufferingReadStream: memory up to 30 KB, then disk
request.EnableBuffering(bufferThreshold: 65536); // 64 KB before spill
var firstRead = await request.Body.ReadAsync(...);
request.Body.Position = 0; // rewind for next reader
```

---

### Feature Collection Mutability

**Q: Why would you swap `IHttpResponseBodyFeature` mid-pipeline and what are the risks?**

> Response compression middleware swaps `IHttpResponseBodyFeature` to wrap the response stream with a compressor — the risk is that any middleware that cached a reference to the original stream now writes to the wrong place.

`UseResponseCompression()` wraps the stream in GZip/Brotli. Hazard: middleware registered before it that caches `Response.Body` will bypass compression. Always read `Response.Body` late, never store it in a local variable at request start.

```csharp
// WRONG: caches original stream before compression middleware
var body = context.Response.Body;
await next();
await body.WriteAsync(...); // bypasses compression!

// RIGHT: read Response.Body fresh
await next();
await context.Response.Body.WriteAsync(...); // uses wrapped stream
```

---

**Q: What formatter features do minimal APIs lose and how do you recover them?**

> Minimal APIs don't run `ObjectResult` through `DefaultOutputFormatterSelector`, so you lose automatic Accept-header-driven content negotiation — you must implement it manually or return `Results.Content` with explicit media types.

You also lose `[Produces]`/`[Consumes]` attribute routing and the filter pipeline. For JSON-only APIs, this doesn't matter. For content negotiation, check `HttpContext.Request.Headers.Accept` manually or return an `IResult` wrapping an `ObjectResult`.

```csharp
// Minimal API: no automatic content negotiation
app.MapPost("/users", (UserDto dto) => TypedResults.Created("/users/1", user));

// Manual negotiation fallback
app.MapGet("/users", (HttpContext ctx) =>
{
    var accept = ctx.Request.Headers.Accept.ToString();
    return accept.Contains("xml") 
        ? Results.Content(XmlSerialize(users), "application/xml")
        : Results.Json(users);
});
```

---

## Level 7 — Advanced & Expert

### Expert Debugging

**Q: How do you diagnose `ObjectDisposedException` on `HttpContext.Response.Body`?**

> The most common cause is a middleware or background task writing to the response after `HttpContext` has been disposed — typically a fire-and-forget continuation that outlives the request lifetime.

Check for unawaited tasks in middleware, streaming writers that don't check `context.RequestAborted`, and exception filters writing after another middleware completed the response. Fix: check `HttpContext.Response.HasStarted` before writing, always `await` fire-and-forget work, and register a `context.RequestAborted` cancellation handler.

```csharp
// WRONG: writes after request ends
_ = Task.Run(async () => await LogAsync(context)); // disposed!

// RIGHT: check HasStarted, copy values, monitor cancellation
if (!context.Response.HasStarted)
{
    await context.Response.WriteAsync("data", context.RequestAborted);
}

// Or register handler
context.RequestAborted.Register(() => 
    logger.LogWarning("Request cancelled"));
```

