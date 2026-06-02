# L2 How do you parse, format, and validate a phone number?

## The challenge

Phone numbers are notoriously varied:
- Different countries use different digit counts (7–15 digits per E.164).
- The same number can be written many ways: `+1 (800) 555-0100`, `18005550100`, `1-800-555-0100`.
- Local vs. international format depends on country code.
- Some regions share country codes (e.g., +1 covers the US, Canada, and many Caribbean islands).

---

## The recommended tool: libphonenumber

Google's **libphonenumber** is the industry standard for phone number handling. The .NET port is **PhoneNumbers** (available on NuGet as `libphonenumber-csharp`).

```
dotnet add package libphonenumber-csharp
```

---

## Parsing

```csharp
using PhoneNumbers;

var util = PhoneNumberUtil.GetInstance();

// Parse with an explicit default region (used when there is no country code prefix)
PhoneNumber number = util.Parse("+44 20 7946 0958", null);  // international format
PhoneNumber local  = util.Parse("020 7946 0958", "GB");     // local UK format

Console.WriteLine(number.CountryCode);     // 44
Console.WriteLine(number.NationalNumber); // 2079460958
```

---

## Validation

```csharp
bool isValid = util.IsValidNumber(number);          // full validation (length + pattern)
bool isPossible = util.IsPossibleNumber(number);    // fast length-only check

// Validate for a specific region
bool isValidForGB = util.IsValidNumberForRegion(number, "GB");
```

`IsValidNumber` performs deep validation — it checks that the number matches the known patterns for that country code. `IsPossibleNumber` is faster but only checks that the length is plausible.

---

## Formatting

```csharp
// E.164 — canonical international format, ideal for storage
string e164 = util.Format(number, PhoneNumberFormat.E164);
// → "+442079460958"

// International — human-readable with country code
string intl = util.Format(number, PhoneNumberFormat.INTERNATIONAL);
// → "+44 20 7946 0958"

// National — local format without country code
string national = util.Format(number, PhoneNumberFormat.NATIONAL);
// → "020 7946 0958"

// RFC3966 — for href="tel:..." links
string rfc = util.Format(number, PhoneNumberFormat.RFC3966);
// → "tel:+44-20-7946-0958"
```

---

## Handling international formats and country codes

```csharp
// Get the two-letter region code from a parsed number
string region = util.GetRegionCodeForNumber(number); // "GB"

// Get example numbers for testing
PhoneNumber example = util.GetExampleNumber("DE"); // German example number
Console.WriteLine(util.Format(example, PhoneNumberFormat.INTERNATIONAL));
// → "+49 30 123456"

// Detect number type
PhoneNumberType type = util.GetNumberType(number);
// FIXED_LINE, MOBILE, TOLL_FREE, PREMIUM_RATE, VOIP, etc.
```

---

## End-to-end helper method

```csharp
using PhoneNumbers;

public static class PhoneValidator
{
    private static readonly PhoneNumberUtil Util = PhoneNumberUtil.GetInstance();

    /// <summary>
    /// Parses, validates, and returns the E.164 form of a phone number.
    /// Returns null if the number cannot be parsed or is invalid.
    /// </summary>
    /// <param name="input">Raw input string from the user.</param>
    /// <param name="defaultRegion">ISO 3166-1 alpha-2 region code (e.g. "US", "GB") used
    /// when the input does not include a country code prefix.</param>
    public static string? ToE164(string? input, string defaultRegion = "US")
    {
        if (string.IsNullOrWhiteSpace(input)) return null;

        try
        {
            PhoneNumber number = Util.Parse(input, defaultRegion);
            return Util.IsValidNumber(number)
                ? Util.Format(number, PhoneNumberFormat.E164)
                : null;
        }
        catch (NumberParseException)
        {
            return null;
        }
    }
}

// Usage
string? e164 = PhoneValidator.ToE164("+1 (800) 555-0199", "US");
// → "+18005550199"

string? local = PhoneValidator.ToE164("020 7946 0958", "GB");
// → "+442079460958"

string? bad = PhoneValidator.ToE164("not-a-phone", "US");
// → null
```

---

## Without the library: simple regex (limited)

If you cannot add a dependency, a regex can catch obvious errors but will not catch invalid numbers within a valid format:

```csharp
using System.Text.RegularExpressions;

public static bool IsPlausibleE164(string input)
{
    // E.164: + followed by 7–15 digits
    return Regex.IsMatch(input, @"^\+[1-9]\d{6,14}$");
}
```

This does **not** validate country codes or national number patterns. Use libphonenumber whenever correctness matters.

---

## Storage recommendation

Always store phone numbers in **E.164 format** (`+<country-code><number>`, digits only, max 15 digits). This format is unambiguous, sortable, and works directly with SMS/telephony APIs (Twilio, AWS SNS, etc.).
