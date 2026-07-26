# L5 How does `IHttpClientFactory` manage `HttpMessageHandler` lifetimes, and why is `PooledConnectionLifetime` important for DNS freshness?

## The Core Problem `IHttpClientFactory` Solves

Two competing requirements exist for `HttpClient` usage:
1. **Reuse handlers** — `HttpMessageHandler` holds a TCP connection pool; recreating it too often causes socket exhaustion.
2. **Refresh handlers** — handlers that live forever cache stale DNS resolutions; the pool never re-resolves a changed hostname.

`IHttpClientFactory` satisfies both by separating the **lifetime of the `HttpClient` wrapper** from the **lifetime of the underlying `HttpMessageHandler`**.

---

## Internal Architecture

```
IHttpClientFactory.CreateClient("MyApi")
  └─► HttpClient (lightweight wrapper — create/dispose freely)
        └─► HttpMessageHandler (from pool — shared and reused)
              └─► SocketsHttpHandler (manages TCP connections)
```

### What Is Pooled and What Is Not

| Object | Pooled? | Lifetime |
|--------|---------|---------|
| `HttpClient` | No | Create per operation or per DI scope; dispose freely |
| `HttpMessageHandler` | Yes | Controlled by `SetHandlerLifetime()` (default: 2 min) |
| TCP connections | Yes | Controlled by `PooledConnectionLifetime` on `SocketsHttpHandler` |

---

## Handler Lifecycle in `IHttpClientFactory`

`IHttpClientFactory` maintains an internal `ActiveHandlerTrackingEntry` pool keyed by client name.

### Step-by-Step

1. **`CreateClient("MyApi")`** is called.
2. The factory checks the pool for an active handler for `"MyApi"`.
3. If found and **within its lifetime**, the existing handler is wrapped in a new `HttpClient` and returned.
4. If **not found or lifetime expired**, a new `HttpMessageHandler` is constructed (via the DI-registered factory), placed in the pool, and wrapped.
5. When a handler's lifetime expires, it is moved to an **expired handler** collection. It is **not disposed immediately** — active requests in flight can still complete.
6. Once no `HttpClient` instances reference the expired handler, it is disposed (finalization via `IDisposable` tracking through `WeakReference`).

### Setting Handler Lifetime

```csharp
builder.Services.AddHttpClient("ProductsApi")
    .SetHandlerLifetime(TimeSpan.FromMinutes(3)); // default is 2 minutes
```

Setting it to `Timeout.InfiniteTimeSpan` disables rotation entirely (DNS staleness risk returns).

---

## Why DNS Goes Stale Without Handler Rotation

`SocketsHttpHandler` (the default inner handler on .NET 5+) maintains a pool of TCP connections. Once a connection is established, it is reused for subsequent requests. The DNS lookup result is cached for the connection's lifetime.

If the IP behind `api.example.com` changes (Kubernetes pod replacement, blue/green deploy, failover), the cached connection still points to the old IP. New connections would resolve the new IP, but if the old connection is never retired, DNS is never re-queried.

---

## `PooledConnectionLifetime`: The Low-Level DNS Fix

`SocketsHttpHandler.PooledConnectionLifetime` tells the handler to retire connections after a given duration. When a connection is retired, the next request creates a new connection — and performs a fresh DNS lookup.

```csharp
var handler = new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(2),
    PooledConnectionIdleTimeout = TimeSpan.FromSeconds(90),
    MaxConnectionsPerServer = 10,
};
```

### How It Interacts with `IHttpClientFactory`

`IHttpClientFactory` already rotates `HttpMessageHandler` instances. But handler rotation alone does not guarantee DNS freshness immediately:
- A new handler is created after the lifetime expires.
- However, if the old handler still has active connections in its pool, they may continue being used until they are naturally closed.

Setting `PooledConnectionLifetime` on the `SocketsHttpHandler` provides a **guaranteed maximum age for each TCP connection**, independent of handler rotation:

```csharp
builder.Services.AddHttpClient<OrdersApiClient>(client =>
{
    client.BaseAddress = new Uri("https://api.example.com/");
})
.ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(2), // DNS freshness guarantee
    PooledConnectionIdleTimeout = TimeSpan.FromMinutes(1),
    EnableMultipleHttp2Connections = true,
})
.SetHandlerLifetime(Timeout.InfiniteTimeSpan); // handler rotation not needed; PooledConnectionLifetime handles it
```

This is the **Microsoft-recommended pattern for long-lived HttpClient singletons** (e.g., when you can't use `IHttpClientFactory`).

---

## Recommended Production Configuration

```csharp
builder.Services.AddHttpClient<ProductsApiClient>(client =>
{
    client.BaseAddress = new Uri("https://api.example.com/");
    client.Timeout = TimeSpan.FromSeconds(30);
})
.ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
{
    // Connections are retired after 2 min → fresh DNS on every new connection
    PooledConnectionLifetime = TimeSpan.FromMinutes(2),

    // Idle connections are released after 90 seconds
    PooledConnectionIdleTimeout = TimeSpan.FromSeconds(90),

    // Enable parallel HTTP/2 connections to the same server
    EnableMultipleHttp2Connections = true,

    ConnectTimeout = TimeSpan.FromSeconds(10),
})
// Handler lifetime can be longer or infinite since PooledConnectionLifetime handles DNS
.SetHandlerLifetime(TimeSpan.FromMinutes(10));
```

---

## Relationship Between the Two Lifetimes

| Setting | Scope | DNS Freshness Mechanism |
|---------|-------|------------------------|
| `SetHandlerLifetime()` | `HttpMessageHandler` (handler pool entry) | Rotating the handler retires the entire connection pool |
| `PooledConnectionLifetime` | Individual TCP connection | Each connection is retired independently after its age limit |

`PooledConnectionLifetime` is more granular and precise. `SetHandlerLifetime` is a coarser mechanism that also covers handler-level state (e.g., `DelegatingHandler` instances).

---

## Disposal Safety

`IHttpClientFactory` uses `WeakReference<ActiveHandlerTrackingEntry>` to track outstanding `HttpClient` instances referencing an expired handler. The handler is only disposed once all referencing clients are GC'd or disposed. This prevents use-after-dispose errors when long-running requests are in flight during a handler rotation.

---

## Key Takeaways
- `IHttpClientFactory` separates `HttpClient` lifetime (short-lived, per-operation) from `HttpMessageHandler` lifetime (pooled, rotated on a timer).
- Handler rotation (via `SetHandlerLifetime`) prevents both socket exhaustion and DNS staleness, but rotation happens at a coarse granularity.
- `SocketsHttpHandler.PooledConnectionLifetime` provides fine-grained TCP connection retirement, ensuring DNS is re-resolved within a bounded window.
- The recommended pattern combines both: `IHttpClientFactory` for handler pooling, and `PooledConnectionLifetime` on `SocketsHttpHandler` for guaranteed DNS freshness.
- Expired handlers are not immediately disposed — they wait for all in-flight requests to complete, preventing use-after-dispose races.
