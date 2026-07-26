# L4 How do you implement retry logic with exponential backoff and jitter? What is a retry storm and how does jitter prevent it?

## Why Retry?

Transient failures — network blips, brief service unavailability, `503 Service Unavailable`, `429 Too Many Requests` — are common in distributed systems. A well-designed retry policy recovers from them automatically without requiring human intervention.

---

## Exponential Backoff

Instead of retrying immediately (which hammers a struggling server), increase the wait time exponentially between attempts:

```
Attempt 1: wait 1s
Attempt 2: wait 2s
Attempt 3: wait 4s
Attempt 4: wait 8s
```

Formula: `delay = baseDelay * 2^(attempt - 1)`

---

## What Is a Retry Storm?

Imagine 1 000 clients all receive a `503` at the same time. If they all use **pure exponential backoff** (no randomness), they all wait exactly the same duration and then **all retry simultaneously**. The server sees a sudden wave of 1 000 requests — often larger than the original load — which can prevent it from ever recovering.

This is a **retry storm** (also called the "thundering herd" problem).

---

## Jitter: The Fix

**Jitter** adds randomness to the delay so retries are spread out over time rather than synchronized.

### Full Jitter (AWS-recommended)

```csharp
double FullJitterDelay(int attempt, double baseSeconds = 1.0, double maxSeconds = 30.0)
{
    var exponential = baseSeconds * Math.Pow(2, attempt - 1);
    var capped = Math.Min(exponential, maxSeconds);
    return Random.Shared.NextDouble() * capped; // uniform random [0, capped]
}
```

Each client picks a random delay in `[0, cap]` — maximum spread, minimum collision.

### Equal Jitter (conservative)

```csharp
double EqualJitterDelay(int attempt, double baseSeconds = 1.0, double maxSeconds = 30.0)
{
    var exponential = baseSeconds * Math.Pow(2, attempt - 1);
    var capped = Math.Min(exponential, maxSeconds) / 2;
    return capped + Random.Shared.NextDouble() * capped; // [cap/2, cap]
}
```

Guarantees at least half the expected wait, preventing very short retries.

---

## Manual Implementation (no library)

```csharp
public async Task<T> ExecuteWithRetryAsync<T>(
    Func<CancellationToken, Task<T>> operation,
    int maxAttempts = 4,
    CancellationToken ct = default)
{
    for (int attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            return await operation(ct);
        }
        catch (HttpRequestException ex) when (attempt < maxAttempts && IsTransient(ex))
        {
            var exponential = TimeSpan.FromSeconds(Math.Pow(2, attempt - 1));
            var jitter = TimeSpan.FromMilliseconds(Random.Shared.Next(0, 1000));
            var delay = exponential + jitter;

            _logger.LogWarning(ex,
                "Attempt {Attempt}/{Max} failed. Retrying in {Delay}ms",
                attempt, maxAttempts, delay.TotalMilliseconds);

            await Task.Delay(delay, ct);
        }
    }

    return await operation(ct); // final attempt — let it throw
}

private static bool IsTransient(HttpRequestException ex)
    => ex.StatusCode is HttpStatusCode.ServiceUnavailable
                     or HttpStatusCode.TooManyRequests
                     or HttpStatusCode.GatewayTimeout
    || ex.StatusCode is null; // network-level failure
```

---

## Recommended: Polly (Production Standard)

```csharp
// NuGet: Polly, Microsoft.Extensions.Http.Polly

builder.Services.AddHttpClient<OrdersApiClient>()
    .AddTransientHttpErrorPolicy(policy =>
        policy
            .OrResult(r => r.StatusCode == HttpStatusCode.TooManyRequests)
            .WaitAndRetryAsync(
                retryCount: 4,
                sleepDurationProvider: (attempt, outcome, ctx) =>
                {
                    // Respect Retry-After header if present
                    var retryAfter = outcome.Result?.Headers.RetryAfter?.Delta;
                    if (retryAfter.HasValue) return retryAfter.Value;

                    // Otherwise: exponential backoff + full jitter
                    var exponential = TimeSpan.FromSeconds(Math.Pow(2, attempt));
                    var jitter = TimeSpan.FromMilliseconds(Random.Shared.Next(0, 1000));
                    return exponential + jitter;
                },
                onRetryAsync: (outcome, delay, attempt, ctx) =>
                {
                    var logger = ctx.GetLogger(); // Polly context logger
                    logger?.LogWarning(
                        "Retry {Attempt} after {Delay}ms — {Reason}",
                        attempt, delay.TotalMilliseconds,
                        outcome.Exception?.Message ?? outcome.Result?.StatusCode.ToString());
                    return Task.CompletedTask;
                }));
```

---

## Respecting `Retry-After`

Some APIs (rate limiters, overloaded services) return a `Retry-After` header specifying how long to wait. Always honour it:

```csharp
sleepDurationProvider: (attempt, outcome, _) =>
{
    if (outcome.Result?.Headers.RetryAfter?.Delta is { } retryAfter)
        return retryAfter; // server-dictated delay

    return TimeSpan.FromSeconds(Math.Pow(2, attempt))
           + TimeSpan.FromMilliseconds(Random.Shared.Next(0, 500));
}
```

---

## What NOT to Retry

- `400 Bad Request` — fix the request, not retry.
- `401 Unauthorized` — refresh the token first, then retry (not a simple retry).
- `403 Forbidden` — permission issue; retrying won't help.
- `404 Not Found` — resource is gone.
- Non-idempotent `POST` calls — unless the API provides idempotency keys.

---

## Key Takeaways
- **Exponential backoff** reduces load on a struggling server by increasing wait time after each failure.
- **Retry storms** occur when many clients retry in lockstep after a shared failure event.
- **Jitter** breaks the lockstep by randomising the delay — full jitter `[0, cap]` is the most effective variant.
- **Polly** is the standard .NET library for resilience policies and integrates directly with `IHttpClientFactory`.
- Always respect `Retry-After` response headers from the server.
- Never retry non-idempotent calls or client-error status codes blindly.
