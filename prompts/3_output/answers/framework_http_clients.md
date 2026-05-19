# Interview Answers: Framework HTTP Clients (ASP.NET)

---

## Level 1 — Definition & Basics

### HTTP Fundamentals

**Q: What is an HTTP request header, and can you name five headers commonly seen in ASP.NET applications? What does each one tell the server?**

> **Bottom line:** Request headers are key-value metadata the client sends alongside the request to convey context about the payload, client capabilities, and authentication.

**Elaboration:** In ASP.NET apps you constantly deal with `Content-Type` (what format the body is in), `Accept` (what format the client wants back), `Authorization` (credentials or token), `X-Correlation-Id` (trace ID for distributed logging), and `User-Agent` (client identity/version). Getting any of these wrong — especially `Content-Type` vs `Accept` — is the most common cause of 415 or 406 errors in API integrations.

---

**Q: How are HTTP response status codes grouped into classes (1xx–5xx)? Give one real-world example from each class and explain what it signals to the client.**

> **Bottom line:** Status codes group by intent: informational, success, redirection, client error, and server error — each class tells the client who is responsible and what to do next.

**Elaboration:** `100 Continue` tells the client it can send a large body after checking headers first. `200 OK` is the baseline success signal. `301 Moved Permanently` instructs clients and crawlers to update their bookmark. `400 Bad Request` means the client sent garbage — fix the request. `500 Internal Server Error` means the server blew up — retry or escalate. The class alone lets monitoring systems and proxies react before they even parse the body.

---

**Q: What is the difference between the `Content-Type` and `Accept` headers? Why does confusing them cause problems in API clients?**

> **Bottom line:** `Content-Type` describes what you are sending; `Accept` describes what you want to receive — they flow in opposite directions.

**Elaboration:** If a client sets `Content-Type: application/xml` but sends JSON, the server's deserializer fails with a 400 or 415. If a client sets `Accept: application/json` but the server only has an XML formatter registered, you get a 406. Confusing the two is extremely common because both look like media-type headers. I always describe them as "outbox label" vs "inbox preference."

---

**Q: What is the role of the `Authorization` header, and why should its value never be logged verbatim?**

> **Bottom line:** The `Authorization` header carries credentials or bearer tokens that grant access, so logging it verbatim means your log store becomes an attack surface equivalent to a leaked password file.

**Elaboration:** Bearer tokens are often long-lived JWTs or API keys — if they appear in application logs, anyone with log access can impersonate any user. The fix is to either omit the header from structured logs entirely or replace its value with a redacted placeholder before writing. ASP.NET's built-in HTTP logging middleware has a `RequestHeaders` allowlist for exactly this reason.

---

### ASP.NET Pipeline Basics

**Q: In one or two sentences, what is ASP.NET Core middleware? How does it differ from an HTTP handler in classic ASP.NET (OWIN)?**

> **Bottom line:** Middleware is a composable pipeline component that processes requests and responses in order; unlike classic HTTP handlers, each middleware explicitly controls whether the next component runs.

**Elaboration:** In classic ASP.NET / OWIN, handlers were terminal — one handler owned the response. ASP.NET Core middleware forms a chain where each component can execute code before and after calling `next()`, enabling pre- and post-processing in a single class. This bidirectional model makes things like response compression and timing straightforward without the IHttpModule/IHttpHandler split.

---

**Q: What does `app.Use` vs `app.Run` mean when registering middleware? Which one allows the request to continue down the pipeline?**

> **Bottom line:** `app.Use` is non-terminal and calls `next()` to continue the pipeline; `app.Run` is terminal and short-circuits it.

**Elaboration:** If you accidentally use `app.Run` for something like CORS or authentication, everything registered after it is dead code and never executes. I treat `app.Run` as the last resort — typically only for a catch-all fallback or a health endpoint in a minimal setup. In practice, almost everything should use `app.Use`.

---

**Q: A junior developer asks whether to handle cross-cutting concerns (logging, auth, CORS) in middleware or in action filters. How would you guide that decision?**

> **Bottom line:** Use middleware for infrastructure concerns that apply to all requests; use action filters for concerns that need MVC context like model state, action descriptors, or controller metadata.

**Elaboration:** Middleware runs before MVC even knows which action will be invoked, so it cannot access route data or model-binding results — authentication and CORS belong there. Action filters run after routing and model binding, making them the right place for things like "log which action was called with what validated parameters" or "check a feature flag based on the route." Mixing them up creates either overly broad security holes or unnecessary MVC overhead for non-MVC requests.

---

## Level 2 — Core Concepts

### Middleware Pipeline

**Q: Describe the request/response lifecycle through the ASP.NET Core middleware pipeline. What happens if a middleware calls `next()` vs if it does not?**

> **Bottom line:** The pipeline is a nested delegate chain — calling `next()` passes control inward toward the endpoint; not calling it short-circuits everything downstream and the response is written by that middleware alone.

**Elaboration:** Each middleware wraps the next in a closure, so the call stack on the way in mirrors the return path on the way out. Code before `await next(context)` runs on the request leg; code after runs on the response leg. Skipping `next()` is how authentication middleware rejects a request with a 401 before the action ever runs. Forgetting to call `next()` accidentally is a common bug that results in silent 200s with an empty body.

---

**Q: Why does middleware registration order matter? Give a concrete scenario where the wrong order causes a security or correctness bug.**

> **Bottom line:** Order is execution order — registering authorization before authentication means you are checking permissions before you know who the user is, which always evaluates to "anonymous."

