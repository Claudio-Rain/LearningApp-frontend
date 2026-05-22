# Answers: Data Sending and Retrieval (HTTP / Networking)

---

## Level 1 — Definition & Basics

### HTTP Methods

**Q: What does each HTTP method do (GET, POST, PUT, PATCH, DELETE)?**
> GET reads, POST creates, PUT replaces, PATCH updates partially, DELETE removes.

tags: #crafting-requests

---

**Q: When should you use each HTTP method?**
> Use GET when retrieving data without changing server state. Use POST when creating a new resource without a pre-known URI. Use PUT when replacing an entire resource at a specific URI. Use PATCH when updating only certain fields. Use DELETE to remove a resource.

tags: #crafting-requests

---

**Q: Why is POST not safe and what are the practical consequences?**
> POST is not safe because it modifies server state — submitting a form twice could create two orders.

That's why browsers show the "resubmit?" dialog on back navigation for POST, and why proxies never cache POST responses by default. You must be careful with retries because a duplicate submission could have side effects.

```csharp
// Unsafe: Retrying without idempotency
var order = new { CustomerId = 123, Amount = 99.99m };
try 
{
    var response = await client.PostAsJsonAsync("api/orders", order);
    response.EnsureSuccessStatusCode();
}
catch (HttpRequestException)
{
    // Network failed — did the first request reach the server?
    // If you retry, the server might process it twice, creating a duplicate order
    var response = await client.PostAsJsonAsync("api/orders", order);
    response.EnsureSuccessStatusCode();
}
```

tags: #crafting-requests

---

**Q: What is idempotency, which HTTP methods have it, and why does it matter for API design?**
> Idempotency means making the same request N times has the same effect as once. GET, PUT, DELETE, HEAD, and OPTIONS are idempotent; POST and PATCH are not. It matters because you can safely retry idempotent calls on network failure.

If a network request times out and you don't know whether the server received it, you can safely retry an idempotent call — the worst that happens is you get the same result twice. For POST, you need an explicit idempotency key strategy to get that same guarantee, otherwise a retry could duplicate the operation.

```csharp
// Safe: Retry an idempotent PUT — worst case, it sets the same value twice
var user = new { Id = 1, Name = "Alice" };
try 
{
    await client.PutAsJsonAsync("api/users/1", user);
}
catch (HttpRequestException)
{
    // Safe to retry — setting the same value again is harmless
    await client.PutAsJsonAsync("api/users/1", user);
}

// Unsafe: POST without idempotency key
var payment = new { Amount = 50m };
try 
{
    await client.PostAsJsonAsync("api/payments", payment); // Creates charge
}
catch (HttpRequestException) 
{
    // Retry creates a second charge!
    await client.PostAsJsonAsync("api/payments", payment);
}
```

---

### Network Protocols

**Q: What's the difference between TCP and UDP, and what guarantees does TCP provide?**
> TCP guarantees ordered, reliable delivery with handshakes and retransmissions; UDP is fire-and-forget with lower overhead.

TCP does a three-way handshake, acknowledges packets, retransmits lost ones, and delivers data in order. UDP just sends datagrams and doesn't check if they arrive or arrive in order, trading reliability for speed.

---

**Q: When should you use UDP over TCP?**
> Use UDP when you care more about speed than completeness — live video, gaming, DNS lookups.

In these scenarios a slightly stale or dropped packet is better than waiting for a retransmit. The lower overhead of UDP makes it worth sacrificing reliability guarantees.

---

**Q: Where is HTTP in the OSI model and what transport protocol does it use?**
> HTTP is an application-layer (Layer 7) protocol. HTTP/1.1 and HTTP/2 use TCP; HTTP/3 uses QUIC (UDP-based with reliability layer).

HTTP sits at the top of the OSI stack and relies on lower layers to handle transport and routing. HTTP/1.1 and HTTP/2 typically use TCP on port 80 (or TLS on 443). HTTP/3 switches to QUIC, which is UDP-based but adds its own reliability layer. The OSI stack below handles IP routing, physical framing, and so on — HTTP doesn't care about those layers directly.

---

**Q: What is DNS's purpose and when does it run in an HTTP request?**
> DNS translates hostnames to IP addresses and runs before the TCP connection is even opened.

When you make a request to `api.example.com`, the OS first checks its local DNS cache, then queries a resolver if the cache is cold. Only after an IP address is returned can the TCP handshake begin. This is why DNS TTLs and connection reuse matter in high-performance systems.

```csharp
// Timeline of a request to api.example.com:
// 1. DNS resolution (20-100ms on cache miss)
//    OS checks cache, queries resolver if cold
// 2. TCP handshake (1 RTT, ~50ms)
//    SYN → SYN-ACK → ACK
// 3. TLS handshake (1-2 RTTs, ~100-200ms)
// 4. HTTP request/response (1+ RTT depending on payload)

// Problem: Singleton HttpClient holds old DNS entry
var client = new HttpClient(); // DNS resolved once, never refreshes
for (int i = 0; i < 1000; i++)
{
    // If api.example.com's IP changes, this client never knows
    await client.GetAsync("https://api.example.com/data");
}

// Solution: Use IHttpClientFactory with PooledConnectionLifetime
// In Program.cs:
services.AddHttpClient<MyApiClient>()
    .ConfigureHttpClient(c => c.BaseAddress = new Uri("https://api.example.com"))
    .ConfigureHttpMessageHandlerBuilder(b => 
    {
        var handler = (SocketsHttpHandler)b.PrimaryHandler;
        handler.PooledConnectionLifetime = TimeSpan.FromMinutes(2);
    });
// Now connections are recreated every 2 minutes, re-resolving DNS
```

---

### Serialization / Deserialization

**Q: What is serialization and why is it needed for network data?**
> Serialization converts in-memory objects into portable byte sequences for transmission between different systems.

Without serialization, there's no portable way to exchange structured data between different languages, runtimes, or machines. In-memory objects contain pointers and machine-specific layouts that are meaningless to another process or machine. Serialization produces a self-contained representation — JSON, Protobuf, XML — that the receiver can reconstruct into its own object graph.

---

