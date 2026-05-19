# Answers: Data Sending and Retrieval (HTTP / Networking)

---

## Level 1 — Definition & Basics

### HTTP Methods

**Q: What is the difference between GET, POST, PUT, PATCH, and DELETE? When should each be used?**
> **Bottom line:** Each method expresses intent — GET reads, POST creates, PUT replaces, PATCH updates partially, DELETE removes.

**Elaboration:** GET is safe and idempotent so it can be cached and bookmarked. POST creates a new resource and is neither safe nor idempotent. PUT replaces the entire resource at a known URI, while PATCH sends only the fields that changed — useful when the payload is large or you want to avoid race conditions on unrelated fields. DELETE removes the resource and is idempotent: calling it twice should return 404 the second time, not an error.

---

**Q: Why is GET considered a "safe" method but POST is not? What practical consequences does that have in browsers and caches?**
> **Bottom line:** "Safe" means the method has no side effects on the server, so intermediaries can freely cache, prefetch, and retry it.

**Elaboration:** Because GET is safe, browsers prefetch links, back buttons don't warn, and CDNs cache responses without asking. POST is not safe because it modifies state — submitting a form twice could create two orders. That's why browsers show the "resubmit?" dialog on back navigation for POST, and why proxies never cache POST responses by default.

---

**Q: What does idempotency mean, and which standard HTTP methods are idempotent? Why does it matter when designing APIs?**
> **Bottom line:** Idempotency means making the same request N times has the same effect as making it once.

**Elaboration:** GET, PUT, DELETE, HEAD, and OPTIONS are idempotent. POST and PATCH are not by default. This matters for reliability: if a network request times out and you don't know whether the server received it, you can safely retry an idempotent call. For POST, you need an explicit idempotency key strategy to get that same guarantee.

---

### Network Protocols

**Q: What is the difference between TCP and UDP? What guarantees does TCP provide that UDP does not?**
> **Bottom line:** TCP guarantees ordered, reliable delivery; UDP is fire-and-forget with lower overhead.

**Elaboration:** TCP does a three-way handshake, acknowledges packets, retransmits lost ones, and delivers data in order — all of which adds latency. UDP just sends datagrams and doesn't check if they arrive or arrive in order. You pick UDP when you care more about speed than completeness: live video, gaming, DNS lookups — where a slightly stale or dropped packet is better than waiting for a retransmit.

---

**Q: Where does HTTP sit in the OSI model, and what transport protocol does it rely on by default?**
> **Bottom line:** HTTP is an application-layer (Layer 7) protocol that rides on TCP at the transport layer (Layer 4).

**Elaboration:** HTTP/1.1 and HTTP/2 both use TCP; HTTP/3 switches to QUIC, which is UDP-based but adds its own reliability layer. Most web traffic you interact with daily is HTTP over TCP port 80 (or TLS on 443). The OSI stack below TCP handles IP routing, physical framing, and so on — HTTP doesn't care about those layers directly.

---

**Q: In one or two sentences, what is the purpose of DNS, and at which point in an HTTP request does it play a role?**
> **Bottom line:** DNS translates a human-readable hostname into an IP address, and it runs before the TCP connection is even opened.

**Elaboration:** When you make a request to `api.example.com`, the OS first checks its local DNS cache, then queries a resolver if the cache is cold. Only after an IP address is returned can the TCP handshake begin. Cold DNS lookups can add 20–100 ms to a first request, which is why DNS TTLs and connection reuse matter in high-performance systems.

---

### Serialization / Deserialization

**Q: What is serialization and why is it necessary when sending data over a network?**
> **Bottom line:** Serialization converts an in-memory object into a portable byte sequence so it can travel across a network or process boundary.

**Elaboration:** In-memory objects contain pointers and machine-specific layouts that are meaningless to another process or machine. Serialization produces a self-contained representation — JSON, Protobuf, XML — that the receiver can reconstruct into its own object graph. Without it you'd have no portable way to exchange structured data between different languages, runtimes, or machines.

---

**Q: What is the difference between binary serialization formats (e.g., Protocol Buffers, MessagePack) and text-based ones (JSON, XML)? What is the trade-off?**
> **Bottom line:** Binary formats are smaller and faster to parse; text formats are human-readable and easier to debug.

**Elaboration:** Protobuf can be 3–10x smaller than equivalent JSON and serializes/deserializes significantly faster because there's no string parsing. The cost is tooling friction: you can't just `curl` an endpoint and read the response. JSON wins for public APIs, browser consumption, and anything where a developer needs to inspect traffic in a proxy. Binary formats win inside a datacenter where bandwidth and CPU cost at scale.

---

## Level 2 — Core Concepts

### HTTP Request/Response Cycle

**Q: Walk me through everything that happens — from the moment a user types a URL into a browser to when the HTML is rendered.**
> **Bottom line:** DNS → TCP handshake → TLS handshake → HTTP request → server processes → HTTP response → browser parses and renders.

**Elaboration:** First the browser resolves the hostname via DNS (cached or queried). Then it opens a TCP connection — three packets for the handshake. If HTTPS, a TLS handshake follows (1–2 round trips, or 0-RTT on resumption). The browser sends the HTTP GET; the server processes it and streams back a response with headers and body. The browser parses HTML, discovers linked resources (CSS, JS, images), and fires sub-requests — often in parallel — before rendering the first frame.

---

**Q: What information lives in an HTTP request header vs. the request body? Give concrete examples.**
> **Bottom line:** Headers carry metadata about the request; the body carries the actual payload.