**Elaboration:** The canonical mistake is `app.UseAuthorization()` before `app.UseAuthentication()`. The auth middleware hasn't populated `HttpContext.User` yet, so every policy check sees an unauthenticated principal and either grants access by default or rejects everyone. Similarly, placing CORS after routing means the preflight OPTIONS request gets routed and rejected before CORS headers are ever added. In the ASP.NET Core docs, the recommended order is explicit for this reason.

---

**Q: When would you choose `IMiddleware` (factory-based) over the convention-based `InvokeAsync` approach? What are the lifecycle implications?**

> **Bottom line:** Use `IMiddleware` when your middleware has scoped or transient dependencies — it gets instantiated per-request from DI rather than once at startup.

**Elaboration:** Convention-based middleware is instantiated as a singleton at startup, so constructor-injected scoped services like `DbContext` will be disposed before the middleware tries to use them again on the next request. `IMiddleware` solves this cleanly because the DI container resolves and disposes it per request, exactly like a controller. The downside is a small extra allocation per request — negligible for most apps but worth knowing in extreme throughput scenarios.

---

### HTTP Headers in ASP.NET

**Q: How does ASP.NET Core expose request headers on the server side? How would you safely read a header that might be absent?**

> **Bottom line:** Headers are exposed via `HttpContext.Request.Headers` as an `IHeaderDictionary`, and the safe read pattern is `TryGetValue` or the indexer with a null/StringValues check.

**Elaboration:** `IHeaderDictionary` maps header names (case-insensitive) to `StringValues`, which can hold multiple values for the same key. The indexer returns `StringValues.Empty` rather than throwing when a header is missing, so you need to check `StringValues.IsNullOrEmpty` or use `TryGetValue`. I avoid direct casting to `string` without that check because it silently returns an empty string, which can mask missing required headers.

```csharp
if (context.Request.Headers.TryGetValue("X-Correlation-Id", out var correlationId)
    && !StringValues.IsNullOrEmpty(correlationId))
{
    // safe to use correlationId.ToString()
}
```

---

**Q: What is `HttpRequestHeaders` in the `System.Net.Http` client stack? How is it different from `IHeaderDictionary` on the server side?**

> **Bottom line:** `HttpRequestHeaders` is the typed, strongly-validated header collection on an outgoing `HttpRequestMessage`; `IHeaderDictionary` is the raw key-value store on an incoming server-side request.

**Elaboration:** `HttpRequestHeaders` has typed properties like `.Authorization` and `.Accept`, and it enforces RFC rules — setting a restricted header like `Host` via the wrong property throws. `IHeaderDictionary` is more permissive because the server receives whatever the client sent, including malformed headers. On the client side you get compile-time safety; on the server side you get raw fidelity and must validate yourself.

---

**Q: Why are some headers (e.g., `Host`, `Content-Length`) considered "restricted" in `HttpClient` and cannot be set via `DefaultRequestHeaders`?**

> **Bottom line:** Restricted headers are automatically computed or controlled by the HTTP stack itself — letting user code override them would produce invalid or inconsistent requests.

**Elaboration:** `Content-Length` is calculated from the request body, and `Host` is derived from the URI; if you could freely set them, you'd easily craft malformed requests or enable header injection. The .NET HTTP stack enforces these as controlled headers. If you genuinely need to override them (e.g., reverse proxy forwarding), you can use `TryAddWithoutValidation` on the specific `HttpRequestMessage`, not `DefaultRequestHeaders`, which only applies per-request.

---

### Status Codes

**Q: A REST API returns `200 OK` on every response and puts the real error in a JSON body field. What problems does this cause?**

> **Bottom line:** Tunneling errors through 200 breaks every layer that relies on HTTP semantics — retry logic, caches, monitoring, and client error handling all become blind.

**Elaboration:** Load balancers and proxies use status codes to decide whether to retry or cache. If everything is 200, a failed payment or a validation error silently looks like a success to infrastructure. APM tools like Application Insights track error rates by status code — you'll show 0% errors in your dashboard while your users are getting failures. Every client must now parse the body before knowing if the call succeeded, which couples them to your private schema instead of a universal contract.

---

**Q: When should an API return `400 Bad Request` vs `422 Unprocessable Entity`? Does ASP.NET Core's default behavior align with your preference?**