**Q: Compare binary serialization (Protobuf, MessagePack) vs. text-based formats (JSON, XML), including trade-offs.**
> Binary formats are 3–10x smaller and faster to parse; text formats are human-readable and easier to debug.

Protobuf serializes/deserializes significantly faster than JSON because there's no string parsing and the payload is much smaller. JSON is easy to inspect and doesn't require special tooling — you can just `curl` an endpoint and read the output. The cost of binary formats is tooling friction: you can't inspect traffic easily without special tools. JSON wins for public APIs, browser consumption, and anything where a developer needs to inspect traffic in a proxy. Binary formats win inside a datacenter where bandwidth and CPU cost at scale.

```csharp
var user = new User { Id = 1, Name = "Alice", Email = "alice@example.com" };

// JSON: Human-readable, ~80 bytes
string json = JsonSerializer.Serialize(user);
// {"id":1,"name":"Alice","email":"alice@example.com"}

// MessagePack: Binary, ~30 bytes (3x smaller)
byte[] msgpack = MessagePackSerializer.Serialize(user);

// Protobuf: Binary, requires .proto schema, ~25 bytes (3x smaller)
// Requires code generation from .proto file

// Trade-off table:
// JSON: Easy to debug (curl endpoint), human-readable, slower parsing
// MessagePack: Smaller, faster, but needs special tools to inspect
// Protobuf: Smallest, fastest, schema versioning, but complex tooling

// When to use what:
// - Public API or browser: JSON (curl-friendly, no tooling needed)
// - Internal microservices: MessagePack/Protobuf (performance at scale)
// - Long-term storage or schema evolution: Protobuf (strong versioning)
```

---

## Level 2 — Core Concepts

### HTTP Request/Response Cycle

**Q: What's the high-level sequence from URL entry to first render?**
> DNS resolution → TCP connection → TLS handshake (if HTTPS) → HTTP request → server response → browser parsing and rendering.

---

**Q: What happens in detail during each step of the request-to-render flow?**
> DNS queries and caches the IP (20–100ms on cache miss). TCP handshake takes 3 packets (1 RTT). TLS handshake adds 1–2 RTTs (or 0-RTT on resumption). Browser sends GET request. Server processes and streams response with headers and body. Browser parses HTML, discovers linked resources (CSS, JS, images), and fires parallel sub-requests before rendering the first frame.

Understanding the granular steps helps you identify bottlenecks — a cold DNS lookup adds latency before anything else can happen, while TLS resumption can nearly eliminate the handshake on repeat connections.

---

**Q: What goes in HTTP headers vs. the body? Give examples.**
> Headers carry metadata about the request; the body carries the actual payload.

Headers include things like `Content-Type: application/json`, `Authorization: Bearer <token>`, `Accept-Encoding: gzip`, and `Host: api.example.com`. The body carries the data being sent — a JSON object for a POST, a file for an upload, form fields for a form submission. GET requests have no body by spec; DELETE typically doesn't either. Query parameters in the URL are a third slot for small, non-sensitive data.

---

**Q: How do persistent connections work, and why were they introduced?**
> Keep-alive reuses the same TCP connection for multiple request/response pairs, eliminating the cost of repeated handshakes.

In HTTP/1.0 every request opened a new TCP (and TLS) connection — expensive at scale. Keep-alive, default in HTTP/1.1, keeps the socket open after a response so the next request skips the handshake overhead. The server signals timeout and max requests via `Keep-Alive` response headers. HTTP/2 takes this further with multiplexing — multiple requests fly over a single connection simultaneously.

---

### Status Codes

**Q: What's the difference between 401 and 403 status codes, and how should clients respond to each?**
> 401 means "not authenticated" (retry with credentials); 403 means "authenticated but not authorized" (user lacks permission).

401 means the client has not provided valid credentials — the server doesn't know who you are. On a 401, prompt for credentials or refresh a token and retry, since the issue is identity. 403 means the server knows who you are but you don't have permission to access this resource. On a 403 the client is already identified successfully; it just doesn't have permission, and retrying with the same credentials won't help. Show "you don't have access to this" instead of retrying.

```csharp
var response = await client.GetAsync("api/admin/reports");

if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized) // 401
{
    // Identity issue — refresh token or prompt for login, then retry
    var newToken = await refreshTokenService.RefreshAsync();
    client.DefaultRequestHeaders.Authorization = 
        new("Bearer", newToken);
    response = await client.GetAsync("api/admin/reports");
}
else if (response.StatusCode == System.Net.HttpStatusCode.Forbidden) // 403
{
    // Authorization issue — user is logged in but lacks permission
    // Do NOT retry; show error message instead
    throw new UnauthorizedAccessException("You don't have access to this resource");
}
```

---

**Q: When should you use 307 vs 301 redirects, and what's the risk of 301 in APIs?**
> Use 307 for temporary moves with method preservation; 301 signals permanent moves but gets cached aggressively, causing problems if you need to reverse it.

307 guarantees the client re-sends the original method (POST stays POST) to the new URL. 301 indicates permanent moves but clients cache it indefinitely — if you later want to reverse it, cached clients won't ask the server again.

---

**Q: How should you handle 503 errors and when should you give up retrying?**
> Retry with exponential back-off and jitter, then fail to user with a timeout budget (usually under 10 seconds).

A 503 means the server is temporarily unavailable, so an immediate single retry is reasonable. If it's still failing, use exponential back-off with jitter to avoid a retry storm across many clients. Set a max retry count (e.g., 3) and a total timeout budget that matches user expectations — usually under 10 seconds for synchronous requests. If all retries are exhausted, fail fast and show a degraded UI rather than hanging indefinitely. The longer you keep retrying, the worse the user experience becomes.

---

### HttpClient Basics

**Q: How do you send a GET with `HttpClient` and read the response as a string?**
> Call `GetStringAsync` for the simplest case, or `GetAsync` + `ReadAsStringAsync` when you need to inspect the response first.

```csharp
// Simple case
var client = httpClientFactory.CreateClient();
string body = await client.GetStringAsync("https://api.example.com/items");

// When you need status code access
HttpResponseMessage response = await client.GetAsync("https://api.example.com/items");
response.EnsureSuccessStatusCode();
string body = await response.Content.ReadAsStringAsync();
```

