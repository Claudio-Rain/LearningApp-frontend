# .NET Regular Expressions — Interview Answers

---

## Level 1 — Definition & Basics

### What Regular Expressions Are

---

**Q: L1 What problem does regex solve that `Contains` or `IndexOf` cannot?**

> A regex describes the *shape* of text, not a specific string — it can match "any 5-digit number" or "a word ending in -ing" without hard-coding every possibility. `Contains` and `IndexOf` only work with exact strings; regex handles variable content like validating phone number format or extracting dates where only the structure is fixed.

```csharp
// Contains/IndexOf can't do this:
bool hasPhoneNumber = input.Contains("555-1234"); // only finds exact match

// Regex can:
bool hasAnyPhoneNumber = Regex.IsMatch(input, @"\d{3}-\d{4}");
```

---

**Q: L1 What is the difference between a pattern and a match in regex terminology?**

> The pattern is the rule you write; the match is what the engine finds when it applies that rule to actual input.

The pattern `\d{3}-\d{4}` is a static description — it never changes. A match is the concrete substring `"555-1234"` that the engine located in a real string by following that description. One pattern can produce zero, one, or many matches depending on the input. In .NET, the pattern is a `string` you pass to the `Regex` constructor, and a `Match` is the object you get back representing a single result.

```csharp
string pattern = @"\d{3}-\d{4}"; // The rule (doesn't change)
string input = "Call 555-1234 today"; // The data

var match = Regex.Match(input, pattern);
if (match.Success)
{
    Console.WriteLine(match.Value); // "555-1234" (the match found)
}

// One pattern, many matches
var matches = Regex.Matches(input, pattern);
foreach (Match m in matches)
{
    Console.WriteLine(m.Value); // Each concrete match
}
```

---

**Q: L1 What namespace and class do you use for regex in .NET? How does .NET differ from JavaScript?**

> Use `System.Text.RegularExpressions.Regex`. .NET gives you named groups, compiled patterns, timeouts, and source generators; JavaScript's regex is baked into the language with minimal features. .NET lets you pre-compile, set timeouts to prevent ReDoS, and use `[GeneratedRegex]` for build-time compilation — none of which JS regex supports.

```csharp
using System.Text.RegularExpressions;

// .NET regex with timeout and compiled options
var regex = new Regex(@"\d+", RegexOptions.Compiled, TimeSpan.FromMilliseconds(100));
bool match = regex.IsMatch(input);
```

---

### Vocabulary & Syntax Primitives

---

**Q: L1 Name five metacharacters and explain why some need escaping.**

> Metacharacters have special meaning and describe structure, not literal text. Escape with `\` to match literally. Five key ones: `.` (any char), `*` (zero+), `+` (one+), `^` (start), `$` (end). Example: `example\.com` matches the literal period; without `\`, the period matches any character.

```csharp
// Metacharacters have special meaning
bool match1 = Regex.IsMatch("example.com", @"example.com"); // true (. matches any char)

// Need escaping to match literal
bool match2 = Regex.IsMatch("example.com", @"example\.com"); // true (escaped period)
bool match3 = Regex.IsMatch("exampleXcom", @"example\.com"); // false (literal period required)

// Other metacharacters
bool match4 = Regex.IsMatch("aaa", @"a+"); // true (+ is one or more)
bool match5 = Regex.IsMatch("admin", @"^admin"); // true (^ is start of string)
bool match6 = Regex.IsMatch("admin", @"admin$"); // true ($ is end of string)
```

---

**Q: L1 What is the difference between a greedy and a lazy quantifier? Which is the default in .NET, and when does it matter?**

> Greedy quantifiers consume as much input as possible while still allowing the overall match to succeed; lazy ones consume as little as possible — and greedy is the default in .NET.

Say you have the string `"<b>bold</b>"` and you write `<.+>`. Greedy matching will grab everything from the first `<` to the last `>`, giving you the whole string as one match. The lazy version `<.+?>` stops at the first `>` it can, so you get `<b>` instead. For beginners this is the most common source of "my match grabbed way too much" bugs, and the fix is usually just adding a `?` after the quantifier.

```csharp
string input = "<b>bold</b>";

// Greedy: .+ consumes as much as possible
var greedyMatch = Regex.Match(input, @"<.+>");
Console.WriteLine(greedyMatch.Value); // "<b>bold</b>" (entire string)

// Lazy: .+? consumes as little as possible
var lazyMatch = Regex.Match(input, @"<.+?>");
Console.WriteLine(lazyMatch.Value); // "<b>" (stops at first >)
```

---

**Q: L1 When should you choose regex vs. a custom parser?**

> Use regex for flat, well-defined patterns (phone numbers, timestamps, simple formats). Use a parser for recursive structures (HTML, JSON, balanced delimiters) or when you need good error messages. Rule of thumb: if you can describe it in one sentence, regex is fine; if you need a grammar, use a parser.

```csharp
// Good: regex for flat patterns
bool validPhone = Regex.IsMatch("555-1234", @"^\d{3}-\d{4}$");
bool validEmail = Regex.IsMatch("user@example.com", @"^[^@]+@[^@]+\.[^@]+$");