**Elaboration:** Headers include things like `Content-Type: application/json`, `Authorization: Bearer <token>`, `Accept-Encoding: gzip`, and `Host: api.example.com`. The body carries the data being sent — a JSON object for a POST, a file for an upload, form fields for a form submission. GET requests have no body by spec; DELETE typically doesn't either. Query parameters in the URL are a third slot for small, non-sensitive data.

---

**Q: How does HTTP keep-alive (persistent connections) work, and why was it introduced?**
> **Bottom line:** Keep-alive reuses the same TCP connection for multiple request/response pairs, eliminating the cost of repeated handshakes.

**Elaboration:** In HTTP/1.0 every request opened a new TCP (and TLS) connection — expensive at scale. Keep-alive, default in HTTP/1.1, keeps the socket open after a response so the next request skips the handshake overhead. The server signals timeout and max requests via `Keep-Alive` response headers. HTTP/2 takes this further with multiplexing — multiple requests fly over a single connection simultaneously.

---

### Status Codes

**Q: What is the difference between a 401 and a 403 response? How should a client behave differently for each?**
> **Bottom line:** 401 means "you're not authenticated"; 403 means "you're authenticated but not authorized."

**Elaboration:** On a 401 the client should prompt for credentials or refresh a token and retry — the issue is identity. On a 403 the client already identified itself successfully; it just doesn't have permission, and retrying with the same credentials won't help. A UI should show "please log in" for 401 and "you don't have access to this" for 403. Mixing them up leaks information or creates confusing UX.

---

**Q: When would a server legitimately return a 307 Temporary Redirect vs. a 301 Moved Permanently? What is the risk of using 301 in an API context?**
> **Bottom line:** Use 307 when the move is temporary and you must preserve the original HTTP method; 301 signals a permanent move that clients and caches will remember forever.

**Elaboration:** 307 guarantees the client re-sends the original method (POST stays POST) to the new URL, which 302 doesn't formally guarantee. The problem with 301 in an API context is that browsers and HTTP clients cache it aggressively — if you later want traffic to go back to the old URL, clients that already cached the redirect won't ask the server again. I've seen 301s cause outages when a temporary change got permanently cached.

---

**Q: A service you depend on starts returning 503. How do you decide whether to retry immediately, use exponential back-off, or surface the error to the user?**
> **Bottom line:** Retry with exponential back-off and jitter for transient overload; surface the error to the user if retries exceed a reasonable threshold.

**Elaboration:** A 503 means the server is temporarily unavailable, so an immediate single retry is reasonable. If it's still failing, exponential back-off with jitter avoids a retry storm across many clients. I'd set a max retry count (e.g., 3) and a total timeout budget that matches user expectations — usually under 10 seconds for a synchronous request. If all retries are exhausted, fail fast and show a degraded UI rather than hanging indefinitely.

---

### HttpClient Basics

**Q: How do you send a GET request using `HttpClient` in C# and read the response body as a string?**
> **Bottom line:** Call `GetStringAsync` for the simplest case, or `GetAsync` + `ReadAsStringAsync` when you need to inspect the response first.

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

**Q: What is the purpose of `HttpResponseMessage.EnsureSuccessStatusCode()`? What does it throw, and when would you prefer manual status-code checking?**
> **Bottom line:** It throws `HttpRequestException` if the status code is not 2xx — convenient shorthand, but too blunt when you need to handle specific codes differently.

**Elaboration:** `EnsureSuccessStatusCode` is fine for "anything other than success is a fatal error." But if your code should handle 404 as "not found, return null" or 409 as "conflict, retry with updated data," you need to check `response.StatusCode` manually and branch. Using `EnsureSuccessStatusCode` in those cases means you're catching an exception for control flow, which is messy.

---

## Level 3 — Practical Usage

### HttpClient with Various Payloads

**Q: Show how you would POST a JSON payload using `HttpClient`. What `Content-Type` header must be set, and how does `System.Text.Json` / `JsonContent` help?**
> **Bottom line:** Use `JsonContent.Create` — it serializes your object and sets `Content-Type: application/json` in one call.

```csharp
var payload = new { Name = "Alice", Age = 30 };

// .NET 5+ preferred approach
var response = await client.PostAsJsonAsync("https://api.example.com/users", payload);
response.EnsureSuccessStatusCode();

// Or manually with JsonContent
var content = JsonContent.Create(payload);
var response = await client.PostAsync("https://api.example.com/users", content);
```

**Elaboration:** Before `JsonContent`, you'd manually serialize to a string and wrap in `StringContent` with the content type — easy to forget the header. `PostAsJsonAsync` (from `System.Net.Http.Json`) handles all of that and uses `System.Text.Json` by default, which is significantly faster than `Newtonsoft.Json` for most payloads.

---

**Q: How would you send a multipart/form-data request (e.g., file upload) with `HttpClient`? Walk through the code.**
> **Bottom line:** Use `MultipartFormDataContent`, add `StreamContent` for the file and `StringContent` for any other fields, then POST it.

```csharp
await using var fileStream = File.OpenRead("/path/to/file.pdf");

var multipart = new MultipartFormDataContent();
multipart.Add(new StreamContent(fileStream), "file", "file.pdf");
multipart.Add(new StringContent("some-description"), "description");

var response = await client.PostAsync("https://api.example.com/upload", multipart);
response.EnsureSuccessStatusCode();
```

**Elaboration:** `MultipartFormDataContent` sets the `Content-Type: multipart/form-data; boundary=...` header automatically. Stream the file rather than reading it all into memory — especially important for large uploads. If the server requires a specific content-type per part (e.g., `application/pdf`), pass a `MediaTypeHeaderValue` into the `StreamContent` constructor.

