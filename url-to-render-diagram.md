# URL Entry to First Render - Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant DNSResolver as DNS Resolver
    participant Network as TCP/Network
    participant Server as Web Server

    User->>Browser: Enter URL in address bar
    activate Browser
    
    Browser->>Browser: Parse URL & validate
    
    rect rgb(200, 220, 255)
        Note over Browser,DNSResolver: DNS Resolution Phase
        Browser->>DNSResolver: DNS Query (example.com)
        activate DNSResolver
        DNSResolver-->>Browser: IP Address (e.g., 93.184.216.34)
        deactivate DNSResolver
    end
    
    rect rgb(200, 255, 220)
        Note over Browser,Network: TCP Connection Phase
        Browser->>Network: TCP SYN packet
        activate Network
        Network->>Server: Forward SYN
        activate Server
        Server-->>Network: TCP SYN-ACK
        Network-->>Browser: TCP SYN-ACK
        Browser->>Network: TCP ACK
        Network->>Server: Forward ACK
        deactivate Network
    end
    
    rect rgb(255, 220, 200)
        Note over Browser,Server: TLS Handshake Phase (HTTPS)
        Browser->>Server: ClientHello (cipher suites, version)
        Server-->>Browser: ServerHello + Certificate
        Browser->>Browser: Verify certificate chain
        Browser->>Server: ClientKeyExchange + Finished
        Server-->>Browser: Finished
        Browser->>Browser: Establish secure session
    end
    
    rect rgb(255, 250, 200)
        Note over Browser,Server: HTTP Request Phase
        Browser->>Server: HTTP GET request<br/>(headers, user-agent, etc.)
        activate Server
    end
    
    rect rgb(220, 200, 255)
        Note over Browser,Server: Server Response Phase
        Server-->>Browser: HTTP 200 OK<br/>(HTML + headers + cookies)
        deactivate Server
    end
    
    rect rgb(200, 255, 200)
        Note over Browser: Parsing & Rendering Phase
        
        Browser->>Browser: Parse HTML (tokenization)
        Browser->>Browser: Build DOM tree
        
        Browser->>Browser: Parse CSS (inline + linked)
        Browser->>Browser: Build CSSOM tree
        
        Browser->>Browser: Merge DOM + CSSOM<br/>= Render tree
        
        Browser->>Browser: Layout (reflow)<br/>Calculate positions & sizes
        
        Browser->>Browser: Paint (rasterization)<br/>Convert to pixels
        
        Browser->>Browser: Composite layers
        
        Browser->>User: Display first render
    end
    
    deactivate Browser
```

## Phase Breakdown

### 1. **DNS Resolution** (50-300ms typical)
- Browser queries recursive resolver
- Resolver checks cache → queries root → TLD → authoritative nameserver
- Returns IP address for domain

### 2. **TCP Connection** (variable, usually <100ms)
- Three-way handshake: SYN → SYN-ACK → ACK
- Establishes reliable connection channel

### 3. **TLS Handshake** (50-300ms, HTTPS only)
- ClientHello → ServerHello + Certificate
- Certificate validation (chain verification)
- Key exchange and encryption setup
- Finished messages confirm secure session

### 4. **HTTP Request**
- Browser sends GET request with headers
- Includes Host, User-Agent, Accept, Cookies, etc.

### 5. **Server Response**
- HTTP status line (200 OK, 404, etc.)
- Response headers (Content-Type, Cache-Control, Set-Cookie, etc.)
- Response body (HTML document)

### 6. **Parsing & Rendering**
- **HTML Parsing**: Tokenize → Build DOM tree
- **CSS Parsing**: Parse stylesheets → Build CSSOM
- **Render Tree**: Combine DOM + CSSOM
- **Layout (Reflow)**: Calculate coordinates and dimensions
- **Paint**: Convert to pixels
- **Composite**: Layer composition
- **First Render**: Display to user

## Key Timing Notes

| Phase | Duration |
|-------|----------|
| DNS Resolution | 50-300ms |
| TCP Connection | 20-100ms |
| TLS Handshake | 50-300ms |
| HTTP Request/Response | 50-500ms (depends on server) |
| Parsing & Rendering | 100-1000ms+ (depends on complexity) |
| **Total (HTTP)** | **~200-900ms** |
| **Total (HTTPS)** | **~300-1200ms** |

