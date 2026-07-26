# L1 How do you validate that a string represents a valid date or time?

## Core approach: `DateTime.TryParse` and `DateTime.TryParseExact`

`DateTime.TryParse` attempts to parse a string using culture-aware heuristics. It returns `false` instead of throwing when the string is invalid.

```csharp
string input = "2024-03-15";

if (DateTime.TryParse(input, out DateTime result))
    Console.WriteLine($"Valid date: {result}");
else
    Console.WriteLine("Invalid date.");
```

`TryParse` is flexible but may accept formats you do not want (e.g. it will accept both `MM/dd/yyyy` and `dd/MM/yyyy` depending on the current culture). Use it when you want broad, culture-sensitive parsing.

---

## Strict format validation with `TryParseExact`

When you need to enforce a specific format, use `TryParseExact`:

```csharp
string input = "15-03-2024";
string format = "dd-MM-yyyy";

bool isValid = DateTime.TryParseExact(
    input,
    format,
    CultureInfo.InvariantCulture,
    DateTimeStyles.None,
    out DateTime parsed);

Console.WriteLine(isValid ? $"Parsed: {parsed:O}" : "Invalid format.");
```

### Multiple accepted formats

```csharp
string[] acceptedFormats = { "yyyy-MM-dd", "dd/MM/yyyy", "MM-dd-yyyy" };

bool isValid = DateTime.TryParseExact(
    input,
    acceptedFormats,
    CultureInfo.InvariantCulture,
    DateTimeStyles.None,
    out DateTime parsed);
```

---

## Handling time zones

### Option 1: `DateTimeOffset` — preferred when time zone matters

`DateTimeOffset` stores the date, time, and UTC offset together. Use it when you need to accurately represent a moment in time regardless of local machine settings.

```csharp
string input = "2024-03-15T14:30:00+02:00";

if (DateTimeOffset.TryParse(input, out DateTimeOffset dto))
    Console.WriteLine($"UTC: {dto.UtcDateTime}");
```

### Option 2: ISO 8601 with `DateTimeStyles.RoundtripKind`

```csharp
string iso = "2024-03-15T12:00:00Z"; // Z = UTC

bool ok = DateTime.TryParse(
    iso,
    CultureInfo.InvariantCulture,
    DateTimeStyles.RoundtripKind,
    out DateTime utcDate);

Console.WriteLine(utcDate.Kind); // Utc
```

### Option 3: Named time zones with `TimeZoneInfo`

```csharp
string input = "2024-03-15 14:00";
string tzId  = "Eastern Standard Time"; // Windows ID

if (DateTime.TryParseExact(input, "yyyy-MM-dd HH:mm",
    CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime local))
{
    var tz  = TimeZoneInfo.FindSystemTimeZoneById(tzId);
    var utc = TimeZoneInfo.ConvertTimeToUtc(local, tz);
    Console.WriteLine($"UTC: {utc}");
}
```

---

## Validating time-only strings (.NET 6+)

.NET 6 introduced the `TimeOnly` struct:

```csharp
string input = "14:30:00";

if (TimeOnly.TryParse(input, out TimeOnly time))
    Console.WriteLine($"Hour: {time.Hour}, Minute: {time.Minute}");
```

---

## Validating date-only strings (.NET 6+)

```csharp
string input = "2024-03-15";

if (DateOnly.TryParseExact(input, "yyyy-MM-dd", out DateOnly date))
    Console.WriteLine($"Year: {date.Year}");
```

---

## Common pitfalls

| Pitfall | Solution |
|---|---|
| Relying on `DateTime.Parse` — throws on bad input | Use `TryParse` or `TryParseExact` |
| Using machine culture in `TryParse` | Pass `CultureInfo.InvariantCulture` for API inputs |
| Ignoring `DateTimeKind` (Local vs Utc vs Unspecified) | Use `DateTimeOffset` or `DateTimeStyles.RoundtripKind` |
| Accepting ambiguous formats like `01/02/03` | Enforce a single format with `TryParseExact` |
| Not accounting for daylight saving time | Use `TimeZoneInfo.ConvertTime` rather than adding a fixed offset |

---

## Recommended pattern for API input validation

```csharp
public record AppointmentRequest(string Date, string StartTime);

public Appointment Parse(AppointmentRequest req)
{
    if (!DateOnly.TryParseExact(req.Date, "yyyy-MM-dd",
            CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        throw new ArgumentException("Date must be in yyyy-MM-dd format.", nameof(req.Date));

    if (!TimeOnly.TryParseExact(req.StartTime, "HH:mm",
            CultureInfo.InvariantCulture, DateTimeStyles.None, out var time))
        throw new ArgumentException("StartTime must be in HH:mm format.", nameof(req.StartTime));

    return new Appointment(date, time);
}
```
