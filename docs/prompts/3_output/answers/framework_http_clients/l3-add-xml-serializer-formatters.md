# L3 — What does `AddXmlSerializerFormatters()` do in `Program.cs`, and how does ASP.NET Core decide which formatter to use when a client sends `Accept: application/xml`?

## Answer

## What `AddXmlSerializerFormatters()` Does

By default, ASP.NET Core MVC registers only JSON formatters (`System.Text.Json`). Calling `AddXmlSerializerFormatters()` (or `AddXmlDataContractSerializerFormatters()`) adds XML support to both the **input formatter** list (for deserializing request bodies) and the **output formatter** list (for serializing responses).

```csharp
// Program.cs
builder.Services.AddControllers(options =>
{
    // Optional: honour the browser's complex Accept header
    options.RespectBrowserAcceptHeader = true;
})
.AddXmlSerializerFormatters();   // adds XmlSerializerInputFormatter + XmlSerializerOutputFormatter
// OR
// .AddXmlDataContractSerializerFormatters();  // uses DataContractSerializer instead
```

| Call | Serializer used | Notes |
|---|---|---|
| `AddXmlSerializerFormatters()` | `System.Xml.Serialization.XmlSerializer` | Requires parameterless constructor and public properties |
| `AddXmlDataContractSerializerFormatters()` | `System.Runtime.Serialization.DataContractSerializer` | Supports `[DataContract]`/`[DataMember]`, more flexible |

After calling either method, the formatter lists become:

**Output formatters (in order):**
1. `StringOutputFormatter` (handles `text/plain`)
2. `SystemTextJsonOutputFormatter` (handles `application/json`)
3. `XmlSerializerOutputFormatter` (handles `application/xml`, `text/xml`)

**Input formatters (in order):**
1. `SystemTextJsonInputFormatter`
2. `XmlSerializerInputFormatter`

## How ASP.NET Core Selects the Formatter

When an action returns an `ObjectResult` (which `Ok()`, `Created()`, etc. all produce), the pipeline runs **content negotiation** via `DefaultOutputFormatterSelector`:

### Step-by-step Selection

1. **Collect acceptable media types** from the `Accept` header, sorted by quality factor (`q` value, highest first). If `Accept` is absent, the selector uses `*/*` — meaning any formatter is acceptable.

2. **Restrict to declared types** — if the action is decorated with `[Produces("application/json")]`, only formatters that support that type are considered, and the `Accept` header is effectively ignored for type selection.

3. **Walk the formatter list in registration order** — for each media type in the `Accept` header (highest quality first), find the first registered formatter that:
   - Can write that media type (`CanWriteType(type)` returns true for the model type), AND
   - Supports that media type string.

4. **Fall back** — if no formatter matches any `Accept` type, the first formatter that can write the object type is used (i.e., the default — usually JSON).

5. **Return 406** — if `options.ReturnHttpNotAcceptable = true` (not the default) and no formatter can satisfy the `Accept` header, ASP.NET Core returns `406 Not Acceptable`.

```csharp
// Example: request with Accept: application/xml
// → negotiation finds XmlSerializerOutputFormatter (registered after JSON)
// → response body is XML, Content-Type: application/xml

// Forcing 406 when no match exists
builder.Services.AddControllers(options =>
{
    options.ReturnHttpNotAcceptable = true;
});
```

### Code Example — Observing Negotiation

```csharp
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    [HttpGet("{id}")]
    // No [Produces] attribute → full content negotiation based on Accept header
    public IActionResult Get(int id) =>
        Ok(new Product { Id = id, Name = "Widget" });

    [HttpGet("json-only/{id}")]
    [Produces("application/json")]   // bypasses negotiation — always JSON
    public IActionResult GetJsonOnly(int id) =>
        Ok(new Product { Id = id, Name = "Widget" });
}
```

```
GET /api/products/1  HTTP/1.1
Accept: application/xml

→ Response: Content-Type: application/xml
  <Product><Id>1</Id><Name>Widget</Name></Product>

GET /api/products/json-only/1  HTTP/1.1
Accept: application/xml

→ Response: Content-Type: application/json   (Accept ignored due to [Produces])
  {"id":1,"name":"Widget"}
```

### Key Takeaways

- `AddXmlSerializerFormatters()` registers XML input and output formatters alongside JSON.
- Formatter selection is driven by the `Accept` header quality factors and formatter registration order.
- `[Produces]` pins the output type, bypassing negotiation.
- `ReturnHttpNotAcceptable = true` makes the API strict about unsupported `Accept` types.
- The formatter's `CanWriteType()` is also checked — a formatter registered for XML won't be picked if it cannot serialize the model type.