// Bad: regex for recursive structures (breaks on nesting)
var jsonRegex = new Regex(@"\{.*\}");
bool badJson = jsonRegex.IsMatch("{\"nested\":{\"key\":\"value\"}}"); // Wrong!

// Good: parser for recursive structures
var doc = JsonDocument.Parse("{\"nested\":{\"key\":\"value\"}}");
var value = doc.RootElement.GetProperty("nested").GetProperty("key").GetString();
```

---

## Level 2 — Core Concepts

### Anchors

---

**Q: L2 What's the practical difference between `^` and `\A` in .NET?**

> Anchors are zero-width assertions matching positions, not characters. `^` matches the string start or after a newline (with `Multiline`); `\A` always matches only the absolute start. Use `\A` for safer validation since it won't be affected if `Multiline` is enabled later.

```csharp
string input = "admin\nextraline";

// ^ matches after newline with Multiline flag
bool match1 = Regex.IsMatch(input, @"^admin", RegexOptions.Multiline); // true
bool match2 = Regex.IsMatch(input, @"^admin"); // false

// \A always matches only absolute start
bool match3 = Regex.IsMatch(input, @"\Aadmin"); // false (safer for validation)
```

---

**Q: L2 A colleague uses `^admin$` but `"admin\nextraline"` passes validation. What's wrong?**

> `RegexOptions.Multiline` is active, causing `^` and `$` to match around embedded newlines. Fix: use `\A` and `\Z` which anchor to the absolute string boundaries regardless of options.

```csharp
string input = "admin\nextraline";

// Bug: ^ and $ match around newlines
bool bug = Regex.IsMatch(input, @"^admin$", RegexOptions.Multiline); // true (wrong!)

// Fix: use \A and \Z
bool fixed = Regex.IsMatch(input, @"\Aadmin\Z"); // false (correct)
```

---

**Q: L2 When would you prefer `\Z` over `$` as a terminal anchor?**

> Use `\Z` to allow an optional trailing newline; use `\z` to disallow it. `$` behavior varies by mode, so it's unreliable for strict format validation. Use `\Z`/`\z` for consistency.

```csharp
string input1 = "admin";
string input2 = "admin\n";

// \Z allows optional trailing newline
bool match1 = Regex.IsMatch(input1, @"admin\Z"); // true
bool match2 = Regex.IsMatch(input2, @"admin\Z"); // true

// \z disallows trailing newline
bool match3 = Regex.IsMatch(input1, @"admin\z"); // true
bool match4 = Regex.IsMatch(input2, @"admin\z"); // false
```

---

### Character Classes & Quantifiers

---

**Q: L2 What is the difference between `\d`, `[0-9]`, and `[^\D]`? Are they always equivalent in .NET?**

> `\d` matches Unicode digits (Arabic-Indic included); `[0-9]` matches only ASCII 0–9. `[^\D]` is equivalent to `\d` (double negative). For ASCII validation, use `[0-9]` explicitly.

```csharp
string arabicDigit = "٥"; // Arabic-Indic 5

// \d matches Unicode digits
bool match1 = Regex.IsMatch(arabicDigit, @"\d"); // true

// [0-9] matches only ASCII
bool match2 = Regex.IsMatch(arabicDigit, @"[0-9]"); // false

// [^\D] is equivalent to \d (double negative)
bool match3 = Regex.IsMatch(arabicDigit, @"[^\D]"); // true
```

---

**Q: L2 Explain `{n}`, `{n,}`, and `{n,m}`. Write a US ZIP code pattern.**

> `{n}` is exact, `{n,}` is "at least n," `{n,m}` is range. US ZIP code: `\d{5}(-\d{4})?`. The optional group is correct because `\d{5,9}` would incorrectly match 6–8 digit strings.

```csharp
bool isValidZip = Regex.IsMatch(input, @"^\d{5}(-\d{4})?$");
```

---

**Q: L2 Match `colour` or `color`. What's the most readable way?**

> `colou?r` is most readable for single-character variants. Use alternation `colour|color` for more different variants — it's clearer in intent despite tiny engine overhead.

```csharp
string input1 = "color";
string input2 = "colour";

// Single-character optional: most readable
bool match1 = Regex.IsMatch(input1, @"colou?r"); // true
bool match2 = Regex.IsMatch(input2, @"colou?r"); // true

