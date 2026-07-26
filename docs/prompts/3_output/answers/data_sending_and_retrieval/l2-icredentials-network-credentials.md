# L2 — What is the `ICredentials` interface, and how do you supply network credentials (for example, basic auth or NTLM) to an HTTP request in .NET?

## Answer

### What is `ICredentials`?

`ICredentials` is an interface in `System.Net` that abstracts the concept of network authentication credentials. It exposes a single method:

```csharp
NetworkCredential? GetCredential(Uri uri, string authType);
```

Given a URI and an authentication scheme name (e.g., `"Basic"`, `"NTLM"`, `"Negotiate"`), the implementation returns a `NetworkCredential` (username + password + optional domain) appropriate for that combination.

Concrete implementations include:
- `NetworkCredential` — a simple username/password/domain credential.
- `CredentialCache` — stores multiple credentials keyed by URI + auth scheme, allowing per-host credential selection.

---

*Include short code examples in C#.*

### Supplying Credentials via `HttpClientHandler`

Credentials are set on `HttpClientHandler`, not on `HttpClient` directly. `HttpClientHandler` passes them to the underlying HTTP stack, which uses them during the authentication challenge/response cycle (WWW-Authenticate → Authorization).

#### Basic Authentication (Username + Password)

```csharp
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;

// Option A: Via HttpClientHandler (for NTLM/Negotiate/Digest — handler manages the challenge)
var handler = new HttpClientHandler
{
    Credentials = new NetworkCredential("alice", "s3cret")
};
var client = new HttpClient(handler) { BaseAddress = new Uri("https://api.example.com/") };

// Option B: Manual Basic Auth header (preferred for REST APIs that use token-style basic auth)
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes("alice:s3cret"));
client.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Basic", credentials);

HttpResponseMessage response = await client.GetAsync("protected/resource");
response.EnsureSuccessStatusCode();
```

#### NTLM Authentication

```csharp
var handler = new HttpClientHandler
{
    Credentials = new NetworkCredential("alice", "s3cret", "CORP")  // username, password, domain
};
var client = new HttpClient(handler) { BaseAddress = new Uri("https://intranet.corp.com/") };
```

#### Use Current Windows Identity (Negotiate / Kerberos / NTLM)

```csharp
var handler = new HttpClientHandler
{
    UseDefaultCredentials = true  // uses the identity of the running process
};
var client = new HttpClient(handler);
```

#### `CredentialCache` — Per-URI Credential Selection

```csharp
var cache = new CredentialCache();
cache.Add(new Uri("https://api.example.com/"),  "Basic",     new NetworkCredential("alice", "s3cret"));
cache.Add(new Uri("https://intranet.corp.com/"), "NTLM",      new NetworkCredential("bob",   "p@ss", "CORP"));

var handler = new HttpClientHandler { Credentials = cache };
var client = new HttpClient(handler);

// HttpClient automatically picks the correct credential for each host
await client.GetAsync("https://api.example.com/data");
await client.GetAsync("https://intranet.corp.com/reports");
```

### Authentication Flow

For schemes like NTLM and Digest, the HTTP stack performs a challenge–response exchange automatically when `Credentials` is set on the handler:

```
Client  →  GET /resource           (no auth header)
Server  ←  401 WWW-Authenticate: NTLM
Client  →  GET /resource + Authorization: NTLM <token1>
Server  ←  401 WWW-Authenticate: NTLM <token2>
Client  →  GET /resource + Authorization: NTLM <token3>
Server  ←  200 OK
```

For Basic auth added manually as a header (Option B above), no challenge cycle occurs — the header is sent on the first request.

### Key Points

- `ICredentials` / `NetworkCredential` are transport-level and work with schemes that use the `WWW-Authenticate` challenge–response cycle.
- For modern REST APIs using Bearer tokens (OAuth/JWT), inject the `Authorization: Bearer <token>` header directly rather than using `ICredentials`.
- `UseDefaultCredentials = true` is convenient for Windows-integrated auth (intranet scenarios) but must not be used for external APIs.
- `CredentialCache` is the right tool when one `HttpClient` instance must authenticate against multiple hosts with different schemes.
