# Interview Questions: Data Sending and Retrieval (HTTP / Networking)

## Coverage map

| Item | Type | Level |
|------|------|-------|
| Understanding of various HTTP request methods | Knowledge | Level 1 — Definition & Basics |
| Fundamentals of computer networking | Knowledge | Level 1 — Definition & Basics |
| Understanding the difference between network protocols (TCP, UDP, HTTP, etc.) | Knowledge | Level 2 — Core Concepts |
| How Serialization/Deserialization works? | Knowledge | Level 2 — Core Concepts |
| Uses HttpClient to send GET/POST/PUT/PATCH requests | Skill | Level 3 — Practical Usage |
| Uses HttpClient with different payloads (json/xml/etc.) | Skill | Level 3 — Practical Usage |
| Works with HttpMessageHandler | Skill | Level 3 — Practical Usage |
| Works with ICredentials interface | Skill | Level 3 — Practical Usage |
| Works with Socket, TcpClient, TcpListener, UdpClient | Skill | Level 3 — Practical Usage |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate knows what HTTP is and the vocabulary of networked communication._

### HTTP Basics
- ❓ What is HTTP and what problem does it solve? `[INFERRED]`
- ❓ What are the main HTTP request methods (verbs) and what does each one signify? `[FROM JD]`
- ❓ What is the difference between a safe and an idempotent HTTP method? Which methods are both? `[INFERRED]`
- ❓ What is the difference between HTTP/1.1 and HTTP/2 at a high level? `[INFERRED]`

### Networking Basics
- ❓ What is the OSI model? Which layers are most relevant for an application developer? `[FROM JD]`
- ❓ What is an IP address and a port? How do they combine to identify a network endpoint? `[FROM JD]`

---

## Level 2 — Core Concepts
_Goal: Test understanding of protocols and serialization._

### Protocol Differences
- ❓ What is the difference between TCP and UDP? When would you choose one over the other? `[FROM JD]`
- ❓ Where does HTTP sit in the protocol stack relative to TCP? `[FROM JD]`
- ❓ What is TLS/HTTPS and how does it layer onto HTTP? `[INFERRED]`
- ❓ What is WebSocket and how does it differ from a regular HTTP request/response cycle? `[INFERRED]`

### Serialization
- ❓ What is serialization? What is the difference between JSON and XML serialization? `[FROM JD]`
- ❓ In C#, what is `System.Text.Json` and how does it differ from `Newtonsoft.Json`? `[INFERRED]`
- ❓ What does it mean for a type to be serializable? What members are excluded by default in JSON serialization? `[INFERRED]`
- ❓ What is the role of DTOs (Data Transfer Objects) in a serialization context? `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Test ability to write real networking code in C#._

### HttpClient
- ❓ How do you send a GET request with `HttpClient` and read the response body as a string? `[FROM JD]`
- ❓ How do you send a POST request with a JSON body using `HttpClient`? `[FROM JD]`
- ❓ How do you send a PUT vs. a PATCH request, and what is the semantic difference between them? `[FROM JD]`
- ❓ How do you deserialize an HTTP JSON response directly into a C# object? `[INFERRED]`

### Payloads and Content
- ❓ How do you send form-encoded data (`application/x-www-form-urlencoded`) with `HttpClient`? `[FROM JD]`
- ❓ How do you send a multipart/form-data request (e.g., file upload) with `HttpClient`? `[FROM JD]`
- ❓ How do you send XML as the request body? `[FROM JD]`

### HttpMessageHandler
- ❓ What is `HttpMessageHandler` and how does the `HttpClient` pipeline work? `[FROM JD]`
- ❓ How would you use a custom `DelegatingHandler` to add an auth token to every outgoing request? `[FROM JD]`
- ❓ How would you use a `DelegatingHandler` to implement request caching? `[FROM JD]`

### Credentials
- ❓ What is the `ICredentials` interface and when would you use it over a custom `DelegatingHandler`? `[FROM JD]`
- ❓ How do you configure `NetworkCredential` for basic authentication with `HttpClient`? `[FROM JD]`

### Sockets
- ❓ What is a `Socket` in .NET and when would you use it instead of `HttpClient`? `[FROM JD]`
- ❓ How do you create a simple TCP echo server using `TcpListener` and `TcpClient`? `[FROM JD]`
- ❓ When would you use `UdpClient` and what limitations does UDP impose on your application? `[FROM JD]`

---

## Level 4 — Common Pitfalls
_Goal: Expose common mistakes when using HttpClient and networking primitives._

### HttpClient Misuse
- ❓ Why should `HttpClient` be reused (singleton or `IHttpClientFactory`) rather than created per request? What problem does creating it per request cause? `[INFERRED]`
- ❓ What is socket exhaustion and how does `HttpClient` contribute to it when misused? `[INFERRED]`
- ❓ What is the `HttpClient` DNS refresh problem when using a long-lived instance, and how do `IHttpClientFactory` or `SocketsHttpHandler` solve it? `[INFERRED]`
- ❓ A developer forgets to dispose `HttpResponseMessage`. What resources leak? `[INFERRED]`

### Serialization Issues
- ❓ What happens when you serialize a circular reference object graph to JSON? How do you handle it? `[INFERRED]`
- ❓ What is a common mistake when deserializing JSON with camelCase properties into a C# class with PascalCase properties? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Test understanding of how HTTP and sockets work under the hood._

### TCP/IP Internals
- ❓ What is the TCP three-way handshake? What happens during connection teardown? `[INFERRED]`
- ❓ What is HTTP keep-alive (persistent connections) and how does it reduce latency? `[INFERRED]`
- ❓ What is connection pooling in `HttpClient` and how does `SocketsHttpHandler` manage it? `[INFERRED]`

### Serialization Internals
- ❓ How does `System.Text.Json` use source generation to improve serialization performance? `[INFERRED]`
- ❓ What is the cost of reflection-based serialization vs. source-generated serialization? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate architectural judgment around networking._

### Design Choices
- ❓ When would you use raw `HttpClient` vs. a typed client via `IHttpClientFactory` vs. a library like `Refit`? `[INFERRED]`
- ❓ REST vs. gRPC: what are the trade-offs? When would you choose gRPC over HTTP/JSON? `[INFERRED]`
- ❓ How do you decide between polling, long-polling, WebSockets, and SSE for real-time updates? `[INFERRED]`
- ❓ TCP vs. UDP: beyond the textbook answer, give a real-world example where you'd choose UDP despite its unreliability. `[FROM JD]`

---

## Level 7 — Advanced & Expert
_Goal: Architecture-level thinking about resilient networked systems._

### Resilience and Performance
- ❓ How would you implement retry logic with exponential backoff for `HttpClient` calls? What library helps with this in .NET? `[INFERRED]`
- ❓ What is the circuit breaker pattern and why is it essential in microservice HTTP communication? `[INFERRED]`
- ❓ How do you propagate distributed tracing context (e.g., W3C TraceContext headers) across HTTP calls? `[INFERRED]`
- ❓ What is HTTP/3 (QUIC) and what problem does it solve over HTTP/2? `[INFERRED]`