---

**Q: What does `EnsureSuccessStatusCode()` do and when should you prefer manual status checking?**
> It throws `HttpRequestException` on non-2xx status — use it for "all-or-nothing" cases, but prefer manual checking for nuanced error handling.

`EnsureSuccessStatusCode` is convenient shorthand for "anything other than success is a fatal error." However, if your code should handle 404 as "not found, return null" or 409 as "conflict, retry with updated data," you need to check `response.StatusCode` manually and branch. Using `EnsureSuccessStatusCode` in those cases means you're catching an exception for control flow, which is messy and inefficient.

---

## Level 3 — Practical Usage

### HttpClient with Various Payloads

**Q: How do you POST JSON with `HttpClient` and `JsonContent`?**
> Use `JsonContent.Create` — it serializes your object and sets `Content-Type: application/json` in one call.

```csharp
var payload = new { Name = "Alice", Age = 30 };

// .NET 5+ preferred approach
var response = await client.PostAsJsonAsync("https://api.example.com/users", payload);
response.EnsureSuccessStatusCode();

// Or manually with JsonContent
var content = JsonContent.Create(payload);
var response = await client.PostAsync("https://api.example.com/users", content);
```

Before `JsonContent`, you'd manually serialize to a string and wrap in `StringContent` with the content type — easy to forget the header. `PostAsJsonAsync` (from `System.Net.Http.Json`) handles all of that and uses `System.Text.Json` by default, which is significantly faster than `Newtonsoft.Json` for most payloads.

---

**Q: How do you send multipart/form-data (file uploads) with `HttpClient`?**
> Use `MultipartFormDataContent`, add `StreamContent` for the file and `StringContent` for any other fields, then POST it.

```csharp
await using var fileStream = File.OpenRead("/path/to/file.pdf");

var multipart = new MultipartFormDataContent();
multipart.Add(new StreamContent(fileStream), "file", "file.pdf");
multipart.Add(new StringContent("some-description"), "description");

var response = await client.PostAsync("https://api.example.com/upload", multipart);
response.EnsureSuccessStatusCode();
```

`MultipartFormDataContent` sets the `Content-Type: multipart/form-data; boundary=...` header automatically. Stream the file rather than reading it all into memory — especially important for large uploads. If the server requires a specific content-type per part (e.g., `application/pdf`), pass a `MediaTypeHeaderValue` into the `StreamContent` constructor.

---

**Q: When should you choose XML over JSON for payloads?**
> Choose XML for legacy SOAP, regulated industries, or XSD validation; avoid it for new greenfield work.

Most greenfield work uses JSON, but SOAP web services, EDI healthcare systems (HL7), and some banking APIs still speak XML. I'd avoid XML as a new choice purely for preference — the verbosity and namespace complexity rarely pay off.

---

**Q: What .NET serialization classes are available for XML?**
> `XmlSerializer` for attribute-driven mapping, `DataContractSerializer` for WCF-style contracts, and `System.Xml.Linq` for manual building/parsing.

`XmlSerializer` is the traditional choice for simple XML mapping. `DataContractSerializer` is for WCF-style contracts. `System.Xml.Linq` with `XDocument`/`XElement` is the friendlier option when you need more control over building or parsing XML manually.

---

**Q: Why should you avoid creating `HttpClient` per request and what's the recommended pattern?**
> Per-request `HttpClient` exhausts the port pool under load; use `IHttpClientFactory` instead to pool handlers efficiently.

Each new `HttpClient` allocates a socket that won't be released immediately — `HttpClient` implements `IDisposable` but disposing it doesn't immediately close the underlying socket; the OS keeps it in `TIME_WAIT`. Under load, you run out of ephemeral ports. `IHttpClientFactory` maintains a pool of `HttpMessageHandler` instances with configurable lifetimes, reusing connections efficiently. Named or typed clients let you also centralize base addresses, headers, and retry policies.

---

### Cancellation and Timeouts

**Q: How do you attach a `CancellationToken` to `HttpClient`?**
> Pass the token to `GetAsync`/`PostAsync`.

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
var response = await client.GetAsync(url, cts.Token);
```

The token is passed as an optional parameter to any async HTTP method.

---

**Q: How do you distinguish user cancellation from timeout?**
> Both throw `OperationCanceledException`, but you can distinguish them by checking `cancellationToken.IsCancellationRequested`.

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
try
{
    var response = await client.GetAsync(url, cts.Token);
}
catch (OperationCanceledException ex) when (cancellationToken.IsCancellationRequested)
{
    // User cancelled
}
catch (OperationCanceledException)
{
    // Timeout
}
```

If the token you passed to `GetAsync` is the user's token (e.g., ASP.NET's `HttpContext.RequestAborted`), check `token.IsCancellationRequested` in the catch. If it's not requested, the cancellation came from `HttpClient.Timeout` firing internally. Linking both tokens with `CancellationTokenSource.CreateLinkedTokenSource` is common when you want both behaviors.

---

**Q: Differentiate `HttpClient.Timeout` vs `CancellationTokenSource` timeout and which takes precedence?**
> `HttpClient.Timeout` is a global default; `CancellationTokenSource` is per-request — whichever expires first cancels the call.

`HttpClient.Timeout` is a blanket fallback that applies to every request made by that client instance. A per-request `CancellationTokenSource` with its own timeout gives you finer control — a quick health check can have a 1s timeout while a report download gets 60s. If both are set, the one that expires first will cancel the request. The thrown exception is `OperationCanceledException` in both cases.

---

### TcpClient / UdpClient

**Q: How do you connect with `TcpClient`, send a message, and read the response?**
> Connect, get the `NetworkStream`, write bytes, then read into a buffer.

```csharp
using var tcp = new TcpClient();
await tcp.ConnectAsync("example.com", 9000);

var stream = tcp.GetStream();
byte[] data = Encoding.UTF8.GetBytes("HELLO\n");
await stream.WriteAsync(data);

var buffer = new byte[4096];
int bytesRead = await stream.ReadAsync(buffer);
string response = Encoding.UTF8.GetString(buffer, 0, bytesRead);
```

