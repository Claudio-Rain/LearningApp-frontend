# L2 How do you validate a currency string?

Currency strings vary widely by locale. `$1,234.56` (US) and `EUR 1.234,56` (German) represent the same concept but use opposite conventions for thousands separators and decimal marks.

---

## The core problem: locale-specific formatting

| Locale | Symbol position | Thousands separator | Decimal separator | Example |
|---|---|---|---|---|
| en-US | Prefix | `,` (comma) | `.` (period) | `$1,234.56` |
| de-DE | Suffix | `.` (period) | `,` (comma) | `1.234,56 €` |
| fr-FR | Suffix (space) | ` ` (non-breaking space) | `,` (comma) | `1 234,56 €` |
| en-GB | Prefix | `,` (comma) | `.` (period) | `£1,234.56` |
| ja-JP | Prefix | `,` | `.` | `¥1,234` |

---

## Option 1: `decimal.TryParse` with a specific culture

This is the simplest approach when you know the expected locale.

```csharp
using System.Globalization;

public static bool TryParseCurrency(string input, string cultureName, out decimal amount)
{
    var culture = CultureInfo.GetCultureInfo(cultureName);

    return decimal.TryParse(
        input,
        NumberStyles.Currency,   // allows symbol, thousands separator, decimal mark
        culture,
        out amount);
}

// Usage
TryParseCurrency("$1,234.56",   "en-US", out decimal usd); // amount = 1234.56
TryParseCurrency("1.234,56 €",  "de-DE", out decimal eur); // amount = 1234.56
TryParseCurrency("1 234,56 €",  "fr-FR", out decimal fra); // amount = 1234.56
```

`NumberStyles.Currency` instructs the parser to accept:
- Leading/trailing currency symbols
- Thousands grouping separators
- A decimal separator
- Leading/trailing whitespace and parentheses for negatives

---

## Option 2: Strip the symbol first, then parse

Useful when you want to separate currency code detection from amount parsing:

```csharp
public record CurrencyValue(string CurrencyCode, decimal Amount);

public static CurrencyValue? Parse(string input, string cultureName)
{
    if (string.IsNullOrWhiteSpace(input)) return null;

    var culture = CultureInfo.GetCultureInfo(cultureName);
    string symbol = culture.NumberFormat.CurrencySymbol;

    // Remove the currency symbol and trim whitespace
    string cleaned = input
        .Replace(symbol, string.Empty)
        .Trim();

    if (!decimal.TryParse(cleaned, NumberStyles.Number, culture, out decimal amount))
        return null;

    // Derive ISO code from culture (e.g. "en-US" → "USD")
    string isoCode = new RegionInfo(culture.Name).ISOCurrencySymbol;

    return new CurrencyValue(isoCode, amount);
}
```

---

## Option 3: Regex-based validation before parsing

Use a regex to confirm the string is structurally sound before attempting to parse it. This gives you early, targeted error messages.

```csharp
using System.Text.RegularExpressions;

public static class CurrencyValidator
{
    // US format: optional $ prefix, digits with optional comma groups, optional decimal
    private static readonly Regex UsFormat = new(
        @"^\$?\d{1,3}(,\d{3})*(\.\d{1,2})?$",
        RegexOptions.Compiled);

    // European format (de-DE): optional € suffix, digits with optional period groups, optional comma decimal
    private static readonly Regex EuFormat = new(
        @"^\d{1,3}(\.\d{3})*(,\d{1,2})?\s?€?$",
        RegexOptions.Compiled);

    // ISO prefix format: "USD 1234.56" or "EUR 1.234,56"
    private static readonly Regex IsoPrefix = new(
        @"^[A-Z]{3}\s\d[\d.,]*$",
        RegexOptions.Compiled);

    public static bool IsValidUsFormat(string input)   => UsFormat.IsMatch(input.Trim());
    public static bool IsValidEuFormat(string input)   => EuFormat.IsMatch(input.Trim());
    public static bool IsValidIsoPrefix(string input)  => IsoPrefix.IsMatch(input.Trim());
}
```

---

## Option 4: Use a library for multi-locale parsing

**NodaMoney** and **Money.Net** are .NET libraries that model monetary values with currencies:

```csharp
// NodaMoney (NuGet: NodaMoney)
using NodaMoney;

var money = Money.Parse("USD 1234.56");
Console.WriteLine(money.Amount);   // 1234.56
Console.WriteLine(money.Currency); // USD
```

---

## Complete validation and parsing helper

```csharp
using System.Globalization;

public static class CurrencyParser
{
    /// <summary>
    /// Tries to parse a currency string according to the given culture.
    /// Returns false if the string is not a valid currency representation.
    /// </summary>
    public static bool TryParse(
        string?   input,
        string    cultureName,
        out decimal amount)
    {
        amount = 0;
        if (string.IsNullOrWhiteSpace(input)) return false;

        CultureInfo culture;
        try { culture = CultureInfo.GetCultureInfo(cultureName); }
        catch (CultureNotFoundException) { return false; }

        return decimal.TryParse(
            input.Trim(),
            NumberStyles.Currency,
            culture,
            out amount);
    }

    /// <summary>
    /// Formats a decimal as a currency string for the given culture.
    /// </summary>
    public static string Format(decimal amount, string cultureName)
    {
        var culture = CultureInfo.GetCultureInfo(cultureName);
        return amount.ToString("C", culture);
    }
}

// Examples
CurrencyParser.TryParse("$1,234.56",  "en-US", out decimal a); // 1234.56
CurrencyParser.TryParse("1.234,56 €", "de-DE", out decimal b); // 1234.56

Console.WriteLine(CurrencyParser.Format(1234.56m, "en-US")); // $1,234.56
Console.WriteLine(CurrencyParser.Format(1234.56m, "de-DE")); // 1.234,56 €
Console.WriteLine(CurrencyParser.Format(1234.56m, "fr-FR")); // 1 234,56 €
```

---

## Key considerations

- **Always use `decimal`**, not `double` or `float`, for currency to avoid floating-point rounding errors.
- **Store amounts as `decimal`** with an explicit currency code (ISO 4217), not as formatted strings.
- **Do not rely on the server's current culture** (`CultureInfo.CurrentCulture`) for API inputs — always specify the locale explicitly.
- **Be aware of negative formats**: many locales use parentheses `(1,234.56)` for negatives; `NumberStyles.Currency` handles this.
- **Validate the currency code** (ISO 4217) separately from the amount when accepting free-form input like `"EUR 1.234,56"`.
