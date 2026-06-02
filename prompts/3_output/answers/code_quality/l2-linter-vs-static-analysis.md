# L2 What is the difference between a linter and a static analysis tool, and when would you use each?

## Answer

Both tools inspect source code without executing it, but they operate at different levels of depth and serve different purposes.

### Linter

A linter enforces **style and formatting rules** — it checks that code follows agreed conventions, naming standards, and basic error-prone patterns. It typically operates on a single file and runs very fast.

**Focus:** style, formatting, simple anti-patterns
**Speed:** near-instant
**Examples:** ESLint (JS), Pylint (Python), StyleCop (C#), EditorConfig

```json
// .editorconfig — linting rule example
[*.cs]
indent_style = space
indent_size = 4
dotnet_naming_rule.private_fields.severity = warning
```

Typical lint errors:
- Missing braces around `if` body
- Unused variable
- Naming convention violation (`myVar` instead of `_myVar`)
- Missing XML doc comment

### Static Analysis Tool

A static analysis tool performs **deeper semantic analysis** — it builds a model of the code's logic, data flow, and control flow to detect real bugs, security vulnerabilities, and maintainability issues. It typically takes minutes to run and operates across the whole codebase.

**Focus:** bugs, security, complexity, design issues
**Speed:** slow (minutes to hours for large codebases)
**Examples:** SonarQube, Roslyn Analyzers, Resharper, Coverity, Semgrep

Typical static analysis findings:
- Null dereference risk
- SQL injection vulnerability
- Unreachable code
- Cyclomatic complexity above threshold
- Resource leak (stream not closed)

### Comparison

| Dimension | Linter | Static Analysis |
|---|---|---|
| Depth | Surface (style) | Deep (logic, data flow) |
| Speed | Milliseconds | Minutes |
| When to run | On every save / pre-commit | CI pipeline |
| Typical findings | Style violations | Bugs, security issues |
| False positives | Very low | Moderate |

### When to use each

- **Linter** → integrate into the editor (saves) and pre-commit hooks. Keeps code consistent and catches trivial issues instantly.
- **Static analysis** → run in CI on every PR. Acts as a quality gate before merging; catches issues that linters miss.

In .NET specifically: EditorConfig/StyleCop for linting, Roslyn Analyzers + SonarQube for static analysis.
