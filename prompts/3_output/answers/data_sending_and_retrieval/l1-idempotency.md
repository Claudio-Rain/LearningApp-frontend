# L1 What is idempotency, which HTTP methods have it, and why does it matter for API design and retries?

## Definition

An operation is **idempotent** if applying it multiple times produces the same result as applying it once. The server state after N identical requests is identical to the state after one request.

Idempotency is a **guarantee about the server state**, not about the response. The response body or status code may vary (e.g., the second `DELETE` may return `404`), but the underlying resource is in the same state.

## HTTP Method Idempotency

| Method  | Idempotent | Safe (read-only) | Notes |
|---------|-----------|-----------------|-------|
| GET     | Yes       | Yes             | Pure read; no side effects |
| HEAD    | Yes       | Yes             | Like GET, no body |
| OPTIONS | Yes       | Yes             | Metadata query |
| PUT     | Yes       | No              | Full replace; same payload = same state |
| DELETE  | Yes       | No              | Resource is gone regardless of how many times |
| POST    | **No**    | No              | Creates a new resource each call |
| PATCH   | **No***   | No              | Depends on implementation (increment vs set) |

\* PATCH *can* be designed to be idempotent (e.g., `SET status = "active"`), but it is not guaranteed by the spec.

## Why It Matters

### 1. Safe Retries
When a network error occurs and you don't know whether the server received the request, you can safely retry an idempotent call without duplicating data:

```csharp
// Safe to retry — GET is idempotent
var response = await _httpClient.GetAsync("/api/products/42");

// DANGEROUS to retry blindly — POST creates a new order each time
var response = await _httpClient.PostAsJsonAsync("/api/orders", order);
```

### 2. Client-Driven Idempotency for POST
For non-idempotent methods, the API can accept an **idempotency key** header so the server deduplicates:

```csharp
var request = new HttpRequestMessage(HttpMethod.Post, "/api/payments");
request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
request.Content = JsonContent.Create(paymentDto);

var response = await _httpClient.SendAsync(request);
```

The server stores the key and returns the cached response for duplicate submissions.

### 3. Retry Policies (Polly)
Libraries like **Polly** only retry idempotent methods by default to avoid data corruption:

```csharp
services.AddHttpClient("PaymentsClient")
    .AddTransientHttpErrorPolicy(builder =>
        builder.WaitAndRetryAsync(
            retryCount: 3,
            sleepDurationProvider: attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
            onRetry: (outcome, delay, attempt, ctx) =>
            {
                // Only safe because the calling code ensures idempotency
                logger.LogWarning("Retry {Attempt} after {Delay}", attempt, delay);
            }));
```

### 4. API Design Guidelines
- **Use PUT** (not POST) for upsert operations where the client controls the resource ID.
- **Use DELETE** safely — a second call returning `404` is still correct behavior.
- **Avoid side-effectful GET** — never use GET to trigger state changes.

## Key Takeaways
- Idempotent methods: `GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE`.
- Non-idempotent: `POST` (and `PATCH` by convention).
- Idempotency enables safe automatic retries, which is essential for resilient distributed systems.
- For `POST`, use **idempotency keys** when you need the same guarantee.