---

**Q: When would you choose XML over JSON as a payload format in a .NET HTTP call? What classes does .NET provide to serialize/deserialize XML?**
> **Bottom line:** Choose XML when you're integrating with legacy SOAP services, regulated industries that mandate it, or systems where schema validation via XSD is required.

**Elaboration:** Most greenfield work uses JSON, but SOAP web services, EDI healthcare systems (HL7), and some banking APIs still speak XML. .NET provides `XmlSerializer` for attribute-driven mapping and `DataContractSerializer` for WCF-style contracts. `System.Xml.Linq` with `XDocument`/`XElement` is the friendlier option for building or parsing XML manually. I'd avoid XML as a new choice purely for preference — the verbosity and namespace complexity rarely pay off.

---

**Q: Why should you avoid creating a new `HttpClient` instance per request? What is the recommended pattern in ASP.NET Core and why?**
> **Bottom line:** Each new `HttpClient` allocates a socket that won't be released immediately, exhausting the port pool under load — use `IHttpClientFactory` instead.

**Elaboration:** `HttpClient` implements `IDisposable` but disposing it doesn't immediately close the underlying socket; the OS keeps it in `TIME_WAIT`. Under load, you run out of ephemeral ports. The fix in ASP.NET Core is `IHttpClientFactory`, which maintains a pool of `HttpMessageHandler` instances with configurable lifetimes, reusing connections efficiently. Named or typed clients let you also centralize base addresses, headers, and retry policies.

---

### Cancellation and Timeouts

**Q: How do you attach a `CancellationToken` to an `HttpClient` request, and what exception is thrown when it fires? How do you distinguish a user cancellation from a timeout?**
> **Bottom line:** Pass the token to `GetAsync`/`PostAsync`; both cancellation and timeout throw `OperationCanceledException`, but you can distinguish them by checking `cancellationToken.IsCancellationRequested`.

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

**Elaboration:** If the token you passed to `GetAsync` is the user's token (e.g., ASP.NET's `HttpContext.RequestAborted`), check `token.IsCancellationRequested` in the catch. If it's not requested, the cancellation came from `HttpClient.Timeout` firing internally. Linking both tokens with `CancellationTokenSource.CreateLinkedTokenSource` is common when you want both behaviors.

---

**Q: What is the difference between `HttpClient.Timeout` and a `CancellationTokenSource` timeout? Which takes precedence?**
> **Bottom line:** `HttpClient.Timeout` is a global default; a `CancellationTokenSource` timeout is per-request and takes precedence if it fires first.

**Elaboration:** `HttpClient.Timeout` applies to every request made by that client instance — it's a blanket fallback. A per-request `CancellationTokenSource` with its own timeout gives you finer control: a quick health check can have a 1s timeout while a report download gets 60s. Whichever token fires first wins. The thrown exception is `OperationCanceledException` in both cases, which is why the distinction technique above matters.

---

### TcpClient / UdpClient

**Q: Using `TcpClient`, how would you connect to a remote host, send a UTF-8 string message, and read the response?**
> **Bottom line:** Connect, get the `NetworkStream`, write bytes, then read into a buffer.

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

**Elaboration:** Real code should wrap this in a loop because TCP is a stream — a single `ReadAsync` may not return the full message. You'll need a framing protocol (length prefix, newline delimiter, etc.) to know when a message is complete. `TcpClient` is a thin wrapper over `Socket`; if you need performance-critical I/O, drop down to `Socket` with `SocketAsyncEventArgs`.

---

**Q: When would you choose `UdpClient` over `TcpClient`? Give a real-world use case where packet loss is acceptable.**
> **Bottom line:** Use UDP when low latency and throughput matter more than guaranteed delivery — real-time games, live video/audio, and telemetry are the canonical examples.

**Elaboration:** In a first-person shooter, sending a stale position update that arrives 200ms late is worse than dropping it — the client has already interpolated forward. DNS is another classic: a single small query/response fits in one datagram, and if it's lost you just retry. Log aggregation (syslog over UDP) also uses it intentionally: it's better to drop a log line than to block the application or overwhelm the log server.

---

### ICredentials

**Q: What is the `ICredentials` interface used for in .NET, and how does it relate to `NetworkCredential`? Give an example of passing credentials to an `HttpClientHandler`.**
> **Bottom line:** `ICredentials` is the abstraction for providing credentials to a request; `NetworkCredential` is the concrete username/password implementation you pass through it.

```csharp
var handler = new HttpClientHandler
{
    Credentials = new NetworkCredential("user", "pass")
};
var client = new HttpClient(handler);
```

**Elaboration:** `ICredentials` defines `GetCredential(Uri, string authType)` so different credentials can be returned for different URIs or auth schemes. `NetworkCredential` implements it for simple username/password or token scenarios. `CredentialCache` also implements `ICredentials` and lets you map multiple credentials to multiple URIs/schemes — useful when one client talks to several services with different auth requirements.

---

**Q: What is the difference between supplying `NetworkCredential` for Basic authentication vs. Windows/NTLM authentication?**
> **Bottom line:** With Basic, the credentials are base64-encoded and sent in the header directly; with NTLM, there's a multi-step challenge-response handshake that never sends the password over the wire.

**Elaboration:** Basic auth is trivially reversible — always use it over TLS. NTLM (and Kerberos/Negotiate) are Windows-integrated schemes where the client proves knowledge of the password via cryptographic challenge without transmitting it. `HttpClientHandler` handles the NTLM handshake automatically when you set `UseDefaultCredentials = true` or supply a `NetworkCredential`. Basic requires you to set `PreAuthenticate = true` or handle the 401 challenge manually.

