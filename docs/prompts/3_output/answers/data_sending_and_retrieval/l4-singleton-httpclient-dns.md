# L4 Why does a singleton `HttpClient` hold stale DNS entries and how do you fix it?

## The Problem

`HttpClient` is designed to be long-lived. It reuses TCP connections via an internal `HttpMessageHandler` / `HttpClientHandler` that maintains a connection pool. Reusing connections is efficient — it avoids the overhead of TCP handshakes and TLS negotiation.

However, the connection pool caches DNS resolutions. When a DNS record changes (e.g., an IP address changes after a deployment, a load balancer failover, or a Kubernetes pod replacement), a long-lived `HttpClient` continues routing traffic to the **old IP** because it never performs a fresh DNS lookup for already-open connections.

```csharp
// Naïve singleton — will hold stale DNS entries indefinitely
public static class HttpClientSingleton
{
    public static readonly HttpClient Client = new HttpClient();
}
```

Even if the TTL of the DNS record has expired, the underlying `SocketsHttpHandler` does not automatically evict pooled connections.

---

## Why Creating a New `HttpClient` Per Request Is Also Wrong

Disposing `HttpClient` does not immediately release the underlying socket. Sockets linger in `TIME_WAIT` (up to 240 seconds on Windows). Under load, this exhausts ephemeral ports and causes `SocketException`.

So neither extreme (singleton forever vs. new per request) is safe.

---

## Fix 1: `PooledConnectionLifetime` on `SocketsHttpHandler` (.NET 5+)

`SocketsHttpHandler` exposes `PooledConnectionLifetime`, which forces connections to be retired after a given duration. When a connection is retired, the next request creates a new connection — and with it, a fresh DNS lookup.

```csharp
var handler = new SocketsHttpHandler
{
    // Connections are retired after 2 minutes, forcing DNS re-resolution
    PooledConnectionLifetime = TimeSpan.FromMinutes(2),

    // Optional: how long an idle connection stays in the pool
    PooledConnectionIdleTimeout = TimeSpan.FromMinutes(1),
};

// Reuse this single HttpClient — it is now DNS-safe
var httpClient = new HttpClient(handler)
{
    BaseAddress = new Uri("https://api.example.com/")
};

// Register as singleton
builder.Services.AddSingleton(httpClient);
```

The key insight: `PooledConnectionLifetime` does NOT close active requests mid-flight. It marks connections as "do not reuse" after the lifetime expires, so the connection is gracefully retired when the current request finishes.

---

## Fix 2: `IHttpClientFactory` with Handler Rotation (Recommended)

`IHttpClientFactory` manages a pool of `HttpMessageHandler` instances and rotates them on a configurable schedule (default: 2 minutes). This achieves the same DNS freshness automatically:

```csharp
// Program.cs
builder.Services.AddHttpClient<ProductsApiClient>(client =>
{
    client.BaseAddress = new Uri("https://api.example.com/");
})
.SetHandlerLifetime(TimeSpan.FromMinutes(2)); // handler is retired and recreated
```

Under the hood, `IHttpClientFactory` uses `SocketsHttpHandler` with `PooledConnectionLifetime` set to the handler lifetime value.

---

## Fix 3: Combining Both (Advanced)

When using a raw singleton `HttpClient` (not through DI), configure both:

```csharp
var handler = new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(2),
    ConnectTimeout = TimeSpan.FromSeconds(10),
    EnableMultipleHttp2Connections = true,
};

var client = new HttpClient(handler, disposeHandler: false)
{
    BaseAddress = new Uri("https://api.example.com/"),
    Timeout = TimeSpan.FromSeconds(30),
};
```

Setting `disposeHandler: false` ensures the handler (and its connection pool) is not torn down when the `HttpClient` wrapper is disposed.

---

## How DNS Is Re-Resolved

When a pooled connection's lifetime expires and it is retired:
1. The next outgoing request finds no valid pooled connection.
2. `SocketsHttpHandler` performs a **new DNS resolution**.
3. A new TCP connection is established to the (potentially changed) IP.
4. The connection enters the pool with a fresh lifetime counter.

---

## Summary

| Approach | Socket Exhaustion | Stale DNS |
|---|---|---|
| `new HttpClient()` per request | Yes (risk) | No |
| Singleton `HttpClient` (default handler) | No | Yes (indefinite) |
| Singleton + `PooledConnectionLifetime` | No | Fixed (after lifetime) |
| `IHttpClientFactory` with handler rotation | No | Fixed (after lifetime) |

## Key Takeaways
- A singleton `HttpClient` caches DNS indefinitely because pooled TCP connections are never retired.
- The fix is `SocketsHttpHandler.PooledConnectionLifetime` — connections are retired after the configured duration, triggering a fresh DNS lookup.
- `IHttpClientFactory` applies this automatically via handler rotation.
- `PooledConnectionLifetime` is safe: connections are not killed mid-request — they are gracefully retired.