Real code should wrap this in a loop because TCP is a stream — a single `ReadAsync` may not return the full message. You'll need a framing protocol (length prefix, newline delimiter, etc.) to know when a message is complete. `TcpClient` is a thin wrapper over `Socket`; if you need performance-critical I/O, drop down to `Socket` with `SocketAsyncEventArgs`.

---

**Q: When should you use `UdpClient` over `TcpClient`? give real-world examples?**
> Use UDP when low latency matters more than reliability — real-time games, live video/audio, DNS, telemetry.

UDP is ideal for real-time scenarios where some data loss is acceptable in exchange for speed. In a first-person shooter, a stale position update that arrives late is worse than dropping it. DNS is another classic: a single small query/response fits in one datagram. Log aggregation over UDP intentionally drops logs rather than blocking the application. These scenarios prioritize speed and throughput over guaranteed delivery.
---

### ICredentials

**Q: What is `ICredentials`? how does `NetworkCredential` relate to it?**
> `ICredentials` is the abstraction for providing credentials; `NetworkCredential` is the concrete username/password implementation.

```csharp
var handler = new HttpClientHandler
{
    Credentials = new NetworkCredential("user", "pass")
};
var client = new HttpClient(handler);
```

`ICredentials` defines `GetCredential(Uri, string authType)` so different credentials can be returned for different URIs or auth schemes. `NetworkCredential` implements `ICredentials` for simple username/password or token scenarios. `CredentialCache` also implements `ICredentials` and lets you map multiple credentials to multiple URIs/schemes — useful when one client talks to several services with different auth requirements.

---

**Q: How do Basic and NTLM authentication differ when using `NetworkCredential`?**
> Basic sends base64-encoded credentials in headers; NTLM uses multi-step challenge-response without sending the password.

Basic auth is trivially reversible — always use it over TLS. It requires you to set `PreAuthenticate = true` or handle the 401 challenge manually. NTLM (and Kerberos/Negotiate) are Windows-integrated schemes where the client proves knowledge of the password via cryptographic challenge without transmitting it. `HttpClientHandler` handles the NTLM handshake automatically when you set `UseDefaultCredentials = true` or supply a `NetworkCredential`.

---

## Level 4 — Common Pitfalls

### HttpClient Misuse

**Q: Why does per-request `HttpClient` cause `SocketException`? how do you fix it?**
> Disposed sockets linger in `TIME_WAIT`, exhausting the port pool — use `IHttpClientFactory` instead.

Each `new HttpClient()` and subsequent disposal leaves a socket in `TIME_WAIT` for up to 240 seconds. Dev traffic is low, so you never hit the limit. Under production load you burn through all ~28,000 ephemeral ports and new connections fail with `SocketException`. `IHttpClientFactory` pools `HttpMessageHandler` instances and manages their lifetimes safely, preventing port exhaustion.

---

**Q: Why does singleton `HttpClient` hold stale DNS entries? what's the fix?**
> Singleton connections never re-resolve DNS; use `IHttpClientFactory` with `PooledConnectionLifetime` to force renewal.

A singleton `HttpClient` holds open connections indefinitely, never re-resolving DNS after the initial lookup. The socket stays open for the process lifetime, so DNS TTL expirations are ignored. When the downstream service's IP rotates (load balancer, blue/green deploy, Kubernetes pod change), your client keeps routing to the old IP. Using `IHttpClientFactory` with `SocketsHttpHandler.PooledConnectionLifetime` set to 2 minutes forces periodic connection renewal so DNS is re-resolved regularly, picking up IP changes from the server.

```csharp
// Problem: Singleton holds DNS entry forever
public static class SingletonHttpClientService
{
    public static readonly HttpClient Client = new();
}

// At 12:00 PM: api.example.com resolves to 10.0.0.1
await SingletonHttpClientService.Client.GetAsync("https://api.example.com/");

// At 12:05 PM: Server scales down, IP changes to 10.0.0.2
// But SingletonHttpClientService.Client still routes to 10.0.0.1 (old socket is open)
// Requests fail with connection timeouts to dead IP

// Solution: Use IHttpClientFactory with connection lifetime
// In Program.cs:
services.AddHttpClient<MyApiClient>()
    .ConfigureHttpMessageHandlerBuilder(b =>
    {
        if (b.PrimaryHandler is SocketsHttpHandler handler)
        {
            handler.PooledConnectionLifetime = TimeSpan.FromMinutes(2);
            // Force new sockets every 2 minutes, triggering DNS re-resolution
        }
    });

// Now the client automatically opens fresh connections every 2 minutes,
// picking up any DNS changes from the server
```

---

### Serialization Edge Cases

**Q: What happens when JSON has unknown fields? how do you control the behavior?**
> By default `System.Text.Json` ignores unknown properties; you can make it throw for strict validation.

The lenient default is usually what you want — it allows the API to add new fields without breaking old clients. If you're writing a strict validation layer and want to reject unknown fields, set `JsonSerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow` (.NET 8+) or use `[JsonExtensionData]` to capture extra fields for inspection rather than silently dropping them.

---

**Q: How can mixing UTC and local time in serialization cause bugs?**
> Mixing UTC and local time causes silent time shifts — a 5-hour discrepancy if one server serializes in Eastern time and another reads it as UTC.

If one server serializes `2024-01-15T10:00:00` (no offset) in local Eastern time and another reads it as UTC, you get a 5-hour time discrepancy without any error messages. This silent shift can corrupt data and cause subtle business logic bugs that only manifest in certain time zones.

```csharp
// Bug: Server A uses local time, Server B reads as UTC
// Server A (Eastern Time, UTC-5)
DateTime localTime = DateTime.Now; // 2024-01-15 10:00:00 (local)
string json = JsonSerializer.Serialize(new { CreatedAt = localTime });
// Output: {"CreatedAt":"2024-01-15T10:00:00"} — no offset!

// Server B (reads as UTC)
var obj = JsonSerializer.Deserialize<Payment>(json);
// obj.CreatedAt is interpreted as 2024-01-15 10:00:00 UTC 
// But it was actually 10:00 AM Eastern = 3:00 PM UTC
// Result: 5-hour discrepancy, silently!

// Fix: Always use DateTimeOffset
DateTimeOffset offsetTime = DateTimeOffset.Now; // 2024-01-15 10:00:00 -05:00
string json = JsonSerializer.Serialize(new { CreatedAt = offsetTime });
// Output: {"CreatedAt":"2024-01-15T10:00:00-05:00"} — includes offset!

var obj = JsonSerializer.Deserialize<Payment>(json);
// obj.CreatedAt is correctly interpreted as 2024-01-15 15:00:00 UTC
```

