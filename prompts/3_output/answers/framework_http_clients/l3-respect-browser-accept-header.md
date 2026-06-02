# L3 — What is `RespectBrowserAcceptHeader`, why is it `false` by default, and when would you set it to `true`?

## Answer

## What It Is

`RespectBrowserAcceptHeader` is a boolean option on `MvcOptions` that controls how ASP.NET Core handles the `Accept` header sent by web browsers.

```csharp
builder.Services.AddControllers(options =>
{
    options.RespectBrowserAcceptHeader = true;   // default is false
});
```

## Why Browsers Send a "Weird" Accept Header

When a browser navigates to a URL directly (e.g., typing it in the address bar or following a link), it sends an `Accept` header such as:

```
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.1
```

This header is designed for document navigation — not for API consumption. It lists `text/html` first, which most APIs cannot produce. The wildcard `*/*;q=0.1` at the end means "I'll take anything with a low preference."

## Why It Defaults to `false`

Without `RespectBrowserAcceptHeader`, ASP.NET Core's content negotiation **ignores the wildcard `*/*`** in browser-style `Accept` headers and falls back to the first registered formatter (usually JSON). This prevents the API from serving HTML or other non-API formats just because a developer browsed to the endpoint directly. It makes the API predictable — it always returns JSON by default regardless of the requesting client.

Setting it to `false` effectively means: "If the `Accept` header contains `*/*`, pretend the client didn't specify a preference and use the default formatter."

## When to Set It to `true`

You should enable `RespectBrowserAcceptHeader = true` when:

1. **Your API returns multiple formats and you want browsers to receive XML** — If you've registered XML formatters and a browser explicitly requests `application/xml` (e.g., via a browser extension or a script), setting this to `true` allows the negotiation to honour that.

2. **You serve Razor views and API endpoints from the same app** — The app may legitimately need to return `text/html` to browsers navigating to a page vs JSON to an XHR/fetch request from a JS frontend.

3. **You want strict RFC 7231-compliant content negotiation** — When the `Accept` header is taken at face value exactly as sent.

```csharp
// Example: API that serves JSON to API clients and XML to browsers requesting XML
builder.Services.AddControllers(options =>
{
    options.RespectBrowserAcceptHeader = true;
    options.ReturnHttpNotAcceptable   = true;   // return 406 if no match
})
.AddXmlSerializerFormatters();
```

```
# API client
GET /api/products/1
Accept: application/json
→ 200 application/json

# Browser navigating to the URL
GET /api/products/1
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.1

# With RespectBrowserAcceptHeader = false (default)
→ 200 application/json  (wildcard */* matched, fell back to default JSON)

# With RespectBrowserAcceptHeader = true
→ 200 application/xml   (application/xml;q=0.9 matched the XML formatter)
```

## Key Takeaways

- The default (`false`) treats `*/*` in the `Accept` header as "no preference" and returns the default format (JSON) — ideal for pure API projects.
- Setting it to `true` performs full RFC-compliant content negotiation, which respects the browser's quality-weighted preferences — useful when the app also serves non-JSON formats to browsers.
- Combine with `ReturnHttpNotAcceptable = true` to make the API strict and return `406` when no registered formatter can satisfy the `Accept` header.
