# L3 How do you send multipart/form-data (file uploads) with `HttpClient`?

## What Is `multipart/form-data`?

`multipart/form-data` is an encoding that allows a single HTTP request to carry multiple named parts — each with its own `Content-Disposition` header. It is the standard format used by HTML `<form enctype="multipart/form-data">` and is the correct content type for file uploads.

The server receives each part separately, which lets it distinguish a file binary from accompanying text fields (e.g., a description or user ID).

---

## Sending a File with `MultipartFormDataContent`

### Basic File Upload

```csharp
public async Task UploadFileAsync(Stream fileStream, string fileName, CancellationToken ct = default)
{
    using var content = new MultipartFormDataContent();

    // Add the file part
    var fileContent = new StreamContent(fileStream);
    fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");

    // "file" is the form field name; fileName is used in Content-Disposition
    content.Add(fileContent, name: "file", fileName: fileName);

    var response = await _httpClient.PostAsync("/api/upload", content, ct);
    response.EnsureSuccessStatusCode();
}
```

The resulting request looks like:

```
POST /api/upload HTTP/1.1
Content-Type: multipart/form-data; boundary="---boundary123"

------boundary123
Content-Disposition: form-data; name="file"; filename="photo.jpg"
Content-Type: image/jpeg

<binary data>
------boundary123--
```

---

### File + Additional Form Fields

```csharp
public async Task UploadWithMetadataAsync(
    Stream fileStream,
    string fileName,
    string description,
    int userId,
    CancellationToken ct = default)
{
    using var content = new MultipartFormDataContent();

    // Text fields
    content.Add(new StringContent(description), "description");
    content.Add(new StringContent(userId.ToString()), "userId");

    // File part
    var fileContent = new StreamContent(fileStream);
    fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/octet-stream");
    content.Add(fileContent, "file", fileName);

    var response = await _httpClient.PostAsync("/api/documents", content, ct);
    response.EnsureSuccessStatusCode();
}
```

---

### Uploading from a Path (IFormFile pattern)

```csharp
await using var fileStream = File.OpenRead("/tmp/report.pdf");
await UploadWithMetadataAsync(fileStream, "report.pdf", "Q1 Report", userId: 7);
```

---

## Receiving the Upload in ASP.NET Core

```csharp
[HttpPost("upload")]
public async Task<IActionResult> Upload(IFormFile file, [FromForm] string description)
{
    if (file.Length == 0)
        return BadRequest("Empty file");

    var path = Path.Combine(_uploadDir, file.FileName);
    await using var stream = System.IO.File.Create(path);
    await file.CopyToAsync(stream);

    return Ok(new { path, description });
}
```

---

## Multiple Files in One Request

```csharp
public async Task UploadMultipleAsync(IEnumerable<(Stream Stream, string Name)> files, CancellationToken ct = default)
{
    using var content = new MultipartFormDataContent();

    foreach (var (stream, name) in files)
    {
        var part = new StreamContent(stream);
        part.Headers.ContentType = MediaTypeHeaderValue.Parse("application/octet-stream");
        content.Add(part, "files", name);   // same field name for each file
    }

    var response = await _httpClient.PostAsync("/api/bulk-upload", content, ct);
    response.EnsureSuccessStatusCode();
}
```

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Disposing the stream before the request completes | Don't wrap `fileStream` in a `using` inside the upload method — let the caller control its lifetime, or copy bytes into a `MemoryStream` first |
| Missing `Content-Type` on the file part | Add `fileContent.Headers.ContentType` explicitly |
| Setting `Content-Type: application/json` on the client | `MultipartFormDataContent` sets the correct header automatically — don't override it |
| Reading `IFormFile` after the request body is disposed | Read and save in the action — don't store `IFormFile` references |

---

## Key Takeaways
- Use `MultipartFormDataContent` to compose file parts and form fields.
- Use `StreamContent` for files (not `ByteArrayContent`) to avoid loading the entire file into memory.
- Provide both `name` (form field name) and `fileName` (original filename) to `content.Add()`.
- The `Content-Type: multipart/form-data; boundary=...` header is set automatically — do not set it manually.
- On the server side, bind files via `IFormFile` (single) or `IFormFileCollection` (multiple).