---

**Q: How do you prevent UTC/local time bugs in serialization?**
> Always use `DateTimeOffset` instead of `DateTime` — it carries the offset in the serialized form.

`DateTimeOffset` serializes as `2024-01-15T10:00:00-05:00`, which preserves the offset so any reader correctly interprets the time.

---

**Q: Why do circular references break JSON serialization?**
> Circular references cause infinite recursion — the serializer keeps traversing the same objects in a loop.

An `Order` that has a `Customer`, which has a list of `Orders`, will recurse forever. `System.Text.Json` throws `JsonException` before the stack overflows. Circular references are common when your domain models reference both parent and child objects.

```csharp
public class Customer 
{
    public int Id { get; set; }
    public List<Order> Orders { get; set; } // Orders reference back to Customer
}

public class Order 
{
    public int Id { get; set; }
    public Customer Customer { get; set; } // Circular reference!
}

// This will throw JsonException: A possible object cycle was detected
var customer = new Customer { Id = 1, Orders = new() };
var order = new Order { Id = 100, Customer = customer };
customer.Orders.Add(order);

string json = JsonSerializer.Serialize(customer); // Throws!
```

---

**Q: How do you handle circular references in JSON serialization?**
> Use `ReferenceHandler.Preserve` to emit `$id`/`$ref` markers, or `ReferenceHandler.IgnoreCycles` (.NET 6+) to break the cycle by writing `null`.

Alternatively, prefer fixing the domain model — use a DTO that doesn't have the cycle. For example, a customer list response might include orders, but each order doesn't need a backreference to the customer.

```csharp
// Option 1: Use ReferenceHandler.Preserve (.NET 6+)
var options = new JsonSerializerOptions 
{ 
    ReferenceHandler = ReferenceHandler.Preserve 
};
string json = JsonSerializer.Serialize(customer, options);
// Output: {"$id":"1","Id":1,"Orders":[{"$id":"2","Id":100,"Customer":{"$ref":"1"}}]}

// Option 2: Use IgnoreCycles to write null
var options = new JsonSerializerOptions 
{ 
    ReferenceHandler = ReferenceHandler.IgnoreCycles 
};
string json = JsonSerializer.Serialize(customer, options);
// Output: {"Id":1,"Orders":[{"Id":100,"Customer":null}]}

// Option 3 (Preferred): Use a DTO without the backreference
public class CustomerDto 
{
    public int Id { get; set; }
    public List<OrderDto> Orders { get; set; }
}

public class OrderDto 
{
    public int Id { get; set; }
    // No reference back to Customer
}
```

---

### Error and Retry

**Q: What goes wrong when retrying POST without idempotency and how do you make it safe?**
> Retrying non-idempotent POSTs can create duplicates — add an `Idempotency-Key` header for safe replays.

The server may have processed the first request successfully but the response was lost in transit. Your retry sends a second request the server treats as new, potentially creating duplicate records, double charges, or duplicate emails. Include an `Idempotency-Key` header (a UUID generated once per logical operation) so the server can detect and deduplicate replays. The server stores the key and the response for long enough to cover your retry window — typically 24 hours for payment APIs.

```csharp
// Unsafe: Retry without idempotency — request 1 succeeds, response is lost
// Client retries with same data → Server creates duplicate charge
var payment = new { Amount = 100m };
try
{
    response = await client.PostAsJsonAsync("api/payments", payment);
    // Network fails, response is lost
    throw new HttpRequestException();
}
catch (HttpRequestException)
{
    // Retry with same payload — server treats as new request
    response = await client.PostAsJsonAsync("api/payments", payment); // Duplicate!
}

// Safe: Add idempotency key, generate once
var paymentId = Guid.NewGuid().ToString();
var payment = new { Amount = 100m };

for (int attempt = 0; attempt < 3; attempt++)
{
    try
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "api/payments");
        request.Headers.Add("Idempotency-Key", paymentId); // Same key on all retries
        request.Content = JsonContent.Create(payment);
        
        response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        break;
    }
    catch (HttpRequestException) when (attempt < 2)
    {
        // Retry with same idempotency key
        // Server recognizes the key and returns cached response
    }
}
```

---

**Q: What is a retry storm and how does jitter in backoff prevent it?**
> Retry storms happen when all clients retry simultaneously — jitter randomizes timing to spread the load.

Imagine 1,000 clients all get 503 at the same time, all wait exactly 2 seconds, and all hammer the server together again. The server, just recovering, gets hit by the same spike. With jitter you multiply the back-off delay by a random factor (e.g., `delay * random(0.5, 1.5)`), so retries are spread across several seconds. Libraries like Polly implement this pattern with decorrelated jitter.

```csharp
// Bad: All 1,000 clients retry at exactly t=2.0s (retry storm)
const int retryDelaySeconds = 2;
int retries = 0;
while (retries < 3)
{
    try 
    { 
        return await client.GetAsync(url); 
    }
    catch (HttpRequestException) when (retries < 3)
    {
        await Task.Delay(TimeSpan.FromSeconds(retryDelaySeconds));
        retries++;
    }
}

// Good: Exponential backoff with jitter spreads retries
// Using Polly library
var policy = Policy
    .Handle<HttpRequestException>()
    .OrResult<HttpResponseMessage>(r => (int)r.StatusCode >= 500)
    .WaitAndRetryAsync(
        retryCount: 3,
        sleepDurationProvider: attempt =>
        {
            var baseDelay = TimeSpan.FromSeconds(Math.Pow(2, attempt)); // 1s, 2s, 4s
            var jitter = TimeSpan.FromMilliseconds(Random.Shared.Next(0, 1000));
            return baseDelay + jitter; // Add randomness
        }
    );

await policy.ExecuteAsync(async () => await client.GetAsync(url));
// First retry: ~1 second + 0-1000ms
// Second retry: ~2 seconds + 0-1000ms  
// Third retry: ~4 seconds + 0-1000ms
// All retries spread across the interval, no synchronized spike
```

