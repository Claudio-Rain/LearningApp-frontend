You are a senior software engineer being interviewed. You have 10+ years of experience and know how to give clear, confident answers that sound natural in a real interview — not rehearsed, not a wall of text.

Your task is to generate a model answer for each question below, which covers **.NET Regular Expressions**.

## Answer format (per question)

Each answer must follow this exact structure:

**Q: [paste question here]**

> **Bottom line:** One sentence. The core of the answer — what a confident engineer says first.

**Elaboration:** 2–4 sentences that naturally expand on the bottom line. Explain the why, give a brief example, or clarify a nuance. Write it the way you would actually say it out loud in an interview — conversational, direct, no jargon for its own sake.

**Code example:** _(include only when the question is about a specific API, method, syntax, or implementation)_
Show the minimal code that proves the point. No boilerplate, no imports unless they matter, no comments that repeat what the elaboration already said. Use C# unless otherwise implied.

---

## Rules

- The bottom line must stand alone — if the interviewer stopped you there, they'd have a real answer
- The elaboration must sound spoken, not written — no bullet lists, no headers inside the answer, no markdown formatting
- Keep the full answer under 6 sentences total
- Include a code example when the question is about a method, API, or concrete implementation — skip it for purely conceptual questions
- Code examples must be minimal — only what is needed to illustrate the point
- If a question is scenario-based, answer as if you are in that scenario
- If a question asks for a trade-off, take a position — don't just list pros and cons without a conclusion
- Do not over-explain. Stop when the point is made.

---

## Output location

Save the generated answers as `answers/dotnet/regex.md`. If the folder does not exist, create it.

---

## Questions

### Level 1 — Definition & Basics

**What Regular Expressions Are**
- How would you explain a regular expression to a colleague who has never used one? What problem does it solve that simple string methods like `Contains` or `IndexOf` cannot?
- What is the difference between a **pattern** and a **match** in regex terminology?
- In .NET, which namespace and primary class do you use to work with regular expressions, and why is it worth knowing that distinction over, say, using regex in JavaScript?

**Vocabulary & Syntax Primitives**
- Without writing a full pattern, name five regex metacharacters (e.g., `.`, `*`) and describe what each one means. Why do you need to escape some of them?
- What is the difference between a **greedy** and a **lazy** quantifier? Which is the default in .NET, and why does that matter to a beginner writing their first pattern?
- When would you choose a regular expression over a custom parsing method, and when would you choose the opposite? What is your default instinct, and why?

---

### Level 2 — Core Concepts

**Anchors**
- What is an anchor in a regular expression, and what does it match against? Give two examples and explain the practical difference between `^` and `\A` in .NET.
- A colleague writes `^admin$` to validate a username field but users are passing validation with values like `"admin\nextraline"`. What is happening, and how do you fix it?
- When would you prefer `\Z` over `$` as a terminal anchor? What risk does ignoring this distinction introduce?

**Character Classes & Quantifiers**
- What is the difference between `\d`, `[0-9]`, and `[^\D]`? Are they always equivalent in .NET? Why or why not?
- How do `{n}`, `{n,}`, and `{n,m}` quantifiers differ? Write a pattern that matches a US ZIP code (5 digits, optionally followed by a hyphen and 4 more digits).
- You need to match either `colour` or `color` in a single pattern. What is the most readable way to express this, and what trade-off does it have versus two separate checks?

**Groups & Capturing**
- What is the difference between a **capturing group** `(...)` and a **non-capturing group** `(?:...)`? When would you deliberately choose one over the other?
- What are **named groups** in .NET regex, and how do you define and reference one? How do named groups improve maintainability of complex patterns?
- What is a **backreference**, and what problem does it solve that a simple repeated group cannot? Give a concrete example.

---

### Level 3 — Practical Usage

**Validation with Regex.IsMatch**
- How do you use `Regex.IsMatch` to validate that a string is a valid email address? Write the method call and explain why you might choose the static overload over an instance method.
- `Regex.IsMatch` returns `bool` but throws no exception on a bad pattern at runtime in some cases — how does .NET handle an invalid regex pattern, and what should you do to surface this early?
- A QA engineer tells you that your email validator passes `"a@b@c.com"`. How do you diagnose and fix the pattern without changing the method call structure?

**Replacement with Regex.Replace**
- How does `Regex.Replace` differ from `string.Replace`? Write a call that redacts all sequences of digits in a log line by replacing them with `***`.
- What is a **replacement pattern** (e.g., `$1`, `${name}`)? Write a `Regex.Replace` call that reformats dates from `MM/DD/YYYY` to `YYYY-MM-DD` using capturing groups.
- `Regex.Replace` has an overload that accepts a `MatchEvaluator` delegate. When is this overload necessary, and what would break if you tried to replicate it with a plain string replacement pattern?

**Splitting with Regex.Split**
- What does `Regex.Split` do that `string.Split` cannot? Write a call that splits a CSV line on commas, but only commas that are not inside double quotes. Why is this non-trivial?
- What happens to captured groups inside the split pattern? Write an example where including a group in the pattern changes the output array, and explain whether that behavior is useful or surprising.
- If the input string starts or ends with the delimiter pattern, what does `Regex.Split` return for those boundary positions? How would you clean up the output defensively?

**Parsing with Groups**
- Given the log line `"[2024-01-15 14:32:01] ERROR UserService: Timeout after 30s"`, write a pattern and the C# code using `Regex.Match.Groups` to extract the date, level, service name, and message into separate variables.
- What is the difference between `Match.Groups[1]` and `Match.Groups["date"]`? Which would you prefer in production code and why?
- How do you iterate over **all** matches in a string (not just the first), and what method do you use? Write the loop.

---

### Level 4 — Common Pitfalls

