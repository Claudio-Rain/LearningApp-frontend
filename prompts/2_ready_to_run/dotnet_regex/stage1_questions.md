# Interview Questions: .NET Regular Expressions

## Coverage map

| Item | Type | Level |
|------|------|-------|
| What are Regular Expressions? | Knowledge | Level 1 — Definition & Basics |
| What are Anchors in Regular Expressions and for what purpose are they used? | Knowledge | Level 2 — Core Concepts |
| How to validate input data using Regular Expressions? | Knowledge | Level 3 — Practical Usage |
| How to split a string into an array using Regular Expression? | Knowledge | Level 3 — Practical Usage |
| How to replace text using Regular Expression? | Knowledge | Level 3 — Practical Usage |
| How to parse data using Regular Expression Group? | Knowledge | Level 3 — Practical Usage |
| Uses static Regex.IsMatch for validating user input | Skill | Level 3 — Practical Usage |
| Uses Regex.Replace for replacing matched string with the new string | Skill | Level 3 — Practical Usage |
| Uses Regex.Split for splitting a string into an array of substring | Skill | Level 3 — Practical Usage |
| Uses Regex.Match.Groups for parsing the string | Skill | Level 3 — Practical Usage |
| Uses compiled regular expression | Skill | Level 5 — Internals & Deep Mechanics |
| Uses Regex Engine configuration to tune the engine for preventing hanging and getting better performances | Skill | Level 5 — Internals & Deep Mechanics |
| Uses regular expression compiled to the assembly | Skill | Level 7 — Advanced & Expert |

---

## Level 1 — Definition & Basics
_Goal: Verify the candidate understands what a regular expression is, why it exists, and can speak to its role in .NET specifically._

### What Regular Expressions Are

- ❓ How would you explain a regular expression to a colleague who has never used one? What problem does it solve that simple string methods like `Contains` or `IndexOf` cannot? `[FROM JD]`
- ❓ What is the difference between a **pattern** and a **match** in regex terminology? `[INFERRED]`
- ❓ In .NET, which namespace and primary class do you use to work with regular expressions, and why is it worth knowing that distinction over, say, using regex in JavaScript? `[INFERRED]`

### Vocabulary & Syntax Primitives

- ❓ Without writing a full pattern, name five regex metacharacters (e.g., `.`, `*`) and describe what each one means. Why do you need to escape some of them? `[INFERRED]`
- ❓ What is the difference between a **greedy** and a **lazy** quantifier? Which is the default in .NET, and why does that matter to a beginner writing their first pattern? `[INFERRED]`
- ❓ When would you choose a regular expression over a custom parsing method, and when would you choose the opposite? What is your default instinct, and why? `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Confirm the candidate understands the building blocks that make patterns expressive — character classes, anchors, groups, and quantifiers._

### Anchors

- ❓ What is an anchor in a regular expression, and what does it match against? Give two examples and explain the practical difference between `^` and `\A` in .NET. `[FROM JD]`
- ❓ A colleague writes `^admin$` to validate a username field but users are passing validation with values like `"admin\nextraline"`. What is happening, and how do you fix it? `[INFERRED]`
- ❓ When would you prefer `\Z` over `$` as a terminal anchor? What risk does ignoring this distinction introduce? `[INFERRED]`

### Character Classes & Quantifiers

- ❓ What is the difference between `\d`, `[0-9]`, and `[^\D]`? Are they always equivalent in .NET? Why or why not? `[INFERRED]`
- ❓ How do `{n}`, `{n,}`, and `{n,m}` quantifiers differ? Write a pattern that matches a US ZIP code (5 digits, optionally followed by a hyphen and 4 more digits). `[INFERRED]`
- ❓ You need to match either `colour` or `color` in a single pattern. What is the most readable way to express this, and what trade-off does it have versus two separate checks? `[INFERRED]`

### Groups & Capturing

- ❓ What is the difference between a **capturing group** `(...)` and a **non-capturing group** `(?:...)`? When would you deliberately choose one over the other? `[FROM JD]`
- ❓ What are **named groups** in .NET regex, and how do you define and reference one? How do named groups improve maintainability of complex patterns? `[INFERRED]`
- ❓ What is a **backreference**, and what problem does it solve that a simple repeated group cannot? Give a concrete example. `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Assess whether the candidate can translate regex knowledge into correct, idiomatic .NET code using the core API._

### Validation with Regex.IsMatch

