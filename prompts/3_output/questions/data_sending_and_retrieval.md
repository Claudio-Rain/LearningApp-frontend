# Interview Questions: Data Sending and Retrieval (HTTP / Networking)

## Coverage map

| Item | Type | Level |
|------|------|-------|
| HTTP request methods (GET, POST, PUT, PATCH, DELETE) | FROM JD | 1–3 |
| Network protocols overview (TCP, UDP, HTTP, HTTPS) | FROM JD | 1–3 |
| Serialization / Deserialization concepts | FROM JD | 1–4 |
| HttpClient — GET/POST/PUT/PATCH requests | FROM JD | 2–4 |
| HttpClient with different payloads (JSON, XML, form data) | FROM JD | 3–4 |
| HttpMessageHandler — authentication, caching, pipeline | FROM JD | 3–5 |
| ICredentials interface and network credential supply | FROM JD | 3–5 |
| Socket (TCP/UDP) low-level communication | FROM JD | 3–6 |
| TcpClient / TcpListener / UdpClient as higher-level alternatives | FROM JD | 3–5 |
| HTTP status codes and error handling | INFERRED | 2–4 |
| Connection pooling and HttpClient lifecycle | INFERRED | 4–6 |
| TLS/SSL and certificate validation | INFERRED | 4–6 |
| Idempotency and safe HTTP methods | INFERRED | 3–5 |
| Cancellation tokens and timeouts | INFERRED | 3–5 |
| Retry policies and transient fault handling | INFERRED | 4–6 |
| HTTP/2 and HTTP/3 — multiplexing, QUIC | INFERRED | 5–7 |
| WebSockets vs HTTP for real-time communication | INFERRED | 5–7 |
| REST vs gRPC vs GraphQL design trade-offs | INFERRED | 6–7 |

---

## Level 1 — Definition & Basics

_Goal: Confirm the candidate understands fundamental networking vocabulary and HTTP method semantics before writing any code._

### HTTP Methods

- ❓ What is the difference between GET, POST, PUT, PATCH, and DELETE? When should each be used? `[FROM JD]`
- ❓ Why is GET considered a "safe" method but POST is not? What practical consequences does that have in browsers and caches? `[INFERRED]`
- ❓ What does idempotency mean, and which standard HTTP methods are idempotent? Why does it matter when designing APIs? `[INFERRED]`

### Network Protocols

- ❓ What is the difference between TCP and UDP? What guarantees does TCP provide that UDP does not? `[FROM JD]`
- ❓ Where does HTTP sit in the OSI model, and what transport protocol does it rely on by default? `[INFERRED]`
- ❓ In one or two sentences, what is the purpose of DNS, and at which point in an HTTP request does it play a role? `[INFERRED]`

### Serialization / Deserialization

- ❓ What is serialization and why is it necessary when sending data over a network? `[FROM JD]`
- ❓ What is the difference between binary serialization formats (e.g., Protocol Buffers, MessagePack) and text-based ones (JSON, XML)? What is the trade-off? `[INFERRED]`

---

## Level 2 — Core Concepts

_Goal: Verify the candidate understands the HTTP request/response cycle, status codes, and can reason about client/server interaction._

### HTTP Request/Response Cycle

- ❓ Walk me through everything that happens — from the moment a user types a URL into a browser to when the HTML is rendered. `[INFERRED]`
- ❓ What information lives in an HTTP request header vs. the request body? Give concrete examples. `[INFERRED]`
- ❓ How does HTTP keep-alive (persistent connections) work, and why was it introduced? `[INFERRED]`

### Status Codes

- ❓ What is the difference between a 401 and a 403 response? How should a client behave differently for each? `[INFERRED]`
- ❓ When would a server legitimately return a 307 Temporary Redirect vs. a 301 Moved Permanently? What is the risk of using 301 in an API context? `[INFERRED]`
- ❓ A service you depend on starts returning 503. How do you decide whether to retry immediately, use exponential back-off, or surface the error to the user? `[INFERRED]`

### HttpClient Basics

- ❓ How do you send a GET request using `HttpClient` in C# and read the response body as a string? `[FROM JD]`
- ❓ What is the purpose of `HttpResponseMessage.EnsureSuccessStatusCode()`? What does it throw, and when would you prefer manual status-code checking? `[INFERRED]`

---

