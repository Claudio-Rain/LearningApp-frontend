# Model Answers: Framework HTTP Clients (ASP.NET)

---

**Q: What is the ASP.NET Core request pipeline at a high level?**

> **Bottom line:** Every HTTP request passes through a sequential chain of middleware components, each able to inspect, modify, or short-circuit the request and response.

**Elaboration:** Kestrel (or IIS) receives the raw TCP connection and hands it to the middleware pipeline as an `HttpContext`. Each middleware calls the next one in the chain; on the way back out (after `next()` returns), it can modify the response. Routing, authentication, authorization, and endpoint execution are all middleware components registered in a specific order.

---

**Q: What are the most common HTTP request headers and what does each tell the server?**

> **Bottom line:** `Content-Type` describes the request body format; `Authorization` carries credentials; `Accept` declares acceptable response formats; `User-Agent` identifies the client; `Cache-Control` and `If-None-Match`/`ETag` drive caching.

**Elaboration:** `Content-Type: application/json` tells the server how to parse the body. `Accept: application/json` tells it what format the client wants back. `Authorization: Bearer <token>` carries a JWT or API key. Understanding these headers is essential for debugging API integration issues and for implementing content negotiation.

---

**Q: What are the five classes of HTTP response status codes?**

> **Bottom line:** 1xx = informational, 2xx = success, 3xx = redirection, 4xx = client error, 5xx = server error.

**Elaboration:** Common examples: 200 OK (success), 201 Created (resource created), 204 No Content (success with no body), 400 Bad Request (invalid input), 401 Unauthorized (no credentials), 403 Forbidden (credentials insufficient), 404 Not Found, 409 Conflict (business rule violation), 422 Unprocessable Entity (validation error), 500 Internal Server Error, 503 Service Unavailable.

---

**Q: What is content negotiation and which header drives it?**

> **Bottom line:** Content negotiation is the process by which client and server agree on the response format using the `Accept` request header.

**Elaboration:** The client sends `Accept: application/json, application/xml;q=0.9` to declare its preference. ASP.NET Core's output formatters examine this header and pick the best matching formatter. If no formatter matches and `ReturnHttpNotAcceptable` is enabled, the server returns 406 Not Acceptable.

---

**Q: What is middleware in ASP.NET Core?**

> **Bottom line:** Middleware is a component that handles an HTTP request and optionally passes it to the next component in the pipeline via the `next` delegate.

**Elaboration:** Each middleware sits in a chain — it runs code before calling `next(context)` (request phase), and can run code after `next` returns (response phase). This makes it ideal for cross-cutting concerns: logging, authentication, rate limiting, and error handling. Unlike action filters, middleware runs for every request, not just those handled by MVC.

---

**Q: What is the difference between Use, Run, and Map in middleware?**

> **Bottom line:** `Use` adds middleware that calls the next component; `Run` adds terminal middleware (never calls next); `Map` branches the pipeline based on the request path.

```csharp
app.Use(async (ctx, next) => { /* before */ await next(); /* after */ });
app.Run(async ctx => await ctx.Response.WriteAsync("Terminal")); // no next
app.Map("/api", apiApp => apiApp.Run(async ctx => await ctx.Response.WriteAsync("API")));
```

---

**Q: In what order should you register middleware, and why does order matter?**

> **Bottom line:** Order matters because earlier middleware runs first on the request and last on the response — security middleware (auth) must come before business logic, and error handling must come first.

**Elaboration:** A typical correct order: exception handling → HTTPS redirection → static files → routing → authentication → authorization → endpoints. If you put authorization before authentication, the auth check runs against an unauthenticated user and everything is denied. Error handling must be outermost so it catches exceptions from all inner middleware.

---

**Q: What is the difference between middleware and an action filter?**

> **Bottom line:** Middleware runs for every request in the pipeline; action filters run only for requests that reach MVC controller actions.

**Elaboration:** Use middleware for cross-cutting concerns that apply to all requests (authentication, logging, rate limiting). Use action filters for concerns specific to controller actions (model validation, per-action caching, response shaping). Action filters have access to `ActionContext` and can interact with model binding results; middleware does not.

---

**Q: How do you add a custom header to an HTTP request using HttpRequestHeaders?**

```csharp
var request = new HttpRequestMessage(HttpMethod.Get, "/api/items");
request.Headers.Add("X-Correlation-Id", correlationId);
request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
var response = await _client.SendAsync(request);
```

---

**Q: How do you add XML support to an ASP.NET Core API? What does AddXmlSerializerFormatters() do?**

> **Bottom line:** `AddXmlSerializerFormatters()` registers both an XML input formatter (for parsing XML request bodies) and an XML output formatter (for returning XML responses) using `XmlSerializer`.

```csharp
builder.Services.AddControllers()
    .AddXmlSerializerFormatters(); // enables XML in + out via XmlSerializer
// Alternative: AddXmlDataContractSerializerFormatters() for DataContractSerializer
```

---

**Q: What does RespectBrowserAcceptHeader do? When would you enable it?**

> **Bottom line:** It makes ASP.NET Core honor the browser's `Accept` header (which typically requests HTML/XML before JSON), enabling true content negotiation including XML responses for browser requests.

**Elaboration:** By default, ASP.NET Core APIs ignore the `*/*` or `text/html` preference browsers send and always return JSON. Setting `RespectBrowserAcceptHeader = true` makes the server actually respond with XML when the browser prefers it. Enable it only if your API genuinely serves multiple content types and you want browsers to receive non-JSON responses. Most JSON APIs leave it false.

