# L2 — What is `HttpMessageHandler`, and how do you use it to configure cross-cutting concerns like authentication headers or response caching when working with `HttpClient`?

## Answer

### What is `HttpMessageHandler`?

`HttpMessageHandler` is an abstract class that sits between `HttpClient` and the actual network. `HttpClient` itself does not send requests — it delegates to a handler chain. The default handler (`HttpClientHandler` / `SocketsHttpHandler`) performs the real TCP connection and TLS handshake.

You can insert **delegating handlers** — middleware-like objects — into this chain to intercept every request and response without touching application code.

```
HttpClient
    └── DelegatingHandler A  (e.g., auth header injector)
        └── DelegatingHandler B  (e.g., retry / caching)
            └── HttpClientHandler  (real network I/O)
```

Each delegating handler calls `base.SendAsync(request, cancellationToken)` to pass the request down the chain, then can inspect or modify the response on the way back up.

---

*Include short code examples in C#.*

### Example 1: Authentication Header Handler

```csharp
public class AuthHeaderHandler : DelegatingHandler
{
    private readonly ITokenProvider _tokenProvider;

    public AuthHeaderHandler(ITokenProvider tokenProvider)
    {
        _tokenProvider = tokenProvider;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        // Obtain a fresh token for every request
        string token = await _tokenProvider.GetTokenAsync(cancellationToken);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return await base.SendAsync(request, cancellationToken);
    }
}
```

### Example 2: Simple In-Memory Response Cache Handler

```csharp
public class CachingHandler : DelegatingHandler
{
    private readonly Dictionary<string, (DateTimeOffset Expiry, HttpResponseMessage Response)> _cache = new();

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        // Only cache GET requests
        if (request.Method != HttpMethod.Get)
            return await base.SendAsync(request, cancellationToken);

        string key = request.RequestUri!.ToString();

        if (_cache.TryGetValue(key, out var entry) && entry.Expiry > DateTimeOffset.UtcNow)
        {
            // Return a clone of the cached response
            return entry.Response;
        }

        HttpResponseMessage response = await base.SendAsync(request, cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            _cache[key] = (DateTimeOffset.UtcNow.AddSeconds(30), response);
        }

        return response;
    }
}
```

### Registering Handlers with `IHttpClientFactory`

```csharp
// Program.cs (ASP.NET Core)
builder.Services.AddTransient<AuthHeaderHandler>();
builder.Services.AddTransient<CachingHandler>();

builder.Services.AddHttpClient<ApiService>(client =>
    {
        client.BaseAddress = new Uri("https://api.example.com/");
    })
    .AddHttpMessageHandler<AuthHeaderHandler>()   // outermost
    .AddHttpMessageHandler<CachingHandler>();      // next in chain
```

### Manual Setup (without DI)

```csharp
var innerHandler = new HttpClientHandler();
var cachingHandler = new CachingHandler { InnerHandler = innerHandler };
var authHandler = new AuthHeaderHandler(tokenProvider) { InnerHandler = cachingHandler };

var client = new HttpClient(authHandler)
{
    BaseAddress = new Uri("https://api.example.com/")
};
```

### Common Cross-Cutting Concerns Implemented via Handlers

| Concern | What the handler does |
|---------|----------------------|
| Authentication | Injects `Authorization` header with a fresh token |
| Logging | Logs method, URI, status code, and elapsed time |
| Retry / resilience | Re-sends on transient errors (often via Polly) |
| Caching | Returns cached responses for GET requests |
| Rate limiting | Queues or delays requests to stay within API limits |
| Correlation IDs | Adds `X-Correlation-Id` header to every request |

### Key Points

- `DelegatingHandler` is the extension point for `HttpClient` middleware — not the `HttpClient` itself.
- Always chain handlers through `IHttpClientFactory` in ASP.NET Core to benefit from automatic handler lifetime management.
- Call `base.SendAsync` to pass the request down the chain; returning early (e.g., from cache) short-circuits the remaining handlers and the network.
- Handlers registered first in `AddHttpMessageHandler` are outermost (run first on request, last on response).
