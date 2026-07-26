# L3 — How do you bind a file upload to an action method parameter using `IFormFile`, and what `Content-Type` must the client send?

## Answer

## Required `Content-Type`

The client **must** send `Content-Type: multipart/form-data` with a `boundary` parameter. This is the only content type that allows mixing binary file data with other form fields in a single request body. `application/x-www-form-urlencoded` cannot carry binary data.

```
POST /api/files HTTP/1.1
Content-Type: multipart/form-data; boundary=----FormBoundary7MA4YWxkTrZu0gW

------FormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="report.pdf"
Content-Type: application/pdf

<binary file data>
------FormBoundary7MA4YWxkTrZu0gW--
```

## Binding a Single File

```csharp
[ApiController]
[Route("api/[controller]")]
public class FilesController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    public FilesController(IWebHostEnvironment env) => _env = env;

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file provided.");

        // Validate extension / MIME type before saving
        var allowedTypes = new[] { "image/jpeg", "image/png", "application/pdf" };
        if (!allowedTypes.Contains(file.ContentType))
            return UnprocessableEntity("Unsupported file type.");

        var savePath = Path.Combine(_env.ContentRootPath, "Uploads", file.FileName);
        Directory.CreateDirectory(Path.GetDirectoryName(savePath)!);

        await using var stream = new FileStream(savePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return Ok(new { file.FileName, file.Length, file.ContentType });
    }
}
```

## Binding Multiple Files

```csharp
[HttpPost("upload-many")]
[Consumes("multipart/form-data")]
public async Task<IActionResult> UploadMany(List<IFormFile> files)
{
    foreach (var file in files)
    {
        var savePath = Path.Combine(_env.ContentRootPath, "Uploads", file.FileName);
        await using var stream = new FileStream(savePath, FileMode.Create);
        await file.CopyToAsync(stream);
    }
    return Ok(new { Count = files.Count });
}
```

## Mixing File + Form Fields

```csharp
public class UploadRequest
{
    public string Description { get; set; } = string.Empty;
    public IFormFile File { get; set; } = default!;
}

[HttpPost("upload-with-metadata")]
[Consumes("multipart/form-data")]
public async Task<IActionResult> UploadWithMetadata([FromForm] UploadRequest request)
{
    // request.Description — from a regular form field
    // request.File        — from the file part
    return Ok(new { request.Description, request.File.FileName });
}
```

## Accessing All Files via `Request.Form.Files`

```csharp
// When you don't know the field names upfront
[HttpPost("upload-raw")]
public async Task<IActionResult> UploadRaw()
{
    foreach (var file in Request.Form.Files)
    {
        Console.WriteLine($"{file.Name}: {file.FileName} ({file.Length} bytes)");
    }
    return Ok();
}
```

## Client-Side Example (HttpClient)

```csharp
using var content = new MultipartFormDataContent();
var fileBytes = await File.ReadAllBytesAsync("report.pdf");
content.Add(new ByteArrayContent(fileBytes), "file", "report.pdf");
content.Add(new StringContent("Monthly report"), "description");

var response = await httpClient.PostAsync("/api/files/upload-with-metadata", content);
// MultipartFormDataContent automatically sets the correct Content-Type header
```

## Key Takeaways

- `IFormFile` is bound from `multipart/form-data` — not JSON; no `[FromBody]`.
- Use `[FromForm]` or no attribute when binding form fields alongside `IFormFile`.
- Always validate `ContentType` and `Length` before saving — never trust the `FileName` from the client directly (sanitise it to prevent path traversal).
- For large files, stream directly to storage (Azure Blob, S3, disk) via `CopyToAsync` instead of loading into a `byte[]` to avoid excessive memory pressure.
- Configure size limits via Kestrel options and, if behind IIS, in `web.config` (see the L4 question on 413 errors).
