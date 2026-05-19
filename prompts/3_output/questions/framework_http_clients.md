# Interview Questions: Framework HTTP Clients (ASP.NET)

## Coverage map

| Item | Type | Level |
|------|------|-------|
| Middleware pipeline — request/response handling | `[FROM JD]` | 2–4 |
| Common HTTP request headers and their meaning | `[FROM JD]` | 1–2 |
| HTTP response status code classification | `[FROM JD]` | 1–2 |
| Accessing HttpContext in custom components | `[FROM JD]` | 3–5 |
| Common IFeatureCollection / Request Feature interfaces | `[FROM JD]` | 4–6 |
| HttpRequestHeaders — add, remove, modify | `[FROM JD]` | 3–4 |
| AddXmlSerializerFormatters — XML response formatting | `[FROM JD]` | 3–4 |
| RespectBrowserAcceptHeader — content negotiation | `[FROM JD]` | 3–5 |
| Custom formatters for unsupported types | `[FROM JD]` | 4–5 |
| [Consumes] / [Produces] filters | `[FROM JD]` | 3–4 |
| File content in HTTP requests (IFormFile) | `[FROM JD]` | 3–4 |
| Custom middleware for request metadata | `[FROM JD]` | 4–5 |
| HttpContext and Request Features internals | `[FROM JD]` | 5–7 |
| Content negotiation algorithm internals | `[INFERRED]` | 5–6 |
| Middleware order and short-circuiting | `[INFERRED]` | 3–5 |
| IHttpContextAccessor thread-safety pitfalls | `[INFERRED]` | 5–6 |
| OutputFormatter vs InputFormatter design | `[INFERRED]` | 5–7 |
| Streaming large file uploads / responses | `[INFERRED]` | 6–7 |
| Minimal API vs Controller-based content negotiation | `[INFERRED]` | 6–7 |
| Feature collection mutability and performance | `[INFERRED]` | 6–7 |

---

## Level 1 — Definition & Basics

_Goal: Confirm the candidate has foundational vocabulary and can reason about HTTP as a protocol inside ASP.NET._

### HTTP Fundamentals

- ❓ What is an HTTP request header, and can you name five headers commonly seen in ASP.NET applications? What does each one tell the server? `[FROM JD]`

- ❓ How are HTTP response status codes grouped into classes (1xx–5xx)? Give one real-world example from each class and explain what it signals to the client. `[FROM JD]`

- ❓ What is the difference between the `Content-Type` and `Accept` headers? Why does confusing them cause problems in API clients? `[FROM JD]`

- ❓ What is the role of the `Authorization` header, and why should its value never be logged verbatim? `[INFERRED]`

### ASP.NET Pipeline Basics

- ❓ In one or two sentences, what is ASP.NET Core middleware? How does it differ from an HTTP handler in classic ASP.NET (OWIN)? `[FROM JD]`

- ❓ What does `app.Use` vs `app.Run` mean when registering middleware? Which one allows the request to continue down the pipeline? `[FROM JD]`

- ❓ **Trade-off:** A junior developer asks whether to handle cross-cutting concerns (logging, auth, CORS) in middleware or in action filters. How would you guide that decision? `[INFERRED]`

---

## Level 2 — Core Concepts

_Goal: Verify the candidate understands how ASP.NET models HTTP requests and responses in code._

### Middleware Pipeline

- ❓ Describe the request/response lifecycle through the ASP.NET Core middleware pipeline. What happens if a middleware calls `next()` vs if it does not? `[FROM JD]`

- ❓ Why does middleware registration order matter? Give a concrete scenario where the wrong order causes a security or correctness bug (e.g., placing authentication after authorization). `[FROM JD]`

- ❓ **Trade-off:** When would you choose `IMiddleware` (factory-based) over the convention-based `InvokeAsync(HttpContext, RequestDelegate)` approach? What are the lifecycle implications for injected services? `[INFERRED]`

### HTTP Headers in ASP.NET

- ❓ How does ASP.NET Core expose request headers on the server side? Walk through `HttpRequest.Headers` and how you would safely read a header that might be absent. `[FROM JD]`

- ❓ What is `HttpRequestHeaders` in the `System.Net.Http` client stack? How is it different from `IHeaderDictionary` on the server side? `[FROM JD]`

- ❓ Why are some headers (e.g., `Host`, `Content-Length`) considered "restricted" in `HttpClient` and cannot be set via `DefaultRequestHeaders`? `[INFERRED]`

### Status Codes

- ❓ A REST API returns `200 OK` on every response and puts the real error in a JSON body field. What problems does this cause for clients, intermediaries, and monitoring? `[INFERRED]`

- ❓ **Trade-off:** When should an API return `400 Bad Request` vs `422 Unprocessable Entity`? Does ASP.NET Core's default model-validation behavior align with your preference, and if not, how would you change it? `[INFERRED]`

---

## Level 3 — Practical Usage

_Goal: Confirm the candidate can write real ASP.NET code for the skills listed in the JD._

### Manipulating Headers

