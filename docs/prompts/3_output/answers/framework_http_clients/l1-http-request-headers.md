# L1 — What is an HTTP request header, and can you name five headers commonly seen in ASP.NET applications and what each one tells the server?

## Answer

An **HTTP request header** is a key-value pair sent by the client at the start of an HTTP message (before the body). Headers carry metadata about the request itself — who is sending it, what format the body is in, what formats the client can accept, authentication tokens, caching directives, and so on. The server reads these headers to decide how to process the request and how to format the response.

### Five Headers Common in ASP.NET Applications

| Header | What it tells the server |
|---|---|
| `Content-Type` | The media type (and optional charset/boundary) of the request body. E.g., `Content-Type: application/json; charset=utf-8` tells ASP.NET Core's model binder to deserialize the body as JSON. |
| `Accept` | The media types the client is willing to receive in the response. E.g., `Accept: application/json` drives ASP.NET Core's content negotiation to pick a JSON output formatter. |
| `Authorization` | Credentials for authenticating the request. The most common scheme in ASP.NET APIs is Bearer: `Authorization: Bearer <jwt-token>`. ASP.NET Core authentication middleware reads and validates this header. |
| `Content-Length` | The exact byte size of the request body. Kestrel and IIS use this to know when the body is fully received and to enforce size limits. |
| `X-Correlation-Id` / `X-Request-Id` | A custom (or semi-standard) header used to trace a request across microservices. ASP.NET Core middleware often reads this and stores it in `HttpContext.TraceIdentifier` or forwards it to downstream services. |

### Code Example

```csharp
// Reading headers inside a controller action
[HttpPost("upload")]
public IActionResult Upload()
{
    string? contentType  = Request.Headers["Content-Type"];
    string? accept       = Request.Headers["Accept"];
    string? correlationId = Request.Headers["X-Correlation-Id"];

    _logger.LogInformation("Content-Type={CT}, Accept={A}, CorrelationId={CID}",
        contentType, accept, correlationId);

    return Ok();
}
```

```csharp
// Adding headers to an outgoing HttpClient request
var request = new HttpRequestMessage(HttpMethod.Get, "/api/data");
request.Headers.Add("Accept", "application/json");
request.Headers.Add("X-Correlation-Id", Activity.Current?.Id ?? Guid.NewGuid().ToString());

var response = await _httpClient.SendAsync(request);
```

### Key Takeaways

- Headers are case-insensitive per the HTTP spec; ASP.NET Core normalises them internally.
- `Content-Type` describes the **request** body; `Accept` describes the **desired response** format — they are often confused.
- Custom headers typically follow the `X-` prefix convention (though RFC 6648 deprecated the requirement, the pattern is still widely used).
