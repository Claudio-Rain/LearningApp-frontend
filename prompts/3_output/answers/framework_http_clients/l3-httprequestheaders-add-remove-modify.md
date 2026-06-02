# L3 — How would you use `HttpRequestHeaders` to add, remove, or modify a header on an outgoing `HttpClient` request without duplicating code across call sites?

## Answer

The cleanest way to centralise header manipulation is through a **`DelegatingHandler`** — a middleware-like component in the `HttpClient` pipeline. It intercepts every outgoing request, so you write the header logic once and it applies automatically to all calls made through that `HttpClient` instance.

### Option 1 — `DelegatingHandler` (Recommended)

```csharp
// Handler that adds/modifies/removes headers on every request
public class ApiHeaderHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _accessor;
    private readonly IConfiguration _config;

    public ApiHeaderHandler(IHttpContextAccessor accessor, IConfiguration config)
    {
        _accessor = accessor;
        _config   = config;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        // 1. ADD — only if not already present
        if (!request.Headers.Contains("X-Api-Key"))
            request.Headers.Add("X-Api-Key", _config["ApiKey"]);

        // 2. MODIFY — remove old value, add new one
        request.Headers.Remove("User-Agent");
        request.Headers.TryAddWithoutValidation("User-Agent", "MyApp/2.0");

        // 3. PROPAGATE — forward correlation ID from the incoming request
        var correlationId = _accessor.HttpContext?
            .Request.Headers["X-Correlation-Id"]
            .FirstOrDefault() ?? Guid.NewGuid().ToString();
        request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        // 4. REMOVE — strip a header before forwarding
        request.Headers.Remove("X-Internal-Debug");

        return await base.SendAsync(request, cancellationToken);
    }
}
```

```csharp
// Registration (Program.cs)
builder.Services.AddHttpContextAccessor();

builder.Services.AddHttpClient("ExternalApi", client =>
{
    client.BaseAddress = new Uri("https://api.example.com/");
})
.AddHttpMessageHandler<ApiHeaderHandler>();

builder.Services.AddTransient<ApiHeaderHandler>();
```

```csharp
// Usage — no header code here; the handler takes care of it
public class ProductService
{
    private readonly HttpClient _client;
    public ProductService(IHttpClientFactory factory)
        => _client = factory.CreateClient("ExternalApi");

    public async Task<Product?> GetAsync(int id)
    {
        var response = await _client.GetAsync($"/products/{id}");
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<Product>();
    }
}
```

### Option 2 — `DefaultRequestHeaders` for Static Headers

For headers that are fixed per client instance (e.g., `Accept`, API keys that don't vary per request), set them when configuring the named client:

```csharp
builder.Services.AddHttpClient("ExternalApi", client =>
{
    client.BaseAddress = new Uri("https://api.example.com/");
    client.DefaultRequestHeaders.Accept.Add(
        new MediaTypeWithQualityHeaderValue("application/json"));
    client.DefaultRequestHeaders.Add("X-Api-Key", config["ApiKey"]);
});
```

> **Gotcha:** `DefaultRequestHeaders` is shared across all requests on a named client. Modifying it per-request from concurrent threads causes races. Use a `DelegatingHandler` for any per-request or dynamic headers.

### `Add` vs `TryAddWithoutValidation` vs `Remove`

```csharp
// Add — throws if header value is invalid per RFC
request.Headers.Add("Accept", "application/json");

// TryAddWithoutValidation — allows non-standard/custom values without throwing
request.Headers.TryAddWithoutValidation("X-Custom", "value with spaces");

// Remove — idempotent; returns false (not throws) if header not present
bool removed = request.Headers.Remove("X-Internal-Debug");
```

### Key Takeaways

- Use a `DelegatingHandler` to centralise any per-request, dynamic, or propagated headers.
- Use `DefaultRequestHeaders` only for static, client-wide headers.
- `TryAddWithoutValidation` is useful for custom or non-standard headers that would fail RFC validation checks.
- Handlers compose — you can chain multiple `DelegatingHandler`s for separation of concerns (auth, tracing, retries).