## Level 3 — Practical Usage

_Goal: Assess whether the candidate can write real, working networking code and handle common scenarios correctly._

### HttpClient with Various Payloads

- ❓ Show how you would POST a JSON payload using `HttpClient`. What `Content-Type` header must be set, and how does `System.Text.Json` / `JsonContent` help? `[FROM JD]`
- ❓ How would you send a multipart/form-data request (e.g., file upload) with `HttpClient`? Walk through the code. `[FROM JD]`
- ❓ When would you choose XML over JSON as a payload format in a .NET HTTP call? What classes does .NET provide to serialize/deserialize XML? `[FROM JD]`
- ❓ Why should you avoid creating a new `HttpClient` instance per request? What is the recommended pattern in ASP.NET Core and why? `[INFERRED]`

### Cancellation and Timeouts

- ❓ How do you attach a `CancellationToken` to an `HttpClient` request, and what exception is thrown when it fires? How do you distinguish a user cancellation from a timeout? `[INFERRED]`
- ❓ What is the difference between `HttpClient.Timeout` and a `CancellationTokenSource` timeout? Which takes precedence? `[INFERRED]`

### TcpClient / UdpClient

- ❓ Using `TcpClient`, how would you connect to a remote host, send a UTF-8 string message, and read the response? `[FROM JD]`
- ❓ When would you choose `UdpClient` over `TcpClient`? Give a real-world use case where packet loss is acceptable. `[FROM JD]`

### ICredentials

- ❓ What is the `ICredentials` interface used for in .NET, and how does it relate to `NetworkCredential`? Give an example of passing credentials to an `HttpClientHandler`. `[FROM JD]`
- ❓ What is the difference between supplying `NetworkCredential` for Basic authentication vs. Windows/NTLM authentication? `[FROM JD]`

---

## Level 4 — Common Pitfalls

_Goal: Surface battle-tested awareness of mistakes that cause production bugs, security holes, or performance degradation._

### HttpClient Misuse

- ❓ A developer creates a new `HttpClient` inside every controller action. The application works fine in dev but starts throwing `SocketException` in production under load. What is happening, and how do you fix it? `[INFERRED]`
- ❓ You registered `HttpClient` as a singleton but now notice stale DNS entries when a downstream service's IP changes. Why does this happen, and what is the correct fix? `[INFERRED]`

### Serialization Edge Cases

- ❓ A JSON payload arrives with extra fields your model does not define. What happens with `System.Text.Json` by default? How do you control this behavior? `[FROM JD]`
- ❓ A `DateTime` field is serialized differently on two different servers (one UTC, one local). What subtle bugs can this cause, and how do you prevent them? `[INFERRED]`
- ❓ Why can circular object references cause problems during JSON serialization, and how do you handle them in `System.Text.Json`? `[INFERRED]`

### Error and Retry

- ❓ You retry an HTTP POST on failure without checking idempotency. What can go wrong? How do you make a POST retryable safely? `[INFERRED]`
- ❓ What is "retry storm," and how does jitter in exponential back-off help prevent it? `[INFERRED]`

### TLS / Security

- ❓ A developer disables SSL certificate validation (`ServerCertificateCustomValidationCallback = (_, _, _, _) => true`) to fix a dev environment issue. What are the risks of this reaching production? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics

_Goal: Distinguish senior engineers who understand what happens under the hood from those who only use high-level APIs._

### HttpMessageHandler Pipeline

- ❓ Explain the `HttpMessageHandler` / `DelegatingHandler` pipeline in .NET. How does a request travel through multiple handlers before reaching the network? `[FROM JD]`
- ❓ How would you implement a custom `DelegatingHandler` that automatically adds a Bearer token to every outgoing request and refreshes the token on a 401 response? `[FROM JD]`
- ❓ How would you use `HttpMessageHandler` to implement response caching at the client level? What cache-control headers should you respect? `[FROM JD]`

### Connection Pooling Internals

- ❓ How does `SocketsHttpHandler` (the default in .NET Core 2.1+) manage connection pooling? What does `PooledConnectionLifetime` do, and why is it important for DNS-aware pooling? `[INFERRED]`
- ❓ What is the difference between `PooledConnectionIdleTimeout` and `PooledConnectionLifetime`? How would you tune them for a high-throughput microservice? `[INFERRED]`

