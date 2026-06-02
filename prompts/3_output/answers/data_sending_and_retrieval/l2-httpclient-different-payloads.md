# L2 How do you use `HttpClient` with different payload formats such as JSON or XML?

## Answer

`HttpClient` sends request bodies via `HttpContent` subclasses. The choice of subclass determines the serialization format and the `Content-Type` header sent to the server.

### JSON payload (`application/json`)

```csharp
using System.Net.Http;
using System.Net.Http.Json;  // .NET 5+

var client = new HttpClient();

// .NET 5+ — serialize and send in one call
var order = new { ProductId = 42, Quantity = 3 };
HttpResponseMessage response = await client.PostAsJsonAsync("https://api.example.com/orders", order);

// Manual approach (all .NET versions)
string json = JsonSerializer.Serialize(order);
var content = new StringContent(json, Encoding.UTF8, "application/json");
response = await client.PostAsync("https://api.example.com/orders", content);
```

### XML payload (`application/xml`)

```csharp
var serializer = new XmlSerializer(typeof(OrderDto));
using var stream = new MemoryStream();
serializer.Serialize(stream, orderDto);
stream.Position = 0;

var content = new StreamContent(stream);
content.Headers.ContentType = new MediaTypeHeaderValue("application/xml");

HttpResponseMessage response = await client.PostAsync("https://api.example.com/orders", content);
```

### Form data (`application/x-www-form-urlencoded`)

```csharp
var formData = new Dictionary<string, string>
{
    { "username", "alice" },
    { "password", "secret" }
};

var content = new FormUrlEncodedContent(formData);
HttpResponseMessage response = await client.PostAsync("https://api.example.com/login", content);
```

### Multipart / file upload (`multipart/form-data`)

```csharp
using var form = new MultipartFormDataContent();
form.Add(new StringContent("Alice"),            "name");
form.Add(new ByteArrayContent(fileBytes), "file", "report.pdf");

HttpResponseMessage response = await client.PostAsync("https://api.example.com/upload", form);
```

### Setting the `Accept` header (response format)

To tell the server which format you want in the response:

```csharp
client.DefaultRequestHeaders.Accept.Clear();
client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
// or "application/xml"
```

### Summary

| Format | `HttpContent` type | `Content-Type` |
|---|---|---|
| JSON | `StringContent` / `JsonContent` | `application/json` |
| XML | `StreamContent` / `StringContent` | `application/xml` |
| Form fields | `FormUrlEncodedContent` | `application/x-www-form-urlencoded` |
| File upload | `MultipartFormDataContent` | `multipart/form-data` |
