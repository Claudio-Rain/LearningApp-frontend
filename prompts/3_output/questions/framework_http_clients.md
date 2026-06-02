# Interview Questions: Framework HTTP Clients (ASP.NET)

## Level 1

### HTTP Fundamentals
- L1 What is an HTTP request header, and can you name five headers commonly seen in ASP.NET applications and what each one tells the server? `[FROM JD]`
- L1 How are HTTP response status codes grouped into classes (1xx–5xx), and what does each class indicate to the client? `[FROM JD]`
- L1 What is ASP.NET Core middleware, and what is its role in handling requests and responses in the pipeline? `[FROM JD]`

---

## Level 2

### HttpContext & Pipeline Basics
- L2 What is `HttpContext` in ASP.NET Core, and how can it be accessed inside a custom component such as a service or a filter? `[FROM JD]`
- L2 What is the difference between `app.Use`, `app.Run`, and `app.Map` when registering middleware, and which allows the request to continue down the pipeline?
- L2 What is the difference between the `Content-Type` and `Accept` headers, and why does confusing them cause problems in API clients?
- L2 When would an API correctly return `400 Bad Request` vs `422 Unprocessable Entity` vs `401 Unauthorized` vs `403 Forbidden`?

---

## Level 3

### Working with Headers & Formatters
- L3 How would you use `HttpRequestHeaders` to add, remove, or modify a header on an outgoing `HttpClient` request without duplicating code across call sites? `[FROM JD]`
- L3 What does `AddXmlSerializerFormatters()` do in `Program.cs`, and how does ASP.NET Core decide which formatter to use when a client sends `Accept: application/xml`? `[FROM JD]`
- L3 What is `RespectBrowserAcceptHeader`, why is it `false` by default, and when would you set it to `true`? `[FROM JD]`
- L3 What is the difference between `[Consumes("application/json")]` and `[Produces("application/json")]`, and how does each affect routing and response serialization? `[FROM JD]`

### File Uploads & Middleware
- L3 How do you bind a file upload to an action method parameter using `IFormFile`, and what `Content-Type` must the client send? `[FROM JD]`
- L3 Walk through what it takes to create a custom middleware component in ASP.NET Core that captures and logs request metadata such as method, path, and duration. `[FROM JD]`
- L3 How do you read the request body inside middleware without consuming it for downstream handlers?

---

## Level 4

### Custom Formatters & Advanced Middleware
- L4 What abstract base classes would you extend to create a custom input and output formatter in ASP.NET Core MVC, and what are the minimum methods you must override? `[FROM JD]`
- L4 What are the common Request-Features interfaces (e.g., `IHttpRequestFeature`, `IHttpConnectionFeature`, `IHttpResponseFeature`), and what information does each expose? `[FROM JD]`
- L4 How do you work with `HttpContext` and Request Features directly in a custom component — when would you reach into `IFeatureCollection` instead of using `HttpContext` properties? `[FROM JD]`
- L4 A developer writes middleware that reads `Request.Body` for audit logging, but downstream action methods always receive an empty model. What is the root cause and how do you fix it?
- L4 How do you short-circuit the middleware pipeline, and what is the difference between short-circuiting and calling `next()`?
