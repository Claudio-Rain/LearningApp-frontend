# Interview Questions: Code Quality

## Coverage Map

| Item | Type | Level |
|------|------|-------|
| Code Quality Metrics definition | `[FROM JD]` | 1 |
| Types of code quality metrics | `[FROM JD]` | 1–2 |
| Cyclomatic complexity definition | `[FROM JD]` | 1–2 |
| Measuring cyclomatic complexity | `[FROM JD]` | 3 |
| Maintainability index definition | `[FROM JD]` | 2 |
| Measuring maintainability index | `[FROM JD]` | 3 |
| Class coupling definition | `[FROM JD]` | 2 |
| Measuring class coupling | `[FROM JD]` | 3 |
| Depth of inheritance definition | `[FROM JD]` | 2 |
| Measuring depth of inheritance | `[FROM JD]` | 3 |
| Static analysis tools (Resharper, EditorConfig, StyleCop, SonarQube) | `[FROM JD]` | 3–4 |
| Configuring rules for static analysis tools | `[FROM JD]` | 4 |
| Refactoring to address code quality issues | `[FROM JD]` | 4–5 |
| Adding new analyzer rules | `[FROM JD]` | 5 |
| Code smell taxonomy | `[INFERRED]` | 2–3 |
| Technical debt quantification | `[INFERRED]` | 4–5 |
| Quality gates and CI/CD integration | `[INFERRED]` | 5–6 |
| Trade-offs: strictness vs. developer velocity | `[INFERRED]` | 6 |
| Custom Roslyn analyzers | `[INFERRED]` | 6–7 |
| Metrics correlation and composite scoring | `[INFERRED]` | 7 |
| False-positive management in static analysis | `[INFERRED]` | 5–6 |
| Incremental quality enforcement on legacy codebases | `[INFERRED]` | 6–7 |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate understands what code quality is, why it matters, and can name the primary metric categories._

### Code Quality Fundamentals

- ❓ How would you define "code quality" to a junior developer who just joined your team? What properties does high-quality code have? `[FROM JD]`

- ❓ What categories of code quality metrics do you know? Give at least one concrete example per category and explain what each one measures. `[FROM JD]`

- ❓ Why is measuring code quality objectively useful, rather than relying solely on code reviews? What are the limits of pure human review? `[INFERRED]`

### Metrics Basics

- ❓ What is cyclomatic complexity? Who introduced the concept and what does the numeric value represent in plain terms? `[FROM JD]`

- ❓ What is the maintainability index? What range of values does it produce and what does the scale mean? `[FROM JD]`

- ❓ What is class coupling (also called afferent/efferent coupling)? Why is high coupling considered a code quality problem? `[FROM JD]`

- ❓ What is depth of inheritance (DIT)? What does a DIT of 1 vs. 8 tell you about a class hierarchy? `[FROM JD]`

- ❓ **Trade-off:** Is a lower cyclomatic complexity always better? Describe a case where artificially lowering it could make the code worse. `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Verify the candidate can explain the mechanics behind each metric and connect metrics to real design principles._

### Cyclomatic Complexity

- ❓ How is cyclomatic complexity calculated from a control-flow graph? Walk through a method that has one `if`, one `for` loop, and a `switch` with three cases — what is its cyclomatic complexity? `[FROM JD]`

- ❓ What is the relationship between cyclomatic complexity and the minimum number of test cases needed for full branch coverage? `[INFERRED]`

- ❓ How does cyclomatic complexity relate to SOLID principles, particularly the Single Responsibility Principle? `[INFERRED]`

### Maintainability Index

- ❓ The maintainability index combines Halstead volume, cyclomatic complexity, and lines of code. Why were these three dimensions chosen? What does each contribute to the overall score? `[FROM JD]`

- ❓ A class scores 12 on the maintainability index (red zone). What kinds of issues would you look for first, and why? `[FROM JD]`

- ❓ **Trade-off:** The maintainability index was designed in the 1990s. What are its known shortcomings, and when might it mislead you? `[INFERRED]`

### Class Coupling & Depth of Inheritance

- ❓ Explain the difference between afferent coupling (Ca) and efferent coupling (Ce). Which direction is more dangerous and why? `[FROM JD]`

- ❓ What is the "instability" metric (I = Ce / (Ca + Ce)) and how does it help you decide which classes to refactor first? `[INFERRED]`

- ❓ Why does a deep inheritance hierarchy (high DIT) increase class coupling and reduce testability? Give a concrete scenario. `[FROM JD]`

- ❓ **Trade-off:** Framework base classes (e.g., ASP.NET `Controller`, Entity Framework `DbContext`) necessarily increase DIT. How do you distinguish "framework-imposed" depth from "design-problem" depth in your metrics? `[INFERRED]`

### Code Smells

- ❓ Name five classic code smells from Fowler's taxonomy. For each, identify which code quality metric it would affect and how. `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Assess hands-on experience with tooling, workflows, and interpreting real metric outputs._

