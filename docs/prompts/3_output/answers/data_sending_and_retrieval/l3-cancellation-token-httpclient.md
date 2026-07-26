# L3 How do you attach a `CancellationToken` to `HttpClient`, and how do you distinguish a user cancellation from a timeout?

## Attaching a `CancellationToken`

Every `HttpClient` async method accepts an optional `CancellationToken`:

```csharp
public async Task<Product?> GetProductAsync(int id, CancellationToken ct)
{
    var response = await _httpClient.GetAsync($"/api/products/{id}", ct);
    response.EnsureSuccessStatusCode();
    return await response.Content.ReadFromJsonAsync<Product>(ct);
}
```

Passing `ct` to both `GetAsync` and `ReadFromJsonAsync` ensures cancellation is honoured at every async boundary — not just while waiting for headers, but also while reading the body.

---

## Sources of Cancellation

### 1. User / Caller Cancellation
The caller provides a `CancellationToken` linked to a user action (e.g., navigating away, pressing Cancel):

```csharp
private CancellationTokenSource? _cts;

public async Task LoadAsync()
{
    _cts = new CancellationTokenSource();
    await _productService.GetProductAsync(42, _cts.Token);
}

public void Cancel() => _cts?.Cancel();
```

### 2. HttpClient Timeout
`HttpClient.Timeout` (default: 100 seconds) creates an **internal** `CancellationToken` that fires when the timeout elapses. This is independent of any token the caller passes.

```csharp
_httpClient.Timeout = TimeSpan.FromSeconds(10);
```

### 3. Combined with `CancellationTokenSource.CancelAfter`
You can set a per-request deadline in addition to the global `HttpClient.Timeout`:

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
var response = await _httpClient.GetAsync("/api/data", cts.Token);
```

---

## The Problem: Distinguishing Timeout from User Cancellation

When cancellation occurs, `HttpClient` throws `TaskCanceledException` (or its base `OperationCanceledException`) in **both** cases. The exception alone does not tell you why.

### .NET 5+ — Use `HttpRequestException.HttpRequestError` or `InnerException`

In .NET 6+, the `TaskCanceledException` thrown on timeout has an `InnerException` of type `TimeoutException`:

```csharp
try
{
    var response = await _httpClient.GetAsync("/api/data", userCt);
}
catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
{
    // HttpClient.Timeout elapsed
    _logger.LogWarning("Request timed out");
}
catch (OperationCanceledException) when (userCt.IsCancellationRequested)
{
    // User/caller cancelled
    _logger.LogInformation("Request cancelled by caller");
}
catch (OperationCanceledException)
{
    // Ambiguous — could be an internal linked token
    _logger.LogWarning("Request cancelled (unknown source)");
}
```

### Robust Pattern: Explicit Per-Request Timeout with Linked Token

The cleanest approach — create a timeout token and link it with the caller's token so you always know the source:

```csharp
public async Task<Product?> GetProductAsync(int id, CancellationToken userCt)
{
    using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(userCt, timeoutCts.Token);

    try
    {
        var response = await _httpClient.GetAsync($"/api/products/{id}", linkedCts.Token);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<Product>(linkedCts.Token);
    }
    catch (OperationCanceledException) when (!userCt.IsCancellationRequested)
    {
        // linkedCts fired but userCt did not → must be our timeout
        throw new TimeoutException($"Request to /api/products/{id} timed out after 10s");
    }
    // If userCt.IsCancellationRequested, let OperationCanceledException propagate naturally
}
```

---

## ASP.NET Core: `HttpContext.RequestAborted`

In controllers, ASP.NET Core provides a ready-made cancellation token tied to the HTTP connection:

```csharp
[HttpGet("{id}")]
public async Task<IActionResult> GetProduct(int id, CancellationToken ct)
    // ct is automatically bound to HttpContext.RequestAborted
{
    var product = await _productService.GetProductAsync(id, ct);
    return Ok(product);
}
```

If the client disconnects, `ct` is cancelled and the downstream `HttpClient` call is also cancelled — no wasted work.

---

## Key Takeaways
- Always thread `CancellationToken` through to every async `HttpClient` call.
- On timeout, `TaskCanceledException.InnerException` is a `TimeoutException` (.NET 6+).
- Check `userCt.IsCancellationRequested` to distinguish a caller cancel from a timeout cancel.
- The linked-token + explicit timeout pattern gives the clearest, most testable cancellation semantics.
- In ASP.NET Core, inject `CancellationToken` as an action parameter to get connection-abort cancellation for free.
