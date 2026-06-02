# L1 — How are HTTP response status codes grouped into classes (1xx–5xx), and what does each class indicate to the client?

## Answer

HTTP status codes are three-digit integers. The **first digit** defines the class (category) of the response. There are five classes:

| Class | Name | What it means to the client |
|---|---|---|
| **1xx** | Informational | The server has received the request and the client should continue sending (or wait). These are provisional responses — the final response comes later. Example: `100 Continue` tells the client it may send the request body after checking with the server first. |
| **2xx** | Success | The request was received, understood, and accepted. Example: `200 OK` (generic success), `201 Created` (resource created, `Location` header points to it), `204 No Content` (success but no body). |
| **3xx** | Redirection | Further action is needed to complete the request, usually following a `Location` header. Example: `301 Moved Permanently` (update bookmarks), `302 Found` (temporary redirect), `304 Not Modified` (use cached response). |
| **4xx** | Client Error | The request is malformed or cannot be fulfilled due to something the **client** did wrong. Example: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`. |
| **5xx** | Server Error | The server failed to fulfil a valid request due to an error on the **server** side. Example: `500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable`. |

### ASP.NET Core Context

ASP.NET Core maps these classes to specific helpers and attributes:

```csharp
// 2xx — success responses
return Ok(data);               // 200
return Created(uri, data);     // 201
return NoContent();            // 204

// 4xx — client errors
return BadRequest(problem);    // 400
return NotFound();             // 404
return Conflict();             // 409
return UnprocessableEntity();  // 422

// 5xx — usually thrown as exceptions and handled by middleware
throw new InvalidOperationException("Something went wrong"); // → 500 via exception handler
```

```csharp
// Reading the status class programmatically on the client side
var response = await httpClient.GetAsync("/api/resource");
int statusCode = (int)response.StatusCode;

bool isSuccess     = statusCode is >= 200 and < 300;
bool isClientError = statusCode is >= 400 and < 500;
bool isServerError = statusCode is >= 500 and < 600;

response.EnsureSuccessStatusCode(); // throws HttpRequestException if not 2xx
```

### Key Takeaways

- 1xx is rarely seen in typical REST APIs but is critical for protocols like WebSocket upgrades (`101 Switching Protocols`).
- 4xx errors should always be paired with a descriptive body (ideally a `ProblemDetails` payload per RFC 7807) so clients can self-diagnose.
- Never return a 2xx when the operation failed — monitoring and clients rely on the status class to determine retry behaviour and alerting.