---

## Level 4 — Common Pitfalls

### HttpClient Misuse

**Q: A developer creates a new `HttpClient` inside every controller action. The application works fine in dev but surfaces `SocketException` in production under load. What is happening, and how do you fix it?**
> **Bottom line:** Disposing `HttpClient` doesn't immediately close the underlying TCP socket, so under load you exhaust the OS ephemeral port pool.

**Elaboration:** Each `new HttpClient()` and subsequent disposal leaves a socket in `TIME_WAIT` for up to 240 seconds. Dev traffic is low, so you never hit the limit. Under production load you burn through all ~28,000 ephemeral ports and new connections fail with `SocketException`. Fix: inject `IHttpClientFactory` and call `CreateClient()` — it pools `HttpMessageHandler` instances and manages their lifetimes safely.

---

**Q: You registered `HttpClient` as a singleton but now notice stale DNS entries when a downstream service's IP changes. Why does this happen, and what is the correct fix?**
> **Bottom line:** A singleton `HttpClient` holds open connections indefinitely, never re-resolving DNS after the initial lookup.

**Elaboration:** The socket stays open for the lifetime of the process, so DNS TTL expirations are ignored. When the downstream service's IP rotates (load balancer, blue/green deploy, Kubernetes pod change), your client keeps routing to the old IP. The fix is `IHttpClientFactory` with `SocketsHttpHandler.PooledConnectionLifetime` set to something like 2 minutes — this forces periodic connection renewal so DNS is re-resolved.

---

### Serialization Edge Cases

**Q: A JSON payload arrives with extra fields your model does not define. What happens with `System.Text.Json` by default? How do you control this behavior?**
> **Bottom line:** By default `System.Text.Json` ignores unknown properties; you can make it throw instead via `JsonUnknownTypeHandling` or a custom converter.

**Elaboration:** The lenient default is usually what you want — it allows the API to add new fields without breaking old clients. If you're writing a strict validation layer and want to reject unknown fields, set `JsonSerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow` (.NET 8+) or use `[JsonExtensionData]` to capture extra fields for inspection rather than silently dropping them.

---

**Q: A `DateTime` field is serialized differently on two different servers (one UTC, one local). What subtle bugs can this cause, and how do you prevent them?**
> **Bottom line:** Mixing UTC and local time in serialized strings causes silent time shifts — always serialize as UTC with an explicit offset.

**Elaboration:** If one server serializes `2024-01-15T10:00:00` (no offset) in local Eastern time and another reads it as UTC, you get a 5-hour discrepancy. The fix is to always use `DateTimeOffset` instead of `DateTime` — it carries the offset in the serialized form (`2024-01-15T10:00:00-05:00`). Alternatively, enforce UTC everywhere with a custom `JsonConverter` that calls `.ToUniversalTime()` on write and sets `DateTimeKind.Utc` on read.

---

**Q: Why can circular object references cause problems during JSON serialization, and how do you handle them in `System.Text.Json`?**
> **Bottom line:** Circular references cause infinite recursion during serialization, crashing with a `JsonException` or stack overflow — handle them with `ReferenceHandler.Preserve` or by restructuring your model.

**Elaboration:** An `Order` that has a `Customer`, which has a list of `Orders`, will recurse forever. `System.Text.Json` throws `JsonException` before the stack overflows, which is better than `Newtonsoft`'s behavior. You can set `JsonSerializerOptions.ReferenceHandler = ReferenceHandler.Preserve` to emit `$id`/`$ref` markers, or `ReferenceHandler.IgnoreCycles` (.NET 6+) to break the cycle by writing `null`. I usually prefer fixing the domain model — use a DTO that doesn't have the cycle.

---

### Error and Retry

**Q: You retry an HTTP POST on failure without checking idempotency. What can go wrong? How do you make a POST retryable safely?**
> **Bottom line:** Retrying a non-idempotent POST can create duplicate records, double charges, or duplicate emails — add a client-generated idempotency key.

**Elaboration:** The server may have processed the first request successfully but the response was lost in transit. Your retry sends a second request the server treats as new. The standard fix is to include an `Idempotency-Key` header (a UUID generated once per logical operation) so the server can detect and deduplicate replays. The server stores the key and the response for long enough to cover your retry window — typically 24 hours for payment APIs.

---

**Q: What is "retry storm," and how does jitter in exponential back-off help prevent it?**
> **Bottom line:** A retry storm happens when all clients back off and then retry simultaneously — jitter randomizes the retry timing to spread the load.

**Elaboration:** Imagine 1,000 clients all get 503 at the same time, all wait exactly 2 seconds, and all hammer the server together again. The server, just recovering, gets hit by the same spike. With jitter you multiply the back-off delay by a random factor (e.g., `delay * random(0.5, 1.5)`), so retries are spread across several seconds. Libraries like Polly implement this pattern out of the box with decorrelated jitter.

---

### TLS / Security

**Q: A developer disables SSL certificate validation (`ServerCertificateCustomValidationCallback = (_, _, _, _) => true`) to fix a dev environment issue. What are the risks of this reaching production?**
> **Bottom line:** Disabling certificate validation makes every HTTPS call vulnerable to man-in-the-middle attacks — an attacker can intercept and read or modify all traffic.

**Elaboration:** TLS without certificate validation provides encryption but no authentication — you don't know who you're talking to. In a corporate network or cloud environment this can expose credentials, tokens, and sensitive payloads to any process that can intercept the traffic. The right fix in dev is to install a self-signed CA cert into the trust store or use a tool like `mkcert`. Add a CI check or code review rule that rejects this callback pattern outside test projects.

