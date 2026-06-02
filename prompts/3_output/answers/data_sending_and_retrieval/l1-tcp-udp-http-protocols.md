# L1 — What is the difference between network protocols such as TCP, UDP, and HTTP — how do they relate to each other and when would you choose one over another?

## Answer

These three protocols live at different layers of the networking stack and serve different purposes.

### The Layered View

```
Application Layer   →  HTTP, WebSocket, FTP, SMTP …
Transport Layer     →  TCP, UDP
Network Layer       →  IP
```

TCP and UDP operate at the **Transport layer** and run on top of IP. HTTP operates at the **Application layer** and runs on top of TCP (HTTP/1.1, HTTP/2) — or QUIC/UDP (HTTP/3).

---

### TCP (Transmission Control Protocol)
- **Connection-oriented**: establishes a connection via a three-way handshake (SYN → SYN-ACK → ACK) before any data is sent.
- **Reliable**: guarantees delivery, ordering, and integrity of packets. Lost packets are retransmitted automatically.
- **Flow and congestion control**: prevents overwhelming the receiver or the network.
- **Overhead**: higher latency due to handshaking and acknowledgment round-trips.
- **Use when**: data integrity is critical — web browsing, file transfers, email, databases, REST APIs.

### UDP (User Datagram Protocol)
- **Connectionless**: no handshake; packets (datagrams) are fired and forgotten.
- **Unreliable**: no delivery guarantee, no ordering, no duplicate protection.
- **Fast and low-overhead**: minimal header, no round-trips required.
- **Use when**: speed matters more than perfect delivery — real-time video/audio streaming, online gaming, DNS lookups, VoIP, live telemetry. Applications that need reliability can implement it themselves on top of UDP (as HTTP/3/QUIC does).

### HTTP (HyperText Transfer Protocol)
- **Application-layer protocol**: defines the format of requests and responses (headers, body, status codes, methods like GET/POST).
- **Built on TCP** (HTTP/1.1, HTTP/2): inherits TCP's reliability.
- **HTTP/3** uses QUIC, which is built on UDP but re-implements reliability at the QUIC layer to reduce latency.
- **Stateless**: each request/response pair is independent by default.
- **Use when**: building web APIs, fetching web pages, or any scenario where a structured request–response pattern with rich semantics (methods, status codes, headers) is needed.

### How They Relate

```
HTTP request  →  formatted as bytes  →  TCP segments  →  IP packets  →  physical network
```

HTTP doesn't know about packets; TCP doesn't know about methods or status codes; IP doesn't know about connections. Each layer adds its own header and hands the payload down.

### Choosing Between Them

| Scenario | Choice | Reason |
|----------|--------|--------|
| REST API / web page | HTTP over TCP | Reliability + rich semantics |
| File download | TCP (FTP/SFTP) | Must not lose bytes |
| Live video stream | UDP or QUIC | Latency more important than perfect delivery |
| Online multiplayer game | UDP | Low latency; occasional packet loss acceptable |
| DNS query | UDP | Small payload, single round-trip |
| Secure financial transaction | TCP (TLS) | Ordering and reliability mandatory |