### Measuring Metrics

- ❓ How do you measure cyclomatic complexity in a .NET codebase? Name at least two tools and describe the workflow for each. `[FROM JD]`

- ❓ Walk me through how you would set up SonarQube to analyze a C# solution. What does the initial configuration look like and where do the metrics appear in the UI? `[FROM JD]`

- ❓ How does ReSharper surface code quality issues differently from SonarQube? When would you use each in your daily workflow? `[FROM JD]`

- ❓ What is an `.editorconfig` file? How does it interact with Roslyn analyzers and Visual Studio's code style enforcement? `[FROM JD]`

- ❓ What is StyleCop? How does StyleCop.Analyzers differ from the legacy StyleCop MSBuild runner, and why does the distinction matter? `[FROM JD]`

### Configuring Static Analysis

- ❓ How do you configure rule severity (error, warning, suggestion, silent) in a `.editorconfig` file for a Roslyn analyzer rule? Show the syntax for setting rule `CA1062` to `error`. `[FROM JD]`

- ❓ In SonarQube, what is a Quality Profile? How would you create a custom profile that inherits from "Sonar way" but adds stricter cyclomatic complexity thresholds? `[FROM JD]`

- ❓ How do you suppress a specific ReSharper warning inline vs. project-wide, and what are the pros and cons of each suppression approach? `[FROM JD]`

- ❓ **Trade-off:** Your team uses both ReSharper and SonarQube and they occasionally report conflicting severity levels for the same rule. How do you decide which tool is the authoritative source, and how do you document that decision? `[INFERRED]`

### Refactoring for Quality

- ❓ **Scenario:** A method has a cyclomatic complexity of 22 and a maintainability index of 8. Describe step by step how you would approach refactoring it without breaking existing behavior. `[FROM JD]`

- ❓ You inherit a legacy codebase where average DIT is 9 and average class coupling is 47. What is your prioritization strategy for improvement? `[FROM JD]`

---

## Level 4 — Common Pitfalls
_Goal: Surface experience with tool misconfiguration, metric gaming, and false positives._

### Tool Misconfiguration

- ❓ **Debugging scenario:** Your CI pipeline runs SonarQube analysis and always reports 0 code coverage even though unit tests pass locally. What are the three most likely causes and how do you diagnose each? `[INFERRED]`

- ❓ You enable all StyleCop rules on a large existing codebase and the build now produces 4,000 warnings. What is the correct strategy to handle this without disabling all rules or ignoring all warnings? `[FROM JD]`

- ❓ A developer on your team suppresses 30 analyzer warnings with `#pragma warning disable` comments across a single file. How do you handle this in code review, and what tooling options do you have to prevent it systematically? `[INFERRED]`

### Metric Misinterpretation

- ❓ **Trade-off:** A generated file (e.g., a protobuf-generated class or an EF migration) scores very poorly on all metrics. Should generated code be included in quality gates? How do you configure SonarQube to exclude it? `[INFERRED]`

- ❓ A manager asks you to prove the codebase improved by pointing to the average cyclomatic complexity trend going down. What are two ways this metric can decrease without the code actually becoming better? `[INFERRED]`

- ❓ Your team achieves 95% code coverage but SonarQube still marks many methods as high-risk. Why might coverage be a poor proxy for quality, and what additional metrics would you consult? `[INFERRED]`

### Refactoring Pitfalls

- ❓ **Scenario:** While reducing cyclomatic complexity by extracting private methods, a colleague argues you have made the code harder to follow because the logic is now split across 12 small methods. How do you evaluate whether the refactoring was worthwhile? `[FROM JD]`

- ❓ What is "shotgun surgery" and how can aggressive rule enforcement by static analysis tools accidentally encourage it? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Distinguish strong candidates who understand how tools work under the hood._

### How Static Analyzers Work

- ❓ At a high level, how does a Roslyn-based analyzer work? What is a syntax tree, a semantic model, and a diagnostic, and how do they relate to each other? `[INFERRED]`

- ❓ How does SonarQube's "cognitive complexity" metric differ mechanically from McCabe's cyclomatic complexity? Which nesting constructs are penalized more heavily and why? `[INFERRED]`

- ❓ How does the Halstead volume component of the maintainability index get computed? What counts as an "operator" vs. an "operand" in C#, and why is this distinction sometimes ambiguous? `[FROM JD]`