---

### TLS / Security

**Q: What's the risk of disabling SSL certificate validation and how does it expose your application?**
> Disabling validation enables man-in-the-middle attacks — any attacker with network access can intercept and modify traffic.

An attacker can intercept and read or modify all traffic. TLS without certificate validation provides encryption but no authentication — you don't know who you're talking to. In a corporate network or cloud environment this can expose credentials, tokens, and sensitive payloads to any process that can intercept the traffic. The right fix in dev is to install a self-signed CA cert into the trust store or use a tool like `mkcert`. Add a CI check or code review rule that rejects this callback pattern outside test projects.

```csharp
// DANGER: Disables certificate validation (allows MITM attacks)
// Never use in production!
var handler = new HttpClientHandler
{
    ServerCertificateCustomValidationCallback = (msg, cert, chain, errors) => true
};
var client = new HttpClient(handler);
// Attacker on your network can now intercept and read:
// - API credentials in headers
// - Bearer tokens
// - Form data in POST bodies
// - Response payloads

// Correct dev approach: Use self-signed cert in trust store
// Option 1: Use mkcert tool
// $ mkcert localhost api.local.dev
// Installs self-signed cert into OS trust store

// Option 2: Add cert to HttpClientHandler
var handler = new HttpClientHandler();
var cert = new X509Certificate2("path/to/cert.crt");
handler.ClientCertificateOptions = ClientCertificateOption.Manual;
handler.ClientCertificates.Add(cert);
var client = new HttpClient(handler);

// Production: Use valid certificates from a trusted CA
// The default HttpClientHandler validates certificates automatically
var handler = new HttpClientHandler(); // Uses OS cert store
var client = new HttpClient(handler);
```

---

## Level 5 — Internals & Deep Mechanics

### HttpMessageHandler Pipeline

**Q: Explain the `DelegatingHandler` pipeline and how requests travel through it.**
> `DelegatingHandler` is a chain-of-responsibility pattern — each handler processes requests and passes control to the next via `base.SendAsync()`.

When `HttpClient.SendAsync` is called, it passes the request to the outermost handler. Each `DelegatingHandler` has a reference to `InnerHandler` and calls `base.SendAsync` to pass control along. The chain might be: logging handler → auth handler → retry handler → `HttpClientHandler` (network). Each handler can inspect or modify the request/response before passing it forward. The response bubbles back up through the same chain in reverse. `IHttpClientFactory` builds and manages these pipelines when you configure them in `AddHttpClient`.

---

**Q: Implement a `DelegatingHandler` that adds Bearer tokens and refreshes on 401.**
> Override `SendAsync`, add the token header, forward the request, and if you get a 401, refresh the token and retry once.

```csharp
public class AuthHandler : DelegatingHandler
{
    private readonly ITokenProvider _tokens;
    public AuthHandler(ITokenProvider tokens) => _tokens = tokens;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", await _tokens.GetTokenAsync());

        var response = await base.SendAsync(request, ct);

        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            var fresh = await _tokens.RefreshAsync();
            request.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", fresh);
            response = await base.SendAsync(request, ct);
        }
        return response;
    }
}
```

Be careful to clone the request if you need to replay it — `HttpRequestMessage` can only be sent once on some runtimes. Also avoid infinite loops by only retrying once, not on every 401. Register the handler via `services.AddHttpClient<MyClient>().AddHttpMessageHandler<AuthHandler>()`.

---

**Q: How do you implement response caching in `HttpMessageHandler` and what headers should you respect?**
> Intercept requests in `SendAsync`, check cache before forwarding, and respect `Cache-Control` directives.

A minimal implementation uses a `MemoryCache` keyed by the request URI and ignores POST/PUT. Intercept the request, check if you have a cached response, return it if available, otherwise forward the request and cache the response. Check the response's `Cache-Control` header before caching: `no-store` means never cache, `no-cache` means revalidate with the server on each use (via `ETag`/`If-None-Match`), and `max-age` gives the TTL. Full compliance also requires `Vary` header handling — different cached entries for different `Accept` or `Accept-Encoding` values. For most internal services a simple max-age cache is sufficient.

---

### Connection Pooling Internals

**Q: How does `SocketsHttpHandler` pool connections and why is `PooledConnectionLifetime` important for DNS?**
> `SocketsHttpHandler` maintains a connection pool per host, and `PooledConnectionLifetime` forces renewal so DNS is re-resolved.

Connections are reused across multiple requests to the same host, reducing handshake overhead. By default `PooledConnectionLifetime` is infinite, meaning connections live until the server closes them. If the server IP changes (pod restart, DNS rotation), your client keeps sending to the old address. Setting it to something like `TimeSpan.FromMinutes(2)` means the handler periodically creates fresh connections, re-resolving DNS in the process. This is the underlying mechanism `IHttpClientFactory` uses when you configure handler lifetimes — it recreates handlers on that interval.

---

**Q: Differentiate `IdleTimeout` vs `Lifetime` and how do you tune for high-throughput services?**
> `IdleTimeout` evicts unused connections; `Lifetime` evicts by age — tune `Lifetime` for DNS (1–5 min), `IdleTimeout` for bursty traffic (~90 sec).

`IdleTimeout` closes connections that haven't been used for the specified timeout period to free up resources. `Lifetime` closes connections based on age regardless of activity, even if actively used. For high-throughput services, `IdleTimeout` rarely triggers since connections stay busy. `Lifetime` is what you tune for DNS freshness, typically 1–5 minutes. For a service with bursty traffic, set `IdleTimeout` to something like 90 seconds to reclaim sockets during quiet periods. Setting both too low adds unnecessary handshake overhead; too high risks stale connections or port exhaustion on the server side.

---

### Socket-Level Mechanics

**Q: What is the TCP three-way handshake and when does `ConnectAsync` return?**
> SYN → SYN-ACK → ACK — `ConnectAsync` returns after the connection is fully established.

