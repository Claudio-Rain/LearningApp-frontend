# L1 — How does serialization and deserialization work — what problem does it solve, and what happens under the hood when you serialize an object to JSON or XML?

## Answer

### The Problem Serialization Solves

Objects in memory are laid out as heap structures with pointers, vtables, and GC metadata — a format that is process-specific and platform-specific. You cannot simply copy memory bytes across:
- a network (different machine, different address space),
- a file (bytes need to survive process restart),
- or a message queue (bytes must be understood by a different language or runtime).

**Serialization** converts an in-memory object into a portable, self-describing byte sequence (text or binary).  
**Deserialization** is the reverse: reconstructing an object from that byte sequence.

---

### What Happens Under the Hood — JSON Serialization

When you call `JsonSerializer.Serialize(obj)` in .NET:

1. **Reflection / source generation**: The serializer inspects the type's public properties (via reflection, or at compile time with source generators).
2. **Recursive traversal**: It walks the object graph, converting each property value:
   - Primitive types (`int`, `string`, `bool`) → JSON literals.
   - Nested objects → JSON objects `{ }`.
   - Collections (`List<T>`, arrays) → JSON arrays `[ ]`.
   - `null` values → JSON `null`.
3. **Text output**: The serializer writes UTF-8 encoded characters to a buffer — curly braces, colons, commas, quoted keys, and quoted or unquoted values — producing a valid JSON document.

Deserialization reverses this: the parser tokenizes the JSON text, then maps each key to a property on the target type using reflection or a pre-compiled accessor, setting the value after converting it from the JSON token type.

---

### What Happens Under the Hood — XML Serialization

`XmlSerializer` works similarly but writes XML elements/attributes:

1. Class name → root element tag (e.g., `<User>`).
2. Public properties/fields → child elements or XML attributes.
3. Nested objects → nested elements.
4. The output is a text document conforming to the XML specification.

---

### Key Concepts

| Term | Meaning |
|------|---------|
| **Serialization** | Object → portable format (JSON, XML, binary, etc.) |
| **Deserialization** | Portable format → Object |
| **Schema** | Contract describing the expected structure (e.g., OpenAPI, XSD) |
| **Idempotency** | Serialize then deserialize should yield an equivalent object |
| **Versioning** | Unknown fields are typically ignored; missing fields use defaults |

---

*Include short code examples in C#.*

```csharp
using System.Text.Json;
using System.Xml.Serialization;

// --- JSON ---
var user = new User { Id = 1, Name = "Alice", Email = "alice@example.com" };

// Serialize to JSON string
string json = JsonSerializer.Serialize(user);
// Output: {"Id":1,"Name":"Alice","Email":"alice@example.com"}

// Deserialize back
User? restored = JsonSerializer.Deserialize<User>(json);

// --- XML ---
var xmlSerializer = new XmlSerializer(typeof(User));
using var writer = new StringWriter();
xmlSerializer.Serialize(writer, user);
string xml = writer.ToString();
// Output: <User><Id>1</Id><Name>Alice</Name><Email>alice@example.com</Email></User>

using var reader = new StringReader(xml);
var xmlUser = (User?)xmlSerializer.Deserialize(reader);

// --- Model ---
public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
}
```

### Common Pitfalls
- **Circular references**: object A references B which references A — the serializer will loop infinitely unless configured to handle cycles (`ReferenceHandler.Preserve` in `System.Text.Json`).
- **Type information loss**: deserialization needs to know the target type; polymorphic hierarchies require discriminators.
- **Culture sensitivity**: dates and decimals should use invariant culture or ISO 8601 to avoid locale-dependent formatting bugs.