---

## Level 5 — Internals & Deep Mechanics

### HttpMessageHandler Pipeline

**Q: Explain the `HttpMessageHandler` / `DelegatingHandler` pipeline in .NET. How does a request travel through multiple handlers before reaching the network?**
> **Bottom line:** `DelegatingHandler` is a chain-of-responsibility pattern — each handler can inspect or modify the request/response, then calls the next handler in the chain until the innermost `HttpClientHandler` sends the actual HTTP request.

**Elaboration:** When `HttpClient.SendAsync` is called, it passes the request to the outermost handler. Each `DelegatingHandler` has a reference to `InnerHandler` and calls `base.SendAsync` to pass control along. The chain might be: logging handler → auth handler → retry handler → `HttpClientHandler` (network). The response bubbles back up through the same chain in reverse. `IHttpClientFactory` builds and manages these pipelines when you configure them in `AddHttpClient`.

---

**Q: How would you implement a custom `DelegatingHandler` that automatically adds a Bearer token to every outgoing request and refreshes the token on a 401 response?**
> **Bottom line:** Override `SendAsync`, add the token header, forward the request, and if you get a 401, refresh the token and retry once.

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

**Elaboration:** Be careful to clone the request if you need to replay it — `HttpRequestMessage` can only be sent once on some runtimes. Also avoid infinite loops by only retrying once, not on every 401. Register the handler via `services.AddHttpClient<MyClient>().AddHttpMessageHandler<AuthHandler>()`.

---

**Q: How would you use `HttpMessageHandler` to implement response caching at the client level? What cache-control headers should you respect?**
> **Bottom line:** Intercept in `SendAsync`, check your cache before forwarding, and on a miss store the response while respecting `Cache-Control: max-age`, `no-store`, and `no-cache` directives.

**Elaboration:** Check the response's `Cache-Control` header before caching: `no-store` means never cache, `no-cache` means revalidate with the server on each use (via `ETag`/`If-None-Match`), and `max-age` gives the TTL. A minimal implementation uses a `MemoryCache` keyed by the request URI and ignores POST/PUT. Full compliance also requires `Vary` header handling — different cached entries for different `Accept` or `Accept-Encoding` values. For most internal services a simple max-age cache is sufficient.

---

### Connection Pooling Internals

**Q: How does `SocketsHttpHandler` manage connection pooling? What does `PooledConnectionLifetime` do, and why is it important for DNS-aware pooling?**
> **Bottom line:** `SocketsHttpHandler` maintains a pool of connections per host, and `PooledConnectionLifetime` forces connections to be replaced after a set duration so DNS changes are picked up.

**Elaboration:** By default `PooledConnectionLifetime` is infinite, meaning connections live until the server closes them. If the server IP changes (pod restart, DNS rotation), your client keeps sending to the old address. Setting it to something like `TimeSpan.FromMinutes(2)` means the handler periodically creates fresh connections, re-resolving DNS in the process. This is the underlying mechanism `IHttpClientFactory` uses when you configure handler lifetimes — it recreates handlers on that interval.

---

**Q: What is the difference between `PooledConnectionIdleTimeout` and `PooledConnectionLifetime`? How would you tune them for a high-throughput microservice?**
> **Bottom line:** `IdleTimeout` evicts connections that haven't been used recently; `Lifetime` evicts connections based on age regardless of activity.

**Elaboration:** For a high-throughput service that constantly uses connections, `IdleTimeout` rarely triggers — connections are always busy. `Lifetime` is what you tune for DNS freshness, typically 1–5 minutes. For a service with bursty traffic, set `IdleTimeout` to something like 90 seconds to reclaim sockets during quiet periods. Setting both too low adds unnecessary handshake overhead; too high risks stale connections or port exhaustion on the server side.

---

### Socket-Level Mechanics

**Q: What is the TCP three-way handshake? At which point does `TcpClient.ConnectAsync` return to the caller?**
> **Bottom line:** SYN → SYN-ACK → ACK; `ConnectAsync` returns after the ACK is sent and the connection is fully established.

**Elaboration:** The client sends SYN, the server replies with SYN-ACK, and the client sends ACK. After that ACK is sent the client-side socket enters `ESTABLISHED` state, which is when `ConnectAsync` completes. No data has been exchanged yet — you still have a TLS handshake ahead if using HTTPS. The handshake typically takes one round-trip time (RTT), so a 50ms ping means a ~50ms TCP setup cost before your first byte of data.

---

**Q: What is the `TIME_WAIT` state in TCP, and why can it cause port exhaustion on a heavily used outbound connection source?**
> **Bottom line:** `TIME_WAIT` holds a connection's port reserved for up to 2×MSL (~240s) after close to absorb delayed packets — under high connection churn, this exhausts ephemeral ports.

**Elaboration:** The OS needs to ensure no late-arriving packets from the old connection are misattributed to a new one on the same port. Each closed outbound connection occupies an ephemeral port in `TIME_WAIT`. With ~28,000 ephemeral ports and connections closing at 100/sec, you run out in under 5 minutes. Solutions: reuse connections (keep-alive/pooling), enable `SO_REUSEADDR`/`SO_REUSEPORT`, or tune `tcp_fin_timeout` on Linux.

---

**Q: Explain how `Socket.SetSocketOption` with `SocketOptionName.ReuseAddress` or `SO_REUSEPORT` helps address port-exhaustion scenarios.**
> **Bottom line:** `SO_REUSEADDR` allows binding to a port still in `TIME_WAIT`; `SO_REUSEPORT` allows multiple sockets to bind to the same port for load distribution.

