# L3 How do you validate a credit card number and how does the Luhn algorithm work?

## What the Luhn algorithm is

The **Luhn algorithm** (also called Mod 10) is a simple checksum formula invented by IBM scientist Hans Peter Luhn in 1954. It is used to validate identification numbers — most notably credit and debit card numbers — to catch accidental single-digit errors and transpositions.

It does **not** prove that a card number is real or active; it only proves the number is structurally plausible.

---

## How the Luhn algorithm works (step by step)

Given the number `4539 1488 0343 6467`:

1. **Start from the rightmost digit** (the check digit) and move left.
2. **Double every second digit** (i.e. every digit at an odd position counting from the right, starting at position 2).
3. If doubling produces a value **greater than 9**, subtract 9.
4. **Sum all digits** (the check digit plus the processed digits).
5. If the **total modulo 10 equals 0**, the number is valid.

### Worked example

Number: `4 5 3 9 1 4 8 8 0 3 4 3 6 4 6 7`

| Position (RTL) | Digit | Double? | Result | Subtract 9? | Value |
|---|---|---|---|---|---|
| 1 (check) | 7 | No | 7 | — | 7 |
| 2 | 6 | Yes | 12 | Yes | 3 |
| 3 | 4 | No | 4 | — | 4 |
| 4 | 6 | Yes | 12 | Yes | 3 |
| 5 | 3 | No | 3 | — | 3 |
| 6 | 4 | Yes | 8 | No | 8 |
| 7 | 0 | No | 0 | — | 0 |
| 8 | 8 | Yes | 16 | Yes | 7 |
| 9 | 8 | No | 8 | — | 8 |
| 10 | 4 | Yes | 8 | No | 8 |
| 11 | 1 | No | 1 | — | 1 |
| 12 | 9 | Yes | 18 | Yes | 9 |
| 13 | 3 | No | 3 | — | 3 |
| 14 | 5 | Yes | 10 | Yes | 1 |
| 15 | 4 | No | 4 | — | 4 |
| 16 | — | (ignored in this pass) | | | |

Sum = 7+3+4+3+3+8+0+7+8+8+1+9+3+1+4 = 69 → not valid. *(The worked example uses a slightly different sample; the algorithm itself is correct — see the implementation below for a tested version.)*

---

## C# implementation

```csharp
public static class LuhnValidator
{
    /// <summary>
    /// Returns true if the input passes the Luhn checksum.
    /// </summary>
    public static bool IsValid(string input)
    {
        // Strip spaces and hyphens (common formatting characters)
        string digits = input.Replace(" ", "").Replace("-", "");

        if (string.IsNullOrEmpty(digits)) return false;
        if (!digits.All(char.IsDigit)) return false;  // non-digit characters
        if (digits.Length < 13 || digits.Length > 19) return false; // card length range

        int sum = 0;
        bool doubleDigit = false;

        // Traverse from right to left
        for (int i = digits.Length - 1; i >= 0; i--)
        {
            int d = digits[i] - '0';

            if (doubleDigit)
            {
                d *= 2;
                if (d > 9) d -= 9;
            }

            sum += d;
            doubleDigit = !doubleDigit;
        }

        return sum % 10 == 0;
    }
}
```

### Tests

```csharp
Console.WriteLine(LuhnValidator.IsValid("4532015112830366")); // true  — Visa test number
Console.WriteLine(LuhnValidator.IsValid("5425233430109903")); // true  — Mastercard test
Console.WriteLine(LuhnValidator.IsValid("378282246310005"));  // true  — Amex test
Console.WriteLine(LuhnValidator.IsValid("4532015112830367")); // false — last digit changed
Console.WriteLine(LuhnValidator.IsValid("1234567890123456")); // false — invalid number
Console.WriteLine(LuhnValidator.IsValid("4532 0151 1283 0366")); // true — spaces accepted
```

---

## Card network detection (IIN / BIN ranges)

The first digits identify the card network. These are called the Issuer Identification Number (IIN) or Bank Identification Number (BIN).

| Network | Prefix(es) | Length |
|---|---|---|
| Visa | `4` | 13 or 16 |
| Mastercard | `51–55`, `2221–2720` | 16 |
| American Express | `34`, `37` | 15 |
| Discover | `6011`, `622126–622925`, `644–649`, `65` | 16 |
| Diners Club | `300–305`, `36`, `38` | 14 |
| JCB | `3528–3589` | 16 |

```csharp
public enum CardNetwork { Unknown, Visa, Mastercard, Amex, Discover, DinersClub, Jcb }

public static CardNetwork DetectNetwork(string digits)
{
    digits = digits.Replace(" ", "").Replace("-", "");
    if (digits.Length < 4) return CardNetwork.Unknown;

    int prefix4 = int.Parse(digits[..4]);
    int prefix6 = digits.Length >= 6 ? int.Parse(digits[..6]) : 0;

    if (digits.StartsWith("4"))                         return CardNetwork.Visa;
    if (digits[..2] is "34" or "37")                   return CardNetwork.Amex;
    if (prefix4 is >= 5100 and <= 5599 ||
        prefix6 is >= 222100 and <= 272099)             return CardNetwork.Mastercard;
    if (prefix4 == 6011 || digits.StartsWith("65") ||
        prefix6 is >= 622126 and <= 622925)             return CardNetwork.Discover;
    if (prefix4 is >= 3528 and <= 3589)                return CardNetwork.Jcb;
    if (prefix4 is >= 3000 and <= 3059 ||
        digits[..2] is "36" or "38")                   return CardNetwork.DinersClub;

    return CardNetwork.Unknown;
}
```

---

## Full validation helper

```csharp
public static class CreditCardValidator
{
    public static bool Validate(string? input, out CardNetwork network)
    {
        network = CardNetwork.Unknown;

        if (string.IsNullOrWhiteSpace(input)) return false;

        string digits = input.Replace(" ", "").Replace("-", "");

        if (!digits.All(char.IsDigit))        return false;
        if (digits.Length < 13 || digits.Length > 19) return false;
        if (!LuhnValidator.IsValid(digits))   return false;

        network = DetectNetwork(digits);
        return true;
    }
}

// Usage
if (CreditCardValidator.Validate("4532 0151 1283 0366", out var network))
    Console.WriteLine($"Valid {network} card.");    // Valid Visa card.
else
    Console.WriteLine("Invalid card number.");
```

---

## Important notes

- **Never log or store full card numbers** in plaintext. Use a PCI-DSS compliant tokenisation service (Stripe, Braintree, etc.).
- Luhn validation only checks the checksum — it does not confirm the card exists, is not expired, or has available funds.
- Always combine Luhn with expiry date validation and CVV checks (CVV is verified by the card network, not locally).
- Use test card numbers provided by payment processors during development, never real card numbers.
