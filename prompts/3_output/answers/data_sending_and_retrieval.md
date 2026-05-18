# Model Answers: Data Sending and Retrieval (HTTP / Networking)

---

**Q: What is HTTP and what problem does it solve?**

> **Bottom line:** HTTP is an application-layer protocol for transferring hypermedia documents between clients and servers over the internet.

**Elaboration:** It defines a request/response cycle: a client sends a request with a method, URL, headers, and optional body; the server responds with a status code, headers, and optional body. HTTP abstracts the underlying TCP connection, making it straightforward to build web services without managing sockets directly.

---

**Q: What are the main HTTP request methods and what does each signify?**

> **Bottom line:** GET retrieves, POST creates, PUT replaces, PATCH partially updates, DELETE removes, HEAD retrieves headers only, OPTIONS describes capabilities.

**Elaboration:** The choice of verb carries semantic meaning — `GET` must be safe (no side effects) and idempotent; `PUT` is idempotent (same result if called multiple times); `POST` is neither. Using the correct verb makes APIs self-describing and allows caches and proxies to optimize correctly.

---

**Q: What is the difference between a safe and an idempotent HTTP method?**

> **Bottom line:** Safe means no observable side effects; idempotent means the result is the same regardless of how many times you call it.

**Elaboration:** GET and HEAD are both safe and idempotent. PUT and DELETE are idempotent but not safe. POST is neither. These properties determine whether clients can safely retry requests after a timeout — an idempotent method can be retried without risk of duplication.

---

**Q: What is the OSI model? Which layers matter most to application developers?**

> **Bottom line:** The OSI model is a 7-layer conceptual framework for network communication; application developers primarily work with layers 4 (Transport — TCP/UDP) and 7 (Application — HTTP, DNS).

**Elaboration:** Layers 1–3 handle physical transmission and routing — the OS and network hardware manage those. Layer 4 gives you TCP (reliable, ordered) vs. UDP (unreliable, fast). Layer 7 is where HTTP, WebSocket, gRPC, and DNS live — the protocols you call directly in application code.

---

**Q: What is the difference between TCP and UDP?**

> **Bottom line:** TCP is connection-oriented, reliable, and ordered; UDP is connectionless, unreliable, and faster — choose TCP when you need every byte delivered, UDP when you need low latency and can tolerate loss.

**Elaboration:** TCP's reliability comes from handshakes, acknowledgments, and retransmission — overhead that adds latency. UDP sends packets without checking delivery; the application handles loss if needed. Use UDP for video streaming, gaming, or DNS — scenarios where a stale packet is worse than a missing one, or where latency matters more than reliability.

---

**Q: How Serialization/Deserialization works?**

> **Bottom line:** Serialization converts an object into a format (JSON, XML, binary) for storage or transmission; deserialization reconstructs the object from that format.

**Elaboration:** In JSON serialization, each public property becomes a key-value pair in the JSON string. The deserializer reads that string and maps keys back to properties, converting types as needed. Mismatches — wrong types, missing required fields, name casing differences — cause errors that you must handle explicitly.

---

**Q: In C#, what is System.Text.Json and how does it differ from Newtonsoft.Json?**

> **Bottom line:** `System.Text.Json` is the built-in, allocation-efficient JSON library in .NET; `Newtonsoft.Json` is a richer, more flexible but heavier third-party library.

**Elaboration:** `System.Text.Json` is significantly faster and produces less GC pressure due to `Span<T>`-based parsing. It's the right default for new .NET projects. `Newtonsoft.Json` has more features out of the box — `JsonConverter`, dynamic deserialization, better handling of complex polymorphic hierarchies — and is still worth reaching for when those features are needed.

---

**Q: How do you send a GET request with HttpClient and read the response body as a string?**

> **Bottom line:** Call `GetStringAsync(url)` or `GetAsync(url)` then `ReadAsStringAsync()` on the content.

```csharp
string content = await _client.GetStringAsync("https://api.example.com/items");
```

---

**Q: How do you send a POST request with a JSON body using HttpClient?**

> **Bottom line:** Create `StringContent` or use `PostAsJsonAsync` (.NET 5+) with the object to serialize.

```csharp
var response = await _client.PostAsJsonAsync("https://api.example.com/items", new { Name = "Widget", Price = 9.99 });
response.EnsureSuccessStatusCode();
```

---

**Q: How do you send a PUT vs a PATCH request and what is the semantic difference?**

> **Bottom line:** PUT replaces the entire resource; PATCH applies a partial update — only the fields you include change.

```csharp
// PUT — replace entire resource
await _client.PutAsJsonAsync($"/items/{id}", fullItem);

// PATCH — partial update
var patch = new { Price = 12.99 };
var request = new HttpRequestMessage(HttpMethod.Patch, $"/items/{id}")
    { Content = JsonContent.Create(patch) };
await _client.SendAsync(request);
```

---

**Q: How do you send form-encoded data with HttpClient?**

> **Bottom line:** Use `FormUrlEncodedContent` with a dictionary of key-value pairs.

```csharp
var content = new FormUrlEncodedContent(new Dictionary<string, string>
{
    ["username"] = "alice",
    ["password"] = "s3cr3t"
});
await _client.PostAsync("/login", content);
```

---

**Q: How do you send a multipart/form-data request (file upload) with HttpClient?**

> **Bottom line:** Use `MultipartFormDataContent`, add a `StreamContent` for the file and any other form fields.

