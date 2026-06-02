# L2 How do you validate a domain name?

## Rules for a valid domain name

Domain names are governed by RFC 1035, RFC 1123, and RFC 5891 (internationalised domains). The core rules are:

1. **Labels** — A domain is made of labels separated by dots (e.g. `mail.example.com` has three labels).
2. **Label length** — Each label must be 1–63 characters long.
3. **Total length** — The fully qualified domain name (FQDN, including dots) must be ≤ 253 characters.
4. **Allowed characters** — Labels may contain letters (a–z, A–Z), digits (0–9), and hyphens (`-`).
5. **Hyphen rules** — A label must not start or end with a hyphen. Labels must not have a hyphen in both the third and fourth positions unless they are an internationalised domain name (IDN) encoded with the `xn--` prefix (Punycode).
6. **All-numeric labels** — The top-level domain (TLD) must not be all numeric (so `example.123` is invalid).
7. **Minimum structure** — A domain must have at least two labels (i.e. at least one dot) to be routable on the public internet, though single-label names are technically valid in some private networks.
8. **Case insensitivity** — Domain names are case-insensitive.

---

## Validation with a regex

```csharp
using System.Text.RegularExpressions;

public static class DomainValidator
{
    // Each label: starts and ends with alnum, may contain hyphens in the middle, 1–63 chars.
    // TLD: at least two alpha characters (rejects all-numeric TLDs).
    // Total length check is done separately.
    private static readonly Regex DomainRegex = new(
        @"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static bool IsValid(string? domain)
    {
        if (string.IsNullOrWhiteSpace(domain)) return false;
        if (domain.Length > 253) return false;

        return DomainRegex.IsMatch(domain);
    }
}
```

### Usage

```csharp
Console.WriteLine(DomainValidator.IsValid("example.com"));        // true
Console.WriteLine(DomainValidator.IsValid("mail.example.co.uk")); // true
Console.WriteLine(DomainValidator.IsValid("xn--nxasmq6b.com"));  // true (IDN Punycode)
Console.WriteLine(DomainValidator.IsValid("-bad.com"));           // false (leading hyphen)
Console.WriteLine(DomainValidator.IsValid("bad-.com"));           // false (trailing hyphen)
Console.WriteLine(DomainValidator.IsValid("example.123"));        // false (numeric TLD)
Console.WriteLine(DomainValidator.IsValid("a" + new string('b', 63) + ".com")); // false (label too long)
```

---

## Detailed per-label validation

For stricter validation — including the 63-character limit per label — split on dots and validate each label individually:

```csharp
public static bool IsValidStrict(string? domain)
{
    if (string.IsNullOrWhiteSpace(domain)) return false;
    if (domain.Length > 253) return false;

    var labelRegex = new Regex(@"^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);
    var tldRegex = new Regex(@"^[a-zA-Z]{2,}$", RegexOptions.Compiled);

    string[] labels = domain.TrimEnd('.').Split('.');
    if (labels.Length < 2) return false;

    for (int i = 0; i < labels.Length; i++)
    {
        string label = labels[i];

        if (label.Length == 0 || label.Length > 63) return false;

        bool isTld = i == labels.Length - 1;
        if (isTld)
        {
            if (!tldRegex.IsMatch(label)) return false;
        }
        else
        {
            if (!labelRegex.IsMatch(label)) return false;
        }
    }

    return true;
}
```

---

## DNS existence check

Structural validation confirms the format; it cannot confirm the domain actually exists. For that, perform a DNS lookup:

```csharp
using System.Net;

public static async Task<bool> ExistsInDnsAsync(string domain)
{
    try
    {
        IPAddress[] addresses = await Dns.GetHostAddressesAsync(domain);
        return addresses.Length > 0;
    }
    catch (Exception)
    {
        return false;
    }
}
```

---

## Internationalised Domain Names (IDN)

IDN domains use Unicode labels that are encoded as Punycode (e.g. `münchen.de` → `xn--mnchen-3ya.de`). The `System.Globalization.IdnMapping` class converts between the two representations:

```csharp
using System.Globalization;

public static string ToAscii(string unicodeDomain)
{
    var idn = new IdnMapping();
    return idn.GetAscii(unicodeDomain); // Converts to Punycode
}

public static string ToUnicode(string asciiDomain)
{
    var idn = new IdnMapping();
    return idn.GetUnicode(asciiDomain); // Converts back to Unicode
}

// Example
string punycode = ToAscii("münchen.de"); // "xn--mnchen-3ya.de"
```

Always convert an IDN to its ASCII/Punycode form before running the regex above.

---

## Summary of rules

| Rule | Value |
|---|---|
| Max total length | 253 characters |
| Max label length | 63 characters |
| Min label length | 1 character |
| Allowed label chars | `[a-zA-Z0-9-]` |
| Label must not start/end with | `-` |
| TLD must not be | All-numeric |
| Minimum labels | 2 (at least one dot) |
