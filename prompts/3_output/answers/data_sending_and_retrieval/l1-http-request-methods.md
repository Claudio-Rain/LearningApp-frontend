# L1 — What are the main HTTP request methods, and when would you use each one (GET, POST, PUT, PATCH, DELETE)?

## Answer

HTTP defines a set of **request methods** (also called verbs) that indicate the desired action to be performed on a resource. Each method has specific semantics around safety and idempotency.

### GET
- **Purpose**: Retrieve a resource without modifying it.
- **Safe**: Yes (no side effects on the server).
- **Idempotent**: Yes (calling it multiple times returns the same result).
- **Use when**: Fetching a list of users, reading a product detail page, or loading configuration data.

### POST
- **Purpose**: Submit data to the server to create a new resource or trigger a non-idempotent action.
- **Safe**: No.
- **Idempotent**: No (calling it multiple times may create multiple resources).
- **Use when**: Creating a new order, submitting a form, or uploading a file.

### PUT
- **Purpose**: Replace an existing resource entirely with the provided representation.
- **Safe**: No.
- **Idempotent**: Yes (sending the same PUT multiple times results in the same state).
- **Use when**: Replacing a user profile with a complete new version.

### PATCH
- **Purpose**: Apply a partial update to an existing resource.
- **Safe**: No.
- **Idempotent**: Not guaranteed (depends on implementation).
- **Use when**: Updating only the email field of a user, or toggling a single property without resending the entire object.

### DELETE
- **Purpose**: Remove a resource from the server.
- **Safe**: No.
- **Idempotent**: Yes (deleting something that is already gone still results in it not existing).
- **Use when**: Removing a record, cancelling a subscription, or clearing a cache entry.

### Quick Comparison Table

| Method | Safe | Idempotent | Typical Use |
|--------|------|-----------|-------------|
| GET    | Yes  | Yes       | Read        |
| POST   | No   | No        | Create / action |
| PUT    | No   | Yes       | Full replace |
| PATCH  | No   | Conditional | Partial update |
| DELETE | No   | Yes       | Remove      |

### Key Distinction: PUT vs PATCH
- **PUT** requires the client to send the complete resource. Missing fields may be set to null or default values.
- **PATCH** sends only the fields that need to change, leaving everything else untouched.

*Include short code examples in C#.*

```csharp
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

var client = new HttpClient { BaseAddress = new Uri("https://api.example.com/") };

// GET
var user = await client.GetFromJsonAsync<User>("users/1");

// POST — create new resource
var newUser = new User { Name = "Alice", Email = "alice@example.com" };
var postResponse = await client.PostAsJsonAsync("users", newUser);

// PUT — full replacement
var updatedUser = new User { Id = 1, Name = "Alice", Email = "alice@new.com" };
var putResponse = await client.PutAsJsonAsync("users/1", updatedUser);

// PATCH — partial update
var patch = new { Email = "alice@patched.com" };
var patchResponse = await client.PatchAsJsonAsync("users/1", patch);

// DELETE
var deleteResponse = await client.DeleteAsync("users/1");
```