```csharp
var socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
socket.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
```

**Elaboration:** `SO_REUSEADDR` is primarily useful on server sockets so you can restart a server and immediately rebind without waiting out `TIME_WAIT`. For client-side port exhaustion, the real fix is connection pooling, not `REUSEADDR`. `SO_REUSEPORT` (Linux) is a different beast — it lets multiple processes/threads bind the same port so the kernel load-balances incoming connections across them, useful for multi-threaded servers. Use these carefully; misapplied they can cause packet routing surprises.

---

### ICredentials Deep Dive

**Q: How does `CredentialCache` differ from a single `NetworkCredential`? When would you need to supply different credentials per URI or authentication scheme?**
> **Bottom line:** `CredentialCache` maps (URI, auth-scheme) tuples to credentials — use it when one client talks to multiple endpoints with different credentials or when you need to respond correctly to different server auth challenges.

```csharp
var cache = new CredentialCache();
cache.Add(new Uri("https://api.service1.com"), "Basic",
    new NetworkCredential("user1", "pass1"));
cache.Add(new Uri("https://api.service2.com"), "NTLM",
    new NetworkCredential("domain\\user2", "pass2"));

var handler = new HttpClientHandler { Credentials = cache };
```

**Elaboration:** `HttpClientHandler` calls `GetCredential(uri, authType)` on whatever `ICredentials` you supply. With a single `NetworkCredential`, it returns the same credentials regardless of URI or scheme. `CredentialCache` lets the handler do the right thing automatically when a server advertises multiple auth schemes in a `WWW-Authenticate` header — it picks the most appropriate credential for the scheme the server selected.

---

## Level 6 — Trade-offs & Design Decisions

### Protocol and Transport Choices

**Q: You are building a real-time multiplayer game. Compare using raw UDP sockets, WebSockets over TCP, and HTTP long-polling. What are the trade-offs in latency, reliability, and implementation complexity?**
> **Bottom line:** Raw UDP is lowest latency but highest complexity; WebSockets are a solid middle ground; long-polling is too high-latency for real-time gameplay.

**Elaboration:** Raw UDP gives you sub-millisecond overhead and you control exactly what gets retransmitted, but you build your own reliability layer (sequence numbers, ACKs for critical messages, congestion control). WebSockets over TCP are much simpler and good enough for most games — you lose ~1 RTT on packet loss due to TCP's head-of-line blocking, but most games tolerate that. HTTP long-polling adds a full HTTP overhead per message cycle — fine for turn-based games, completely unsuitable for a 60fps shooter. In practice I'd start with WebSockets and only move to UDP + QUIC/custom protocol if profiling shows TCP's retransmit behavior is a real problem.

---

**Q: When would you choose gRPC (HTTP/2 + Protobuf) over REST + JSON? Consider payload size, streaming, and type safety.**
> **Bottom line:** Choose gRPC for internal service-to-service communication where you need strong typing, smaller payloads, and bidirectional streaming — use REST + JSON for public APIs or browser clients.

**Elaboration:** Protobuf payloads are typically 3–5x smaller and faster to serialize than JSON; the HTTP/2 transport adds multiplexing and header compression. The `.proto` contract acts as a strongly typed IDL — breaking changes are caught at compile time. The downsides are browser support (gRPC-Web is a workaround, not the real thing), harder debugging without tooling, and the overhead of maintaining `.proto` files. For a public API where clients are varied and human readability matters, REST wins.

---

**Q: A team proposes replacing synchronous HTTP calls between microservices with a message queue (e.g., RabbitMQ). What do you gain and what do you lose? When is each approach appropriate?**
> **Bottom line:** A message queue decouples services temporally and absorbs load spikes, but you lose synchronous response semantics and add operational complexity.

**Elaboration:** With HTTP you get an immediate response — easy to model as a function call. With a queue, the producer doesn't know when or if the consumer processed the message, so you need polling, callbacks, or a correlation ID pattern for request/reply. The gains are significant: the consumer can go down without the producer failing, and the queue buffers bursts the consumer can't handle in real time. I'd use HTTP for "I need the answer now" (lookups, reads, user-facing calls) and messaging for "fire and move on" (email sending, audit events, async workflows).

---

### HttpClient Design

**Q: Compare `IHttpClientFactory` typed clients, named clients, and a shared singleton `HttpClient`. Under what circumstances would you pick each?**
> **Bottom line:** Use typed clients for most cases — they give you a dedicated class with a pre-configured client; use named clients for multiple configurations of the same endpoint; use a singleton only for trivial tools or scripts.

**Elaboration:** Typed clients (a class that takes `HttpClient` in its constructor) are the most ergonomic: they encapsulate the URL, default headers, and retry policy, and the factory manages the underlying handler lifetime. Named clients work well when you need runtime selection — picking "slow-client" vs. "fast-client" based on context. A raw singleton `HttpClient` with `SocketsHttpHandler.PooledConnectionLifetime` set is acceptable in console apps or simple scenarios where DI isn't in play. Never use a new-per-request pattern in production.

---

**Q: You need to call 10 independent endpoints to build a response. How do you parallelise the calls safely with `HttpClient`? What are the risks and how do you cap concurrency?**
> **Bottom line:** Use `Task.WhenAll` for up to ~10 concurrent calls; add a `SemaphoreSlim` to cap concurrency if the fan-out is larger or the downstream service is fragile.

