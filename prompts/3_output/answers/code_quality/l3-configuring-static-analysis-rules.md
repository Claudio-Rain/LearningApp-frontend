# L3 How do you configure rules in static analysis tools such as ReSharper, EditorConfig, StyleCop, or SonarQube?

## Answer

Each static analysis tool has its own configuration mechanism, but they all share the same concept: **declaring which rules to enable, disable, or tune** so the tool enforces your team's standards consistently.

---

## EditorConfig (`.editorconfig`)

EditorConfig is supported natively by Visual Studio, Rider, and VS Code. It controls formatting, whitespace, and Roslyn code-style rules.

```ini
# .editorconfig placed at the repo root
root = true

[*.cs]
indent_style = space
indent_size = 4
charset = utf-8-bom
end_of_line = crlf

# Roslyn code-style severity
dotnet_diagnostic.IDE0003.severity = warning   # Remove 'this' qualification
dotnet_diagnostic.IDE0005.severity = error     # Remove unnecessary using
dotnet_diagnostic.CA1062.severity = error      # Validate arguments of public methods
csharp_style_expression_bodied_methods = true:suggestion
```

---

## StyleCop (`stylecop.json` + `.editorconfig`)

StyleCop.Analyzers NuGet package reads `stylecop.json` for behavioral settings and `.editorconfig` for severity.

```json
// stylecop.json
{
  "$schema": "https://raw.githubusercontent.com/DotNetAnalyzers/StyleCopAnalyzers/master/StyleCop.Analyzers/StyleCop.Analyzers/Settings/stylecop.schema.json",
  "settings": {
    "documentationRules": {
      "companyName": "Acme Corp",
      "xmlHeader": false,
      "documentInternalElements": false
    },
    "orderingRules": {
      "usingDirectivesPlacement": "outsideNamespace"
    }
  }
}
```

```ini
# .editorconfig — disable a specific StyleCop rule
dotnet_diagnostic.SA1633.severity = none   # File header not required
dotnet_diagnostic.SA1101.severity = none   # Prefix local calls with 'this' — off
```

---

## ReSharper / Rider (`.DotSettings`)

ReSharper stores its configuration in `.DotSettings` files (team-shared or personal). These are XML files managed through the IDE or checked in as `MyProject.sln.DotSettings`.

Via IDE: `ReSharper → Options → Code Inspection → Inspection Severity` — set any rule to Error, Warning, Suggestion, or Hint.

```xml
<!-- MyProject.sln.DotSettings (simplified excerpt) -->
<s:String x:Key="/Default/CodeInspection/Highlighting/InspectionSeverities/=CSharpWarnings005/@EntryIndexedValue">ERROR</s:String>
<s:String x:Key="/Default/CodeInspection/Highlighting/InspectionSeverities/=UnusedParameter/@EntryIndexedValue">WARNING</s:String>
```

Naming conventions, code style, and cleanup profiles are also stored here and can be committed to source control for team consistency.

---

## SonarQube (Quality Profiles)

In SonarQube you configure rules through **Quality Profiles** in the web UI or via the API.

1. Go to **Quality Profiles** → Select or clone the built-in `Sonar way` profile for C#.
2. Activate / deactivate rules, set severity (Blocker, Critical, Major, Minor, Info).
3. Assign the profile to your project.

You can also use `sonar-project.properties` to tune behaviour:

```properties
# sonar-project.properties
sonar.projectKey=my-project
sonar.sources=src
sonar.tests=tests
sonar.cs.opencover.reportsPaths=coverage.xml

# Exclude generated code from analysis
sonar.exclusions=**/Migrations/**,**/*.g.cs

# Issue exclusions per rule
sonar.issue.ignore.multicriteria=e1
sonar.issue.ignore.multicriteria.e1.ruleKey=csharpsquid:S1481
sonar.issue.ignore.multicriteria.e1.resourceKey=**/LegacyModule/**
```

---

## Best Practices

- **Commit all config files** (`.editorconfig`, `stylecop.json`, `.DotSettings`) so every developer and CI agent enforces the same rules.
- **Start permissive, tighten progressively** — introduce rules as warnings first, then elevate to errors once the codebase is clean.
- **Use suppressions sparingly** — prefer fixing the root cause; use `#pragma warning disable` or `[SuppressMessage]` only when a false positive is confirmed.

```csharp
// Targeted suppression with justification — acceptable
[System.Diagnostics.CodeAnalysis.SuppressMessage(
    "Performance",
    "CA1822:Mark members as static",
    Justification = "Required by interface contract")]
public string GetName() => _name;
```
