# L2 How do you validate an IPv4 and IPv6 address?

## Using `IPAddress.TryParse` (recommended)

.NET's `System.Net.IPAddress.TryParse` handles both IPv4 and IPv6. It is the simplest and most reliable approach.

```csharp
using System.Net;
using System.Net.Sockets;

public static bool IsValidIp(string input)
{
    return IPAddress.TryParse(input, out _);
}

// Distinguish IPv4 from IPv6
public static bool IsIPv4(string input) =>
    IPAddress.TryParse(input, out var ip) && ip.AddressFamily == AddressFamily.InterNetwork;

public static bool IsIPv6(string input) =>
    IPAddress.TryParse(input, out var ip) && ip.AddressFamily == AddressFamily.InterNetworkV6;
```

`IPAddress.TryParse` accepts the full range of valid formats for both address families, including IPv6 with zone IDs (`fe80::1%eth0`) when running on supported platforms.

---

## IPv4 validation rules

An IPv4 address consists of **four octets** separated by dots. Each octet is a decimal integer from **0 to 255**.

| Rule | Detail |
|---|---|
| Format | `0–255.0–255.0–255.0–255` |
| Length | 7–15 characters |
| Leading zeros | Invalid in strict mode (`010.0.0.1` is ambiguous) |
| Total groups | Exactly 4 |

```csharp
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;

public static bool IsValidIPv4(string input)
{
    if (!IPAddress.TryParse(input, out var ip)) return false;
    if (ip.AddressFamily != AddressFamily.InterNetwork) return false;

    // IPAddress.TryParse accepts octal/hex notation on some platforms.
    // Re-check with a strict decimal regex to reject leading zeros.
    var strictRegex = new Regex(
        @"^((25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$");
    return strictRegex.IsMatch(input);
}
```

### IPv4 examples

```csharp
IsValidIPv4("192.168.1.1");    // true
IsValidIPv4("0.0.0.0");        // true
IsValidIPv4("255.255.255.255");// true
IsValidIPv4("256.0.0.1");      // false (256 > 255)
IsValidIPv4("192.168.1");      // false (only 3 octets)
IsValidIPv4("010.0.0.1");      // false with strict regex (leading zero)
```

---

## IPv6 validation rules

IPv6 addresses consist of **eight 16-bit groups** of hexadecimal digits separated by colons.

| Rule | Detail |
|---|---|
| Format | `xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx` |
| Group values | 0000–FFFF (hex) |
| Leading zeros | Can be omitted per group (`0001` → `1`) |
| `::` notation | One (and only one) `::` can compress consecutive zero groups |
| Mixed notation | Last two groups can be written as an IPv4 address (`::ffff:192.0.2.1`) |
| Zone ID | `%` suffix for link-local addresses (`fe80::1%eth0`) |
| Total bits | 128 bits |

```csharp
public static bool IsValidIPv6(string input)
{
    if (!IPAddress.TryParse(input, out var ip)) return false;
    return ip.AddressFamily == AddressFamily.InterNetworkV6;
}
```

### IPv6 examples

```csharp
IsValidIPv6("2001:0db8:85a3:0000:0000:8a2e:0370:7334"); // true (full)
IsValidIPv6("2001:db8:85a3::8a2e:370:7334");            // true (compressed)
IsValidIPv6("::");                                       // true (all zeros)
IsValidIPv6("::1");                                      // true (loopback)
IsValidIPv6("::ffff:192.168.1.1");                      // true (IPv4-mapped)
IsValidIPv6("fe80::1%eth0");                             // true (link-local with zone ID)
IsValidIPv6("2001:db8::85a3::1");                        // false (two :: groups)
IsValidIPv6("gggg::1");                                  // false (invalid hex digits)
```

---

## Key differences between IPv4 and IPv6 validation

| Aspect | IPv4 | IPv6 |
|---|---|---|
| Separator | `.` (dot) | `:` (colon) |
| Groups | 4 decimal octets | 8 hex groups |
| Compression | None | `::` compresses zero groups |
| Address length | 32 bits | 128 bits |
| Special notation | None | IPv4-mapped, zone ID |
| Leading zeros | Ambiguous / reject | Allowed and optional |
| Loopback | `127.0.0.1` | `::1` |
| Unspecified | `0.0.0.0` | `::` |

---

## Complete utility class

```csharp
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;

public static class IpAddressValidator
{
    private static readonly Regex StrictIPv4 = new(
        @"^((25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$",
        RegexOptions.Compiled);

    public static bool IsValidIPv4(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return false;
        return IPAddress.TryParse(input, out var ip)
               && ip.AddressFamily == AddressFamily.InterNetwork
               && StrictIPv4.IsMatch(input);
    }

    public static bool IsValidIPv6(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return false;
        // Strip zone ID before parsing if needed
        var clean = input.Split('%')[0];
        return IPAddress.TryParse(clean, out var ip)
               && ip.AddressFamily == AddressFamily.InterNetworkV6;
    }

    public static bool IsValidIpAddress(string? input)
        => IsValidIPv4(input) || IsValidIPv6(input);

    public static AddressFamily? GetAddressFamily(string? input)
    {
        if (IPAddress.TryParse(input?.Split('%')[0], out var ip))
            return ip.AddressFamily;
        return null;
    }
}
```