The client sends SYN, the server replies with SYN-ACK, and the client sends ACK. After that ACK is sent the client-side socket enters `ESTABLISHED` state, which is when `ConnectAsync` completes. No data has been exchanged yet — you still have a TLS handshake ahead if using HTTPS. The handshake typically takes one round-trip time (RTT), so a 50ms ping means a ~50ms TCP setup cost before your first byte of data.

---

**Q: What is `TIME_WAIT` in TCP and why does it cause port exhaustion?**
> `TIME_WAIT` reserves a port for 2×MSL (~240s) after close; under high churn, this exhausts all ~28,000 ephemeral ports.

`TIME_WAIT` holds a connection's port reserved to absorb delayed packets — the OS needs to ensure no late-arriving packets from the old connection are misattributed to a new one on the same port. Each closed outbound connection occupies an ephemeral port in `TIME_WAIT`. With ~28,000 ephemeral ports and connections closing at 100/sec, you run out in under 5 minutes. Solutions: reuse connections (keep-alive/pooling), enable `SO_REUSEADDR`/`SO_REUSEPORT`, or tune `tcp_fin_timeout` on Linux.

```csharp
// Anti-pattern: Creates new sockets, exhausts ports under load
for (int i = 0; i < 10000; i++)
{
    using var client = new HttpClient(); // Creates socket
    var result = await client.GetStringAsync("https://api.example.com/data");
    // Socket goes to TIME_WAIT for ~240 seconds
    // After 100 iterations/sec, ~240 sockets in TIME_WAIT simultaneously
    // Ephemeral ports exhausted in minutes
}

// Correct: Reuse HttpClient via IHttpClientFactory
public class MyApiClient
{
    private readonly HttpClient _client;
    
    public MyApiClient(HttpClient client) => _client = client;
    
    public async Task<string> FetchAsync()
    {
        return await _client.GetStringAsync("https://api.example.com/data");
    }
}

// In Program.cs:
services.AddHttpClient<MyApiClient>();

// Now all instances reuse the same pooled connections
// Sockets stay open, avoiding TIME_WAIT entirely
```

---

## Level 6 — Trade-offs & Design Decisions

### Protocol and Transport Choices

**Q: Compare UDP vs WebSockets for real-time multiplayer communication.**
> UDP is lowest-latency but requires custom reliability; WebSockets are a solid middle ground with built-in TCP reliability.

**Latency:** Raw UDP gives sub-millisecond overhead. WebSockets over TCP add ~1 RTT on packet loss due to head-of-line blocking. **Reliability:** Raw UDP requires you to build your own reliability layer with sequence numbers, ACKs, and congestion control. WebSockets provide TCP reliability automatically. **Complexity:** Raw UDP is highest complexity with custom protocol. WebSockets are much simpler. In practice, start with WebSockets and only move to UDP + QUIC/custom protocol if profiling shows TCP's retransmit behavior is a real problem.

---

**Q: Why is long-polling unsuitable for real-time multiplayer?**
> Long-polling adds full HTTP overhead per message cycle, making it impractical for 60fps gameplay.

Each message cycle requires a new HTTP request/response roundtrip, which is both latency-heavy and resource-intensive. WebSockets reuse a single persistent connection, avoiding this overhead.

---

**Q: Compare HTTP calls vs. message queues for microservices communication.**
> HTTP is synchronous (immediate responses); queues decouple services (no blocking) but add operational complexity.

With HTTP you get an immediate response — easy to model as a function call. With a queue, the producer doesn't know when or if the consumer processed the message, so you need polling, callbacks, or a correlation ID pattern for request/reply. Message queues decouple services: the consumer can go down without the producer failing, and the queue buffers bursts the consumer can't handle.

---

**Q: When should you use HTTP calls vs. message queues?**
> Use HTTP for "answer now" (lookups, reads, user-facing calls). Use messaging for "fire and move on" (email sending, audit events, async workflows).

HTTP is better when you need an immediate response and the producer can't proceed without it. Message queues are better when the producer is willing to continue without knowing the outcome — you trade synchronous response semantics for resilience and burst handling. Message queues do add operational complexity: queue infrastructure, failure handling, and retry logic all become your concern.

---

### HttpClient Design

**Q: What are the three main patterns for using `HttpClient` and when should you use each?**
> Typed clients for most cases; named clients for multiple configurations; singletons only for trivial tools.

Typed clients (a class that takes `HttpClient` in its constructor) are the most ergonomic: they encapsulate the URL, default headers, and retry policy. Named clients work well when you need runtime selection. A raw singleton `HttpClient` is acceptable in console apps or simple scenarios where DI isn't in play. Never use a new-per-request pattern in production.

---

**Q: What makes typed clients ergonomic and how do they manage handler lifetime?**
> Typed clients encapsulate the URL, default headers, and retry policy in one class, and `IHttpClientFactory` manages the underlying handler lifetime.

With a typed client, you inject `HttpClient` into a class that wraps it. The factory manages handler pooling and lifecycle, handling DNS refreshes and connection reuse automatically. This is cleaner than passing raw `HttpClient` around or managing handlers manually.

---

**Q: What's the risk when parallelizing many HTTP calls and how do you cap concurrency?**
> The risk is thundering-herd against the downstream service — 100 simultaneous calls during a retry storm can take it down. Use `SemaphoreSlim` to limit concurrent requests.

`HttpClient` is thread-safe and handles connection pooling, so parallel calls are safe from the client side. But hammering a single downstream service with too many concurrent requests can overwhelm it. Limit concurrency with `SemaphoreSlim` or `Parallel.ForEachAsync` with `MaxDegreeOfParallelism`.

