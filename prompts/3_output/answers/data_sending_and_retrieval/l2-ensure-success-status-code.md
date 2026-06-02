# L2 What does `EnsureSuccessStatusCode()` do and when should you prefer manual status code checking?

## What `EnsureSuccessStatusCode()` Does

`HttpResponseMessage.EnsureSuccessStatusCode()` throws an `HttpRequestException` if the response's HTTP status code is **not in the 2xx range** (200–299). It also disposes the response content to prevent resource leaks.

```csharp
var response = await _httpClient.GetAsync("/api/orders/42");
response.EnsureSuccessStatusCode(); // throws if 4xx or 5xx

var order = await response.Content.ReadFromJsonAsync<Order>();
```

The thrown exception message includes the status code:
> `Response status code does not indicate success: 404 (Not Found).`

---

## When `EnsureSuccessStatusCode()` Is Appropriate

Use it when:
- Any non-2xx response is genuinely unexpected and should bubble up as an unhandled error.
- You have a **global exception handler** (e.g., middleware, `ProblemDetails`) that will catch and format the `HttpRequestException`.
- You want minimal boilerplate for simple internal service calls where 4xx/5xx responses are bugs, not business logic.

```csharp
// Clean internal call — any failure is exceptional
var response = await _httpClient.GetAsync($"/internal/config/{key}");
response.EnsureSuccessStatusCode();
var config = await response.Content.ReadFromJsonAsync<ConfigDto>();
```

---

## When to Prefer Manual Status Code Checking

### 1. Different Business Logic Per Status Code
```csharp
var response = await _httpClient.GetAsync($"/api/users/{id}");

switch (response.StatusCode)
{
    case HttpStatusCode.OK:
        return await response.Content.ReadFromJsonAsync<UserDto>();

    case HttpStatusCode.NotFound:
        return null; // Not an error — user simply doesn't exist

    case HttpStatusCode.Forbidden:
        throw new UnauthorizedAccessException($"Access denied for user {id}");

    default:
        response.EnsureSuccessStatusCode(); // Let unexpected codes throw
        break;
}
```

### 2. Reading the Error Response Body
`EnsureSuccessStatusCode()` disposes the content. If you need the error details:

```csharp
var response = await _httpClient.GetAsync("/api/orders");

if (!response.IsSuccessStatusCode)
{
    var error = await response.Content.ReadAsStringAsync(); // still available
    _logger.LogError("Order fetch failed {Status}: {Body}", response.StatusCode, error);
    throw new ApiException(response.StatusCode, error);
}

var orders = await response.Content.ReadFromJsonAsync<List<Order>>();
```

### 3. Distinguishing 401 vs 403 for Auth Flows
```csharp
if (response.StatusCode == HttpStatusCode.Unauthorized)
{
    await _tokenService.RefreshAsync();
    // retry the request
}
else if (response.StatusCode == HttpStatusCode.Forbidden)
{
    // User is authenticated but lacks permission — don't retry
    throw new ForbiddenException();
}
```

### 4. Retry Logic
Retry policies (Polly) typically inspect the status code directly rather than catching exceptions:

```csharp
.AddTransientHttpErrorPolicy(p =>
    p.OrResult(r => r.StatusCode == HttpStatusCode.TooManyRequests)
     .WaitAndRetryAsync(3, _ => TimeSpan.FromSeconds(2)));
```

---

## `IsSuccessStatusCode` vs `EnsureSuccessStatusCode()`

| | `IsSuccessStatusCode` | `EnsureSuccessStatusCode()` |
|---|---|---|
| Type | `bool` property | `void` method (throws) |
| Error body | Still accessible | Disposed on failure |
| Use case | Manual branching | Fire-and-forget / throw |

---

## Key Takeaways
- `EnsureSuccessStatusCode()` is a convenient shorthand when all failures should be exceptions.
- Prefer manual `IsSuccessStatusCode` / `switch (response.StatusCode)` when different status codes mean different business outcomes, or when you need to read the error body.
- A common hybrid: handle expected codes manually, then call `EnsureSuccessStatusCode()` as a catch-all for anything unexpected.
