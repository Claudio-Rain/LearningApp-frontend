# L3 — How do you use the `Socket` class to communicate over TCP or UDP at a low level — what steps are involved in establishing a connection, sending data, and closing the socket?

## Answer

`System.Net.Sockets.Socket` is the lowest-level networking API in .NET. It maps closely to BSD/POSIX sockets and gives full control over the transport and network layers.

---

### TCP Socket Steps

**Server side:**
1. Create a socket (`AddressFamily.InterNetwork`, `SocketType.Stream`, `ProtocolType.Tcp`).
2. Bind to a local endpoint (IP + port).
3. Call `Listen(backlog)` to start accepting connections.
4. Call `Accept()` to get a connected socket for each client.
5. Send and receive data.
6. Shutdown and close.

**Client side:**
1. Create a socket.
2. Call `Connect(remoteEndPoint)` — this triggers the TCP three-way handshake.
3. Send and receive data.
4. Shutdown and close.

---

*Include short code examples in C#.*

```csharp
using System.Net;
using System.Net.Sockets;
using System.Text;

// -------------------------------------------------------
// TCP Server (simplified, single client)
// -------------------------------------------------------
static async Task RunTcpServerAsync()
{
    using var serverSocket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);

    serverSocket.Bind(new IPEndPoint(IPAddress.Any, 5000));
    serverSocket.Listen(backlog: 10);

    Console.WriteLine("Server listening on port 5000...");

    using Socket clientSocket = await serverSocket.AcceptAsync();
    Console.WriteLine($"Client connected: {clientSocket.RemoteEndPoint}");

    // Receive
    byte[] buffer = new byte[1024];
    int received = await clientSocket.ReceiveAsync(buffer, SocketFlags.None);
    string message = Encoding.UTF8.GetString(buffer, 0, received);
    Console.WriteLine($"Received: {message}");

    // Send reply
    byte[] reply = Encoding.UTF8.GetBytes("Hello from server!");
    await clientSocket.SendAsync(reply, SocketFlags.None);

    // Graceful shutdown
    clientSocket.Shutdown(SocketShutdown.Both);
}  // using disposes and closes the socket

// -------------------------------------------------------
// TCP Client
// -------------------------------------------------------
static async Task RunTcpClientAsync()
{
    using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);

    await socket.ConnectAsync(new IPEndPoint(IPAddress.Loopback, 5000));
    Console.WriteLine("Connected to server.");

    // Send
    byte[] data = Encoding.UTF8.GetBytes("Hello from client!");
    await socket.SendAsync(data, SocketFlags.None);

    // Receive reply
    byte[] buffer = new byte[1024];
    int received = await socket.ReceiveAsync(buffer, SocketFlags.None);
    Console.WriteLine($"Server replied: {Encoding.UTF8.GetString(buffer, 0, received)}");

    socket.Shutdown(SocketShutdown.Both);
}
```

---

### UDP Socket Steps

UDP is connectionless — no handshake, no `Accept`. The server just waits for datagrams and the client sends them directly.

```csharp
// -------------------------------------------------------
// UDP Server (receiver)
// -------------------------------------------------------
static async Task RunUdpServerAsync()
{
    using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, ProtocolType.Udp);
    socket.Bind(new IPEndPoint(IPAddress.Any, 6000));

    byte[] buffer = new byte[1024];
    EndPoint sender = new IPEndPoint(IPAddress.Any, 0);

    SocketReceiveFromResult result = await socket.ReceiveFromAsync(buffer, SocketFlags.None, sender);
    string message = Encoding.UTF8.GetString(buffer, 0, result.ReceivedBytes);
    Console.WriteLine($"UDP received from {result.RemoteEndPoint}: {message}");
}

// -------------------------------------------------------
// UDP Client (sender)
// -------------------------------------------------------
static async Task RunUdpClientAsync()
{
    using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, ProtocolType.Udp);

    byte[] data = Encoding.UTF8.GetBytes("Hello UDP server!");
    var serverEndPoint = new IPEndPoint(IPAddress.Loopback, 6000);

    await socket.SendToAsync(data, SocketFlags.None, serverEndPoint);
}
```

---

### Lifecycle Summary

| Step | TCP | UDP |
|------|-----|-----|
| Create | `new Socket(Stream, Tcp)` | `new Socket(Dgram, Udp)` |
| Bind (server) | `Bind` → `Listen` → `Accept` | `Bind` only |
| Connect (client) | `Connect` (three-way handshake) | Optional (`Connect` just sets default remote endpoint) |
| Send | `Send` / `SendAsync` | `SendTo` / `SendToAsync` |
| Receive | `Receive` / `ReceiveAsync` | `ReceiveFrom` / `ReceiveFromAsync` |
| Close | `Shutdown` then `Close`/`Dispose` | `Close`/`Dispose` |

### Key Points

- Call `Shutdown(SocketShutdown.Both)` before `Close` for TCP to allow the remote side to receive all in-flight data (FIN exchange).
- `ReceiveAsync` on a TCP socket may return fewer bytes than expected — loop until you have the full message (TCP is a byte stream, not a message protocol).
- UDP has no delivery guarantee; use it when low latency matters more than reliability.
- Prefer `TcpClient`/`TcpListener` or `UdpClient` over raw `Socket` unless you need features they do not expose.
