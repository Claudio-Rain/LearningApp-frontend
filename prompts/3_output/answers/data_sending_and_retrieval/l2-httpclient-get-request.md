# L2 L1 — How do you use `HttpClient` to send a GET request to a given URI and read the response body?

## Answer

`HttpClient` is the standard .NET class for sending HTTP requests. For GET requests, it provides several helper methods depending on how you want to read the response body.

### Core Steps

1. Create (or inject) an `HttpClient` instance.
2. Call one of the GET methods with the target URI.
3. Await the response and read the body.
4. Dispose or reuse the client (prefer `IHttpClientFactory` to avoid socket exhaustion).

### Important: Lifetime Management

Do **not** create a new `HttpClient` per request — this exhausts sockets. In production, use:
- `IHttpClientFactory` (preferred in ASP.NET Core / .NET)
- A single static/singleton `HttpClient` instance (acceptable in simple console apps)

---

*Include short code examples in C#.*

```csharp
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

// -------------------------------------------------------
// Option 1: Read response as a string
// -------------------------------------------------------
var client = new HttpClient();

string body = await client.GetStringAsync("https://api.example.com/users/1");
Console.WriteLine(body); // raw JSON/HTML/text

// -------------------------------------------------------
// Option 2: Deserialize JSON directly (recommended for APIs)
// -------------------------------------------------------
User? user = await client.GetFromJsonAsync<User>("https://api.example.com/users/1");

// -------------------------------------------------------
// Option 3: Full control — read status code and headers too
// -------------------------------------------------------
HttpResponseMessage response = await client.GetAsync("https://api.example.com/users/1");

response.EnsureSuccessStatusCode(); // throws HttpRequestException if 4xx/5xx

string content = await response.Content.ReadAsStringAsync();
Console.WriteLine($"Status: {response.StatusCode}");
Console.WriteLine($"Body: {content}");

// -------------------------------------------------------
// Option 4: Read as stream (efficient for large responses)
// -------------------------------------------------------
using Stream stream = await client.GetStreamAsync("https://api.example.com/data");
// process stream ...

// -------------------------------------------------------
// Model
// -------------------------------------------------------
public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
}
```

### Using `IHttpClientFactory` (production pattern)

```csharp
// Program.cs (ASP.NET Core)
builder.Services.AddHttpClient<UserService>(client =>
{
    client.BaseAddress = new Uri("https://api.example.com/");
});

// UserService.cs
public class UserService(HttpClient client)
{
    public Task<User?> GetUserAsync(int id) =>
        client.GetFromJsonAsync<User>($"users/{id}");
}
```

### Key Methods Summary

| Method | Returns | Notes |
|--------|---------|-------|
| `GetStringAsync` | `Task<string>` | Simplest; no status code check |
| `GetFromJsonAsync<T>` | `Task<T?>` | Deserializes JSON directly |
| `GetAsync` | `Task<HttpResponseMessage>` | Full control over response |
| `GetStreamAsync` | `Task<Stream>` | Memory-efficient for large payloads |
| `GetByteArrayAsync` | `Task<byte[]>` | Binary downloads |