```csharp
// Dangerous: All 100 calls hammer the server simultaneously
var urls = Enumerable.Range(1, 100).Select(i => $"api/item/{i}");
var tasks = urls.Select(url => client.GetStringAsync(url));
var results = await Task.WhenAll(tasks); // 100 concurrent requests!

// Safe: Cap at 5 concurrent requests
var semaphore = new SemaphoreSlim(5);
var tasks = urls.Select(async url =>
{
    await semaphore.WaitAsync();
    try 
    { 
        return await client.GetStringAsync(url); 
    }
    finally 
    { 
        semaphore.Release(); 
    }
});
var results = await Task.WhenAll(tasks);

// Alternative: Use Parallel.ForEachAsync (.NET 6+)
var results = new List<string>();
var cts = new CancellationTokenSource();

await Parallel.ForEachAsync(
    urls,
    new ParallelOptions { MaxDegreeOfParallelism = 5, CancellationToken = cts.Token },
    async (url, ct) =>
    {
        var result = await client.GetStringAsync(url, ct);
        lock (results) results.Add(result); // Thread-safe collection
    }
);
```

---

**Q: How do you implement capped concurrency for parallel HTTP calls?**
> Use `SemaphoreSlim` to limit concurrent requests, or use `Parallel.ForEachAsync` with `MaxDegreeOfParallelism`.

```csharp
// With SemaphoreSlim
var semaphore = new SemaphoreSlim(5);
var tasks = urls.Select(async url => {
    await semaphore.WaitAsync();
    try { return await client.GetStringAsync(url); }
    finally { semaphore.Release(); }
});
```

Always propagate a shared `CancellationToken` so one failure can cancel the rest.

---

### Serialization Format Trade-offs

**Q: Should you switch from JSON to MessagePack or Protobuf, and what should you consider?**
> Only if profiling shows JSON is a bottleneck; consider both performance and non-performance factors.

Premature optimization has real maintenance costs. Run benchmarks with production-representative payloads: throughput (ops/sec), payload size, and latency under concurrency. Non-performance factors are often decisive: you can't just `curl` a binary endpoint, and Protobuf requires careful field numbering for schema evolution. New team members need to learn the binary format tools.

---

### Security Architecture

## Level 7 — Advanced & Expert

### HTTP/2 and HTTP/3

**Q: How does HTTP/2 multiplexing improve over HTTP/1.1?**
> HTTP/2 multiplexes streams over one TCP connection, allowing many requests to share the connection without blocking each other.

In HTTP/1.1 you can only have one in-flight request per connection. HTTP/2 assigns each request a stream ID so many requests share one TCP connection simultaneously. This eliminates the need to open multiple connections for parallel requests.

---

**Q: What limitation does HTTP/2 have and how does HTTP/3 improve it?**
> HTTP/2 doesn't completely eliminate head-of-line blocking — TCP-layer blocking occurs on packet loss. HTTP/3 on QUIC fixes this at the transport layer.

In HTTP/2, if one TCP packet is lost, the OS pauses delivery of all streams until it's retransmitted. HTTP/3 on QUIC implements independent streams in userspace over UDP, so a lost packet for stream 5 doesn't block stream 6. For networks with non-trivial packet loss (mobile, satellite), HTTP/3 meaningfully improves latency.

---

**Q: How do you enable HTTP/2 or HTTP/3 in `HttpClient` and what server configuration is needed?**
> Set `DefaultRequestVersion` and `DefaultVersionPolicy`; server negotiates via ALPN (HTTP/2) or `Alt-Svc` header (HTTP/3).

```csharp
// HTTP/2
var handler = new SocketsHttpHandler();
var client = new HttpClient(handler)
{
    DefaultRequestVersion = HttpVersion.Version20,
    DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrLower
};

// HTTP/3
client.DefaultRequestVersion = HttpVersion.Version30;
client.DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrLower;
```

The client negotiates HTTP/2 via ALPN in the TLS handshake — the server must support it and advertise `h2`. HTTP/3 requires the server to advertise via the `Alt-Svc` HTTP header pointing to a QUIC endpoint. In ASP.NET Core, enable both via `ListenOptions.Protocols` in `Program.cs`. `RequestVersionOrLower` means the client falls back gracefully if the server doesn't support the requested version; `RequestVersionOrHigher` throws if the server can't match.

---

### Advanced Socket Programming

### Distributed System Scenarios

**Q: How do you implement idempotency keys for financial POSTs, what should the server store, and how long?**
> Client generates UUID per operation in `Idempotency-Key` header; server stores key→response mapping for 24 hours.

The client generates the key once — typically a UUID — before the first attempt and includes it on every retry (`Idempotency-Key: <uuid>`). The server checks a durable store (Redis, database) before processing: if the key exists, return the cached response immediately. If not, process the request. The server maps the idempotency key to the response it generated. On duplicate requests with the same key, it returns the cached response. Store for long enough to cover your retry window plus clock skew — 24 hours is standard for payment APIs. The longer you store, the safer you are from duplicates, but the more storage you consume. 24 hours is a reasonable default that covers most retry patterns.

```csharp
// Client side: Generate once and include on all retries
var idempotencyKey = Guid.NewGuid().ToString();
var payment = new { Amount = 100m, AccountId = 42 };

HttpResponseMessage response = null;
for (int attempt = 0; attempt < 3; attempt++)
{
    var request = new HttpRequestMessage(HttpMethod.Post, "api/payments");
    request.Headers.Add("Idempotency-Key", idempotencyKey); // Same key on all attempts
    request.Content = JsonContent.Create(payment);
    
    try 
    {
        response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        break;
    }
    catch (HttpRequestException) when (attempt < 2)
    {
        // Retry with same idempotency key
    }
}

// Server side: Check and cache response by key
[HttpPost("payments")]
public async Task<IActionResult> CreatePayment(
    [FromBody] PaymentRequest req,
    [FromHeader(Name = "Idempotency-Key")] string key)
{
    // Atomic check-and-process
    var cached = await idempotencyStore.GetAsync(key); // Redis or DB
    if (cached != null)
        return Ok(JsonSerializer.Deserialize(cached)); // Return cached response
    
    var result = await processPayment(req);
    
    // Store response for 24 hours
    await idempotencyStore.SetAsync(key, JsonSerializer.Serialize(result), 
        expiry: TimeSpan.FromHours(24));
    
    return Ok(result);
}
```

---

**Q: What is the most important principle when implementing idempotency key handling?**
> Atomicity — process-and-store or return-cached with no gap for duplicates to slip through.

If there's a gap between checking for the key and storing the result, a duplicate request arriving during that gap could cause a double-charge. The check and store must be atomic — either both happen or neither does.

---