```csharp
// Uncapped fan-out for small N
var tasks = urls.Select(url => client.GetStringAsync(url));
string[] results = await Task.WhenAll(tasks);

// Capped concurrency
var semaphore = new SemaphoreSlim(5);
var tasks = urls.Select(async url => {
    await semaphore.WaitAsync();
    try { return await client.GetStringAsync(url); }
    finally { semaphore.Release(); }
});
```

**Elaboration:** `HttpClient` is thread-safe and handles connection pooling, so parallel calls are fine. The risk is thundering-herd against the downstream service — 100 simultaneous calls during a retry storm can take it down. A semaphore or `Parallel.ForEachAsync` with a `MaxDegreeOfParallelism` gives you a simple circuit breaker. Also propagate a shared `CancellationToken` so one failure can cancel the rest.

---

### Serialization Format Trade-offs

**Q: A high-throughput internal service currently uses JSON. A colleague suggests switching to MessagePack or Protobuf. What benchmarks would you run, and what non-performance factors (versioning, tooling, human readability) would influence the decision?**
> **Bottom line:** Benchmark payload size and serialization throughput under realistic load, but weigh the debugging and schema evolution costs before committing.

**Elaboration:** Run benchmarks with production-representative payloads: serialization/deserialization throughput (ops/sec), payload byte size, and end-to-end latency under concurrency. Non-performance factors are often decisive: binary formats require tooling to inspect traffic (no `curl` + readable output), schema evolution needs careful field numbering discipline, and onboarding new team members gets harder. I'd switch only if profiling shows JSON is a bottleneck — premature optimization of serialization format has real maintenance costs.

---

### Security Architecture

**Q: You need to call a third-party API that uses mutual TLS (mTLS). How does mTLS differ from one-way TLS, and how do you configure it in .NET's `HttpClientHandler`?**
> **Bottom line:** In mTLS both sides present certificates — not just the server — so the server can verify the client's identity; configure it by loading a client certificate into `HttpClientHandler.ClientCertificates`.

```csharp
var cert = X509Certificate2.CreateFromPemFile("client.crt", "client.key");
var handler = new HttpClientHandler();
handler.ClientCertificates.Add(cert);
var client = new HttpClient(handler);
```

**Elaboration:** Standard TLS only proves the server's identity to the client. mTLS adds a client certificate step to the TLS handshake, letting the server authenticate the caller at the transport layer — before any HTTP happens. This is common in zero-trust architectures and service meshes. Store the certificate securely (Azure Key Vault, AWS Certificate Manager) and rotate it — hardcoding it in config files is a security antipattern.

---

## Level 7 — Advanced & Expert

### HTTP/2 and HTTP/3

**Q: How does HTTP/2 multiplexing eliminate head-of-line blocking at the HTTP layer, and why does HTTP/3 (QUIC) still improve on this?**
> **Bottom line:** HTTP/2 multiplexes multiple streams over one TCP connection, eliminating HTTP-layer blocking — but TCP itself still causes head-of-line blocking on packet loss; HTTP/3 on QUIC fixes this at the transport layer.

**Elaboration:** In HTTP/1.1 you can only have one in-flight request per connection (pipelining was too buggy to use). HTTP/2 assigns each request a stream ID so many requests share one TCP connection without waiting for each other. The remaining problem: if one TCP packet is lost, the OS pauses delivery of all streams until it's retransmitted. QUIC implements independent streams in userspace over UDP, so a lost packet for stream 5 doesn't block stream 6. For networks with non-trivial packet loss (mobile, satellite), HTTP/3 meaningfully improves latency.

---

**Q: How do you enable HTTP/2 or HTTP/3 in a .NET `HttpClient`? What server-side configuration is required, and what happens if the server does not support it?**
> **Bottom line:** Set `HttpVersionPolicy` and configure `SocketsHttpHandler` — the client negotiates via ALPN and gracefully falls back if the server doesn't support the requested version.

```csharp
var handler = new SocketsHttpHandler();
var client = new HttpClient(handler)
{
    DefaultRequestVersion = HttpVersion.Version20,
    DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrLower
};

// For HTTP/3
client.DefaultRequestVersion = HttpVersion.Version30;
client.DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrLower;
```

**Elaboration:** HTTP/2 is negotiated via ALPN in the TLS handshake — the server must support it and advertise `h2`. HTTP/3 requires the server to advertise via the `Alt-Svc` HTTP header pointing to a QUIC endpoint. `RequestVersionOrLower` means the client falls back gracefully; `RequestVersionOrHigher` throws if the server can't match. Server-side in ASP.NET Core: enable via `ListenOptions.Protocols` in `Program.cs`.

---

**Q: What is stream prioritisation in HTTP/2, and in what type of application does it provide a measurable benefit?**
> **Bottom line:** Stream prioritisation lets clients hint that some responses (e.g., CSS blocking render) should be delivered before others (deferred analytics scripts) — it provides the most benefit in browser-facing applications with mixed critical and non-critical assets.

**Elaboration:** HTTP/2 defines a dependency tree with weights for each stream. A browser can tell the server "give CSS stream 3 priority over image stream 7." In practice, most servers implement prioritisation inconsistently and browsers have largely moved to fetch-priority hints at the HTML level. For API-to-API communication it rarely matters — all streams are equally critical. The measurable wins are in web page loading scenarios with a mix of render-blocking and lazy resources.

---

### Advanced Socket Programming

**Q: What are the performance differences between `Socket` in blocking mode, non-blocking mode, and async I/O (`SocketAsyncEventArgs`)? When would you drop down to `SocketAsyncEventArgs` instead of `TcpClient`?**
> **Bottom line:** Blocking mode ties up a thread per connection; non-blocking uses polling which wastes CPU; `SocketAsyncEventArgs` achieves high throughput with minimal allocations — use it when you need to handle tens of thousands of concurrent connections with predictable GC behavior.