**Catastrophic Backtracking**
- What is **catastrophic backtracking**, and under what pattern structure does it appear? Give an example of a pattern that could hang on a crafted input.
- A support team reports that your regex-based validator causes the web server to spike to 100% CPU for several seconds on certain inputs. How do you reproduce, diagnose, and fix this? What tooling does .NET provide?
- What is the difference between an **atomic group** `(?>...)` and a standard group in the context of preventing backtracking?

**Multiline & Culture Traps**
- You apply `^` to match the start of each line in a multiline string, but it only matches the start of the entire string. What is missing, and how do you fix it with `RegexOptions`?
- How does `RegexOptions.IgnoreCase` interact with non-ASCII characters? Could a case-insensitive pattern for `ß` behave differently across cultures, and how do you guard against it?
- What does `RegexOptions.Singleline` do, and why is the name potentially misleading? When would you combine it with `RegexOptions.Multiline`?

**Static API Misuse**
- A developer caches a `Regex` instance as a `static readonly` field for performance. A code reviewer says this is wrong because `Regex` is not thread-safe. Is the reviewer correct? Defend your answer.
- What is the internal cache maintained by the static `Regex` methods, and what happens when you exceed its default size in a high-throughput application?

---

### Level 5 — Internals & Deep Mechanics

**The NFA Engine**
- .NET uses an NFA (Non-deterministic Finite Automaton) regex engine. What does that mean in practical terms for how matches are found, and how does it differ from a DFA?
- How does backtracking work inside an NFA engine? Trace through the execution of the pattern `a.*b` against the string `"aXYb"` step by step.
- What is **possessive quantification**, and why does .NET not support it natively? What equivalent construct can you use instead?

**Compiled Regular Expressions**
- What does `RegexOptions.Compiled` actually do under the hood, and what are its concrete performance trade-offs? When is it the right choice, and when does it make things worse?
- You have a pattern that is constructed dynamically from user input at runtime. Should you use `RegexOptions.Compiled`? Justify your answer with reasoning about startup cost versus execution cost.
- In .NET 7+, `Regex` gained a source-generator mode via `[GeneratedRegex]`. How does this differ from `RegexOptions.Compiled`, and what advantage does it offer at build time rather than runtime?

**Engine Configuration & Timeout**
- How do you configure a `Regex` instance to throw a `RegexMatchTimeoutException` instead of hanging? Write the constructor call, and explain what value you would set for a user-facing validation endpoint.
- What is `Regex.InfiniteMatchTimeout`, when would you explicitly pass it, and what risk does doing so carry?
- Is it possible to set a process-wide default match timeout so that all static `Regex` calls are protected? How?

---

### Level 6 — Trade-offs & Design Decisions

**Regex vs. Alternatives**
- You need to parse a well-formed XML attribute out of a string. A junior developer writes a regex. Why is this almost certainly the wrong tool, and what would you recommend instead?
- Compare using `Regex.IsMatch` versus `string.Contains` + `string.StartsWith` for a simple prefix-and-suffix check. When does the regex approach justify its added complexity?
- For a tokenizer that must handle 20 different token types, would you use a single large alternation pattern or 20 separate patterns evaluated in order? Discuss the correctness, performance, and maintenance trade-offs.

**Pattern Design & Maintainability**
- How does `RegexOptions.IgnorePatternWhitespace` (verbose mode) change what you can do in a pattern, and how does it improve maintainability? Write a before/after example of a complex pattern.
- A team maintains a 200-character regex pattern with no comments or tests. What is your strategy for refactoring it safely, and what .NET-specific tooling or test approaches would you use?
- When is it appropriate to **reject** a regex-based solution in a code review and ask for a parser instead? What signals in the pattern or use case trigger that decision for you?

**Security Considerations**
- If a regex pattern is constructed from user-supplied input, what attack surface opens up? How do you mitigate ReDoS (Regular Expression Denial of Service) in a .NET service?
- How does `Regex.Escape` work, and why is it not a complete solution to the regex injection problem?

---

### Level 7 — Advanced & Expert

**Compilation to Assembly**
- What does `Regex.CompileToAssembly` do, and in what scenarios was it designed to be used? How does it differ from `RegexOptions.Compiled` in terms of where and when compilation happens?
- `Regex.CompileToAssembly` is marked obsolete in .NET 7+. What replaced it, and why is the replacement considered superior for ahead-of-time (AOT) compilation scenarios like Native AOT or Blazor WASM?
- You are publishing a .NET Native AOT application that uses several complex regex patterns. Walk through the constraints this environment imposes on regex usage and how `[GeneratedRegex]` solves them.

**High-Throughput & Architecture**
- You are building a log ingestion pipeline that classifies 50,000 log lines per second against 30 patterns. Describe your regex architecture: how you organize patterns, which compilation strategy you use, how you handle timeouts, and how you measure regression.
- How does `Span<char>`-based regex matching (introduced in .NET 7 via `Regex.IsMatch(ReadOnlySpan<char>, ...)`) improve throughput compared to `string`-based overloads, and under what conditions does it matter most?
- A regex pattern works correctly in development but produces different results on a Linux container in production. After ruling out input differences, what .NET-specific causes would you investigate — covering culture, line endings, and engine version?

**Lookaheads, Lookbehinds & Zero-Width Assertions**
- What is the difference between a **lookahead** `(?=...)` and a **lookbehind** `(?<=...)`? Write a pattern that matches a number only when it is immediately followed by `px` but does not include `px` in the match.
- .NET supports **variable-length lookbehinds** (unlike most other engines). Give an example where this is genuinely useful and explain why other engines cannot support it.
- Negative lookaheads can sometimes replace alternation. Rewrite the pattern `cat|dog` using only a negative lookahead, and then explain whether you would actually do this in production code and why.
