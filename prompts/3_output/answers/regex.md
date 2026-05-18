# .NET Regular Expressions — Interview Answers

---

## Level 1 — Definition & Basics

### What Regular Expressions Are

---

**Q: How would you explain a regular expression to a colleague who has never used one? What problem does it solve that simple string methods like `Contains` or `IndexOf` cannot?**

> **Bottom line:** A regex is a pattern language that describes the *shape* of text you're looking for, not a specific string — so it can match things like "any 5-digit number" or "a word ending in -ing" without you hard-coding every possibility.

**Elaboration:** `Contains` and `IndexOf` are great when you know the exact string, but they fall apart the moment the content is variable — like validating that a phone number has the right format, or extracting a date from a log line where only the structure is fixed. A regex lets you express that structure once and apply it to any input. It's like the difference between asking "does this contain the word 'cat'?" versus "does this match the pattern of an animal name followed by a number?"

---

**Q: What is the difference between a pattern and a match in regex terminology?**

> **Bottom line:** The pattern is the rule you write; the match is what the engine finds when it applies that rule to actual input.

**Elaboration:** The pattern `\d{3}-\d{4}` is a static description — it never changes. A match is the concrete substring `"555-1234"` that the engine located in a real string by following that description. One pattern can produce zero, one, or many matches depending on the input. In .NET, the pattern is a `string` you pass to the `Regex` constructor, and a `Match` is the object you get back representing a single result.

---

**Q: In .NET, which namespace and primary class do you use to work with regular expressions, and why is it worth knowing that distinction over, say, using regex in JavaScript?**

> **Bottom line:** You use `System.Text.RegularExpressions.Regex` — and the key distinction is that .NET gives you a full object model with named groups, compiled patterns, and timeouts, whereas JavaScript's regex is baked into the language with far fewer knobs.

**Elaboration:** In JavaScript you mostly work with regex literals and a handful of string methods. In .NET, `Regex` is a first-class class with instance methods, static methods, `RegexOptions`, and even source generators. That matters because you can do things like pre-compile a pattern once and reuse it across threads, set a match timeout to prevent ReDoS attacks, or use `[GeneratedRegex]` to move compilation entirely to build time. Those capabilities simply don't exist in JS regex.

---

### Vocabulary & Syntax Primitives

---

**Q: Without writing a full pattern, name five regex metacharacters and describe what each one means. Why do you need to escape some of them?**

