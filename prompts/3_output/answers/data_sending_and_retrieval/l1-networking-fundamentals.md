# L1 — What are the fundamentals of computer networking — what is a socket, a port, an IP address, and how does data travel from one machine to another?

## Answer

### IP Address
An **IP address** is a numerical label assigned to every device on a network that identifies it uniquely within that network (like a postal address for a machine).

- **IPv4**: 32-bit, written as four decimal octets separated by dots — `192.168.1.10`.
- **IPv6**: 128-bit, written in hexadecimal groups — `2001:0db8::1`.
- Routers use the IP address to forward packets toward the correct destination machine.

### Port
A **port** is a 16-bit number (0–65535) that identifies a specific process or service on a machine. Where the IP address gets data to the right machine, the port gets it to the right application.

- Well-known ports: HTTP = 80, HTTPS = 443, DNS = 53, SSH = 22.
- When your browser opens `https://example.com`, it connects to the IP of `example.com` on port 443.
- The combination of IP + port is called an **endpoint**.

### Socket
A **socket** is a software abstraction that represents one end of a two-way communication link between two programs running on a network. It is identified by:

```
(Protocol, Local IP, Local Port, Remote IP, Remote Port)
```

A socket provides an API so that application code can send and receive bytes without worrying about how those bytes travel through the network. The OS manages the actual network I/O below the socket.

### How Data Travels from One Machine to Another

The journey of a single HTTP request illustrates the full stack:

1. **Application layer (HTTP)**: Your browser formats an HTTP GET request as text bytes.
2. **Transport layer (TCP)**: The OS wraps those bytes into one or more TCP **segments**, each containing source port, destination port, sequence number, and the payload. TCP splits large data into segments and tracks them for reliable delivery.
3. **Network layer (IP)**: Each TCP segment is wrapped in an IP **packet**, which adds source and destination IP addresses. Routers look at the IP header to forward the packet hop-by-hop toward the destination.
4. **Link layer (Ethernet/Wi-Fi)**: The packet is wrapped in a **frame** with MAC addresses for the next hop. This layer handles the physical transmission on the local network segment.
5. **Physical layer**: Bits are transmitted as electrical signals, light pulses (fiber), or radio waves (Wi-Fi).

On the receiving side, each layer unwraps its header and passes the payload up until the application receives the original HTTP bytes.

### Data Journey Summary

```
[Browser] → HTTP bytes
         → TCP segment (adds ports + seq numbers)
         → IP packet (adds IP addresses)
         → Ethernet frame (adds MAC addresses)
         → [Router 1] → ... → [Router N] → [Server]
         ← Response travels back the same way
```

### Key Takeaways
- **IP address** = which machine
- **Port** = which service on that machine
- **Socket** = the programming handle your app uses to read/write over the network
- **TCP/IP stack** = the layered system that routes, reliably delivers, and frames the data end-to-end