### Writing Custom Rules

- ❓ Walk me through writing a simple Roslyn diagnostic analyzer that flags any `public` method with more than 4 parameters. What interfaces do you implement and what is the registration pattern? `[FROM JD]`

- ❓ How would you add a custom rule to SonarQube for a C# codebase using the SonarQube Plugin API? What are the prerequisites and rough implementation steps? `[FROM JD]`

- ❓ **Trade-off:** Custom analyzer rules are powerful but add maintenance burden. When is writing a custom rule justified vs. enforcing the same constraint through architectural patterns or code generation? `[INFERRED]`

### Technical Debt

- ❓ **Debugging scenario:** SonarQube estimates 47 days of technical debt on your project. A stakeholder asks you to cut it to under 5 days before the next release. What is wrong with this request, and how do you reframe the conversation productively? `[INFERRED]`

- ❓ How does SonarQube calculate technical debt (remediation cost)? What assumptions does SQALE methodology make, and where can those assumptions break down? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate architectural and organizational judgment around quality tooling and enforcement._

### Policy & Process Design

- ❓ **Trade-off:** Should code quality rules be enforced at commit time (pre-commit hook), at PR merge time (CI gate), or as advisory warnings in the IDE? What are the failure modes of each approach? `[INFERRED]`

- ❓ Your organization wants a single shared `.editorconfig` and SonarQube Quality Profile across 20 teams with different tech stacks (.NET, Python, TypeScript). What governance model do you recommend and what are the risks of centralized vs. decentralized rule ownership? `[FROM JD]`

- ❓ How do you roll out stricter quality gates on a legacy codebase without blocking all feature work? Describe the "new code" vs. "all code" strategy and when each is appropriate. `[INFERRED]`

- ❓ **Scenario:** A principal engineer argues that code review by experienced humans is sufficient and that static analysis tools produce too many false positives to be worth maintaining. How do you respond? What data would you bring to the discussion? `[INFERRED]`

### Metrics as Leading Indicators

- ❓ Which code quality metrics are most predictive of production bug density, based on published research (e.g., Nagappan et al., Microsoft studies)? How would you use this knowledge to prioritize refactoring work? `[INFERRED]`

- ❓ **Trade-off:** Optimizing for a single metric (e.g., enforcing cyclomatic complexity ≤ 10 everywhere) can lead to perverse incentives. How do you design a quality score that is harder to game? `[INFERRED]`

- ❓ How do you measure whether a quality improvement initiative actually reduced defect rates? What confounding factors make this attribution hard? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Distinguish exceptional candidates with cross-cutting systems thinking and original insight._

### Custom Tooling & Ecosystem Integration

- ❓ Design a quality enforcement pipeline for a monorepo with 50 .NET microservices. Each service team wants autonomy, but the platform team needs to enforce minimum security and complexity rules globally. What is your architecture for rule inheritance, override, and exception tracking? `[INFERRED]`

- ❓ How would you build a time-series dashboard that tracks cyclomatic complexity, maintainability index, and coupling metrics per module over every sprint, and uses anomaly detection to alert on regressions before they reach code review? What data sources, storage, and alerting components would you use? `[INFERRED]`

- ❓ **Advanced scenario:** You notice that two modules consistently score well on all individual metrics (low complexity, low coupling, high maintainability index) yet they account for 60% of production incidents. How do you investigate and what additional instrumentation or metrics would you add? `[INFERRED]`

### Analyzer Internals & Extensibility

- ❓ Explain the difference between a Roslyn analyzer, a source generator, and a code fix provider. How can all three be combined to automatically detect a pattern, generate compliant code, and apply a fix — giving a concrete example in the code quality domain? `[INFERRED]`

- ❓ How does interprocedural analysis work in SonarQube's taint analysis engine? Why is it significantly harder than intraprocedural analysis, and what approximations does it make that can cause false negatives? `[INFERRED]`

### Strategic & Organizational

- ❓ **Trade-off:** Some high-performing teams (e.g., certain Google or Netflix teams) deliberately carry high technical debt in non-critical paths to maximize feature velocity. Under what conditions is this a rational engineering decision, and how do you make it explicit and time-bounded rather than accidental? `[INFERRED]`

- ❓ You are joining a 200-person engineering org as the first dedicated developer-experience engineer. Code quality tooling is inconsistent across teams. Walk me through your first 90 days: what you measure, what quick wins you target, and how you build organizational buy-in for a unified quality standard. `[INFERRED]`

- ❓ **Synthesis:** If you could only track three code quality metrics across an entire organization to predict long-term maintainability and defect rates, which three would you choose and why? How would you weight them relative to each other? `[INFERRED]`