// Alternation: clearer for larger differences
bool match3 = Regex.IsMatch(input1, @"colour|color"); // true
```

---

### Groups & Capturing

---

**Q: L2 When do you use capturing `(...)` vs. non-capturing `(?:...)`?**

> A capturing group stores its matched text in `Match.Groups` so you can retrieve it; a non-capturing group just provides grouping for quantifiers or alternation without the overhead of storing the result.

I use `(?:...)` whenever I need grouping for structure — like `(?:red|blue)+` — but don't actually need to extract what was matched. It's slightly faster because the engine doesn't allocate a capture, and it keeps your `Groups` collection clean so the indices of the captures you *do* care about don't shift unexpectedly.

```csharp
string input = "red red blue";

// Capturing group: stores matches
var captureMatch = Regex.Match(input, @"(red|blue)+");
Console.WriteLine(captureMatch.Groups[1].Value); // "blue" (last match)

// Non-capturing group: just groups, doesn't store
var nonCaptureMatch = Regex.Match(input, @"(?:red|blue)+");
// Only Groups[0] exists (the whole match)
```

---

**Q: L2 How do you define and use named groups in .NET?**

> Named groups let you refer to captures by a meaningful name instead of a numeric index, defined with `(?<name>...)` and accessed via `match.Groups["name"]`.

In a pattern like `(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})`, you can write `match.Groups["year"].Value` instead of `match.Groups[1].Value`. This matters enormously in long patterns — if you later add or remove a group earlier in the pattern, all your numeric indices shift, but named references stay correct. It's one of those small things that makes regex maintainable at scale.

```csharp
var m = Regex.Match("2024-01-15", @"(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})");
string year = m.Groups["year"].Value; // "2024"
```

---

**Q: L2 What problem does a backreference solve that a repeated group cannot?**

> A backreference matches the exact same text that a capturing group already matched — not just the same pattern — so it can enforce that two parts of the input are identical.

The classic example is detecting repeated words: `\b(\w+)\s+\1\b` matches "the the" because `\1` requires the second word to be the exact same string as the first, not merely another word. A repeated group like `(\w+)\s+(\w+)` would match "the cat" too. Backreferences are also used to match balanced quotes: `(['"])[^'"]*\1` ensures the opening and closing quote are the same character.

```csharp
// Backreference: matches exact same text
bool repeatWord1 = Regex.IsMatch("the the", @"\b(\w+)\s+\1\b"); // true
bool repeatWord2 = Regex.IsMatch("the cat", @"\b(\w+)\s+\1\b"); // false

// Repeated group: just matches same pattern
bool repeatedGroup = Regex.IsMatch("the cat", @"(\w+)\s+(\w+)"); // true (not what we want)

// Balanced quotes using backreference
bool quotes1 = Regex.IsMatch("\"hello\"", @"(['\""])[^'""]*\1"); // true
bool quotes2 = Regex.IsMatch("\"hello'", @"(['\""])[^'""]*\1"); // false
```

---

## Level 3 — Practical Usage

### Validation with Regex.IsMatch

---

**Q: L3 When should you use static vs. instance `Regex.IsMatch`?**

> Static overload is fine for one-off calls. For hot paths, use `static readonly Regex` with `RegexOptions.Compiled` to avoid repeated parsing overhead.

```csharp
private static readonly Regex EmailRegex = new(
    @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    RegexOptions.Compiled | RegexOptions.IgnoreCase);

bool isValid = EmailRegex.IsMatch(input);
```

---

**Q: L3 When should you validate regex patterns?**

> Construct all patterns at startup, not lazily in request handlers. Invalid patterns throw `ArgumentException` immediately, catching errors before traffic hits. Use a health check or initialization method to validate all patterns early.

```csharp
// Good: validate at startup
private static readonly Regex EmailRegex;

static MyClass()
{
    try
    {
        EmailRegex = new Regex(@"^[^@]+@[^@]+\.[^@]+$");
    }
    catch (ArgumentException ex)
    {
        throw new InvalidOperationException("Invalid email regex", ex);
    }
}

// Bad: lazy validation in request handler
public bool ValidateEmail(string email)
{
    var regex = new Regex(userSuppliedPattern); // Throws during request!
    return regex.IsMatch(email);
}
```

---

**Q: L3 Your email validator accepts `"a@b@c.com"`. Fix it.**

> The pattern allows `@` in the wrong places. Fix: use `^[^@\s]+@[^@\s]+\.[^@\s]+$` to exclude `@` from both local and domain parts. Add a test case for this regression.

```csharp
// Bug: allows @ in domain part
var badRegex = new Regex(@"^.+@.+\..+$");
bool badResult = badRegex.IsMatch("a@b@c.com"); // true (wrong!)

// Fixed: excludes @ from both parts
var goodRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$");
bool goodResult1 = goodRegex.IsMatch("user@example.com"); // true
bool goodResult2 = goodRegex.IsMatch("a@b@c.com"); // false (correct)
```

---

### Replacement with Regex.Replace

---

**Q: L3 How does `Regex.Replace` differ from `string.Replace`?**

> `string.Replace` handles fixed strings; `Regex.Replace` handles patterns and backreferences. Example: replace any digit sequence with `@"\d+"` — something `string.Replace` can't do.

```csharp
string redacted = Regex.Replace(logLine, @"\d+", "***");
```

---

**Q: L3 Explain replacement patterns like `$1` and `${name}`.**

> Replacement patterns reference captured groups: `$1` for positional, `${name}` for named groups. Use named groups for clarity.

```csharp
string result = Regex.Replace(
    input,
    @"(?<month>\d{2})/(?<day>\d{2})/(?<year>\d{4})",
    "${year}-${month}-${day}");
```

The replacement string `"${year}-${month}-${day}"` is evaluated by the regex engine, not by C# string interpolation — they look similar but are different mechanisms. Using named groups here is far more readable than `$3-$1-$2`, especially when the pattern changes.

---

**Q: L3 When is the `MatchEvaluator` overload of `Regex.Replace` necessary?**

> Use `MatchEvaluator` when replacement requires logic: dictionary lookups, arithmetic, or transformation. Replacement patterns can only rearrange captured text, not transform it.

```csharp
string result = Regex.Replace(input, @"\d+", m =>
    (int.Parse(m.Value) * 2).ToString());
```

---

### Splitting with Regex.Split

---

**Q: L3 What can `Regex.Split` do that `string.Split` cannot?**

> `Regex.Split` handles variable-width delimiters; `string.Split` only handles fixed strings. For complex cases like CSV parsing with quoted fields, use a dedicated library like `CsvHelper` — regex becomes too fragile.

```csharp
// Simplified: splits on commas outside of double-quoted segments
var parts = Regex.Split(line, @",(?=(?:[^""]*""[^""]*"")*[^""]*$)");
```

---

**Q: L3 What happens to captured groups inside the split pattern? Show an example.**

> Capturing groups in the split pattern include their matches in the output. `Regex.Split("one,two,three", "(,)")` returns `["one", ",", "two", ",", "three"]`. Use `(?:,)` (non-capturing) to exclude delimiters.

```csharp
var parts = Regex.Split("one,two,three", "(,)");
// ["one", ",", "two", ",", "three"]
```

---

**Q: L3 What does `Regex.Split` return when input starts/ends with the delimiter?**

> You get empty strings at boundaries: `Regex.Split(",a,b,", ",")` returns `["", "a", "b", ""]`. Filter with `.Where(s => !string.IsNullOrEmpty(s))` if needed.

```csharp
var result = Regex.Split(",a,b,", ",");
// Result: ["", "a", "b", ""]

// Filter empty strings
var filtered = Regex.Split(",a,b,", ",")
    .Where(s => !string.IsNullOrEmpty(s))
    .ToArray();
// Result: ["a", "b"]
```

---

### Parsing with Groups

---

**Q: L3 Given the log line `"[2024-01-15 14:32:01] ERROR UserService: Timeout after 30s"`, write a pattern and C# code to extract date, level, service, and message.**

> Use named groups to make each captured segment self-describing, then access them by name off the `Match.Groups` collection.

```csharp
var pattern = new Regex(
    @"\[(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (?<level>\w+) (?<service>\w+): (?<message>.+)",
    RegexOptions.Compiled);

var m = pattern.Match(line);
if (m.Success)
{
    string date    = m.Groups["date"].Value;
    string level   = m.Groups["level"].Value;
    string service = m.Groups["service"].Value;
    string message = m.Groups["message"].Value;
}
```

---

**Q: L3 Prefer `Groups[1]` or `Groups["date"]` in production?**

> Always use named groups. Positional indices break silently when groups are added or reordered; named groups stay correct. Use `Groups["date"]` for maintainability.

```csharp
var pattern = new Regex(@"(?<date>\d{4})-(?<month>\d{2})");
var m = pattern.Match("2024-01");

// Fragile: breaks if you add a group at position 1
string dateByIndex = m.Groups[1].Value; // "2024"

// Robust: stays correct when pattern changes
string dateByName = m.Groups["date"].Value; // "2024"
```

---

**Q: L3 How do you iterate over all matches in a string, and what method do you use?**

> Use `Regex.Matches` which returns a `MatchCollection` for direct iteration. Use `EnumerateMatches` in .NET 7+ for span-based efficiency.

```csharp
foreach (Match m in Regex.Matches(input, @"\d+"))
{
    Console.WriteLine(m.Value);
}
```

---

## Level 4 — Common Pitfalls

### Catastrophic Backtracking

---

**Q: L4 What is catastrophic backtracking? How does it happen?**

> Nested or ambiguous quantifiers cause exponential backtracking. Example: `(a+)+` against `"aaaaaab"` tries all ways to split the `a`s before failing. Root cause: two quantifiers competing for the same characters, creating redundant paths.

```csharp
// Catastrophic backtracking: nested quantifiers
var badRegex = new Regex(@"(a+)+b");
badRegex.IsMatch("aaaaaab"); // Fast
badRegex.IsMatch("aaaaaaa"); // VERY SLOW (exponential backtracking)

// Fixed: use atomic group or single quantifier
var goodRegex = new Regex(@"(?>a+)b");
goodRegex.IsMatch("aaaaaaa"); // Fast (fails immediately)
```

---

**Q: L4 A validator causes CPU spikes. How do you fix it?**

> Test with adversarial input (long repeating characters). Set `Regex.MatchTimeout` to prevent hangs. Fix: eliminate nested quantifiers, use atomic groups `(?>...)`, or restructure the pattern.

```csharp
// Vulnerable pattern with timeout
try
{
    var regex = new Regex(@"(x+)+y", RegexOptions.None, TimeSpan.FromMilliseconds(100));
    regex.IsMatch("xxxxxxxxxxxxxxxxxxxxx"); // Times out, throws exception
}
catch (RegexMatchTimeoutException)
{
    Console.WriteLine("Pattern took too long - likely catastrophic backtracking");
}

// Fixed pattern: atomic group prevents backtracking
var safeRegex = new Regex(@"(?>x+)y", RegexOptions.None, TimeSpan.FromMilliseconds(100));
safeRegex.IsMatch("xxxxxxxxxxxxxxxxxxxxx"); // Fast, returns false
```

---

**Q: L4 What is an atomic group `(?>...)` in the context of preventing backtracking?**

> An atomic group prevents backtracking: once matched, it commits and won't retry alternatives. Example: `(?>a+)b` against `"aaa"` fails immediately instead of retrying with fewer `a`s. This eliminates exponential backtracking paths.

```csharp
// Without atomic group: backtracks
var noAtomic = new Regex(@"(a+)b");
bool result1 = noAtomic.IsMatch("aaaa"); // false (backtracks through many states)

// With atomic group: fails immediately
var atomic = new Regex(@"(?>a+)b");
bool result2 = atomic.IsMatch("aaaa"); // false (no backtracking)

// Atomic group commits and won't give back matches
bool result3 = noAtomic.IsMatch("aaab"); // true (a+ gives back 1 'a' to match 'b')
bool result4 = atomic.IsMatch("aaab"); // false (a+ won't give back any)
```

---

### Multiline & Culture Traps

---

**Q: L4 `^` only matches the entire string start, not each line. Why?**

> Add `RegexOptions.Multiline`. Without it, `^` and `$` only match string boundaries, not line boundaries. With it, `^` matches after every `\n`.

```csharp
var matches = Regex.Matches(input, @"^\w+", RegexOptions.Multiline);
```

---

**Q: L4 Does `IgnoreCase` behave differently across cultures for non-ASCII characters?**

> Yes. `IgnoreCase` uses current culture by default. German `ß` uppercases to `SS` in some cultures. Always pair `IgnoreCase` with `CultureInvariant` for server-side code unless you need culture-sensitive matching.

```csharp
string germanChar = "ß"; // German eszett

// Culture-dependent: may match or not depending on locale
var cultureDependent = new Regex("ss", RegexOptions.IgnoreCase);
bool match1 = cultureDependent.IsMatch(germanChar); // Varies by culture

// Culture-invariant: consistent across all locales
var cultureInvariant = new Regex("ss", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
bool match2 = cultureInvariant.IsMatch(germanChar); // Consistent behavior
```

---

**Q: L4 What does `Singleline` do? Why combine it with `Multiline`?**

> `Singleline` makes `.` match newlines; `Multiline` makes `^`/`$` work per-line. They control different things and can be combined. Use both when you want per-line anchors and `.` spanning lines.

```csharp
string input = "line1\nline2\nline3";

// Singleline: . matches newlines
var singleline = new Regex(@"line1.*line3", RegexOptions.Singleline);
bool match1 = singleline.IsMatch(input); // true (. matches \n)

// Multiline: ^ and $ work per-line
var multiline = new Regex(@"^line2$", RegexOptions.Multiline);
bool match2 = multiline.IsMatch(input); // true (^ and $ match line boundaries)

// Both: . spans lines AND ^ and $ work per-line
var both = new Regex(@"^line1.*line3$", RegexOptions.Singleline | RegexOptions.Multiline);
bool match3 = both.IsMatch(input); // true
```

---

### Static API Misuse

---

**Q: L4 Is `static readonly Regex` thread-safe?**

> Yes, `static readonly Regex` is thread-safe. Instances are thread-safe for read operations (`Match`, `IsMatch`, etc.). Match state lives in separate objects per call, not on the Regex instance.

```csharp
private static readonly Regex EmailRegex = new(@"^[^@]+@[^@]+\.[^@]+$", RegexOptions.Compiled);

// Safe to call from multiple threads simultaneously
Task task1 = Task.Run(() => EmailRegex.IsMatch("user1@example.com"));
Task task2 = Task.Run(() => EmailRegex.IsMatch("user2@example.com"));
Task task3 = Task.Run(() => EmailRegex.IsMatch("user3@example.com"));

Task.WaitAll(task1, task2, task3); // No race conditions
```

---

**Q: L4 What is the internal cache maintained by static `Regex` methods, and what happens when you exceed its default size?**

> Static methods cache 15 patterns. For high-throughput, pre-create `static readonly Regex` with `RegexOptions.Compiled` instead of relying on the cache.

```csharp
// Relying on cache: OK for occasional patterns
bool match1 = Regex.IsMatch("test", @"\w+"); // Cached

// Problem: cache miss after 15+ patterns - old patterns evicted
for (int i = 0; i < 20; i++)
{
    bool match = Regex.IsMatch("test", $@"pattern{i}"); // Patterns 1-5 evicted
}

// Solution: use static readonly for hot patterns
private static readonly Regex HotRegex = new(@"frequently-used-pattern", RegexOptions.Compiled);

bool match2 = HotRegex.IsMatch("test"); // Always ready, compiled once
```

---

## Level 5 — Internals & Deep Mechanics


### Compiled Regular Expressions

---

**Q: L5 What does `Compiled` do? What are the trade-offs?**

> `Compiled` JIT-compiles to IL for faster matching but costs 10–100x more to construct. Only use for patterns repeated hundreds+ times. Best for `static readonly` in hot paths.

```csharp
// Interpreted (default): fast to construct, slower to match
var interpreted = new Regex(@"\d{3}-\d{4}");
for (int i = 0; i < 1000; i++)
{
    interpreted.IsMatch("555-1234"); // Slower per match
}

// Compiled: slow to construct, faster to match
var compiled = new Regex(@"\d{3}-\d{4}", RegexOptions.Compiled);
for (int i = 0; i < 1000; i++)
{
    compiled.IsMatch("555-1234"); // Faster per match - amortizes construction cost
}

// Best practice: static readonly compiled for hot paths
private static readonly Regex PhoneRegex = new(@"\d{3}-\d{4}", RegexOptions.Compiled);
```

---

**Q: L5 Should you use `Compiled` for dynamically constructed patterns?**

> No. JIT cost is paid on every construction, so you can't amortize it across executions. Use interpreted mode, rely on static cache, and add `MatchTimeout` for user-supplied patterns.

```csharp
// Bad: user-supplied patterns with Compiled
public bool ValidateWithUserPattern(string userPattern, string input)
{
    var regex = new Regex(userPattern, RegexOptions.Compiled); // JIT cost every call!
    return regex.IsMatch(input);
}

// Good: user-supplied patterns without Compiled, with timeout
public bool ValidateWithUserPattern(string userPattern, string input)
{
    try
    {
        var regex = new Regex(userPattern, RegexOptions.None, TimeSpan.FromMilliseconds(100));
        return regex.IsMatch(input);
    }
    catch (RegexMatchTimeoutException)
    {
        return false; // Pattern took too long
    }
}
```

---

**Q: L5 How does `[GeneratedRegex]` differ from `Compiled`?**

> `[GeneratedRegex]` generates code at build time with zero runtime cost and Native AOT support. `Compiled` JITs at runtime and doesn't work with AOT. Use `[GeneratedRegex]` for static patterns.

```csharp
[GeneratedRegex(@"\d{4}-\d{2}-\d{2}", RegexOptions.Compiled)]
private static partial Regex DateRegex();
```

---

**Q: L5 How do you compile a regex pattern to assembly at build time? What are the benefits?**

> Use `[GeneratedRegex]` source generator attribute on a partial method. The C# compiler generates optimized IL code at build time, giving you compiled-speed regex with zero runtime overhead. Benefits: works with Native AOT, no JIT cost, fastest matching for static patterns.

```csharp
[GeneratedRegex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")]
private static partial Regex EmailRegex();

// Use it:
bool isValid = EmailRegex().IsMatch(input);
```

---

### Engine Configuration & Timeout

---

**Q: L5 How do you set a timeout on `Regex`? What's a good value?**

> Pass `TimeSpan` as the third constructor argument. Use 100–500ms for user-facing endpoints.

```csharp
var regex = new Regex(pattern, RegexOptions.Compiled, TimeSpan.FromMilliseconds(200));
```

Catch `RegexMatchTimeoutException` and treat as failed match or return 400.

---

**Q: L5 What is `Regex.InfiniteMatchTimeout`, when would you pass it, and what risk does it carry?**

> Use `InfiniteMatchTimeout` only for offline pipelines where you control all inputs. Risk: thread hangs if later used with adversarial input. Always set a real timeout for external input.

```csharp
// Good: offline pipeline with trusted data
var offlineRegex = new Regex(@"complex-pattern", Regex.InfiniteMatchTimeout);
offlineRegex.IsMatch(trustedData); // Safe - data is controlled

// Bad: external input with infinite timeout
var dangerousRegex = new Regex(@"(x+)+y", Regex.InfiniteMatchTimeout);
dangerousRegex.IsMatch(userInput); // RISK: could hang thread!

// Safe: external input with timeout
var safeRegex = new Regex(@"(x+)+y", RegexOptions.None, TimeSpan.FromMilliseconds(100));
try
{
    safeRegex.IsMatch(userInput); // Protected
}
catch (RegexMatchTimeoutException)
{
    // Handle timeout gracefully
}
```

---

**Q: L5 Can you set a process-wide default timeout for all `Regex` calls?**

> Yes. Set `REGEX_DEFAULT_MATCH_TIMEOUT` via `AppDomain.CurrentDomain.SetData`. It applies to all instances without explicit timeouts and doesn't override explicit values.

```csharp
AppDomain.CurrentDomain.SetData(
    "REGEX_DEFAULT_MATCH_TIMEOUT",
    TimeSpan.FromMilliseconds(500));
```

---

## Level 6 — Trade-offs & Design Decisions

### Regex vs. Alternatives

---

**Q: L6 Why shouldn't you use regex to parse XML?**

> XML is recursive and context-sensitive — regex can't model it correctly. Use `XDocument` or `XmlReader` instead. Regex breaks on namespaces, CDATA, entity encoding, and nested structures.

```csharp
string xml = "<root><item>nested <sub>data</sub></item></root>";

// Bad: regex can't handle nested structures
var badRegex = new Regex(@"<item>(.*?)</item>");
var badMatch = badRegex.Match(xml); // Might miss nesting or CDATA

// Good: use XDocument for proper XML parsing
var doc = XDocument.Parse(xml);
var items = doc.Descendants("item").Select(x => x.Value);
// Properly handles nesting, namespaces, entity encoding
```

---

**Q: L6 When should you use `StartsWith`/`EndsWith` instead of regex?**

> Use `StartsWith`/`EndsWith` for fixed strings — faster, clearer, no compilation overhead. Use regex only when the pattern is genuinely variable.

```csharp
string input = "https://example.com";

// Good: fixed string, use StartsWith
if (input.StartsWith("https://"))
{
    // Is secure connection
}

// Bad: overkill regex for fixed string
var regex = new Regex(@"^https://");
if (regex.IsMatch(input))
{
    // Is secure connection (slower, less readable)
}

// Good: variable pattern, use regex
bool hasProtocol = Regex.IsMatch(input, @"^(https?|ftp)://");
```

---

**Q: L6 For a tokenizer with 20 token types, would you use one large alternation pattern or 20 separate patterns?**

> Use one pattern with 20 named alternatives — single pass is faster than 20 sequential patterns. Order matters: longer/more-specific tokens first (e.g., `!=` before `!`). Use verbose mode for readability.

```csharp
// Bad: 20 separate patterns (20 scans per token)
var patterns = new[] { 
    new Regex(@"!="), 
    new Regex(@"!"), 
    new Regex(@"=="),
    // ... 17 more patterns
};
foreach (var pattern in patterns)
{
    if (pattern.IsMatch(input)) { /* process */ }
}

// Good: one pattern with 20 alternatives (1 scan per token)
var tokenizer = new Regex(@"!=|==|!|=|\+|-|\*|/|[a-zA-Z_]\w*|\d+", RegexOptions.Compiled);
var match = tokenizer.Match(input);
if (match.Success)
{
    string token = match.Value;
}
```

---

### Pattern Design & Maintainability

---

**Q: L6 How does verbose mode (`IgnorePatternWhitespace`) improve maintainability?**

> Verbose mode (`IgnorePatternWhitespace`) lets you add whitespace and comments (lines starting with `#`) for readability.

```csharp
// Before
var r = new Regex(@"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$");

// After
var r = new Regex(@"
    ^
    (?<year>  \d{4}) -
    (?<month> \d{2}) -
    (?<day>   \d{2}) T
    (?<hour>  \d{2}) :
    (?<min>   \d{2}) :
    (?<sec>   \d{2})
    $",
    RegexOptions.IgnorePatternWhitespace);
```

The after version is self-documenting in a way that a 40-character wall of regex never is. The trade-off is that any literal space you want to match must be escaped as `\ ` or `[ ]`, which catches people off guard. For any pattern longer than about 30 characters that you'll maintain over time, verbose mode is worth it.

---

**Q: L6 How do you safely refactor a complex regex?**

> Write a characterization test suite first (valid, invalid, edge cases), then refactor incrementally. Each change should be a no-op against the suite. Use verbose mode and named groups for clarity.

```csharp
// Test suite first
var tests = new[] {
    ("2024-01-15", true),
    ("2024-1-15", false),
    ("invalid", false),
    ("2024-13-01", false), // edge case
};

// Original pattern
var original = new Regex(@"^\d{4}-\d{2}-\d{2}$");

// Refactor with verbose mode (all tests must still pass)
var refactored = new Regex(@"
    ^
    \d{4}      # year
    -
    \d{2}      # month
    -
    \d{2}      # day
    $",
    RegexOptions.IgnorePatternWhitespace);

// Verify: both patterns match same inputs
foreach (var (input, expected) in tests)
{
    Debug.Assert(original.IsMatch(input) == refactored.IsMatch(input));
}
```

---

**Q: L6 When is it appropriate to reject a regex-based solution in a code review and ask for a parser instead?**

> Reject regex for recursive grammars (HTML, JSON), patterns >60 chars with nested groups, or repeatedly patched edge cases. Use a parser instead.

```csharp
// Bad: regex for JSON (recursive structure)
var jsonRegex = new Regex(@"^{.*}$"); // Broken! Can't handle nesting
jsonRegex.IsMatch("{\"nested\":{\"key\":\"value\"}}"); // Wrong result

// Good: use parser
var json = JsonDocument.Parse("{\"nested\":{\"key\":\"value\"}}");
var value = json.RootElement.GetProperty("nested").GetProperty("key").GetString();

// Bad: huge regex with many nested groups (hard to maintain)
var complexRegex = new Regex(@"((\w+)@((\w+)(\.(\w+)){1,2})|((\d{1,3}\.){3}\d{1,3}))", RegexOptions.Compiled);

// Good: use parser or break into smaller functions
bool isEmail = Regex.IsMatch(input, @"^[^@]+@[^@]+\.[^@]+$");
bool isIP = Regex.IsMatch(input, @"^(\d{1,3}\.){3}\d{1,3}$");
```

---

### Security Considerations

---

**Q: L6 How do you prevent ReDoS attacks from user-supplied patterns?**

> Defense in depth: Use `Regex.Escape` for literal matching, always set `MatchTimeout` (100–500ms), and limit allowed syntax (no quantifiers/groups if not needed).

```csharp
// Defense 1: Escape for literal matching
string userSearchTerm = "(x+)+y"; // User input
string pattern = Regex.Escape(userSearchTerm); // Escapes metacharacters
var regex = new Regex(pattern); // Now safe - matches literal string

// Defense 2: Always use timeout for user input
try
{
    var userPattern = new Regex(userInput, RegexOptions.None, TimeSpan.FromMilliseconds(100));
    bool match = userPattern.IsMatch(data);
}
catch (RegexMatchTimeoutException)
{
    Console.WriteLine("Pattern exceeded timeout limit");
}

// Defense 3: Limit syntax allowed from users
bool ValidateUserPattern(string pattern)
{
    // Reject quantifiers, backreferences, etc.
    if (Regex.IsMatch(pattern, @"[+*{\\]"))
    {
        throw new ArgumentException("Complex patterns not allowed");
    }
    return true;
}
```

---

**Q: L6 How does `Regex.Escape` work, and why is it not a complete solution to the regex injection problem?**

> `Regex.Escape` escapes metacharacters to embed user data as literals. But if users provide patterns themselves, escaping breaks their syntax. Use `Regex.Escape` only for literal matching, not for user-written patterns.

```csharp
// Good: user provides search term, not pattern
string userSearchTerm = "(special)"; // User input
string escapedTerm = Regex.Escape(userSearchTerm); // "(special)" -> "\\(special\\)"
var regex = new Regex(escapedTerm);
bool match = regex.IsMatch("(special)"); // true - matches literal string

// Bad: user provides pattern, escaping breaks it
string userPattern = @"\d+"; // User wants digit pattern
string escapedPattern = Regex.Escape(userPattern); // "\d+" -> "\\d\\+"
var badRegex = new Regex(escapedPattern);
bool match2 = badRegex.IsMatch("123"); // false - looking for literal "\d+"

// Solution for user patterns: use timeout + validation
var userSuppliedPattern = new Regex(userPattern, RegexOptions.None, TimeSpan.FromMilliseconds(100));
```

---