> **Bottom line:** `400` means the request was malformed (can't be parsed); `422` means it was syntactically valid but semantically invalid (failed business rules or validation).

**Elaboration:** ASP.NET Core's default automatic model validation returns `400` for both missing required fields and malformed JSON, which I find slightly imprecise — a well-formed JSON body that fails data annotations is arguably a `422`. I usually override `InvalidModelStateResponseFactory` in `AddControllers` to return `422` for model validation failures and reserve `400` for deserialization errors. It's a minor point, but API consumers appreciate the distinction because it tells them whether to fix their schema or their values.

---

## Level 3 — Practical Usage

### Manipulating Headers

**Q: Show how you would add a custom `X-Correlation-Id` header to every outgoing `HttpClient` request without duplicating code in each call site.**

> **Bottom line:** Implement a `DelegatingHandler` and register it with `IHttpClientFactory` — it intercepts every request transparently.

**Elaboration:** A delegating handler is the cleanest extension point because it runs in the `HttpClient` pipeline before the request hits the network, and you register it once per named or typed client. You can inject scoped services into it because `IHttpClientFactory` creates a fresh handler scope per request.

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

**Q: How would you remove a sensitive header (e.g., `Server`) from every HTTP response in ASP.NET Core? Would you use middleware or response headers policy — why?**

> **Bottom line:** Use `app.UseSecurityHeaders()` or the built-in `ResponseHeadersPolicy` — it's declarative and purpose-built, whereas middleware is more flexible but requires manual maintenance.

**Elaboration:** ASP.NET Core provides `HeaderPolicyCollection` via `NetEscapades.AspNetCore.SecurityHeaders` (community) or you can configure Kestrel directly to suppress the `Server` header via `KestrelServerOptions.AddServerHeader = false`. For a one-liner fix, Kestrel's option is cleanest. Middleware works fine but adds a layer you have to test and maintain. I reach for the dedicated config first and write custom middleware only when the policy API can't express what I need.

---

**Q: Your integration tests fail in CI because `DefaultRequestHeaders` throws `InvalidOperationException` after the first request is sent. What is the root cause and how do you fix it?**

> **Bottom line:** `DefaultRequestHeaders` cannot be mutated after the first request because `HttpClient` becomes "locked" — move per-request headers to `HttpRequestMessage.Headers` instead.

**Elaboration:** `HttpClient` freezes its handler pipeline and default headers after the first send to prevent race conditions. If your test setup modifies `DefaultRequestHeaders` between requests on the same `HttpClient` instance, the second modification throws. The fix is to stop using `DefaultRequestHeaders` for anything that varies per request and instead set headers directly on the `HttpRequestMessage`, or use a `DelegatingHandler` for anything that needs dynamic values.

---

### Content Negotiation & Formatters

**Q: What does `AddXmlSerializerFormatters()` do? What is the difference between `XmlSerializerOutputFormatter` and `XmlDataContractSerializerOutputFormatter`?**

> **Bottom line:** It registers both XML formatters so the pipeline can serialize/deserialize XML — `XmlSerializer` uses public property convention while `XmlDataContractSerializer` uses `[DataContract]`/`[DataMember]` attributes.

**Elaboration:** `XmlSerializer` is the older, annotation-free approach that reflects over public properties and fields — it works without modifying your model classes. `XmlDataContractSerializerOutputFormatter` uses the WCF data-contract system, which requires opt-in attributes but gives you more control over element names, namespaces, and versioning. For greenfield APIs, I default to `XmlSerializer` since it requires no attribute noise, and only reach for data contracts when I need strict namespace control for interop.

---

**Q: What is `RespectBrowserAcceptHeader`? Why is it `false` by default, and when would you set it to `true`?**

> **Bottom line:** It controls whether the formatter pipeline honors a browser's `Accept: text/html` preference — it's `false` by default so browsers always get JSON from APIs instead of a 406.

**Elaboration:** Browsers send `Accept: text/html,application/xhtml+xml,*/*` for navigation requests, which would trigger a 406 or an unexpected format from an API. With the default `false`, ASP.NET Core ignores the browser's `text/html` preference and falls through to the first registered formatter (usually JSON). You'd set it to `true` only if you're building a hypermedia API or Razor/MVC app where browsers genuinely should receive HTML — not a JSON API.

---

**Q: Walk through how content negotiation selects a formatter when a client sends `Accept: application/xml, application/json;q=0.8`. What happens if no formatter matches?**

> **Bottom line:** The selector scores each registered formatter against the Accept header by quality factor and picks the highest-scoring match; if nothing matches, it returns `406 Not Acceptable` by default.

**Elaboration:** `DefaultOutputFormatterSelector` iterates the registered formatters in registration order and for each one checks whether any of its supported media types matches an Accept entry. It multiplies the match quality by the Accept q-value and picks the winner. In this example, XML wins over JSON because q=1.0 > q=0.8 — but only if an XML formatter is registered. If no formatter claims any Accept type, you get 406 unless `ReturnHttpNotAcceptable` is `false`, in which case it falls back to the first formatter.

---

**Q: A product manager wants every endpoint to always return JSON regardless of the client's `Accept` header. How would you implement that, and what are the downsides?**

> **Bottom line:** Set `MvcOptions.RespectBrowserAcceptHeader = false` (already default) and remove all non-JSON formatters — or set `ReturnHttpNotAcceptable = false` to always fall back to JSON.

**Elaboration:** The cleanest approach is just not registering XML or other formatters. If you want to be explicit, `options.OutputFormatters.RemoveType<XmlSerializerOutputFormatter>()` ensures nothing else can be negotiated. The downside is you're breaking the HTTP contract — any client that needs XML or MessagePack must now do client-side conversion, and you've made your API less interoperable. Internal APIs can justify this; public APIs generally should not.

---

### Consume and Produce Filters

**Q: What is the difference between `[Consumes("application/json")]` and `[Produces("application/json")]`? How does each affect routing and response serialization?**

> **Bottom line:** `[Consumes]` filters which actions match an incoming request by `Content-Type` and affects routing; `[Produces]` restricts the output formatter and signals to clients what the response will be.

**Elaboration:** `[Consumes]` participates in action selection — if two actions share a route but differ by Consumes, the right one is picked based on the request's Content-Type. If no action matches, you get a 415. `[Produces]` doesn't affect routing at all; it just constrains which formatters are tried for the response and sets the response Content-Type. They're symmetrical in purpose but operate at different pipeline stages.

---

**Q: If a client POSTs `Content-Type: text/plain` to an action decorated with `[Consumes("application/json")]`, what HTTP status code does the client receive, and why?**

> **Bottom line:** `415 Unsupported Media Type` — ASP.NET Core's action selector rejects the request before the action method is ever invoked because no registered action accepts `text/plain`.

**Elaboration:** The MVC framework uses `[Consumes]` as a routing constraint, not just a documentation hint. The framework checks the request's Content-Type against all `[Consumes]` declarations during action selection. If there's no match, it short-circuits with 415 immediately. This is actually desirable behavior — it fails fast with a meaningful status code rather than letting the body reach a deserializer that will also fail.

---

### File Uploads

**Q: How do you bind a file upload to an action method parameter using `IFormFile`? What `Content-Type` must the client use, and why?**

> **Bottom line:** Declare `IFormFile` as a parameter and the client must send `multipart/form-data` — the multipart boundary is what allows both file bytes and form fields to coexist in one body.

**Elaboration:** `application/x-www-form-urlencoded` can only encode text key-value pairs, so binary file content must use `multipart/form-data`. ASP.NET Core's model binder reads the multipart sections, matches part names to parameter names, and wraps each file part in `IFormFile`. If the client sends `application/octet-stream` directly, you'd need to read `Request.Body` manually instead of using `IFormFile`.

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

**Q: What is the default maximum request body size in ASP.NET Core (Kestrel), and how would you increase it only for a specific file-upload endpoint?**

> **Bottom line:** Kestrel's default max request body size is 30 MB — override it per-endpoint with `[RequestSizeLimit]` or `[DisableRequestSizeLimit]`.

**Elaboration:** The global limit is set in `KestrelServerOptions.Limits.MaxRequestBodySize`. For a specific endpoint, `[RequestSizeLimit(100_000_000)]` (in bytes) overrides the global limit just for that action. `[DisableRequestSizeLimit]` removes the limit entirely, which I only use on internal admin endpoints behind additional auth. Remember that IIS has its own `maxAllowedContentLength` in `web.config` that you also need to raise — two different knobs.

---

## Level 4 — Common Pitfalls

### Middleware Pitfalls

**Q: A developer writes a middleware that reads `Request.Body` for audit logging, but downstream action methods always receive an empty model. What is the cause, and what are two ways to fix it?**

> **Bottom line:** `Request.Body` is a forward-only stream — once read, the position is at the end and downstream middleware reads nothing; fix it by either enabling buffering or copying and replacing the stream.

**Elaboration:** The two standard fixes are: (1) call `Request.EnableBuffering()` before reading, which replaces the body with a seekable `FileBufferingReadStream` and then reset `Position = 0` after reading so downstream gets the full content; or (2) read the body, store what you need, and write it back via a `MemoryStream`. Option 1 is preferred because `EnableBuffering` is idempotent and handles memory-to-disk spill for large bodies automatically. Option 2 risks memory issues for large payloads.

---

**Q: Why is it dangerous to capture `HttpContext` in a background `Task` started inside middleware? What interface should you use instead?**

> **Bottom line:** `HttpContext` is request-scoped and gets recycled after the response completes — accessing it from a background task after that point causes `ObjectDisposedException` or silently reads stale data from a recycled context.

**Elaboration:** The correct tool is `IHttpContextAccessor`, but even that is not a silver bullet — it uses `AsyncLocal<T>` which flows context down the call chain but does not prevent the context from being disposed when the request ends. For fire-and-forget background work, you should copy only the specific values you need (correlation ID, user ID) out of `HttpContext` before the background task starts, then work with those primitives. Never store a reference to `HttpContext` itself in a long-lived object.

---

**Q: A team stores per-request state in `HttpContext.Items`. Another team uses a scoped service. Compare these approaches.**

> **Bottom line:** Scoped services are strongly typed, DI-testable, and don't require magic string keys; `HttpContext.Items` is a weakly typed dictionary that couples middleware to shared key constants.

**Elaboration:** `HttpContext.Items` works fine for simple middleware-to-middleware handoffs within one request, but it has no IntelliSense, no compile-time safety, and tests have to mock `HttpContext` just to verify state. A scoped service is resolved by type, plays well with DI mocks, and can encapsulate mutation logic. I use `Items` only when I need to pass data from very early in the pipeline (before DI scope is useful) or in third-party middleware that I can't change to accept DI.

---

### Custom Formatters

**Q: What abstract base classes would you extend to create a custom input and output formatter in ASP.NET Core MVC?**

> **Bottom line:** Extend `InputFormatter` (or `TextInputFormatter`) for reading request bodies and `OutputFormatter` (or `TextOutputFormatter`) for writing responses.

**Elaboration:** For each, you must override `CanReadType`/`CanWriteType` to declare which CLR types you support, and `ReadRequestBodyAsync`/`WriteResponseBodyAsync` for the actual serialization. You also set `SupportedMediaTypes` in the constructor — without that, the formatter is never selected. `TextOutputFormatter` adds charset negotiation on top, so prefer it for text-based formats.

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

**Q: A custom `OutputFormatter` is registered but never selected. List three things you would check first.**

> **Bottom line:** Check that `SupportedMediaTypes` is populated, that the client's `Accept` header actually matches one of those types, and that the formatter is registered before the catch-all JSON formatter.

**Elaboration:** First, if `SupportedMediaTypes` is empty, the selector skips the formatter entirely — this is the most common mistake. Second, even with correct media types, if the client's `Accept` header doesn't include your type (or sends `*/*` with the JSON formatter scoring higher), it won't win. Third, formatter order matters — JSON is often registered first and matches `*/*`, so place your formatter before it or ensure your media type is explicit enough to beat `*/*`.

---

### File Upload Pitfalls

**Q: A file upload endpoint works under 2 MB but returns `413` for larger files only in production behind IIS/NGINX. What layers enforce size limits and how do you adjust each?**

> **Bottom line:** Three independent layers enforce body size limits — Kestrel, IIS (via `web.config`), and NGINX (via `client_max_body_size`) — all three must be raised.

**Elaboration:** Kestrel's limit is `KestrelServerOptions.Limits.MaxRequestBodySize` (default 30 MB). IIS has `<requestLimits maxAllowedContentLength="30000000" />` in `web.config` under `<system.webServer>` (default ~28 MB, in bytes). NGINX defaults `client_max_body_size` to 1 MB. If the 413 only happens in production, it's almost always the reverse proxy. Use `[RequestSizeLimit]` on the action to raise Kestrel's per-endpoint limit without changing the global setting.

---

**Q: Why should you avoid `IFormFile.OpenReadStream()` then `ReadToEnd()` for very large files?**

> **Bottom line:** `ReadToEnd()` buffers the entire file in memory, which exhausts server RAM under concurrency; stream the file in chunks or pipe it directly to storage.

**Elaboration:** ASP.NET Core provides `IFormFile.CopyToAsync(Stream)` for efficient async chunk-based copying to a destination stream. For truly large files, the better pattern is to bypass `IFormFile` entirely and use `MultipartReader` to read sections as streams without materializing the whole file. `System.IO.Pipelines` (`PipeReader`) is the highest-performance option because it avoids double-buffering and works naturally with Kestrel's internal buffer management.

---

### Headers Pitfalls

**Q: A colleague shares `HttpClient` as a static field and mutates `DefaultRequestHeaders` per request in a parallel loop. What concurrency bug will occur, and how do you redesign it?**

> **Bottom line:** `DefaultRequestHeaders` is not thread-safe — concurrent mutations corrupt the header collection, causing intermittent wrong headers or exceptions under load.

**Elaboration:** The redesign is twofold: first, use `IHttpClientFactory` (which manages pooled handler lifetimes correctly) instead of a static `HttpClient`; second, never mutate `DefaultRequestHeaders` at runtime. Set only static, request-invariant headers in `DefaultRequestHeaders` at registration time. For per-request dynamic headers, create a new `HttpRequestMessage` and set `request.Headers` on that instance — `HttpRequestMessage` is not shared, so it's safe.

---

## Level 5 — Internals & Deep Mechanics

### HttpContext and Feature Collections

**Q: What is `IFeatureCollection` in ASP.NET Core? How does `HttpContext` use it internally?**

> **Bottom line:** `IFeatureCollection` is a dictionary keyed by interface type that lets the server (Kestrel, IIS, test host) inject concrete implementations of HTTP abstractions into `HttpContext` without coupling to any one server.

**Elaboration:** `HttpContext` properties like `Request`, `Response`, and `Connection` are not directly stored fields — they delegate to feature objects retrieved from the collection. For example, `HttpContext.Request` reads from `IHttpRequestFeature`. Kestrel provides its own high-performance implementations; the test host provides simple in-memory ones. This indirection is what makes unit-testing `HttpContext` possible without spinning up a real server.

---

**Q: Name four common request feature interfaces and describe what each exposes. When would application code interact with them directly?**

> **Bottom line:** You interact with feature interfaces directly when you need capabilities beyond what `HttpContext`'s convenience properties expose — typically in middleware or custom server integrations.

**Elaboration:** `IHttpRequestFeature` exposes the raw path, method, headers, and body stream. `IHttpResponseFeature` exposes status code, reason phrase, and response headers. `IHttpConnectionFeature` exposes the local/remote IP and connection ID. `IHttpUpgradeFeature` exposes protocol upgrade capability for WebSockets. Application code normally never touches these directly — you'd drop to the feature level when writing a custom WebSocket handshake, implementing response body interception via `IHttpResponseBodyFeature`, or testing with a synthetic server.

---

**Q: What are the performance and versioning trade-offs of the feature collection abstraction layer?**

> **Bottom line:** The abstraction buys server-agnostic code and testability at the cost of a dictionary lookup per property access and the risk of feature absence at runtime.

**Elaboration:** Every access to `HttpContext.Request.Path` ultimately calls `Features.Get<IHttpRequestFeature>()`, which is a dictionary lookup rather than a direct field read. ASP.NET Core caches these lookups in generated code and `DefaultHttpContext` uses indexed slots to make them O(1), but it's still an indirection. The versioning risk is that new .NET releases can add features without breaking existing hosts, but code that calls `Features.Get<ISomeNewFeature>()` must handle the null case when running on an older host.

---

### IHttpContextAccessor Internals

**Q: How does `IHttpContextAccessor` propagate `HttpContext` to non-middleware services? What `AsyncLocal<T>` mechanism underlies it?**

> **Bottom line:** `HttpContextAccessor` stores the current context in an `AsyncLocal<HttpContext>`, which flows the value down the async call chain but does not propagate it back up or across parallel branches.

**Elaboration:** `AsyncLocal<T>` creates a copy-on-write logical context that is inherited by child async operations. When a request starts, the framework sets `HttpContextAccessor.HttpContext = context`; any await that follows inherits that value. The memory leak risk is that `AsyncLocal` causes a capture in every `ExecutionContext` created during the request — in high-allocation scenarios or poorly structured fire-and-forget tasks, this keeps the `HttpContext` alive longer than necessary. Null references happen when a service is called from a context where no request is active (startup, background services).

---

**Q: A singleton service injected with `IHttpContextAccessor` returns `null` for `HttpContext` during startup initialization. Why, and how do you guard against it?**

> **Bottom line:** `IHttpContextAccessor.HttpContext` is null outside of a request — at startup there is no active request, so the `AsyncLocal` has never been set.

**Elaboration:** The guard is a null check with a meaningful exception or early return: `var ctx = _accessor.HttpContext ?? throw new InvalidOperationException("No active HTTP request.")`. Better still, design the service so it doesn't need `HttpContext` in its constructor or initialization path — inject only what you need lazily, at call time. If a singleton genuinely needs request data, reconsider whether it should be scoped instead.

---

### Content Negotiation Internals

**Q: Walk through the `ObjectResult` execution path. How does `DefaultOutputFormatterSelector` score and pick a formatter?**

> **Bottom line:** `ObjectResult.ExecuteResultAsync` calls `DefaultOutputFormatterSelector.SelectFormatter`, which scores each formatter by matching its declared media types against Accept entries weighted by q-values, then calls `WriteAsync` on the winner.

**Elaboration:** The selector first builds an ordered list of acceptable media types from the `Accept` header, sorted by q-value descending. For each formatter (in registration order), it checks whether any of its `SupportedMediaTypes` satisfies one of the acceptable types. The first formatter that matches the highest-priority acceptable type wins — there's no global scoring across all formatters simultaneously, so registration order breaks ties. If `ReturnHttpNotAcceptable` is true and nothing matches, the result short-circuits to 406.

---

**Q: Why does `RespectBrowserAcceptHeader = false` make browsers always receive JSON, even though browsers send `text/html` as their first-choice `Accept` value?**

> **Bottom line:** With `false`, the selector ignores `text/html` and `application/xhtml+xml` entries from the Accept header and falls through to the first registered formatter regardless of browser preference.

**Elaboration:** When `RespectBrowserAcceptHeader` is false, `DefaultOutputFormatterSelector` detects that the client is a browser (by checking for `text/html` in Accept) and strips those browser-specific types before running formatter selection. Since no remaining Accept entries match `text/html`, JSON wins by being the first registered formatter that matches the wildcard or the remaining explicit types. It's a pragmatic escape hatch because browsers' Accept headers are designed for navigation, not APIs.

---

### Middleware Internals

**Q: How does ASP.NET Core compile the middleware pipeline into a single `RequestDelegate` chain at startup? What are the performance implications of `app.UseWhen` vs branching inside a single middleware?**

> **Bottom line:** `IApplicationBuilder.Build()` folds the middleware list into a nested `RequestDelegate` chain via lambda closures; `app.UseWhen` creates a sub-pipeline branch that is also pre-compiled but adds a predicate evaluation overhead per request.

**Elaboration:** Each `app.Use(middleware)` wraps the accumulated next delegate in a new closure — `Build()` reverses the list and composes them. `UseWhen` compiles the branch at startup (no repeated allocation) but evaluates the predicate on every request, which is negligible for simple conditions. The real cost of `UseWhen` is readability and debuggability, not CPU. Branching inside a single middleware with an `if` statement is marginally faster (one fewer delegate call) but trades that micro-optimization for less composable code.

---

## Level 6 — Trade-offs & Design Decisions

### Pipeline Architecture

**Q: Compare placing request-validation logic in middleware vs `IActionFilter` vs the domain model. Under what circumstances does each give better cohesion?**

> **Bottom line:** Middleware for format/auth validation, action filters for MVC-specific cross-cutting concerns, and domain models for business-rule validation — pushing too early sacrifices context; pushing too late sacrifices performance.

**Elaboration:** Middleware is the right place for things that don't require route or model data — rate limiting, JWT signature checks, required headers. Action filters have access to the action descriptor and bound model, making them ideal for "this controller requires a feature flag" or "log every action invocation with parameter names." Domain validation lives in the model because it expresses what the domain cares about, regardless of transport. Duplicating domain rules in middleware creates drift; doing auth in the domain model is a layering violation.

---

**Q: When designing a public API supporting JSON, XML, and MessagePack, how would you structure formatter registration for easy extensibility?**

> **Bottom line:** Register formatters in an extension method driven by feature flags or configuration, with a clear registration order, so adding a fourth format is a one-line addition.

**Elaboration:** I create an `AddApiFormatters(this IMvcBuilder builder)` extension that encapsulates the registration logic. Each formatter is toggled by an `ApiFormatterOptions` config section, so you can enable MessagePack in production without a code deploy. Registration order encodes the default preference: JSON first, then XML, then MessagePack. Versioning can be layered on top via URL segments or `Accept` vendor types without touching formatter registration at all.

---

**Q: A GDPR requirement mandates stripping PII from request logs. Compare (a) a logging middleware, (b) a custom `ILogger` sink, (c) a structured-logging enricher.**

> **Bottom line:** A structured-logging enricher is the right tool because PII scrubbing belongs in the logging pipeline, not in application code, and an enricher operates on structured properties before they reach any sink.

**Elaboration:** A logging middleware must handle every log statement that happens downstream — it cannot intercept logs written by libraries or DI-resolved services unless it wraps the entire logging pipeline. A custom sink scrubs data at the last possible moment, which means PII travels in memory to the sink even if it's never persisted — risky. A Serilog/OpenTelemetry enricher or destructuring policy runs before any sink and can redact by property name, giving you a single policy point that covers all log sources consistently. Correctness wins over performance here.

---

### Streaming vs Buffering

**Q: Describe the memory and latency trade-offs between fully buffering a request body vs streaming it for file-upload endpoints.**

> **Bottom line:** Buffering enables seeking and re-reading at the cost of memory (and disk spill for large files); streaming minimizes memory footprint but requires single-pass processing.

**Elaboration:** For small files or when you need to validate the body before processing, buffering via `EnableBuffering()` is pragmatic — it spills to a temp file beyond a configurable threshold so you don't blow the heap. For large uploads (video, backups), streaming directly to blob storage via `CopyToAsync` avoids ever materializing the full content in the server's memory, dramatically reducing per-request memory pressure under concurrency. The trade-off is that streaming is single-pass, so you can't re-read the body for a second validation step without buffering.

---

**Q: How does `EnableBuffering()` work internally? What are the implications for memory pressure under high concurrency?**

> **Bottom line:** `EnableBuffering()` replaces the raw request body stream with a `FileBufferingReadStream` that buffers in memory up to a threshold (default 30 KB) then spills to a temp file.

**Elaboration:** The memory threshold and temp file location are configurable via `BufferingHelper`. Under high concurrency, if every request calls `EnableBuffering()` and most requests exceed the memory threshold, you'll create a temp file per request — disk I/O becomes the bottleneck. Under the threshold, it's heap allocations of up to 30 KB each. In practice, enable buffering only in the middleware that needs it (audit logger, signature verification) and disable it everywhere else to keep the default streaming behavior.

---

### Feature Collection Mutability

**Q: Describe a legitimate use case for swapping out `IHttpResponseBodyFeature` mid-pipeline and the risks.**

> **Bottom line:** Response compression middleware swaps `IHttpResponseBodyFeature` to wrap the response stream with a compressor — the risk is that any middleware that cached a reference to the original stream now writes to the wrong place.

**Elaboration:** This is exactly how `UseResponseCompression()` works: it replaces the response body feature with one that wraps the underlying stream in a GZip/Brotli compressor. The hazard is ordering — middleware registered before the compression middleware that stores `Response.Body` in a local variable will bypass compression entirely. The rule is: always read `HttpContext.Response.Body` late (at write time), never store it in a local variable at request start.

---

**Q: Minimal APIs bypass much of the MVC formatter infrastructure. What do you lose, and how do you recover it if you need content negotiation?**

> **Bottom line:** Minimal APIs don't run `ObjectResult` through `DefaultOutputFormatterSelector`, so you lose automatic Accept-header-driven content negotiation — you must implement it manually or return `Results.Content` with explicit media types.

**Elaboration:** You also lose `[Produces]`/`[Consumes]` attribute routing, model binder formatters, and the filter pipeline. For simple APIs that always return JSON, none of this matters. If you need negotiation, you can check `HttpContext.Request.Headers.Accept` manually and serialize with your chosen serializer, or you can opt a minimal endpoint into the full MVC formatter pipeline by returning an `IResult` that wraps an `ObjectResult`. Alternatively, mixing minimal endpoints with controller endpoints in the same app is completely valid — use each where it fits.

---

## Level 7 — Advanced & Expert

### Custom Middleware at Platform Level

**Q: Design a production-ready middleware that computes an HMAC signature over the request body for audit, writes it to a distributed cache, and passes it downstream without breaking streaming endpoints.**

> **Bottom line:** Enable buffering to allow re-reading, compute the HMAC over the buffered body, write to the cache asynchronously with a timeout, reset the body position, then call `next()` — with a circuit breaker on the cache write so cache failures don't block requests.

**Elaboration:** Use `EnableBuffering()` with a reasonable memory threshold, then read the body into a `PipeReader` or `MemoryStream` for HMAC computation using `HMACSHA256`. After writing to the distributed cache, always reset `Request.Body.Position = 0` before calling `next()`. Wrap the cache write in a `Task.WhenAny` with a cancellation timeout so a slow Redis doesn't hold up the request. For backpressure, use a bounded channel as a write-ahead log: the middleware enqueues the audit entry and a background service drains it, decoupling request latency from cache write latency entirely.

---

**Q: In a high-throughput API gateway, how would you profile and reduce allocations in a custom middleware chain?**

> **Bottom line:** Profile with `dotnet-trace` and `BenchmarkDotNet` to find allocation hot paths, then replace closures with struct-based state machines, use `ValueTask` for synchronous fast paths, and leverage `System.IO.Pipelines` for zero-copy buffer handling.

**Elaboration:** The biggest middleware allocation sources are: lambda closures capturing `HttpContext` per request, `Task` allocations on every `await` even when the result is synchronous, and intermediate `byte[]` buffers when reading/writing bodies. `ValueTask` eliminates the `Task` allocation when the fast path completes synchronously. `ArrayPool<byte>.Shared` or `PipeReader`/`PipeWriter` eliminate intermediate buffers. For middleware that runs on every request, even eliminating 200 bytes of allocation per request at 10K RPS saves 2 GB/sec of GC pressure.

---

### Advanced Content Negotiation

**Q: Implement a custom `IOutputFormatter` that serializes to `application/vnd.myapp.v2+json` and integrates with `DefaultOutputFormatterSelector`. What edge cases must you handle?**

> **Bottom line:** Declare the vendor media type in `SupportedMediaTypes`, handle charset negotiation via `SupportedEncodings`, and ensure wildcard matching works by also supporting `application/*` if you want `Accept: */*` to select you.

**Elaboration:** The tricky edge cases are: (1) quality factor ordering — if both your formatter and the JSON formatter match `*/*`, registration order decides, so register yours before `SystemTextJsonOutputFormatter`; (2) charset — if the client sends `Accept-Charset: utf-16`, your formatter must check `SupportedEncodings` and select the right encoder; (3) wildcard matching — `application/vnd.myapp.v2+json` matches `application/*` and `*/*` but not `application/json`, so test all three Accept patterns. Return 406 (not crash) when the type is not in your `CanWriteType` — never write a partial response on type mismatch.

---

**Q: A client sends `Accept: */*` and `Accept-Encoding: br`. Your formatter returns JSON but NGINX strips Brotli-encoded responses. How do you diagnose and architect a solution at the ASP.NET Core level?**

> **Bottom line:** Diagnose with `curl -v --compressed` to confirm NGINX is stripping the `Content-Encoding: br` header; then either disable Brotli in ASP.NET Core's response compression for that content type or add a `Vary: Accept-Encoding` header so caches don't serve compressed responses to non-Brotli clients.

**Elaboration:** The root cause is likely a NGINX proxy that doesn't support Brotli but also doesn't pass the `Accept-Encoding` header transparently to the upstream — it strips encodings it can't handle. At the ASP.NET Core level, you can use `ResponseCompressionOptions.MimeTypes` to restrict Brotli to content types where you know the proxy is safe, or add a middleware that inspects the `Via` header (set by NGINX) and downgrades the `Accept-Encoding` to gzip before response compression runs. Adding `Vary: Accept-Encoding` to responses ensures that CDNs and intermediate caches store separate copies per encoding, preventing serving a br-encoded response to a client that didn't ask for it.

---

### Feature Interface Deep Dive

**Q: `IHttpUpgradeFeature` enables protocol upgrades. Walk through the upgrade handshake at the feature-collection level.**

> **Bottom line:** The middleware calls `IHttpUpgradeFeature.UpgradeAsync()`, which replaces the response body feature with a raw bidirectional stream and signals Kestrel to stop treating the connection as HTTP — after that, the middleware pipeline is effectively suspended for that connection.

**Elaboration:** Before the upgrade, normal request features (`IHttpRequestFeature`, `IHttpResponseFeature`) are active. Calling `UpgradeAsync()` sends the `101 Switching Protocols` response, replaces `IHttpResponseBodyFeature` and related features with an `IDuplexPipe`-based transport feature, and returns the raw stream. The pipeline's `next()` is never called (or returns immediately) because the connection is now owned by the upgrade handler — typically a WebSocket loop. The `HttpContext` remains valid for the connection lifetime, which can be hours.

---

**Q: Kestrel implements `IHttpMinRequestBodyDataRateFeature` to protect against slow-loris attacks. How does this interact with large file uploads, and how do you configure it per route?**

> **Bottom line:** The minimum data rate feature aborts connections that send request body data below a threshold bytes/sec, which can prematurely kill legitimate large file uploads on slow connections — disable it per-endpoint with `IHttpMinRequestBodyDataRateFeature.MinDataRate = null`.

**Elaboration:** The global default is 240 bytes/second with a 5-second grace period. For a file upload endpoint, set the feature to null in middleware or an action filter: `context.Features.Get<IHttpMinRequestBodyDataRateFeature>()?.MinDataRate = null`. Do this as early as possible in the pipeline, before Kestrel's rate enforcement fires. In a zero-downtime system, combine this with a reasonable connection timeout (30–120 seconds via `IHttpRequestBodyDetectionFeature` limits) so you don't trade slow-loris vulnerability for unlimited connection lifetime on uploads.

---

### Expert Debugging

**Q: In production, a subset of requests fail with `ObjectDisposedException` on `HttpContext.Response.Body` after the response appears sent. Walk through every layer to find the root cause.**

> **Bottom line:** The most common cause is a middleware or background task writing to the response after `HttpContext` has been disposed — typically a fire-and-forget continuation that outlives the request lifetime.

**Elaboration:** Start at the Kestrel level: each request gets a `HttpConnectionContext` whose `Abort()` disposes the response pipe when the connection closes or the request completes. If a `Task.Run` or an unawaited continuation holds a reference to `HttpContext.Response.Body` and executes after response completion, it touches a disposed `PipeWriter`. Check for unawaited tasks in middleware (`_ = SomeAsync(context)`), streaming response writers that don't check `context.RequestAborted`, and exception filters that try to write error responses after another middleware already completed the response. The fix: check `HttpContext.Response.HasStarted` before writing, always `await` fire-and-forget work or extract what you need from `HttpContext` before launching it, and register a `context.RequestAborted` cancellation handler.

---

**Q: You are evaluating gRPC (`Grpc.AspNetCore`) vs a REST API with custom binary formatters. Compare on content negotiation, middleware compatibility, browser accessibility, and operational complexity.**

> **Bottom line:** gRPC gives you a high-performance, strongly typed contract but sacrifices browser accessibility and standard HTTP content negotiation; REST with binary formatters is more operational overhead but fully compatible with web clients and standard tooling.

**Elaboration:** gRPC uses HTTP/2 trailers and a fixed Protobuf framing — content negotiation doesn't exist, the contract is the `.proto` file. Browser clients need grpc-web and a proxy translation layer. ASP.NET Core middleware works fine with gRPC because it still runs through the same `IFeatureCollection`-based pipeline, but response interceptor middleware that reads the body needs to understand Protobuf framing to do anything useful. REST with custom binary formatters (MessagePack, CBOR) keeps full content negotiation, works with browsers natively, and integrates with standard API gateways. I choose gRPC for internal service-to-service communication and REST for anything client-facing or where tooling interoperability matters.
