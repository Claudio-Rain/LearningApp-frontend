# L3 How do you validate an IBAN, including the country-specific length rules and the mod-97 checksum?

## Answer

An **IBAN (International Bank Account Number)** is validated in three steps:

1. **Format check** — the string matches `[A-Z]{2}[0-9]{2}[A-Z0-9]+` and has the correct total length for that country.
2. **Country length check** — each country code maps to a fixed expected length (e.g., GB = 22, DE = 22, FR = 27, NL = 18).
3. **Mod-97 checksum** — rearrange digits, convert letters to numbers, then verify the result mod 97 equals 1.

### Mod-97 algorithm

1. Move the first 4 characters (country code + check digits) to the end.
2. Replace each letter with its numeric value: `A=10, B=11, …, Z=35`.
3. Interpret the resulting string as a large integer and compute `% 97`.
4. If the result is `1`, the IBAN is valid.

### C# example

```csharp
using System;
using System.Collections.Generic;
using System.Numerics;
using System.Text.RegularExpressions;

public static class IbanValidator
{
    private static readonly Dictionary<string, int> CountryLengths = new()
    {
        { "AL", 28 }, { "AT", 20 }, { "BE", 16 }, { "CH", 21 },
        { "DE", 22 }, { "ES", 24 }, { "FR", 27 }, { "GB", 22 },
        { "IT", 27 }, { "NL", 18 }, { "PL", 28 }, { "PT", 25 },
        // add remaining countries as needed
    };

    public static bool IsValid(string iban)
    {
        if (string.IsNullOrWhiteSpace(iban))
            return false;

        // Normalize: remove spaces and uppercase
        iban = iban.Replace(" ", "").ToUpperInvariant();

        // Basic format check
        if (!Regex.IsMatch(iban, @"^[A-Z]{2}[0-9]{2}[A-Z0-9]+$"))
            return false;

        // Country length check
        string country = iban[..2];
        if (!CountryLengths.TryGetValue(country, out int expectedLength) || iban.Length != expectedLength)
            return false;

        // Mod-97 check: move first 4 chars to end
        string rearranged = iban[4..] + iban[..4];

        // Replace letters with digits (A=10 … Z=35)
        var numericString = string.Concat(rearranged.Select(c =>
            char.IsLetter(c) ? (c - 'A' + 10).ToString() : c.ToString()));

        // Compute mod 97 using BigInteger (too large for long)
        var numeric = BigInteger.Parse(numericString);
        return numeric % 97 == 1;
    }
}

// Usage
Console.WriteLine(IbanValidator.IsValid("GB82 WEST 1234 5698 7654 32")); // true
Console.WriteLine(IbanValidator.IsValid("DE89 3704 0044 0532 0130 00")); // true
Console.WriteLine(IbanValidator.IsValid("GB00 WEST 1234 5698 7654 32")); // false (bad check digits)
```

### Key edge cases

| Case | Handling |
|---|---|
| Spaces / hyphens | Strip before validation |
| Lowercase input | Uppercase before validation |
| Unknown country code | Reject (not in lookup table) |
| Non-alphanumeric characters | Reject at regex step |
| Leading zeros in numeric string | `BigInteger.Parse` handles them correctly |

### Using a library

For production code, prefer a well-tested library such as **IbanNet** (NuGet) which ships with all country length definitions and the full checksum logic:

```csharp
using IbanNet;

var validator = new IbanValidator();
ValidationResult result = validator.Validate("GB82WEST12345698765432");
Console.WriteLine(result.IsValid); // true
```
