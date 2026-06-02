# L3 Why should you avoid creating a new `HttpClient` per request, and what is the recommended pattern (`IHttpClientFactory`)?

## The Anti-Pattern: `new HttpClient()` Per Request

```csharp
// WRONG — do not do this
public async Task<Product> GetProductAsync(int id)
{
    using var client = new HttpClient(); // new instance per call
    return await client.GetFromJsonAsync<Product>($"/api/products/{id}");
}
```

This causes two serious problems:

### Problem 1: Socket Exhaustion

`HttpClient` wraps an `HttpMessageHandler`, which holds an open TCP connection pool. Disposing `HttpClient` does **not** immediately close the underlying sockets — they linger in `TIME_WAIT` state (typically 240 seconds on Windows).

With enough concurrent requests, you exhaust the available ephemeral ports and get `SocketException: Only one usage of each socket address is normally permitted`.

### Problem 2: DNS Changes Are Not Respected

Even if you keep one `HttpClient` alive forever (the naïve "fix"), the `HttpClientHandler` caches DNS resolutions indefinitely. When a service's IP address changes (e.g., Kubernetes rolling deploy, blue/green switch), the stale singleton will keep connecting to the old IP.

---

## The Recommended Pattern: `IHttpClientFactory`

`IHttpClientFactory` (introduced in .NET Core 2.1) solves both problems by managing a pool of `HttpMessageHandler` instances with controlled lifetimes.

### How It Works Internally
- Handlers are pooled and reused across `HttpClient` instances (solving socket exhaustion).
- Each handler has a configurable **lifetime** (default: 2 minutes). After expiry, it is retired and a new one is created (solving DNS staleness).
- `HttpClient` instances created by the factory are lightweight wrappers around the shared handler — safe to `new` and `dispose` freely.

---

## Usage Patterns

### 1. Named Client

```csharp
// Program.cs / Startup.cs
builder.Services.AddHttpClient("ProductsApi", client =>
{
    client.BaseAddress = new Uri("https://api.example.com/");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
    client.Timeout = TimeSpan.FromSeconds(30);
});

// Service
public class ProductService
{
    private readonly IHttpClientFactory _factory;

    public ProductService(IHttpClientFactory factory) => _factory = factory;

    public async Task<Product> GetProductAsync(int id)
    {
        var client = _factory.CreateClient("ProductsApi"); // reuses pooled handler
        return await client.GetFromJsonAsync<Product>($"products/{id}");
    }
}
```

### 2. Typed Client (Preferred)

Wraps the `HttpClient` in a strongly-typed service — no magic strings:

```csharp
// Registration
builder.Services.AddHttpClient<ProductsApiClient>(client =>
{
    client.BaseAddress = new Uri("https://api.example.com/");
});

// Typed client class
public class ProductsApiClient
{
    private readonly HttpClient _client;

    public ProductsApiClient(HttpClient client) => _client = client;

    public Task<Product?> GetProductAsync(int id)
        => _client.GetFromJsonAsync<Product>($"products/{id}");
}

// Injected directly into a controller/service
public class ProductController : ControllerBase
{
    public ProductController(ProductsApiClient productsApi) { ... }
}
```

### 3. Adding Polly Policies

`IHttpClientFactory` integrates cleanly with Polly via `Microsoft.Extensions.Http.Polly`:

```csharp
builder.Services.AddHttpClient<ProductsApiClient>()
    .AddTransientHttpErrorPolicy(p =>
        p.WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt))))
    .AddTransientHttpErrorPolicy(p =>
        p.CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)));
```

---

## Handler Lifetime Configuration

```csharp
builder.Services.AddHttpClient("MyClient")
    .SetHandlerLifetime(TimeSpan.FromMinutes(5)); // default is 2 minutes
```

For even finer DNS control at the socket level, see `PooledConnectionLifetime` (L4 topic).

---

## Summary

| Approach | Socket Exhaustion | DNS Freshness | Recommended |
|---|---|---|---|
| `new HttpClient()` per request | Risk | Fresh (but wasteful) | No |
| Static / singleton `HttpClient` | Safe | Stale | No |
| `IHttpClientFactory` | Safe | Fresh (handler rotation) | Yes |

## Key Takeaways
- Never create `HttpClient` inside a using block that is called per-request.
- `IHttpClientFactory` pools handlers (solving socket exhaustion) and rotates them on a timer (solving DNS staleness).
- Prefer **typed clients** for clean, injectable, testable HTTP service wrappers.
