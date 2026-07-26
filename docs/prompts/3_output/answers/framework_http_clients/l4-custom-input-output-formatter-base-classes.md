# L4 — What abstract base classes would you extend to create a custom input and output formatter in ASP.NET Core MVC, and what are the minimum methods you must override?

## Answer

## Custom Input Formatter

Extend **`TextInputFormatter`** (for text-based formats) or **`InputFormatter`** (for binary formats).

### Minimum Overrides for `TextInputFormatter`

| Method | Purpose |
|---|---|
| `CanReadType(Type type)` | Return `true` if this formatter can deserialize into the given model type |
| `ReadRequestBodyAsync(InputFormatterContext, Encoding)` | Read the request body stream and return an `InputFormatterResult` |

`TextInputFormatter` also requires you to populate `SupportedMediaTypes` and `SupportedEncodings` in the constructor.

```csharp
public class CsvInputFormatter : TextInputFormatter
{
    public CsvInputFormatter()
    {
        SupportedMediaTypes.Add(MediaTypeHeaderValue.Parse("text/csv"));
        SupportedEncodings.Add(Encoding.UTF8);
        SupportedEncodings.Add(Encoding.Unicode);
    }

    protected override bool CanReadType(Type type)
        => type == typeof(List<OrderDto>);  // only handle this specific type

    public override async Task<InputFormatterResult> ReadRequestBodyAsync(
        InputFormatterContext context,
        Encoding encoding)
    {
        using var reader = context.ReaderFactory(context.HttpContext.Request.Body, encoding);
        var lines = new List<OrderDto>();

        string? line;
        while ((line = await reader.ReadLineAsync()) != null)
        {
            var parts = line.Split(',');
            if (parts.Length < 2) continue;
            lines.Add(new OrderDto { Id = int.Parse(parts[0]), Name = parts[1].Trim() });
        }

        return InputFormatterResult.Success(lines);
    }
}
```

## Custom Output Formatter

Extend **`TextOutputFormatter`** (for text-based formats) or **`OutputFormatter`** (for binary formats).

### Minimum Overrides for `TextOutputFormatter`

| Method | Purpose |
|---|---|
| `CanWriteType(Type type)` | Return `true` if this formatter can serialize the given model type |
| `WriteResponseBodyAsync(OutputFormatterWriteContext, Encoding)` | Write the serialized response to `context.HttpContext.Response.Body` |

`TextOutputFormatter` requires `SupportedMediaTypes` and `SupportedEncodings` in the constructor.

```csharp
public class CsvOutputFormatter : TextOutputFormatter
{
    public CsvOutputFormatter()
    {
        SupportedMediaTypes.Add(MediaTypeHeaderValue.Parse("text/csv"));
        SupportedEncodings.Add(Encoding.UTF8);
        SupportedEncodings.Add(Encoding.Unicode);
    }

    protected override bool CanWriteType(Type? type)
        => typeof(IEnumerable<OrderDto>).IsAssignableFrom(type);

    public override async Task WriteResponseBodyAsync(
        OutputFormatterWriteContext context,
        Encoding selectedEncoding)
    {
        var response = context.HttpContext.Response;
        var orders   = context.Object as IEnumerable<OrderDto> ?? [];

        await using var writer = new StreamWriter(response.Body, selectedEncoding, leaveOpen: true);
        foreach (var order in orders)
            await writer.WriteLineAsync($"{order.Id},{order.Name}");
    }
}
```

## Registration

```csharp
builder.Services.AddControllers(options =>
{
    options.InputFormatters.Insert(0, new CsvInputFormatter());
    options.OutputFormatters.Insert(0, new CsvOutputFormatter());
});
```

> Inserting at index 0 gives the formatter the highest priority. Add to the end if JSON/XML should take precedence.

## Binary Formatter Example (no encoding concerns)

```csharp
public class ProtobufOutputFormatter : OutputFormatter
{
    public ProtobufOutputFormatter()
    {
        SupportedMediaTypes.Add(MediaTypeHeaderValue.Parse("application/x-protobuf"));
    }

    protected override bool CanWriteType(Type? type) => type is not null;

    public override async Task WriteResponseBodyAsync(OutputFormatterWriteContext context)
    {
        var model = context.Object;
        // Use a Protobuf serialization library
        ProtoBuf.Serializer.Serialize(context.HttpContext.Response.Body, model);
        await Task.CompletedTask;
    }
}
```

## Summary Table

| Base Class | Format Type | Must Override |
|---|---|---|
| `TextInputFormatter` | Text (CSV, YAML, custom) | `CanReadType`, `ReadRequestBodyAsync(context, encoding)` |
| `InputFormatter` | Binary (Protobuf, MessagePack) | `CanReadType`, `ReadRequestBodyAsync(context)` |
| `TextOutputFormatter` | Text | `CanWriteType`, `WriteResponseBodyAsync(context, encoding)` |
| `OutputFormatter` | Binary | `CanWriteType`, `WriteResponseBodyAsync(context)` |

## Key Takeaways

- Use the `Text*` variants when the format is character-based; they handle encoding negotiation for you.
- Use the plain `Input/OutputFormatter` for binary formats (no encoding parameter).
- Always populate `SupportedMediaTypes` in the constructor — without it, the formatter is never selected.
- `CanReadType`/`CanWriteType` let you scope a formatter to specific model types, preventing it from being accidentally applied to everything.
