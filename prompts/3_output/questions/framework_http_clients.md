# Interview Questions: Framework HTTP Clients (ASP.NET)

## Coverage map

| Item | Type | Level |
|------|------|-------|
| Uses Middleware to handle requests and responses | Knowledge | Level 2 — Core Concepts |
| Common HTTP request headers and their meaning | Knowledge | Level 1 — Definition & Basics |
| Classification of HTTP response status codes | Knowledge | Level 1 — Definition & Basics |
| Accessing HTTP Context in Custom Components | Knowledge | Level 3 — Practical Usage |
| Common Request Features interfaces | Knowledge | Level 3 — Practical Usage |
| Uses HttpRequestHeaders to add/remove/modify headers | Skill | Level 3 — Practical Usage |
| Uses AddXmlSerializerFormatters | Skill | Level 3 — Practical Usage |
| Uses RespectBrowserAcceptHeader | Skill | Level 3 — Practical Usage |
| Creates custom formatters | Skill | Level 3 — Practical Usage |
| Uses consume and produce filters | Skill | Level 3 — Practical Usage |
| Works with file content in HTTP Request | Skill | Level 3 — Practical Usage |
| Creates custom middleware | Skill | Level 3 — Practical Usage |
| Works with HttpContext and Request Features | Skill | Level 3 — Practical Usage |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate knows the vocabulary of ASP.NET request/response processing._

### HTTP Fundamentals in ASP.NET Context
- ❓ What is the ASP.NET Core request pipeline at a high level? `[INFERRED]`
- ❓ What are the most common HTTP request headers and what does each one tell the server? `[FROM JD]`
- ❓ What are the five classes of HTTP response status codes? Give an example for each. `[FROM JD]`
- ❓ What is content negotiation in HTTP and which header drives it? `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Test understanding of middleware and request pipeline mechanics._

### Middleware
- ❓ What is middleware in ASP.NET Core? How does it differ from an HTTP module in classic ASP.NET? `[FROM JD]`
- ❓ What is the middleware pipeline and what does calling `next()` do? `[FROM JD]`
- ❓ What is the difference between `Use`, `Run`, and `Map` when configuring middleware? `[INFERRED]`
- ❓ In what order should you register middleware, and why does order matter? `[INFERRED]`
- ❓ What is the difference between middleware and an action filter in ASP.NET Core? `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Test ability to implement real-world request/response handling features._

### Headers
- ❓ How do you add a custom header to an HTTP request using `HttpRequestHeaders`? `[FROM JD]`
- ❓ How do you remove or replace an existing header on an outgoing `HttpRequestMessage`? `[FROM JD]`

### Content Negotiation and Formatters
- ❓ How do you add XML support to an ASP.NET Core API? What does `AddXmlSerializerFormatters()` do? `[FROM JD]`
- ❓ What does `RespectBrowserAcceptHeader` do? When would you enable it? `[FROM JD]`
- ❓ How do you create a custom input/output formatter in ASP.NET Core? Walk through the steps. `[FROM JD]`
- ❓ What are `[Consumes]` and `[Produces]` attributes? How do they restrict content type? `[FROM JD]`

### File Handling
- ❓ How do you receive a file upload in an ASP.NET Core controller action? `[FROM JD]`
- ❓ How do you return a file as an HTTP response from a controller? `[INFERRED]`
- ❓ What is the difference between `IFormFile` and reading directly from the request body stream? `[INFERRED]`

### Custom Middleware
- ❓ Write a custom middleware that logs the path and status code of every request. `[FROM JD]`
- ❓ How do you register a custom middleware class with dependency injection? `[INFERRED]`
- ❓ How would you use middleware to implement request timing? `[INFERRED]`

### HttpContext and Request Features
- ❓ What is `HttpContext` and what does it give you access to? `[FROM JD]`
- ❓ How do you access `HttpContext` inside a non-controller service? `[FROM JD]`
- ❓ What are Request Feature interfaces (e.g., `IHttpRequestFeature`, `IHttpConnectionFeature`)? When would you access them directly? `[FROM JD]`
- ❓ What is `IHttpMaxRequestBodySizeFeature` and how do you use it to override upload size limits per request? `[FROM JD]`

---

## Level 4 — Common Pitfalls
_Goal: Surface common mistakes in ASP.NET Core request handling._

### Mistakes
- ❓ A developer accesses `HttpContext` inside a background thread spawned from a request handler. What can go wrong? `[INFERRED]`
- ❓ You registered your middleware after `UseRouting` but before `UseEndpoints`. What request-related information is available at that point vs. before routing? `[INFERRED]`
- ❓ A custom formatter is registered but never called. What could be misconfigured? `[INFERRED]`
- ❓ You set `RespectBrowserAcceptHeader = true` and browsers start receiving XML instead of JSON. Why and how do you fix it? `[FROM JD]`
- ❓ A developer reads the request body in middleware and then the controller cannot bind the model. What happened? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Test understanding of how the ASP.NET Core pipeline works under the hood._

### Pipeline Internals
- ❓ How does Kestrel relate to the ASP.NET Core middleware pipeline? `[INFERRED]`
- ❓ How does ASP.NET Core represent the middleware pipeline internally — what is a `RequestDelegate`? `[INFERRED]`
- ❓ What are Feature collections in ASP.NET Core and why is this abstraction useful? `[FROM JD]`
- ❓ How does the content negotiation algorithm decide which formatter to use? What happens when no formatter matches? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate architectural judgment about middleware and formatter design._

### Design Decisions
- ❓ Should cross-cutting concerns like logging, auth, and rate limiting live in middleware or action filters? What's the trade-off? `[INFERRED]`
- ❓ When would you write a custom output formatter vs. returning a `ContentResult` directly? `[FROM JD]`
- ❓ What are the trade-offs of enabling both JSON and XML output in a public API? `[FROM JD]`
- ❓ How do you design middleware that needs to modify the response after the inner pipeline runs (e.g., compression)? What challenge does response streaming pose? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Probe production-level and architecture-scale ASP.NET Core knowledge._

### Advanced Scenarios
- ❓ How would you implement a rate-limiting middleware that uses a sliding window algorithm? `[INFERRED]`
- ❓ How does ASP.NET Core's built-in rate limiting middleware (introduced in .NET 7) work, and what limiters does it provide? `[INFERRED]`
- ❓ How do you write middleware that conditionally branches the pipeline based on the request path or content type? `[INFERRED]`
- ❓ What is minimal API and how does its request pipeline differ from the controller-based model? `[INFERRED]`