### Socket-Level Mechanics

- ❓ What is the TCP three-way handshake? At which point does `TcpClient.ConnectAsync` return to the caller? `[FROM JD]`
- ❓ What is the `TIME_WAIT` state in TCP, and why can it cause port exhaustion on a heavily used outbound connection source? `[INFERRED]`
- ❓ Explain how `Socket.SetSocketOption` with `SocketOptionName.ReuseAddress` or `SO_REUSEPORT` helps address port-exhaustion scenarios. `[FROM JD]`

### ICredentials Deep Dive

- ❓ How does `CredentialCache` differ from a single `NetworkCredential`? When would you need to supply different credentials per URI or authentication scheme? `[FROM JD]`

---

## Level 6 — Trade-offs & Design Decisions

_Goal: Test architectural thinking and the ability to justify technology choices under real constraints._

### Protocol and Transport Choices

- ❓ You are building a real-time multiplayer game. Compare using raw UDP sockets, WebSockets over TCP, and HTTP long-polling. What are the trade-offs in latency, reliability, and implementation complexity? `[FROM JD]`
- ❓ When would you choose gRPC (HTTP/2 + Protobuf) over REST + JSON? Consider payload size, streaming, and type safety. `[INFERRED]`
- ❓ A team proposes replacing synchronous HTTP calls between microservices with a message queue (e.g., RabbitMQ). What do you gain and what do you lose? When is each approach appropriate? `[INFERRED]`

### HttpClient Design

- ❓ Compare `IHttpClientFactory` typed clients, named clients, and a shared singleton `HttpClient`. Under what circumstances would you pick each? `[INFERRED]`
- ❓ You need to call 10 independent endpoints to build a response. How do you parallelise the calls safely with `HttpClient`? What are the risks and how do you cap concurrency? `[INFERRED]`

### Serialization Format Trade-offs

- ❓ A high-throughput internal service currently uses JSON. A colleague suggests switching to MessagePack or Protobuf. What benchmarks would you run, and what non-performance factors (versioning, tooling, human readability) would influence the decision? `[INFERRED]`

### Security Architecture

- ❓ You need to call a third-party API that uses mutual TLS (mTLS). How does mTLS differ from one-way TLS, and how do you configure it in .NET's `HttpClientHandler`? `[INFERRED]`

---

## Level 7 — Advanced & Expert

_Goal: Probe deep understanding of cutting-edge protocols, OS-level networking, and large-scale distributed system implications._

### HTTP/2 and HTTP/3

- ❓ How does HTTP/2 multiplexing eliminate head-of-line blocking at the HTTP layer, and why does HTTP/3 (QUIC) still improve on this? `[INFERRED]`
- ❓ How do you enable HTTP/2 or HTTP/3 in a .NET `HttpClient`? What server-side configuration is required, and what happens if the server does not support it? `[INFERRED]`
- ❓ What is stream prioritisation in HTTP/2, and in what type of application (e.g., video streaming, API gateway) does it provide a measurable benefit? `[INFERRED]`

### Advanced Socket Programming

- ❓ What are the performance differences between `Socket` in blocking mode, non-blocking mode, and async I/O (`SocketAsyncEventArgs`)? When would you drop down to `SocketAsyncEventArgs` instead of `TcpClient`? `[FROM JD]`
- ❓ Explain how `Span<byte>` and `Memory<byte>` can be used with `Socket.ReceiveAsync` overloads to reduce allocations in a high-throughput server. `[INFERRED]`
- ❓ A service is receiving 200,000 UDP packets per second. You start dropping packets. Walk through the diagnostic steps — from checking OS socket buffer sizes (`SO_RCVBUF`) to application-level batching. `[FROM JD]`

### Distributed System Scenarios

- ❓ Describe how you would implement an idempotency key pattern for a financial POST endpoint so that retries never double-charge a customer. What must the server store, and for how long? `[INFERRED]`
- ❓ You have a service mesh (e.g., Istio) handling retries and load balancing. Should the application still implement its own retry logic? What problems arise from retrying at both layers simultaneously? `[INFERRED]`
- ❓ Walk through how an HTTP request is affected by each of these in turn: DNS TTL expiry, TCP slow start, TLS handshake latency, and server-side queuing. How do keep-alive, connection pooling, and TLS session resumption each address one of these costs? `[INFERRED]`