- ❓ Show how you would add a custom `X-Correlation-Id` header to every outgoing `HttpClient` request using `HttpRequestHeaders` without duplicating code in each call site. `[FROM JD]`

- ❓ How would you remove a sensitive header (e.g., `Server`) from every HTTP response in ASP.NET Core? Would you use middleware or response headers policy — why? `[FROM JD]`

- ❓ **Debugging scenario:** Your integration tests pass locally but fail in CI because `DefaultRequestHeaders` throws `InvalidOperationException` after the first request is sent. What is the root cause, and how do you fix it? `[INFERRED]`

### Content Negotiation & Formatters

- ❓ What does `AddXmlSerializerFormatters()` do in `Program.cs`? What is the difference between `XmlSerializerOutputFormatter` and `XmlDataContractSerializerOutputFormatter`? `[FROM JD]`

- ❓ What is `RespectBrowserAcceptHeader`? Why is it `false` by default in ASP.NET Core, and when would you set it to `true`? `[FROM JD]`

- ❓ Walk through how content negotiation selects a formatter when a client sends `Accept: application/xml, application/json;q=0.8`. What happens if no formatter matches? `[INFERRED]`

- ❓ **Trade-off:** A product manager wants every endpoint to always return JSON regardless of the client's `Accept` header. How would you implement that, and what are the downsides for API consumers? `[INFERRED]`

### Consume and Produce Filters

- ❓ What is the difference between `[Consumes("application/json")]` and `[Produces("application/json")]`? How does each affect routing and response serialization? `[FROM JD]`

- ❓ If a client POSTs `Content-Type: text/plain` to an action decorated with `[Consumes("application/json")]`, what HTTP status code does the client receive, and why? `[FROM JD]`

### File Uploads

- ❓ How do you bind a file upload to an action method parameter using `IFormFile`? What `Content-Type` must the client use, and why? `[FROM JD]`

- ❓ What is the default maximum request body size in ASP.NET Core (Kestrel), and how would you increase it only for a specific file-upload endpoint? `[FROM JD]`

---

## Level 4 — Common Pitfalls

_Goal: Surface mistakes the candidate has encountered or knows how to avoid._

### Middleware Pitfalls

- ❓ **Debugging scenario:** A developer writes a middleware that reads `Request.Body` for audit logging, but downstream action methods always receive an empty model. What is the cause, and what are two ways to fix it? `[FROM JD]`

- ❓ Why is it dangerous to capture `HttpContext` in a background `Task` started inside middleware? What interface should you use instead, and what are its own caveats? `[FROM JD]`

- ❓ **Trade-off:** A team stores per-request state in `HttpContext.Items`. Another team uses a scoped service registered in DI. Compare these approaches for clarity, testability, and safety. `[INFERRED]`

### Custom Formatters

- ❓ What abstract base classes would you extend to create a custom input and output formatter in ASP.NET Core MVC? Walk through the minimum methods you must override. `[FROM JD]`

- ❓ A custom `OutputFormatter` is registered but never selected by the pipeline. List three things you would check first to diagnose the issue. `[FROM JD]`

### File Upload Pitfalls

- ❓ **Debugging scenario:** A file upload endpoint works for files under 2 MB but returns `413 Request Entity Too Large` for larger files only in production (behind IIS/NGINX). What layers enforce size limits, and how do you adjust each? `[FROM JD]`

- ❓ Why should you avoid `IFormFile.OpenReadStream()` and then `ReadToEnd()` for very large files? What buffering and streaming APIs does ASP.NET Core provide? `[INFERRED]`

### Headers Pitfalls

- ❓ A colleague shares `HttpClient` as a static field and mutates `DefaultRequestHeaders` per request inside a parallel loop. What concurrency bug will occur, and how do you redesign it? `[FROM JD]`

---

## Level 5 — Internals & Deep Mechanics

_Goal: Distinguish senior candidates who understand what happens under the hood._

### HttpContext and Feature Collections

- ❓ What is `IFeatureCollection` in ASP.NET Core? How does `HttpContext` use it internally to compose its properties like `Request`, `Response`, and `Connection`? `[FROM JD]`

- ❓ Name four common request feature interfaces (e.g., `IHttpRequestFeature`, `IHttpConnectionFeature`) and describe what each exposes. When would application code interact with them directly instead of using `HttpContext`? `[FROM JD]`

- ❓ **Trade-off:** Feature interfaces allow the server (Kestrel, IIS, test host) to swap implementations without changing `HttpContext`'s public surface. What are the performance and versioning trade-offs of this abstraction layer? `[FROM JD]`

### IHttpContextAccessor Internals

- ❓ How does `IHttpContextAccessor` propagate `HttpContext` to non-middleware services? What `AsyncLocal<T>` mechanism underlies it, and why can this cause memory leaks or null references in certain async patterns? `[FROM JD]`

- ❓ **Debugging scenario:** A singleton service injected with `IHttpContextAccessor` returns `null` for `HttpContext` during application startup initialization. Why, and how do you guard against it? `[INFERRED]`

### Content Negotiation Internals

