# Interview Questions: Data Sending and Retrieval (HTTP / Networking)

## Level 1

### HTTP Fundamentals
- L1 What are the main HTTP request methods, and when would you use each one (GET, POST, PUT, PATCH, DELETE)? `[FROM JD]`
- L1 What is idempotency, which HTTP methods have it, and why does it matter for API design and retries?

### Networking Fundamentals
- L1 What is the difference between network protocols such as TCP, UDP, and HTTP, and when would you choose one over another? `[FROM JD]`
- L1 What are the fundamentals of computer networking — what is a socket, a port, an IP address, and how does data travel between machines? `[FROM JD]`

### Serialization
- L1 How does serialization and deserialization work, and what happens under the hood when you serialize an object to JSON or XML? `[FROM JD]`
- L1 Compare binary serialization formats (Protobuf, MessagePack) vs text-based formats (JSON, XML) — what are the trade-offs?

---

## Level 2

### HttpClient Usage
- L2 How do you use `HttpClient` to send GET, POST, PUT, and PATCH requests to a specified URI? `[FROM JD]`
- L2 How do you use `HttpClient` with different payload formats such as JSON or XML — how do you construct and send the request content? `[FROM JD]`
- L2 What does `EnsureSuccessStatusCode()` do and when should you prefer manual status code checking?
- L2 What is the difference between a 401 and a 403 status code, and how should a client respond to each?

### HttpClient Configuration
- L2 What is `HttpMessageHandler`, and how do you use it to configure cross-cutting concerns like authentication headers or response caching? `[FROM JD]`

### Authentication
- L2 What is the `ICredentials` interface, and how do you supply network credentials to an HTTP request in .NET? `[FROM JD]`

---

## Level 3

### HttpClient Practical Patterns
- L3 Why should you avoid creating a new `HttpClient` per request, and what is the recommended pattern (`IHttpClientFactory`)?
- L3 How do you attach a `CancellationToken` to `HttpClient`, and how do you distinguish a user cancellation from a timeout?
- L3 How do you send multipart/form-data (file uploads) with `HttpClient`?

### Low-Level Networking
- L3 How do you use `Socket`, `TcpClient`, `TcpListener`, and `UdpClient` to communicate over TCP or UDP — and when would you prefer these over `HttpClient`? `[FROM JD]`

---

## Level 4

### Pitfalls & Reliability
- L4 Why does a singleton `HttpClient` hold stale DNS entries and how do you fix it?
- L4 How do you implement retry logic with exponential backoff and jitter? What is a retry storm and how does jitter prevent it?
- L4 What is the risk of disabling SSL certificate validation and how should you handle self-signed certs in development?

---

## Level 5

### Internals
- L5 What is a `DelegatingHandler` and how do you implement one to add Bearer tokens and refresh on 401?
- L5 How does `IHttpClientFactory` manage `HttpMessageHandler` lifetimes, and why is `PooledConnectionLifetime` important for DNS freshness?