```csharp
builder.Services.AddControllers(o => o.RespectBrowserAcceptHeader = true);
```

---

**Q: How do you create a custom output formatter in ASP.NET Core?**

> **Bottom line:** Inherit from `TextOutputFormatter`, declare supported media types and encodings, override `WriteResponseBodyAsync`, and register it in `AddControllers(o => o.OutputFormatters.Add(...))`.

```csharp
public class CsvOutputFormatter : TextOutputFormatter
{
    public CsvOutputFormatter()
    {
        SupportedMediaTypes.Add("text/csv");
        SupportedEncodings.Add(Encoding.UTF8);
    }

    public override async Task WriteResponseBodyAsync(OutputFormatterWriteContext context, Encoding encoding)
    {
        var items = context.Object as IEnumerable<object>;
        await context.HttpContext.Response.WriteAsync(ToCsv(items), encoding);
    }
}
// Registration:
builder.Services.AddControllers(o => o.OutputFormatters.Add(new CsvOutputFormatter()));
```

---

**Q: What are [Consumes] and [Produces] attributes? How do they restrict content type?**

> **Bottom line:** `[Consumes]` restricts which content types an action accepts in the request body; `[Produces]` declares what content types the action can return.

**Elaboration:** These attributes affect content negotiation and show up in Swagger/OpenAPI documentation. If a client sends a request with a `Content-Type` not in `[Consumes]`, ASP.NET Core returns 415 Unsupported Media Type. If the client's `Accept` header doesn't match anything in `[Produces]`, it returns 406 Not Acceptable (if `ReturnHttpNotAcceptable` is enabled).

```csharp
[HttpPost]
[Consumes("application/json", "application/xml")]
[Produces("application/json")]
public IActionResult Create([FromBody] ItemDto item) => Ok(item);
```

---

**Q: How do you receive a file upload in an ASP.NET Core controller action?**

> **Bottom line:** Use `IFormFile` as an action parameter, or `IFormFileCollection` for multiple files; bind from `multipart/form-data`.

```csharp
[HttpPost("upload")]
[RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
public async Task<IActionResult> Upload(IFormFile file)
{
    if (file.Length == 0) return BadRequest("Empty file.");
    using var stream = new MemoryStream();
    await file.CopyToAsync(stream);
    // process stream.ToArray()
    return Ok(new { file.FileName, file.Length });
}
```

---

**Q: Write a custom middleware that logs the path and status code of every request.**

```csharp
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        await _next(context);
        _logger.LogInformation("{Method} {Path} → {StatusCode}",
            context.Request.Method, context.Request.Path, context.Response.StatusCode);
    }
}

// Registration:
app.UseMiddleware<RequestLoggingMiddleware>();
```

---

**Q: What is HttpContext and what does it give you access to?**

> **Bottom line:** `HttpContext` is the central object for an HTTP request — it exposes the request, response, connection info, user identity, services, and feature collection.

**Elaboration:** Key properties: `Request` (method, path, headers, body, query string), `Response` (status code, headers, body stream), `User` (ClaimsPrincipal for authentication), `RequestServices` (scoped DI container), `Connection` (remote IP, port), and `Features` (low-level server features).

---

**Q: How do you access HttpContext inside a non-controller service?**

> **Bottom line:** Inject `IHttpContextAccessor` into the service — it provides thread-safe access to the current request's `HttpContext`.

```csharp
public class MyService
{
    private readonly IHttpContextAccessor _accessor;
    public MyService(IHttpContextAccessor accessor) => _accessor = accessor;

    public string GetUserId() =>
        _accessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
}

// Registration:
builder.Services.AddHttpContextAccessor();
```

---

**Q: What are Request Feature interfaces? When would you access them directly?**

> **Bottom line:** Feature interfaces (e.g., `IHttpRequestFeature`, `IHttpConnectionFeature`) expose low-level server details that `HttpContext` doesn't surface directly — use them when you need raw protocol access unavailable through the standard API.

**Elaboration:** Examples: `IHttpConnectionFeature` gives you the remote IP and port without the abstraction of `HttpContext.Connection`. `IHttpMaxRequestBodySizeFeature` lets you override the request body size limit per request. `ITlsConnectionFeature` gives access to the client certificate. You access features via `HttpContext.Features.Get<IFeatureInterface>()`.

---

**Q: How would you use middleware to implement request timing?**

```csharp
public async Task InvokeAsync(HttpContext context)
{
    var sw = Stopwatch.StartNew();
    await _next(context);
    sw.Stop();
    context.Response.Headers["X-Elapsed-Ms"] = sw.ElapsedMilliseconds.ToString();
}
```

---

**Q: A developer accesses HttpContext inside a background thread spawned from a request handler. What can go wrong?**

> **Bottom line:** The `HttpContext` is tied to the request lifetime — after the request completes, accessing it from a background thread causes null references or disposed-object exceptions.

**Elaboration:** `HttpContext` is not thread-safe and is recycled after the response is sent. Background work that outlives the request must not hold a reference to it. If you need data from the request in background work, copy the specific values (user ID, correlation ID) before starting the background task.

---

**Q: Should cross-cutting concerns like logging and auth live in middleware or action filters?**

> **Bottom line:** Middleware for concerns that apply to all requests (auth, HTTPS redirection, global error handling); action filters for concerns specific to controller actions (model validation, per-action authorization policies).

**Elaboration:** Middleware runs earlier and for every request — static files, health checks, and WebSocket upgrades never reach MVC. Action filters have access to `ActionContext`, model binding results, and MVC abstractions. For logging, I use middleware for request/response logging and action filters for business-level audit logging that needs action name and controller context.