- ❓ Walk through the `ObjectResult` execution path in ASP.NET Core MVC. How does `DefaultOutputFormatterSelector` score and pick a formatter given the `Accept` header, declared media types, and formatter order? `[INFERRED]`

- ❓ Why does `RespectBrowserAcceptHeader = false` effectively make browsers always receive JSON from an API, even though browsers send `text/html` as their first-choice `Accept` value? `[FROM JD]`

### Middleware Internals

- ❓ How does ASP.NET Core compile the middleware pipeline into a single `RequestDelegate` chain at startup? What are the performance implications of using `app.UseWhen` vs branching inside a single middleware? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions

_Goal: Evaluate architectural judgment and the ability to reason about alternatives._

### Pipeline Architecture

- ❓ **Trade-off:** Compare placing request-validation logic in middleware vs in an `IActionFilter` vs in the domain model itself. Under what circumstances does each location give better cohesion, testability, and performance? `[INFERRED]`

- ❓ When designing a public-facing API that must support JSON, XML, and MessagePack, how would you structure formatter registration, content-type routing, and versioning so that adding a fourth format requires minimal code change? `[FROM JD]`

- ❓ **Scenario:** A GDPR requirement mandates stripping PII from request logs. You are considering (a) a logging middleware that scrubs headers and body, (b) a custom `ILogger` sink, or (c) a structured-logging enricher. Compare the three on correctness, performance, and maintainability. `[INFERRED]`

### Streaming vs Buffering

- ❓ **Trade-off:** ASP.NET Core buffers request bodies by default in some hosting scenarios. Describe the memory and latency trade-offs between fully buffering a request body vs streaming it, and explain when each is appropriate for file-upload endpoints. `[FROM JD]`

- ❓ How does `EnableBuffering()` work internally? What happens to the underlying stream, and what are the implications for memory pressure under high concurrency? `[INFERRED]`

### Feature Collection Mutability

- ❓ Feature collections are mutable at runtime — middleware can replace features. Describe a legitimate use case for swapping out `IHttpResponseBodyFeature` mid-pipeline and the risks of doing so. `[FROM JD]`

- ❓ **Trade-off:** Minimal APIs in .NET 6+ bypass much of the MVC formatter infrastructure. If your team needs fine-grained content negotiation, what do you lose by choosing Minimal APIs, and how would you recover those capabilities? `[INFERRED]`

---

## Level 7 — Advanced & Expert

_Goal: Identify candidates capable of leading platform decisions, contributing to framework internals, or handling extreme scale._

### Custom Middleware at Platform Level

- ❓ Design a production-ready middleware that intercepts every request, computes an HMAC signature over the request body for audit, writes it to a distributed cache, and passes it downstream — without breaking streaming endpoints. What APIs would you use, what failure modes exist, and how do you handle backpressure? `[FROM JD]`

- ❓ **Trade-off:** In a high-throughput API gateway scenario, every middleware allocation (closures, `Task` objects, intermediate buffers) costs throughput. How would you profile and reduce allocations in a custom middleware chain? What .NET APIs and patterns (e.g., `ValueTask`, `Pipe`, zero-copy buffers) apply? `[INFERRED]`

### Advanced Content Negotiation

- ❓ Implement a custom `IOutputFormatter` that serializes to a vendor media type (`application/vnd.myapp.v2+json`) and integrates seamlessly with `DefaultOutputFormatterSelector`. What edge cases (charset negotiation, quality factors, wildcard matching) must your implementation handle? `[FROM JD]`

- ❓ **Scenario:** A client sends `Accept: */*` but also `Accept-Encoding: br`. Your formatter pipeline returns JSON, but a downstream NGINX proxy strips Brotli-encoded responses. How would you diagnose and architect a solution at the ASP.NET Core level without touching NGINX config? `[INFERRED]`

### Feature Interface Deep Dive

- ❓ `IHttpUpgradeFeature` enables protocol upgrades (WebSocket, HTTP/2 cleartext). Walk through the upgrade handshake at the feature-collection level: which features are replaced, in what order, and what happens to the middleware pipeline after the upgrade? `[FROM JD]`

- ❓ **Trade-off:** Kestrel implements `IHttpMinRequestBodyDataRateFeature` to protect against slow-loris attacks. How does this feature interact with large legitimate file uploads, and how would you configure or disable it selectively per route in a zero-downtime production system? `[INFERRED]`

### Expert Debugging

- ❓ **Debugging scenario:** In production, a subset of requests fail with `ObjectDisposedException` on `HttpContext.Response.Body` after the response appears to have been sent. The bug is intermittent and only occurs under load. Walk through every layer — Kestrel connection lifecycle, middleware pipeline teardown, async state machines — to find the root cause and propose a fix. `[INFERRED]`

- ❓ **Trade-off:** You are evaluating whether to build a new API as a gRPC service (using `Grpc.AspNetCore`) vs a REST API with custom binary formatters. Compare the two on content negotiation, middleware compatibility, browser accessibility, and operational complexity — and describe how the feature-collection model in ASP.NET Core affects both options. `[INFERRED]`
