# L1 Compare binary serialization formats (Protobuf, MessagePack) vs text-based formats (JSON, XML) — what are the trade-offs?

## Overview

Serialization converts an in-memory object into a byte sequence for storage or transmission. The two major families differ in readability, performance, and ecosystem support.

---

## Text-Based Formats

### JSON
- Human-readable, universally supported, native in browsers.
- Verbose: field names are repeated in every record.
- No native schema (though JSON Schema exists).
- Weak type support — numbers have no integer/float distinction; no `Date` type.

```csharp
// System.Text.Json — built into .NET
var json = JsonSerializer.Serialize(order);
var order = JsonSerializer.Deserialize<Order>(json);
```

### XML
- Very verbose; good for document-centric data with namespaces and attributes.
- Strong tooling for transformation (XSLT) and validation (XSD).
- Rare in new API design; common in SOAP/enterprise systems.

```csharp
var serializer = new XmlSerializer(typeof(Order));
serializer.Serialize(stream, order);
```

---

## Binary Formats

### Protobuf (Protocol Buffers — Google)
- **Schema-first**: requires `.proto` files; code is generated from them.
- Very compact (field names replaced by integer tags).
- Excellent for cross-language RPC (gRPC uses Protobuf by default).
- Payload is not human-readable without tooling.

```csharp
// grpc-dotnet / Google.Protobuf
var bytes = order.ToByteArray();          // serialize
var order = Order.Parser.ParseFrom(bytes); // deserialize
```

### MessagePack
- Schema-less (like JSON) but binary — much smaller and faster than JSON.
- Values are self-describing using type tags; no `.proto` required.
- Great drop-in replacement for JSON where performance matters.

```csharp
// MessagePack-CSharp
var bytes = MessagePackSerializer.Serialize(order);
var order = MessagePackSerializer.Deserialize<Order>(bytes);
```

---

## Trade-off Comparison

| Dimension         | JSON          | XML            | Protobuf        | MessagePack     |
|-------------------|---------------|----------------|-----------------|-----------------|
| Human-readable    | Yes           | Yes            | No              | No              |
| Payload size      | Large         | Very large     | Very small      | Small           |
| Parse speed       | Moderate      | Slow           | Very fast       | Fast            |
| Schema required   | No            | Optional (XSD) | Yes (.proto)    | No              |
| Cross-language    | Excellent     | Excellent      | Excellent       | Good            |
| Browser-native    | Yes           | Partial        | No              | No              |
| Versioning        | Flexible      | Flexible       | Structured (field numbers) | Flexible |
| .NET support      | BCL built-in  | BCL built-in   | NuGet package   | NuGet package   |

---

## Typical Size & Speed Benchmarks (rough)

For the same object:
- XML ~ 3–5x larger than JSON
- JSON ~ baseline
- MessagePack ~ 50–70% of JSON size
- Protobuf ~ 30–60% of JSON size, fastest parse time

---

## When to Choose Each

| Scenario | Recommended Format |
|----------|--------------------|
| Public REST API | JSON |
| Internal high-throughput microservices | Protobuf (gRPC) or MessagePack |
| Real-time messaging / WebSockets | MessagePack |
| Legacy enterprise / SOAP | XML |
| Configuration / human-edited files | JSON or YAML |
| Cross-team contract with strict versioning | Protobuf |

---

## Key Takeaways
- **JSON**: default choice — universal, readable, easy to debug.
- **Protobuf**: best raw performance + strict schema; requires tooling.
- **MessagePack**: best of both — no schema, still binary-fast; easy migration from JSON.
- **XML**: avoid for new projects unless mandated by a standard or legacy system.