```csharp
using var form = new MultipartFormDataContent();
using var fileStream = File.OpenRead("photo.jpg");
form.Add(new StreamContent(fileStream), "file", "photo.jpg");
form.Add(new StringContent("My Photo"), "description");
await _client.PostAsync("/upload", form);
```

---

**Q: What is HttpMessageHandler and how does the HttpClient pipeline work?**

> **Bottom line:** `HttpClient` delegates all HTTP work to an `HttpMessageHandler` chain; each handler can inspect, modify, or short-circuit the request/response before passing to the next.

**Elaboration:** The outermost handler is usually a `DelegatingHandler` (e.g., for auth, logging, retry). The innermost is `HttpClientHandler` (or `SocketsHttpHandler`), which actually opens the TCP connection. This chain is the `HttpClient` equivalent of ASP.NET Core middleware — composable and testable.

---

**Q: How would you use a custom DelegatingHandler to add an auth token to every outgoing request?**

> **Bottom line:** Override `SendAsync`, add the `Authorization` header, then call `base.SendAsync` to pass the request down the chain.

```csharp
public class AuthHandler : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", GetToken());
        return await base.SendAsync(request, ct);
    }
}
```

---

**Q: What is the ICredentials interface and when would you use it?**

> **Bottom line:** `ICredentials` is a standard abstraction for supplying network credentials (username/password) to protocols that support challenge-response authentication like NTLM or Basic auth via `HttpClientHandler`.

**Elaboration:** You set `HttpClientHandler.Credentials` to a `NetworkCredential` or `CredentialCache`. This is most useful for intranet scenarios where Windows-integrated authentication (NTLM/Kerberos) is negotiated automatically. For modern APIs, a `DelegatingHandler` with a Bearer token is the more common approach.

---

**Q: What is a Socket in .NET and when would you use it instead of HttpClient?**

> **Bottom line:** A `Socket` is a low-level endpoint for network communication — use it when you need a custom protocol, raw TCP/UDP control, or performance that HTTP abstractions cannot provide.

**Elaboration:** `HttpClient` is appropriate for 99% of API calls. Reach for `Socket` when you're implementing a custom binary protocol, a game server, or a high-throughput data pipeline where HTTP overhead is measurable. `TcpClient`/`TcpListener` and `UdpClient` are friendlier wrappers that cover most remaining cases.

---

**Q: How do you create a simple TCP echo server using TcpListener and TcpClient?**

> **Bottom line:** `TcpListener` accepts incoming connections; for each connection get a `NetworkStream` and read/write bytes.

```csharp
var listener = new TcpListener(IPAddress.Any, 5000);
listener.Start();
while (true)
{
    var client = await listener.AcceptTcpClientAsync();
    _ = HandleClientAsync(client);
}

async Task HandleClientAsync(TcpClient client)
{
    using var stream = client.GetStream();
    var buffer = new byte[1024];
    int read;
    while ((read = await stream.ReadAsync(buffer)) > 0)
        await stream.WriteAsync(buffer.AsMemory(0, read)); // echo back
}
```

---

**Q: Why should HttpClient be reused rather than created per request?**

> **Bottom line:** Creating a new `HttpClient` per request exhausts socket handles because the underlying `HttpClientHandler` is not disposed immediately, causing socket exhaustion even after `Dispose()` is called.

**Elaboration:** TCP connections enter `TIME_WAIT` state after close; under load, creating hundreds of new `HttpClient` instances per second depletes ephemeral ports. The fix is a shared singleton `HttpClient` or, better, `IHttpClientFactory` which manages handler lifetimes and handles DNS refresh automatically.

---

**Q: What is the HttpClient DNS refresh problem and how does IHttpClientFactory solve it?**

> **Bottom line:** A long-lived `HttpClient` caches the DNS resolution and won't pick up IP changes; `IHttpClientFactory` rotates handlers on a configurable interval (default 2 minutes) to force fresh DNS lookups.

**Elaboration:** If a service's IP changes (e.g., blue/green deployment), a singleton `HttpClient` continues routing to the old IP until restarted. `IHttpClientFactory` keeps a pool of `HttpMessageHandler` instances and retires them periodically, creating new handlers that resolve DNS fresh.

---

**Q: When would you choose raw HttpClient vs typed client via IHttpClientFactory vs Refit?**

> **Bottom line:** Raw `HttpClient` for one-off calls; typed client for structured services with consistent base URLs and auth; Refit when you want an interface-driven HTTP client generated from annotations.

**Elaboration:** Typed clients give you a dedicated `HttpClient` instance per service with consistent configuration. Refit takes it further — you define an interface with attributes like `[Get("/items/{id}")]` and Refit generates the implementation. Refit wins on ergonomics for API clients you don't control; typed clients win when you need full control over request construction.

---

**Q: How do you implement retry logic with exponential backoff for HttpClient?**

> **Bottom line:** Use Microsoft's `Polly` (or .NET 8's built-in `ResiliencePipeline`) via `IHttpClientFactory.AddResilienceHandler` to add retry, circuit breaker, and timeout policies declaratively.

```csharp
builder.Services.AddHttpClient<MyService>()
    .AddResilienceHandler("default", b =>
    {
        b.AddRetry(new HttpRetryStrategyOptions { MaxRetryAttempts = 3, Delay = TimeSpan.FromSeconds(1) });
        b.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions());
    });
```
