# L3 — What is the difference between `[Consumes("application/json")]` and `[Produces("application/json")]`, and how does each affect routing and response serialization?

## Answer

## `[Consumes]` — Controls What the Action Accepts

`[Consumes]` restricts the `Content-Type` of the request body that an action will handle. It affects **routing and model binding**:

- **Routing:** When multiple action methods have the same route and HTTP verb but different `[Consumes]` values, ASP.NET Core uses the `Content-Type` header as an additional discriminator during action selection — this is called **media type routing** or **action constraint**.
- **Model binding:** If the incoming `Content-Type` does not match any declared value, ASP.NET Core returns `415 Unsupported Media Type` before the action body even executes.

```csharp
[HttpPost("orders")]
[Consumes("application/json")]
public IActionResult CreateFromJson([FromBody] OrderDto order)
    => CreatedAtAction(nameof(Get), new { id = order.Id }, order);

[HttpPost("orders")]
[Consumes("application/xml")]
public IActionResult CreateFromXml([FromBody] OrderDto order)
    => CreatedAtAction(nameof(Get), new { id = order.Id }, order);
// → two actions on the same route, disambiguated by Content-Type
```

```
POST /api/orders  Content-Type: application/json  → first action
POST /api/orders  Content-Type: application/xml   → second action
POST /api/orders  Content-Type: text/csv          → 415 Unsupported Media Type
```

## `[Produces]` — Controls What the Action Returns

`[Produces]` declares the content types an action can return. It affects **content negotiation and response serialization**:

- **Content negotiation:** It restricts the output formatters considered during negotiation to only those that support the declared media types. The `Accept` header is still read but filtered against this constraint.
- **API documentation:** Swagger/OpenAPI generators use `[Produces]` to document the possible response media types.
- **Does not affect routing** — it has no influence on which action is selected.

```csharp
[HttpGet("orders/{id}")]
[Produces("application/json")]          // always JSON, regardless of Accept header
[ProducesResponseType<OrderDto>(200)]
[ProducesResponseType(404)]
public IActionResult Get(int id)
{
    var order = _service.Find(id);
    return order is null ? NotFound() : Ok(order);
}
```

```
GET /api/orders/1  Accept: application/xml
→ 200  Content-Type: application/json   (Accept: application/xml is ignored)
```

If you want to return `406 Not Acceptable` when the client requests an unsupported type:

```csharp
builder.Services.AddControllers(options =>
{
    options.ReturnHttpNotAcceptable = true;
});
```

## Side-by-Side Comparison

| Aspect | `[Consumes]` | `[Produces]` |
|---|---|---|
| Targets | Request `Content-Type` | Response `Accept` / `Content-Type` |
| Affects routing | Yes (action constraint) | No |
| Affects model binding | Yes (selects input formatter) | No |
| Affects output serialization | No | Yes (restricts output formatters) |
| Wrong value → | `415 Unsupported Media Type` | `406 Not Acceptable` (if `ReturnHttpNotAcceptable = true`) |

## Combined Example

```csharp
[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    [HttpPost]
    [Consumes("application/json")]      // only accept JSON bodies
    [Produces("application/json")]      // only ever return JSON
    public IActionResult Generate([FromBody] ReportRequest request)
    {
        var report = _service.Generate(request);
        return Ok(report);
    }
}
```

## Key Takeaways

- `[Consumes]` gates the **input** — it's about what the server will read.
- `[Produces]` gates the **output** — it's about what the server will write.
- `[Consumes]` participates in action selection; `[Produces]` does not.
- Using both together gives tight, explicit control over the API contract and is recommended for public APIs.