**Elaboration:** `TcpClient` wraps `Socket` with `async`/`await` using `Task`-based APIs, which allocate a `Task` and related objects per operation. `SocketAsyncEventArgs` is a pre-.NET-async API that avoids those allocations by reusing event args objects from a pool — essential for a server handling 50k+ concurrent connections where GC pauses are a problem. For most services, `TcpClient` or `System.IO.Pipelines` is sufficient. Drop to `SocketAsyncEventArgs` only after profiling shows allocation pressure is the bottleneck.

---

**Q: Explain how `Span<byte>` and `Memory<byte>` can be used with `Socket.ReceiveAsync` overloads to reduce allocations in a high-throughput server.**
> **Bottom line:** `Span<byte>` and `Memory<byte>` let you receive directly into stack-allocated or pooled buffers instead of allocating a new `byte[]` per receive call.

```csharp
// Rent a buffer from the pool
byte[] buffer = ArrayPool<byte>.Shared.Rent(4096);
try
{
    int received = await socket.ReceiveAsync(buffer.AsMemory(0, 4096), SocketFlags.None);
    ProcessData(buffer.AsSpan(0, received));
}
finally { ArrayPool<byte>.Shared.Return(buffer); }
```

**Elaboration:** Before these APIs every `ReceiveAsync` call forced you to allocate a new `byte[]`, putting pressure on the GC. `Memory<byte>` is the heap-compatible form passed to async methods, while `Span<byte>` is stack-only and used for synchronous processing. `System.IO.Pipelines` builds on these primitives to give you backpressure-aware, zero-copy I/O — the preferred abstraction for writing high-performance socket servers in .NET today.

---

**Q: A service is receiving 200,000 UDP packets per second. You start dropping packets. Walk through the diagnostic steps — from checking OS socket buffer sizes (`SO_RCVBUF`) to application-level batching.**
> **Bottom line:** Start by checking OS socket receive buffer size, then verify the application is reading fast enough, then consider batching reads with `ReceiveMessageFrom` or reducing GC pressure.

**Elaboration:** First check `SO_RCVBUF` — the OS drops packets when the kernel buffer fills up. On Linux: `sysctl net.core.rmem_max` and `sysctl net.core.rmem_default`. Increase with `socket.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReceiveBuffer, 8 * 1024 * 1024)`. If the buffer is large but still dropping, the application isn't draining it fast enough — profile the processing path. Use `Socket.ReceiveMessageFromAsync` in a tight loop on a dedicated thread. At 200k pps, GC pauses from per-packet allocations can cause the thread to stall for milliseconds — move to `SocketAsyncEventArgs` with pre-allocated buffers. Finally, consider application-level batching: process N packets per loop iteration rather than one at a time.

---

### Distributed System Scenarios

**Q: Describe how you would implement an idempotency key pattern for a financial POST endpoint so that retries never double-charge a customer. What must the server store, and for how long?**
> **Bottom line:** The client generates a UUID per logical operation and sends it as a header; the server stores (key → response) in durable storage and replays the cached response on duplicate requests.

**Elaboration:** The client generates the key once — typically a UUID — before the first attempt and includes it on every retry (`Idempotency-Key: <uuid>`). The server checks a durable store (Redis, database) before processing: if the key exists, return the cached response immediately. If not, process and store the result atomically. Store for long enough to cover your retry window plus clock skew — 24 hours is standard for payment APIs. The key thing is atomicity: you must either process-and-store or return-cached with no gap where a duplicate could slip through.

---

**Q: You have a service mesh (e.g., Istio) handling retries and load balancing. Should the application still implement its own retry logic? What problems arise from retrying at both layers simultaneously?**
> **Bottom line:** Retrying at both layers multiplies the actual retry attempts and can overwhelm downstream services — be deliberate about which layer owns retry and configure them to cooperate.

**Elaboration:** If Istio retries a failed request 3 times and your application also retries 3 times, a single logical failure can generate up to 9 requests. For non-idempotent operations this is dangerous. The general principle: let the mesh handle infrastructure-level transient failures (connection reset, 503) and let the application handle business-level failures (optimistic concurrency conflicts, token refresh). Disable application retries for the same error classes the mesh handles, or set mesh retries to 1 and application retries to 0 and handle it in one place. Document the retry policy explicitly in your runbook.

---

**Q: Walk through how an HTTP request is affected by each of these in turn: DNS TTL expiry, TCP slow start, TLS handshake latency, and server-side queuing. How do keep-alive, connection pooling, and TLS session resumption each address one of these costs?**
> **Bottom line:** Each phase adds latency that compounds — keep-alive eliminates TCP/TLS setup costs on subsequent requests, connection pooling reuses established connections across requests, and TLS session resumption (0-RTT) reduces the handshake from 2 RTTs to near zero.

**Elaboration:** DNS TTL expiry means a cold request must wait for a DNS lookup (20–100ms) before even opening a socket. TCP slow start throttles throughput for the first few round trips until congestion window opens — less visible for small API payloads, significant for large responses. A full TLS 1.3 handshake is 1 RTT; TLS 1.2 was 2 RTTs; 0-RTT resumption with session tickets brings it to near-zero for known servers. Server-side queuing adds variable latency at peak load. Connection pooling addresses all TCP and TLS costs by keeping connections alive across requests — once the connection is established, subsequent requests skip DNS, handshake, and slow start entirely. The only unavoidable cost becomes server processing and one RTT of transmission time.