> **Bottom line:** Metacharacters are characters with special meaning in a pattern — they describe structure rather than matching themselves literally, which is why you have to escape them with `\` when you actually want the literal character.

**Elaboration:** The five I reach for most are: `.` (any character except newline), `*` (zero or more of the preceding element), `^` (start of string or line), `$` (end of string or line), and `+` (one or more of the preceding element). If you want to match a literal period in a URL like `example.com`, you must write `example\.com` — without the backslash, `.` matches any character, and `exampleXcom` would also be a valid match.

---

**Q: What is the difference between a greedy and a lazy quantifier? Which is the default in .NET, and when does it matter?**

> **Bottom line:** Greedy quantifiers consume as much input as possible while still allowing the overall match to succeed; lazy ones consume as little as possible — and greedy is the default in .NET.

**Elaboration:** Say you have the string `"<b>bold</b>"` and you write `<.+>`. Greedy matching will grab everything from the first `<` to the last `>`, giving you the whole string as one match. The lazy version `<.+?>` stops at the first `>` it can, so you get `<b>` instead. For beginners this is the most common source of "my match grabbed way too much" bugs, and the fix is usually just adding a `?` after the quantifier.

---

**Q: When would you choose a regular expression over a custom parsing method, and when would you choose the opposite?**

> **Bottom line:** I reach for regex when the structure is well-defined, bounded, and doesn't nest — and I write a parser when the grammar is recursive, context-sensitive, or when I need good error messages.

**Elaboration:** Regex is great for things like validating a phone number format, extracting a timestamp from a log line, or stripping HTML attributes from a known simple template. But the moment the structure is recursive — like actual HTML, JSON, or even balanced parentheses — regex becomes fragile and hard to reason about. My rule is: if I can describe the pattern in one sentence, regex is fine; if I need a grammar, I write a parser or use an existing library.

---

## Level 2 — Core Concepts

### Anchors

---

**Q: What is an anchor, and what does it match against? Give two examples and explain the practical difference between `^` and `\A` in .NET.**

> **Bottom line:** An anchor is a zero-width assertion — it matches a position in the string, not a character — and the difference between `^` and `\A` is that `^` can match after a newline when `RegexOptions.Multiline` is set, but `\A` always and only matches the very start of the string.

**Elaboration:** Zero-width means consuming no characters; anchors just assert "we are at this position right now." `$` and `\Z`/`\z` are the counterparts for the end. In practice, if you're validating that an entire input starts with something specific, `\A` is safer — you're explicitly saying "the absolute beginning," and you won't be surprised if someone enables `Multiline` later.

---

**Q: A colleague writes `^admin$` to validate a username but users pass with values like `"admin\nextraline"`. What is happening and how do you fix it?**

> **Bottom line:** `RegexOptions.Multiline` is active somewhere (or the developer is surprised by default behavior), causing `^` and `$` to match around embedded newlines — the fix is to use `\A` and `\Z` instead.

**Elaboration:** With `Multiline`, `^` matches after every `\n`, so `"admin\nextraline"` has a valid `^admin$` match on the first line. Swapping to `\Aadmin\Z` anchors to the absolute start and end of the string regardless of options. Alternatively, you can explicitly not pass `RegexOptions.Multiline`, but anchoring with `\A`/`\Z` is more defensive and self-documenting.

---

**Q: When would you prefer `\Z` over `$` as a terminal anchor?**

> **Bottom line:** Use `\Z` when you want to allow an optional trailing newline but nothing else — `$` in singleline/default mode can match before a trailing `\n`, but `\Z` only matches at the very end or before that one final newline.

**Elaboration:** It's a subtle distinction that mostly bites you when validating file contents or multiline input where the last line may or may not end with a newline. If the distinction matters for correctness — like you're validating a strict format — use `\z` (no trailing newline allowed at all) or `\Z` (one trailing newline allowed) instead of `$`, whose behavior is mode-dependent.

---

### Character Classes & Quantifiers

---

**Q: What is the difference between `\d`, `[0-9]`, and `[^\D]`? Are they always equivalent in .NET?**

> **Bottom line:** They are not always equivalent — `\d` in .NET matches any Unicode decimal digit (including Arabic-Indic numerals), while `[0-9]` matches only ASCII digits 0 through 9.

**Elaboration:** `[^\D]` is a double negative — "not a non-digit" — which resolves to the same set as `\d`, so those two are equivalent. But `\d` matching Unicode digits is a real gotcha: the string `"١٢٣"` (Arabic-Indic digits) will satisfy `\d{3}` in .NET. If you're validating that something is an ASCII number, use `[0-9]` explicitly.

---

**Q: How do `{n}`, `{n,}`, and `{n,m}` quantifiers differ? Write a pattern for a US ZIP code.**

> **Bottom line:** `{n}` is exact count, `{n,}` is "at least n," and `{n,m}` is a range — and a US ZIP code is `\d{5}(-\d{4})?`.

**Elaboration:** The ZIP+4 part is optional, hence the `?` on the group. If you wrote `\d{5,9}` you'd also match 6, 7, or 8 digit strings which aren't valid ZIP codes, so the grouped optional suffix is the right approach. The quantifiers are straightforward but the grouping is where most people trip up.

```csharp
bool isValidZip = Regex.IsMatch(input, @"^\d{5}(-\d{4})?$");
```

---

**Q: You need to match either `colour` or `color`. What is the most readable way, and what trade-off does it have?**

> **Bottom line:** The most readable way is `colou?r` — treating the `u` as optional — but if the two variants were more different you'd use alternation `colour|color`, which is clearer in intent at the cost of a tiny bit of engine work.

**Elaboration:** `colou?r` works here because the only difference is a single optional character. The trade-off with alternation `(colour|color)` is that it introduces a group and the engine has to try both branches; for two short strings that's negligible, but in a hot loop with many alternatives it can add up. For variants this close, the optional-character form is terser and just as correct.

---

### Groups & Capturing

---

**Q: What is the difference between a capturing group `(...)` and a non-capturing group `(?:...)`? When do you choose one over the other?**

> **Bottom line:** A capturing group stores its matched text in `Match.Groups` so you can retrieve it; a non-capturing group just provides grouping for quantifiers or alternation without the overhead of storing the result.

**Elaboration:** I use `(?:...)` whenever I need grouping for structure — like `(?:red|blue)+` — but don't actually need to extract what was matched. It's slightly faster because the engine doesn't allocate a capture, and it keeps your `Groups` collection clean so the indices of the captures you *do* care about don't shift unexpectedly.

---

**Q: What are named groups in .NET regex, and how do you define and reference one?**

> **Bottom line:** Named groups let you refer to captures by a meaningful name instead of a numeric index, defined with `(?<name>...)` and accessed via `match.Groups["name"]`.

**Elaboration:** In a pattern like `(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})`, you can write `match.Groups["year"].Value` instead of `match.Groups[1].Value`. This matters enormously in long patterns — if you later add or remove a group earlier in the pattern, all your numeric indices shift, but named references stay correct. It's one of those small things that makes regex maintainable at scale.

```csharp
var m = Regex.Match("2024-01-15", @"(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})");
string year = m.Groups["year"].Value; // "2024"
```

---

**Q: What is a backreference, and what problem does it solve that a simple repeated group cannot?**

> **Bottom line:** A backreference matches the exact same text that a capturing group already matched — not just the same pattern — so it can enforce that two parts of the input are identical.

**Elaboration:** The classic example is detecting repeated words: `\b(\w+)\s+\1\b` matches "the the" because `\1` requires the second word to be the exact same string as the first, not merely another word. A repeated group like `(\w+)\s+(\w+)` would match "the cat" too. Backreferences are also used to match balanced quotes: `(['"])[^'"]*\1` ensures the opening and closing quote are the same character.

---

## Level 3 — Practical Usage

### Validation with Regex.IsMatch

---

**Q: How do you use `Regex.IsMatch` to validate an email address? Static vs. instance method?**

> **Bottom line:** For a one-off call, the static overload is fine; if you're calling it repeatedly in a hot path, create a compiled instance once and reuse it to avoid re-parsing the pattern every time.

**Elaboration:** The static `Regex.IsMatch` maintains an internal pattern cache, so moderate call rates are fine, but the cache has a limited size and doesn't give you `RegexOptions.Compiled`. For a validation endpoint called thousands of times per second, a `static readonly Regex` with `RegexOptions.Compiled` is the right call.

```csharp
private static readonly Regex EmailRegex = new(
    @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    RegexOptions.Compiled | RegexOptions.IgnoreCase);

bool isValid = EmailRegex.IsMatch(input);
```

---

**Q: How does .NET handle an invalid regex pattern, and what should you do to surface this early?**

> **Bottom line:** .NET throws an `ArgumentException` at the point the pattern is compiled — either in the `Regex` constructor or on the first static call — so you surface it early by constructing your `Regex` instances at startup, not lazily inside request handlers.

**Elaboration:** If you have a `static readonly Regex` field, an invalid pattern will blow up on first access to that field, which in practice means your first request after deploy fails. Better to construct and validate all regex instances during startup in a health-check or initialization method so a bad pattern is caught before any traffic hits. You can also wrap it in a try/catch `ArgumentException` during configuration loading.

---

**Q: QA reports your email validator passes `"a@b@c.com"`. How do you diagnose and fix it?**

> **Bottom line:** The pattern allows `@` inside the local or domain parts — tighten the character classes to exclude `@` from both sides of the expected single `@`.

**Elaboration:** A pattern like `.*@.*` will match anything with at least one `@`, including strings with multiple. The fix is to be explicit: `^[^@\s]+@[^@\s]+\.[^@\s]+$` — using `[^@\s]` ensures neither the local part nor the domain contains another `@`. I'd also add a test case for `"a@b@c.com"` to the suite so this regression is caught automatically going forward.

---

### Replacement with Regex.Replace

---

**Q: How does `Regex.Replace` differ from `string.Replace`? Write a call that redacts digit sequences.**

> **Bottom line:** `string.Replace` substitutes one fixed string for another; `Regex.Replace` can match variable patterns and supports back-references in the replacement string.

**Elaboration:** You can't use `string.Replace` to replace "any sequence of digits" because you don't know the sequence ahead of time. `Regex.Replace` handles that naturally.

```csharp
string redacted = Regex.Replace(logLine, @"\d+", "***");
```

---

**Q: What is a replacement pattern like `$1` or `${name}`? Write a call that reformats dates from MM/DD/YYYY to YYYY-MM-DD.**

> **Bottom line:** Replacement patterns reference captured groups in the replacement string — `$1` is the first group, `${name}` is a named group — so you can rearrange what was matched without extra code.

```csharp
string result = Regex.Replace(
    input,
    @"(?<month>\d{2})/(?<day>\d{2})/(?<year>\d{4})",
    "${year}-${month}-${day}");
```

**Elaboration:** The replacement string `"${year}-${month}-${day}"` is evaluated by the regex engine, not by C# string interpolation — they look similar but are different mechanisms. Using named groups here is far more readable than `$3-$1-$2`, especially when the pattern changes.

---

**Q: When is the `MatchEvaluator` overload of `Regex.Replace` necessary?**

> **Bottom line:** Use `MatchEvaluator` when the replacement value depends on logic that can't be expressed as a static string — for example, looking up a value in a dictionary or doing arithmetic on the matched text.

**Elaboration:** A plain replacement pattern is just a template; it can rearrange captured text but can't transform it. If you want to replace every matched number with its square, or substitute matched words from a localization table, you need the delegate overload so you can run arbitrary C# code per match. There is no way to replicate that with a string pattern alone.

```csharp
string result = Regex.Replace(input, @"\d+", m =>
    (int.Parse(m.Value) * 2).ToString());
```

---

### Splitting with Regex.Split

---

**Q: What does `Regex.Split` do that `string.Split` cannot? Write a call that splits on commas not inside double quotes.**

> **Bottom line:** `Regex.Split` can split on variable-width delimiters described by a pattern; `string.Split` only handles fixed strings — and splitting a CSV correctly requires pattern-based splitting or a dedicated parser.

**Elaboration:** The "split on commas not inside quotes" problem is actually non-trivial even for regex, because regex can't easily track balanced state. A lookahead approach works for simple cases: split on a comma not followed (or preceded) by an odd number of quotes. But for production CSV parsing I'd use a library like `CsvHelper` — this problem has more edge cases than a single regex handles cleanly.

```csharp
// Simplified: splits on commas outside of double-quoted segments
var parts = Regex.Split(line, @",(?=(?:[^""]*""[^""]*"")*[^""]*$)");
```

---

**Q: What happens to captured groups inside the split pattern? Show an example.**

> **Bottom line:** When the split pattern contains a capturing group, the captured text is *included* in the output array between the split segments — this is often surprising.

**Elaboration:** If you split `"one,two,three"` on `(,)`, you get `["one", ",", "two", ",", "three"]` — the delimiters appear in the result. This is occasionally useful if you want to preserve the delimiter for reassembly, but most of the time it's a gotcha. Use `(?:,)` (non-capturing) if you don't want the delimiter in the output.

```csharp
var parts = Regex.Split("one,two,three", "(,)");
// ["one", ",", "two", ",", "three"]
```

---

**Q: If input starts or ends with the delimiter, what does `Regex.Split` return for those boundary positions?**

> **Bottom line:** You get empty strings at the boundaries — the same behavior as `string.Split` — so defensively filter with `Where(s => s.Length > 0)` if empty entries aren't meaningful.

**Elaboration:** `Regex.Split(",a,b,", ",")` returns `["", "a", "b", ""]`. Whether those empty strings matter depends on context — for tokenizing they're usually noise. The clean approach is `.Where(s => !string.IsNullOrEmpty(s))` after the split rather than trying to prevent them in the pattern.

---

### Parsing with Groups

---

**Q: Given the log line `"[2024-01-15 14:32:01] ERROR UserService: Timeout after 30s"`, write a pattern and C# code to extract date, level, service, and message.**

> **Bottom line:** Use named groups to make each captured segment self-describing, then access them by name off the `Match.Groups` collection.

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

**Q: What is the difference between `Match.Groups[1]` and `Match.Groups["date"]`? Which do you prefer in production?**

> **Bottom line:** `Groups[1]` is a positional index that breaks silently when you add or reorder groups; `Groups["date"]` is stable by name — always use named groups in production code.

**Elaboration:** The positional index approach is fragile: add a group anywhere before position 1 and all your downstream indices are wrong, with no compiler error to catch it. Named groups are a small syntax cost that pays back in maintainability and readability — anyone reading `Groups["date"]` knows exactly what they're getting.

---

**Q: How do you iterate over all matches in a string, and what method do you use?**

> **Bottom line:** Use `Regex.Matches` which returns a `MatchCollection` you can iterate directly, or use `Match` and follow the `.NextMatch()` chain for lazy evaluation.

```csharp
foreach (Match m in Regex.Matches(input, @"\d+"))
{
    Console.WriteLine(m.Value);
}
```

**Elaboration:** `Regex.Matches` is the idiomatic choice for most cases. If you want LINQ compatibility, cast or use the `EnumerateMatches` span-based API in .NET 7+. Avoid calling `Regex.Match` in a while loop manually unless you have a specific reason — `Matches` handles it for you.

---

## Level 4 — Common Pitfalls

### Catastrophic Backtracking

---

**Q: What is catastrophic backtracking, and what pattern structure causes it?**

> **Bottom line:** Catastrophic backtracking happens when nested or ambiguous quantifiers cause the engine to explore an exponential number of paths before failing — the canonical example is `(a+)+` against a string like `"aaaaaab"`.

**Elaboration:** The inner `a+` and outer `+` can split the sequence of `a`s in an exponential number of ways, and the engine tries all of them before concluding there's no match. On a 30-character string of `a`s followed by a `b`, this can run for minutes. The root cause is always ambiguity: two quantifiers competing to consume the same characters, creating redundant backtracking paths.

---

**Q: A validator causes CPU spikes on certain inputs. How do you reproduce, diagnose, and fix it?**

> **Bottom line:** Reproduce it by crafting adversarial input (long strings of repeating characters), diagnose with .NET's `RegexOptions.Debug` or a timeout exception, and fix by eliminating ambiguity — using atomic groups `(?>...)`, possessive-equivalent constructs, or restructuring the pattern.

**Elaboration:** The first step is to check whether the pattern has nested quantifiers over overlapping character classes. In .NET 7+ you can set `Regex.MatchTimeout` to throw `RegexMatchTimeoutException` rather than spin forever, which at least prevents the outage. The permanent fix is to rewrite the pattern: use `[^"]*` instead of `.*` inside quotes, use atomic groups to prevent backtracking into already-consumed segments, or simplify the quantifier nesting.

---

**Q: What is an atomic group `(?>...)` in the context of preventing backtracking?**

> **Bottom line:** An atomic group tells the engine "once you've matched this, never backtrack into it" — so if the rest of the pattern fails, the engine won't try alternative ways of matching inside the group.

**Elaboration:** Consider `(?>a+)b` against `"aaa"`. The `a+` consumes all three `a`s, and when `b` fails, the engine does not re-try with two `a`s or one `a` — it just fails immediately. This prevents the exponential blowup in nested-quantifier patterns because you're eliminating the backtracking paths that make it exponential.

---

### Multiline & Culture Traps

---

**Q: You apply `^` to match the start of each line in a multiline string, but it only matches the start of the entire string. What is missing?**

> **Bottom line:** You need `RegexOptions.Multiline` — without it, `^` and `$` only match the absolute start and end of the entire input.

```csharp
var matches = Regex.Matches(input, @"^\w+", RegexOptions.Multiline);
```

**Elaboration:** This trips up almost everyone the first time. With `Multiline`, `^` matches after every `\n`, enabling per-line processing. Without it, you'd typically use `\n` explicitly in your pattern or split the string first. The option name is fairly intuitive once you know it exists.

---

**Q: How does `RegexOptions.IgnoreCase` interact with non-ASCII characters? Could a case-insensitive pattern for `ß` behave differently across cultures?**

> **Bottom line:** Yes — `IgnoreCase` uses the current culture by default for some comparisons, and `ß` (German sharp S) uppercases to `SS` in some cultures, which can cause mismatches; use `RegexOptions.CultureInvariant` alongside `IgnoreCase` to get consistent behavior.

**Elaboration:** German uppercase `ß` is `SS`, so a case-insensitive match for `ß` may or may not match `ss` depending on culture and .NET version. For server-side code where culture can vary (e.g., different locale settings on different machines), always pair `IgnoreCase` with `CultureInvariant` unless you explicitly need culture-sensitive matching.

---

**Q: What does `RegexOptions.Singleline` do, and why is the name misleading? When would you combine it with `Multiline`?**

> **Bottom line:** `Singleline` makes `.` match newlines too — it has nothing to do with how many lines the input has — and combining it with `Multiline` is valid: you want `^`/`$` to work per-line *and* `.` to cross line boundaries.

**Elaboration:** The naming confuses people because `Multiline` and `Singleline` sound like opposites, but they control entirely different things. `Multiline` affects `^` and `$`; `Singleline` affects `.`. A pattern like `(?s)(?m)^.*$` on a multiline string uses both: `^`/`$` anchor per line, and `.` inside the match can still span newlines if needed.

---

### Static API Misuse

---

**Q: A developer caches a `Regex` as `static readonly` for performance. A reviewer says `Regex` is not thread-safe. Is the reviewer correct?**

> **Bottom line:** The reviewer is wrong — a compiled `Regex` instance is thread-safe for concurrent matching; the instance stores the compiled pattern, not match state, which lives in separate `Match` objects per call.

**Elaboration:** The `Regex` documentation explicitly states that instances are thread-safe for read operations — i.e., calling `Match`, `IsMatch`, `Matches`, etc. concurrently. Each call creates its own internal state machine execution context. The anti-pattern would be sharing a single `Match` object across threads, not sharing the `Regex` instance. `static readonly Regex` is in fact the recommended pattern for performance.

---

**Q: What is the internal cache maintained by static `Regex` methods, and what happens when you exceed its default size?**

> **Bottom line:** The static methods cache the 15 most recently used compiled patterns; once you exceed that, the oldest entry is evicted and must be recompiled on next use — in a high-throughput app with many dynamic patterns, this causes repeated JIT overhead.

**Elaboration:** You can increase the cache size with `Regex.CacheSize`, but that's a band-aid. The real solution for high-throughput is to pre-create and reuse `Regex` instances yourself rather than relying on the static cache. The static API is convenient for occasional use; if you're calling it in a tight loop with the same few patterns, use `static readonly` instances with `RegexOptions.Compiled`.

---

## Level 5 — Internals & Deep Mechanics

### The NFA Engine

---

**Q: .NET uses an NFA regex engine. What does that mean in practical terms, and how does it differ from a DFA?**

> **Bottom line:** An NFA engine tries each alternative in order and backtracks on failure, which gives you features like backreferences and lookaheads but means worst-case performance depends on the pattern, not just the input length.

**Elaboration:** A DFA engine compiles the pattern into a state machine that processes each input character exactly once — O(n) always, no backtracking, but it can't support backreferences or variable-length lookbehinds. .NET's NFA means you get expressive power at the cost of potentially exponential worst-case time. It's the trade-off that makes catastrophic backtracking possible and why timeout configuration matters.

---

**Q: How does backtracking work? Trace `a.*b` against `"aXYb"` step by step.**

> **Bottom line:** The `.*` greedily consumes all characters, then backtracks one position at a time until `b` can match — so it over-shoots and backs off.

**Elaboration:** Step by step: `a` matches `a`. `.*` greedily consumes `XYb` (end of string). `b` has nothing to match — backtrack. `.*` gives back `b`, now pointing at `b`. `b` in the pattern matches `b` in the string — success. The match is `aXYb`. If the string had been `"aXYbc"`, `.*` would have consumed `XYbc`, then backed off one at a time until `b` aligned with the `b` in `XYb`. This backtracking is what makes `.+` inside complex patterns expensive on long inputs.

---

**Q: What is possessive quantification, and why does .NET not support it natively?**

> **Bottom line:** A possessive quantifier is like a greedy quantifier that never gives back what it consumed — it prevents backtracking entirely — and .NET doesn't have the syntax natively, but atomic groups `(?>...)` achieve the same effect.

**Elaboration:** In engines that support it (like Java), `a++` means "match as many `a`s as possible and never backtrack." .NET achieves this with `(?>a+)` — an atomic group. The practical difference from greedy is that once an atomic group succeeds, the engine commits; failure of a later part causes the whole group to fail without trying shorter alternatives inside it.

---

### Compiled Regular Expressions

---

**Q: What does `RegexOptions.Compiled` actually do, and what are its performance trade-offs?**

> **Bottom line:** `Compiled` JIT-compiles the regex into IL at runtime for faster repeated matching — but it takes significantly longer to construct and uses more memory, so it only pays off for patterns used hundreds of times or more.

**Elaboration:** Without `Compiled`, the `Regex` interpreter walks the pattern tree for each match. With it, the engine emits actual IL that runs the state machine directly, removing interpreter overhead. The startup cost is 10–100x slower to construct and the memory footprint is higher, so for patterns used once or twice, `Compiled` is a net loss. Use it for `static readonly` patterns in hot paths.

---

**Q: You have a pattern constructed dynamically from user input at runtime. Should you use `RegexOptions.Compiled`?**

> **Bottom line:** No — the compilation overhead is paid on every construction, and for dynamic patterns you can't amortize that cost across many executions.

**Elaboration:** `Compiled` makes sense when you construct the `Regex` once and call it thousands of times. If you're building a new pattern per request from user input, you're paying JIT cost every time with no benefit, and you're also unable to cache the compiled instance meaningfully because the pattern changes. Use the interpreted mode (no `Compiled` flag), rely on the static method cache, and add a `MatchTimeout` since user-supplied patterns carry a ReDoS risk.

---

**Q: In .NET 7+, `[GeneratedRegex]` provides source-generator mode. How does it differ from `RegexOptions.Compiled`, and what advantage does it offer at build time?**

> **Bottom line:** `[GeneratedRegex]` emits the regex implementation as C# source at build time, so there's zero runtime compilation cost and it works with Native AOT — `RegexOptions.Compiled` JITs at runtime and cannot be used in AOT environments.

**Elaboration:** With `[GeneratedRegex]`, the compiler generates a concrete class with the matching logic inlined as C# code during the build. This means the IL is in your assembly from the start, startup time is unaffected, and Ahead-of-Time compilation scenarios like Native AOT and Blazor WASM work correctly. It also means the generated code can be inspected and reviewed. It's strictly better than `Compiled` for any pattern you can define statically.

```csharp
[GeneratedRegex(@"\d{4}-\d{2}-\d{2}", RegexOptions.Compiled)]
private static partial Regex DateRegex();
```

---

### Engine Configuration & Timeout

---

**Q: How do you configure a `Regex` instance to throw `RegexMatchTimeoutException`? What value for a user-facing validation endpoint?**

> **Bottom line:** Pass a `TimeSpan` as the third constructor argument, and for a user-facing endpoint I'd use 100–500 milliseconds — enough for legitimate patterns, tight enough to kill a ReDoS attempt fast.

```csharp
var regex = new Regex(pattern, RegexOptions.Compiled, TimeSpan.FromMilliseconds(200));
```

**Elaboration:** Without a timeout, a crafted input against a backtracking-prone pattern can spin indefinitely. For validation endpoints, the user is waiting synchronously, so 200ms is a reasonable ceiling — any legitimate validation should complete in microseconds. Catch `RegexMatchTimeoutException` at the call site and return a 400 or treat it as a failed match, depending on context.

---

**Q: What is `Regex.InfiniteMatchTimeout`, when would you pass it, and what risk does it carry?**

> **Bottom line:** `InfiniteMatchTimeout` disables the timeout entirely — pass it only for offline processing pipelines where you control all inputs and a hang would be surfaced by monitoring rather than causing a live outage.

**Elaboration:** It's the explicit "I know what I'm doing and I don't want a timeout" signal, useful for batch jobs or build tools. The risk is that if you later use the pattern against adversarial input, the thread hangs with no escape hatch. For anything touching external input, always set a real timeout.

---

**Q: Is it possible to set a process-wide default match timeout for all static `Regex` calls?**

> **Bottom line:** Yes — set the `REGEX_DEFAULT_MATCH_TIMEOUT` AppDomain data key via `AppDomain.CurrentDomain.SetData`, and all `Regex` instances that don't specify a timeout will inherit it.

```csharp
AppDomain.CurrentDomain.SetData(
    "REGEX_DEFAULT_MATCH_TIMEOUT",
    TimeSpan.FromMilliseconds(500));
```

**Elaboration:** This is a useful defense-in-depth measure for legacy codebases where you can't easily audit every regex call. It doesn't override explicitly set timeouts, so it's safe to apply globally and then fine-tune specific instances that need longer or shorter limits. Document it in your startup code because it's non-obvious and a future developer will wonder why timeouts appear without a constructor argument.

---

## Level 6 — Trade-offs & Design Decisions

### Regex vs. Alternatives

---

**Q: A junior developer writes a regex to parse a well-formed XML attribute. Why is this almost certainly wrong?**

> **Bottom line:** XML is a recursive, context-sensitive grammar that regex cannot correctly model — use `XDocument`, `XmlReader`, or another XML API that understands the full spec.

**Elaboration:** Even "simple" XML has quoting rules, namespaces, CDATA sections, entity encoding, and nested structures that make any regex brittle. It'll work on the example in the developer's test but break on the first real-world document with a namespace prefix or an encoded entity. The standard library XML parsers handle all of this correctly and are not meaningfully slower for this use case.

---

**Q: Compare `Regex.IsMatch` vs. `string.Contains` + `string.StartsWith` for a simple prefix-and-suffix check.**

> **Bottom line:** If you can express the check clearly with `StartsWith`/`EndsWith`, do that — it's faster, has no compilation overhead, and is immediately readable; only reach for regex when the pattern is genuinely variable.

**Elaboration:** `string.StartsWith("foo") && string.EndsWith("bar")` is zero learning curve for any reader, has no risk of pattern syntax errors, and runs faster than any regex. Regex is justified when the prefix or suffix is itself a pattern — like "starts with any 3-letter uppercase word" — not when it's a fixed string.

---

**Q: For a tokenizer with 20 token types, would you use one large alternation pattern or 20 separate patterns?**

> **Bottom line:** I'd use one pattern with 20 named alternatives — it's faster because the engine makes a single pass, and the match result tells you which alternative fired, which is exactly what a tokenizer needs.

**Elaboration:** Twenty separate patterns applied in sequence means up to 20 passes over the same position for every character. One alternation pattern fails or succeeds in a single pass. The correctness concern is ordering — the engine tries alternatives left-to-right, so longer or more specific tokens must come before shorter ones (e.g., `!=` before `!`). Maintenance is harder, but that's solved with `IgnorePatternWhitespace` and comments, not by fragmenting the pattern.

---

### Pattern Design & Maintainability

---

**Q: How does `RegexOptions.IgnorePatternWhitespace` (verbose mode) improve maintainability? Show a before/after example.**

> **Bottom line:** Verbose mode lets you add whitespace and inline comments to a pattern for readability — whitespace in the pattern is ignored, and `#` starts a comment to end of line.

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

**Elaboration:** The after version is self-documenting in a way that a 40-character wall of regex never is. The trade-off is that any literal space you want to match must be escaped as `\ ` or `[ ]`, which catches people off guard. For any pattern longer than about 30 characters that you'll maintain over time, verbose mode is worth it.

---

**Q: A team maintains a 200-character regex with no comments or tests. What is your strategy for refactoring it safely?**

> **Bottom line:** Write a characterization test suite first — collect real inputs (valid, invalid, edge cases) and lock in the current behavior — then refactor incrementally and run the suite after every change.

**Elaboration:** The tests are your safety net and your spec. Use a tool like `Regex101` or the .NET `Regex` debugger to visualize what each group captures, then break the pattern into named groups or verbose form piece by piece. Each change should be a no-op against the test suite until you're confident in the structure — only then fix any bugs you discovered along the way.

---

**Q: When is it appropriate to reject a regex-based solution in a code review and ask for a parser instead?**

> **Bottom line:** I reject regex when the target language is recursive (HTML, XML, JSON, code), when the pattern has grown past ~60 characters and is getting harder to reason about, or when correctness at the edges genuinely matters and a regex has already been patched multiple times.

**Elaboration:** The signals I look for: the pattern has more than two levels of nested groups, there are comments saying "this handles X but not Y," or the developer added a flag like "works for most cases." Those are signs the problem outgrew the tool. Recursive grammars, balanced delimiters, and context-sensitive rules all belong to parsers — using a regex there is taking on unbounded maintenance debt.

---

### Security Considerations

---

**Q: If a regex pattern is constructed from user-supplied input, what attack surface opens up? How do you mitigate ReDoS in .NET?**

> **Bottom line:** Users can inject patterns designed to trigger catastrophic backtracking (ReDoS), and the mitigation is to combine `Regex.Escape` for literal matching, a strict `MatchTimeout`, and ideally a pattern complexity check before constructing the `Regex`.

**Elaboration:** A user who controls the pattern can submit `(a+)+` and send a request body of 30 `a`s to peg your thread. Defense in depth: first, if you only need to match the user's input literally (not as a pattern), use `Regex.Escape` to neutralize metacharacters. Second, always set a `MatchTimeout` of 100–500ms. Third, consider limiting the allowed syntax — validate that user input doesn't contain quantifiers or groups if the use case only needs prefix/substring matching.

---

**Q: How does `Regex.Escape` work, and why is it not a complete solution to the regex injection problem?**

> **Bottom line:** `Regex.Escape` escapes all regex metacharacters in a string so it can be safely embedded as a literal, but it doesn't help if the user is supposed to provide an actual pattern — and it doesn't prevent a legitimate-looking pattern from being adversarially slow.

**Elaboration:** If your feature lets users define their own search patterns (like a log filter), you can't just escape everything — that would break their intended syntax. In that case you're stuck with the harder problem of validating or sandboxing the pattern itself, which `Regex.Escape` doesn't address. It solves injection of user *data* into a developer-written pattern; it doesn't solve the case where the user writes the pattern itself.

---

## Level 7 — Advanced & Expert

### Compilation to Assembly

---

**Q: What does `Regex.CompileToAssembly` do, and how does it differ from `RegexOptions.Compiled`?**

> **Bottom line:** `CompileToAssembly` compiles patterns into a separate `.dll` on disk ahead of time so they can be loaded without any runtime compilation cost; `RegexOptions.Compiled` does the same JIT work but at application startup, not at build time.

**Elaboration:** The idea was to pre-build a regex assembly, ship it with your application, and load it at startup — zero runtime compilation cost and faster cold-start than `Compiled`. In practice it was clunky to set up and the tooling support was poor, which is why it was deprecated. The conceptual successor is `[GeneratedRegex]`, which achieves the same ahead-of-time goal with a much better developer experience.

---

**Q: `Regex.CompileToAssembly` is obsolete in .NET 7+. What replaced it and why is it superior for AOT scenarios?**

> **Bottom line:** `[GeneratedRegex]` source generators replaced it — they generate the regex implementation as readable C# code at build time, which works with Native AOT because there's no runtime IL emission.

**Elaboration:** Native AOT and Blazor WASM prohibit runtime code generation, which is exactly what `RegexOptions.Compiled` and `CompileToAssembly` rely on. `[GeneratedRegex]` emits standard C# that the compiler processes normally, so the final binary contains the regex logic as pre-compiled native code. It's also easier to use — just an attribute on a partial method — and the generated code can be inspected in version control.

---

**Q: You are publishing a .NET Native AOT application with complex regex patterns. Walk through the constraints and how `[GeneratedRegex]` solves them.**

> **Bottom line:** Native AOT bans runtime IL generation, which means `RegexOptions.Compiled` throws at runtime and the interpreter mode works but is slower — `[GeneratedRegex]` is the only way to get compiled-speed regex in a Native AOT app.

**Elaboration:** The constraint is hard: AOT trims and pre-compiles everything; any runtime `Assembly.Emit` or `DynamicMethod` usage is illegal. The interpreted `Regex` (no `Compiled` flag) still works but gives up the performance benefits of compilation. `[GeneratedRegex]` moves all that work to the Roslyn source generator during `dotnet publish`, so by the time AOT sees it, it's ordinary static C# code. The only constraint it introduces is that the pattern must be a compile-time constant.

---

### High-Throughput & Architecture

---

**Q: You're building a log ingestion pipeline that classifies 50,000 lines/second against 30 patterns. Describe your regex architecture.**

> **Bottom line:** Pre-compile all 30 patterns as `[GeneratedRegex]` or `static readonly Regex` with `RegexOptions.Compiled`, evaluate them in parallel where possible, set per-match timeouts of 50–100ms, and benchmark with representative data before shipping.

**Elaboration:** Organization matters: group patterns by expected frequency and check the common ones first to short-circuit early. Use `Span<char>`-based overloads in .NET 7+ to avoid string allocations. For timeouts, a 50ms ceiling is plenty for a classification task — any legitimate match completes in microseconds. Track p99 match latency in production and alert on timeout exceptions, which indicate either a pattern regression or adversarial input.

---

**Q: How does `Span<char>`-based regex matching improve throughput, and when does it matter most?**

> **Bottom line:** It avoids allocating a `string` for the input, which matters most in high-throughput pipelines where you're processing data already in a `char[]`, `Memory<char>`, or reading from a buffer without creating intermediate strings.

**Elaboration:** In .NET 7+, `Regex.IsMatch(ReadOnlySpan<char>, string)` and related overloads let you match directly against a span. The gain is purely allocation reduction — the matching algorithm is the same. It matters most when you're parsing large buffers (network streams, file reading) where creating a `string` per line or per token would generate significant GC pressure at scale.

---

**Q: A regex works in dev but produces different results in a Linux container in production. After ruling out input differences, what .NET-specific causes would you investigate?**

> **Bottom line:** Investigate culture settings (`IgnoreCase` behavior differs by `CultureInfo`), line ending differences (`\r\n` vs `\n` affecting `$` and `.`), and whether the .NET runtime versions differ between environments.

**Elaboration:** On Linux, the default culture is typically invariant or a POSIX locale, while Windows dev machines are often `en-US`. `IgnoreCase` without `CultureInvariant` can produce different results for Unicode characters. Line endings are the other common trap — Windows-style `\r\n` means `$` without `\r` optional matching won't align where you expect. Always use `CultureInvariant` for server-side patterns and be explicit about `\r?\n` in multiline patterns.

---

### Lookaheads, Lookbehinds & Zero-Width Assertions

---

**Q: What is the difference between a lookahead `(?=...)` and a lookbehind `(?<=...)`? Write a pattern that matches a number followed by `px` without including `px` in the match.**

> **Bottom line:** A lookahead asserts what comes *after* the current position; a lookbehind asserts what comes *before* — both are zero-width, meaning they consume no characters.

```csharp
// Matches the number in "24px" but not "24em"
var matches = Regex.Matches(input, @"\d+(?=px)");
```

**Elaboration:** The `(?=px)` says "the next characters must be `px`, but don't include them in the match." This is useful for extracting values that are identified by adjacent context you don't want in the result. A lookbehind `(?<=px)\d+` would match a number *preceded by* `px`. Neither moves the match position, so they're composable with other parts of the pattern.

---

**Q: .NET supports variable-length lookbehinds unlike most other engines. Give an example where this is genuinely useful.**

> **Bottom line:** Variable-length lookbehinds let you assert something like "preceded by a word of any length" — most engines restrict lookbehinds to fixed-width patterns, which forces awkward workarounds for variable-length context.

**Elaboration:** A practical example: match a version number only when it's preceded by the string `"version "` or `"v"` — both of different lengths. In .NET: `(?<=version |\bv)\d+\.\d+`. PCRE and JavaScript would throw a "lookbehind assertion is not fixed length" error here. .NET implements variable-length lookbehinds by running a separate right-to-left match for the lookbehind, which is why it works but has an associated cost.

---

**Q: Negative lookaheads can sometimes replace alternation. Rewrite `cat|dog` using only a negative lookahead, and would you do this in production?**

> **Bottom line:** You could write `(?!(?:cat|dog)$)\w+` to match words that aren't cat or dog, but that inverts the semantics — to *match* either cat or dog with only lookaheads you'd need something like `\b(?=cat|dog)\w+`, which is just obfuscating the alternation and I would not do this in production.

**Elaboration:** The `cat|dog` alternation is immediately readable to any engineer; the lookahead version requires explanation and doesn't actually eliminate the alternation — it just hides it inside the assertion. Lookaheads and lookbehinds are powerful for expressing context constraints that can't be expressed in plain alternation, but using them to replace simple alternation adds complexity with no benefit. Write the simplest pattern that correctly describes what you want.