- ❓ How do you use `Regex.IsMatch` to validate that a string is a valid email address? Write the method call and explain why you might choose the static overload over an instance method. `[FROM JD]` `[Skill]`
- ❓ `Regex.IsMatch` returns `bool` but throws no exception on a bad pattern at runtime in some cases — how does .NET handle an invalid regex pattern, and what should you do to surface this early? `[INFERRED]`
- ❓ A QA engineer tells you that your email validator passes `"a@b@c.com"`. How do you diagnose and fix the pattern without changing the method call structure? `[INFERRED]`

### Replacement with Regex.Replace

- ❓ How does `Regex.Replace` differ from `string.Replace`? Write a call that redacts all sequences of digits in a log line by replacing them with `***`. `[FROM JD]` `[Skill]`
- ❓ What is a **replacement pattern** (e.g., `$1`, `${name}`)? Write a `Regex.Replace` call that reformats dates from `MM/DD/YYYY` to `YYYY-MM-DD` using capturing groups. `[INFERRED]`
- ❓ `Regex.Replace` has an overload that accepts a `MatchEvaluator` delegate. When is this overload necessary, and what would break if you tried to replicate it with a plain string replacement pattern? `[INFERRED]`

### Splitting with Regex.Split

- ❓ What does `Regex.Split` do that `string.Split` cannot? Write a call that splits a CSV line on commas, but only commas that are not inside double quotes. Why is this non-trivial? `[FROM JD]` `[Skill]`
- ❓ What happens to captured groups inside the split pattern? Write an example where including a group in the pattern changes the output array, and explain whether that behavior is useful or surprising. `[INFERRED]`
- ❓ If the input string starts or ends with the delimiter pattern, what does `Regex.Split` return for those boundary positions? How would you clean up the output defensively? `[INFERRED]`

### Parsing with Groups

- ❓ Given the log line `"[2024-01-15 14:32:01] ERROR UserService: Timeout after 30s"`, write a pattern and the C# code using `Regex.Match.Groups` to extract the date, level, service name, and message into separate variables. `[FROM JD]` `[Skill]`
- ❓ What is the difference between `Match.Groups[1]` and `Match.Groups["date"]`? Which would you prefer in production code and why? `[INFERRED]`
- ❓ How do you iterate over **all** matches in a string (not just the first), and what method do you use? Write the loop. `[INFERRED]`

---

## Level 4 — Common Pitfalls
_Goal: Surface whether the candidate has been burned by real regex bugs — catastrophic backtracking, culture-sensitive matching, multiline confusion, and incorrect static usage._

### Catastrophic Backtracking

- ❓ What is **catastrophic backtracking**, and under what pattern structure does it appear? Give an example of a pattern that could hang on a crafted input. `[INFERRED]`
- ❓ A support team reports that your regex-based validator causes the web server to spike to 100% CPU for several seconds on certain inputs. How do you reproduce, diagnose, and fix this? What tooling does .NET provide? `[INFERRED]`
- ❓ What is the difference between an **atomic group** `(?>...)` and a standard group in the context of preventing backtracking? `[INFERRED]`

### Multiline & Culture Traps

- ❓ You apply `^` to match the start of each line in a multiline string, but it only matches the start of the entire string. What is missing, and how do you fix it with `RegexOptions`? `[INFERRED]`
- ❓ How does `RegexOptions.IgnoreCase` interact with non-ASCII characters? Could a case-insensitive pattern for `ß` behave differently across cultures, and how do you guard against it? `[INFERRED]`
- ❓ What does `RegexOptions.Singleline` do, and why is the name potentially misleading? When would you combine it with `RegexOptions.Multiline`? `[INFERRED]`

### Static API Misuse

- ❓ A developer caches a `Regex` instance as a `static readonly` field for performance. A code reviewer says this is wrong because `Regex` is not thread-safe. Is the reviewer correct? Defend your answer. `[INFERRED]`
- ❓ What is the internal cache maintained by the static `Regex` methods, and what happens when you exceed its default size in a high-throughput application? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Distinguish candidates who understand how the .NET regex engine works — NFA mechanics, compilation modes, and engine configuration options._

### The NFA Engine

- ❓ .NET uses an NFA (Non-deterministic Finite Automaton) regex engine. What does that mean in practical terms for how matches are found, and how does it differ from a DFA? `[INFERRED]`
- ❓ How does backtracking work inside an NFA engine? Trace through the execution of the pattern `a.*b` against the string `"aXYb"` step by step. `[INFERRED]`
- ❓ What is **possessive quantification**, and why does .NET not support it natively? What equivalent construct can you use instead? `[INFERRED]`

### Compiled Regular Expressions

