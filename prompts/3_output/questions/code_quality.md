# Interview Questions: Code Quality

## Coverage map

| Item | Type | Level |
|------|------|-------|
| What are Code Quality Metrics? What kinds do you know? | Knowledge | Level 1 — Definition & Basics |
| What is cyclomatic complexity? How to measure it? | Knowledge | Level 2 — Core Concepts |
| What is the maintainability index? How to measure it? | Knowledge | Level 2 — Core Concepts |
| What is class coupling? How to measure it? | Knowledge | Level 2 — Core Concepts |
| What is the depth of inheritance? How to measure it? | Knowledge | Level 2 — Core Concepts |
| Measures code quality with static analysis tools | Skill | Level 3 — Practical Usage |
| Configures rules for static analysis tools | Skill | Level 3 — Practical Usage |
| Deals with code quality issues by refactoring | Skill | Level 3 — Practical Usage |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate knows what code quality means and the vocabulary around it._

### Definitions
- ❓ What does "code quality" mean? What are the main dimensions you'd use to assess it? `[FROM JD]`
- ❓ What is the difference between static analysis and dynamic analysis? `[INFERRED]`
- ❓ What is technical debt and how does poor code quality relate to it? `[INFERRED]`
- ❓ Name four or more categories of code quality metrics. `[FROM JD]`

---

## Level 2 — Core Concepts
_Goal: Test understanding of specific quality metrics._

### Cyclomatic Complexity
- ❓ What is cyclomatic complexity? What does it measure? `[FROM JD]`
- ❓ How is cyclomatic complexity calculated? What is the formula? `[FROM JD]`
- ❓ What cyclomatic complexity value is generally considered a warning sign? What does a value of 10 mean? `[INFERRED]`
- ❓ How does high cyclomatic complexity affect testability? `[INFERRED]`

### Maintainability Index
- ❓ What is the maintainability index in Visual Studio / .NET? What range does it use and what does each range indicate? `[FROM JD]`
- ❓ What factors are combined to produce the maintainability index? `[FROM JD]`

### Class Coupling
- ❓ What is class coupling (also called afferent and efferent coupling)? Why is high coupling a problem? `[FROM JD]`
- ❓ What is the difference between tight coupling and loose coupling? How do interfaces help? `[INFERRED]`
- ❓ How do you measure class coupling in a .NET project? `[FROM JD]`

### Depth of Inheritance
- ❓ What is depth of inheritance (DIT)? What is a good target depth? `[FROM JD]`
- ❓ Why does deep inheritance make code harder to maintain? `[FROM JD]`
- ❓ How do you measure depth of inheritance in a .NET project? `[FROM JD]`

---

## Level 3 — Practical Usage
_Goal: Test ability to use tools and act on quality signals._

### Static Analysis Tools
- ❓ What static analysis tools do you know for .NET? What does each one focus on? `[FROM JD]`
- ❓ How do you run Roslyn analyzers in a .NET project and view the results? `[FROM JD]`
- ❓ How do you configure rules in an `.editorconfig` file? Give an example of enabling a specific analyzer rule. `[FROM JD]`
- ❓ What is SonarQube? What kind of issues does it detect that a compiler won't? `[FROM JD]`
- ❓ How do you configure StyleCop to enforce naming and formatting rules? `[FROM JD]`
- ❓ How do you suppress a specific analyzer warning for a single occurrence without disabling the rule globally? `[INFERRED]`

### Acting on Quality Issues
- ❓ You open a legacy codebase and the maintainability index is 12. Where do you start? `[FROM JD]`
- ❓ A method has a cyclomatic complexity of 25. What refactoring techniques would you apply to reduce it? `[FROM JD]`
- ❓ How do you refactor a class with many dependencies (high afferent coupling) to improve testability? `[FROM JD]`

---

## Level 4 — Common Pitfalls
_Goal: Expose common mistakes around code quality tooling and metrics._

### Mistakes
- ❓ A team adds SonarQube to CI and the pipeline starts failing constantly. How do you make the adoption sustainable? `[INFERRED]`
- ❓ A developer suppresses all analyzer warnings to hit a deadline. What should the code review process catch? `[INFERRED]`
- ❓ What is Goodhart's Law and how does it apply to code quality metrics? `[INFERRED]`
- ❓ A class has a low cyclomatic complexity but is still very hard to understand. How is that possible? `[INFERRED]`
- ❓ What is the danger of configuring static analysis rules that are too strict for a large existing codebase? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Test understanding of how static analysis tools work._

### How Tools Work
- ❓ What is the Roslyn compiler platform? How do analyzers plug into it? `[INFERRED]`
- ❓ What is a syntax tree in the context of Roslyn analyzers? `[INFERRED]`
- ❓ What is the difference between a diagnostic analyzer and a code fix provider in Roslyn? `[INFERRED]`
- ❓ How does SonarQube compute code coverage and what is the difference between line, branch, and condition coverage? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate judgment about quality tooling and process._

### Design Decisions
- ❓ Should you enforce a zero-warning policy for static analysis? What are the trade-offs? `[INFERRED]`
- ❓ How do you decide which analyzer rules to enable vs. treat as warnings vs. disable entirely? `[INFERRED]`
- ❓ Code reviews vs. automated static analysis: are they complementary or redundant? `[INFERRED]`
- ❓ When should you prioritize reducing technical debt over delivering new features? How do you make that case to stakeholders? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Architecture-level code quality thinking._

### Advanced Scenarios
- ❓ How would you introduce a quality gate into a CI/CD pipeline that blocks merges when quality regresses? `[INFERRED]`
- ❓ What is architecture testing (e.g., ArchUnitNET, NetArchTest)? How is it different from unit testing? `[INFERRED]`
- ❓ How do you track code quality trends over time and make them visible to the team? `[INFERRED]`
- ❓ What is the boy scout rule in software engineering and how does it apply to large legacy codebases? `[INFERRED]`
