# L5 What is a `DelegatingHandler` and how do you implement one to add Bearer tokens and refresh on 401?

## What Is a `DelegatingHandler`?

`DelegatingHandler` is an abstract class in `System.Net.Http` that sits in the **middleware pipeline** for `HttpClient`. It receives an outgoing `HttpRequestMessage`, can inspect or modify it, then calls the next handler in the chain via `base.SendAsync()`. It also receives the `HttpResponseMessage` coming back and can act on it.

This creates an **interceptor chain** (decorator pattern) similar to ASP.NET Core middleware but for outgoing HTTP calls:

```
HttpClient.SendAsync()
  → DelegatingHandler 1 (e.g., Auth)
    → DelegatingHandler 2 (e.g., Logging)
      → DelegatingHandler 3 (e.g., Retry)
        → HttpClientHandler (the real socket)
```

Each handler calls `base.SendAsync()` to pass the request down the chain and receives the response on the way back.

---

## Basic Structure

```csharp
public class AuthHandler : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        // 1. Pre-processing: modify the outgoing request
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", "token");

        // 2. Call the next handler (eventually reaches the network)
        var response = await base.SendAsync(request, cancellationToken);

        // 3. Post-processing: inspect the response
        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            // handle 401...
        }

        return response;
    }
}
```

---

## Full Implementation: Bearer Token + 401 Refresh

```csharp
public class BearerTokenHandler : DelegatingHandler
{
    private readonly ITokenService _tokenService;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    public BearerTokenHandler(ITokenService tokenService)
    {
        _tokenService = tokenService;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        // Attach the current access token
        var token = await _tokenService.GetAccessTokenAsync(cancellationToken);
        SetAuthHeader(request, token);

        var response = await base.SendAsync(request, cancellationToken);

        // If 401, try to refresh and retry exactly once
        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            var newToken = await RefreshTokenSafelyAsync(cancellationToken);

            if (newToken is not null)
            {
                response.Dispose(); // discard old response

                // HttpRequestMessage cannot be reused — clone it
                var retryRequest = await CloneRequestAsync(request, cancellationToken);
                SetAuthHeader(retryRequest, newToken);

                response = await base.SendAsync(retryRequest, cancellationToken);
            }
        }

        return response;
    }

    private void SetAuthHeader(HttpRequestMessage request, string token)
        => request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task<string?> RefreshTokenSafelyAsync(CancellationToken ct)
    {
        // Use a semaphore to prevent N concurrent requests all refreshing simultaneously
        await _refreshLock.WaitAsync(ct);
        try
        {
            // Another thread may have already refreshed — get the latest token first
            var current = await _tokenService.GetAccessTokenAsync(ct);
            if (!_tokenService.IsExpired(current))
                return current; // already refreshed by another caller

            return await _tokenService.RefreshAsync(ct);
        }
        catch (Exception)
        {
            return null; // refresh failed — let the 401 propagate
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    // HttpRequestMessage cannot be sent twice — must create a new instance
    private static async Task<HttpRequestMessage> CloneRequestAsync(
        HttpRequestMessage original,
        CancellationToken ct)
    {
        var clone = new HttpRequestMessage(original.Method, original.RequestUri);

        // Copy headers (except Authorization — we will set a new one)
        foreach (var header in original.Headers)
            if (!header.Key.Equals("Authorization", StringComparison.OrdinalIgnoreCase))
                clone.Headers.TryAddWithoutValidation(header.Key, header.Value);

        foreach (var prop in original.Options)
            clone.Options.Set(new HttpRequestOptionsKey<object?>(prop.Key), prop.Value);

        // Copy body content
        if (original.Content is not null)
        {
            var bodyBytes = await original.Content.ReadAsByteArrayAsync(ct);
            clone.Content = new ByteArrayContent(bodyBytes);
            foreach (var header in original.Content.Headers)
                clone.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        return clone;
    }
}
```

---

## Registering with `IHttpClientFactory`

```csharp
// Register the token service
builder.Services.AddScoped<ITokenService, TokenService>();

// Register the handler — must be transient or scoped, NOT singleton
// (it depends on ITokenService which may be scoped)
builder.Services.AddTransient<BearerTokenHandler>();

// Attach to the typed client
builder.Services.AddHttpClient<OrdersApiClient>(client =>
{
    client.BaseAddress = new Uri("https://api.example.com/");
})
.AddHttpMessageHandler<BearerTokenHandler>();
```

Multiple handlers chain in **registration order**:

```csharp
.AddHttpMessageHandler<LoggingHandler>()     // outermost
.AddHttpMessageHandler<BearerTokenHandler>() // middle
// SocketsHttpHandler is innermost (network)
```

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Reusing `HttpRequestMessage` for the retry | Clone the request — messages are single-use |
| Multiple concurrent 401s all triggering refresh | Use `SemaphoreSlim` to serialize the refresh |
| Registering handler as singleton when it depends on scoped services | Register as `Transient` or `Scoped` |
| Infinite retry loop if refresh returns another 401 | Retry only once; track with a flag or option key on `HttpRequestMessage` |

---

## Preventing Infinite Retry

Use `HttpRequestMessage.Options` to mark a request as already-retried:

```csharp
private static readonly HttpRequestOptionsKey<bool> RetryAttemptedKey = new("RetryAttempted");

if (response.StatusCode == HttpStatusCode.Unauthorized
    && !request.Options.TryGetValue(RetryAttemptedKey, out var alreadyRetried)
    && !alreadyRetried)
{
    var retryRequest = await CloneRequestAsync(request, ct);
    retryRequest.Options.Set(RetryAttemptedKey, true); // mark as retried
    // ... refresh and send
}
```

---

## Key Takeaways
- `DelegatingHandler` is the outgoing-HTTP equivalent of ASP.NET Core middleware — it wraps `SendAsync` and can inspect/modify requests and responses.
- Attach a Bearer token in the pre-processing phase; intercept 401 in the post-processing phase.
- Always **clone** `HttpRequestMessage` before retrying — messages cannot be sent twice.
- Use a `SemaphoreSlim` to prevent concurrent 401s from all triggering token refresh simultaneously.
- Register handlers as `Transient` (not `Singleton`) when they depend on scoped services like `ITokenService`.
- Guard against infinite retry loops by marking requests that have already been retried.