- ❓ What does `RegexOptions.Compiled` actually do under the hood, and what are its concrete performance trade-offs? When is it the right choice, and when does it make things worse? `[FROM JD]` `[Skill]`
- ❓ You have a pattern that is constructed dynamically from user input at runtime. Should you use `RegexOptions.Compiled`? Justify your answer with reasoning about startup cost versus execution cost. `[INFERRED]`
- ❓ In .NET 7+, `Regex` gained a source-generator mode via `[GeneratedRegex]`. How does this differ from `RegexOptions.Compiled`, and what advantage does it offer at build time rather than runtime? `[INFERRED]`

### Engine Configuration & Timeout

- ❓ How do you configure a `Regex` instance to throw a `RegexMatchTimeoutException` instead of hanging? Write the constructor call, and explain what value you would set for a user-facing validation endpoint. `[FROM JD]` `[Skill]`
- ❓ What is `Regex.InfiniteMatchTimeout`, when would you explicitly pass it, and what risk does doing so carry? `[INFERRED]`
- ❓ Is it possible to set a process-wide default match timeout so that all static `Regex` calls are protected? How? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Probe the candidate's ability to reason about when regex is the right tool, how to structure it for maintainability, and how to weigh it against alternatives._

### Regex vs. Alternatives

- ❓ You need to parse a well-formed XML attribute out of a string. A junior developer writes a regex. Why is this almost certainly the wrong tool, and what would you recommend instead? `[INFERRED]`
- ❓ Compare using `Regex.IsMatch` versus `string.Contains` + `string.StartsWith` for a simple prefix-and-suffix check. When does the regex approach justify its added complexity? `[INFERRED]`
- ❓ For a tokenizer that must handle 20 different token types, would you use a single large alternation pattern or 20 separate patterns evaluated in order? Discuss the correctness, performance, and maintenance trade-offs. `[INFERRED]`

### Pattern Design & Maintainability

- ❓ How does `RegexOptions.IgnorePatternWhitespace` (verbose mode) change what you can do in a pattern, and how does it improve maintainability? Write a before/after example of a complex pattern. `[INFERRED]`
- ❓ A team maintains a 200-character regex pattern with no comments or tests. What is your strategy for refactoring it safely, and what .NET-specific tooling or test approaches would you use? `[INFERRED]`
- ❓ When is it appropriate to **reject** a regex-based solution in a code review and ask for a parser instead? What signals in the pattern or use case trigger that decision for you? `[INFERRED]`

### Security Considerations

- ❓ If a regex pattern is constructed from user-supplied input, what attack surface opens up? How do you mitigate ReDoS (Regular Expression Denial of Service) in a .NET service? `[INFERRED]`
- ❓ How does `Regex.Escape` work, and why is it not a complete solution to the regex injection problem? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Identify candidates who can make architecture-level decisions about regex compilation, source generation, ahead-of-time constraints, and high-throughput pipeline design._

### Compilation to Assembly

- ❓ What does `Regex.CompileToAssembly` do, and in what scenarios was it designed to be used? How does it differ from `RegexOptions.Compiled` in terms of where and when compilation happens? `[FROM JD]` `[Skill]`
- ❓ `Regex.CompileToAssembly` is marked obsolete in .NET 7+. What replaced it, and why is the replacement considered superior for ahead-of-time (AOT) compilation scenarios like Native AOT or Blazor WASM? `[INFERRED]`
- ❓ You are publishing a .NET Native AOT application that uses several complex regex patterns. Walk through the constraints this environment imposes on regex usage and how `[GeneratedRegex]` solves them. `[INFERRED]`

### High-Throughput & Architecture

- ❓ You are building a log ingestion pipeline that classifies 50,000 log lines per second against 30 patterns. Describe your regex architecture: how you organize patterns, which compilation strategy you use, how you handle timeouts, and how you measure regression. `[INFERRED]`
- ❓ How does `Span<char>`-based regex matching (introduced in .NET 7 via `Regex.IsMatch(ReadOnlySpan<char>, ...)`) improve throughput compared to `string`-based overloads, and under what conditions does it matter most? `[INFERRED]`
- ❓ A regex pattern works correctly in development but produces different results on a Linux container in production. After ruling out input differences, what .NET-specific causes would you investigate — covering culture, line endings, and engine version? `[INFERRED]`

### Lookaheads, Lookbehinds & Zero-Width Assertions

- ❓ What is the difference between a **lookahead** `(?=...)` and a **lookbehind** `(?<=...)`? Write a pattern that matches a number only when it is immediately followed by `px` but does not include `px` in the match. `[INFERRED]`
- ❓ .NET supports **variable-length lookbehinds** (unlike most other engines). Give an example where this is genuinely useful and explain why other engines cannot support it. `[INFERRED]`
- ❓ Negative lookaheads can sometimes replace alternation. Rewrite the pattern `cat|dog` using only a negative lookahead, and then explain whether you would actually do this in production code and why. `[INFERRED]`
