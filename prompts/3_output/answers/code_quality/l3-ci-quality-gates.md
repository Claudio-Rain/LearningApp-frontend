# L3 How do you set up code quality gates in a CI/CD pipeline, and what metrics would you enforce as blocking?

## Answer

A **quality gate** is a set of conditions that must pass before code is allowed to merge or deploy. If any condition fails, the pipeline blocks the PR or deployment and forces the developer to fix the issue first.

### Common tooling stack

- **SonarQube / SonarCloud** — most common for quality gate enforcement
- **Roslyn Analyzers** — enforced as build errors in .NET
- **Code coverage tools** — Coverlet + ReportGenerator for .NET
- **CI system** — GitHub Actions, Azure DevOps, GitLab CI

### Setting up in a CI pipeline (GitHub Actions + SonarCloud)

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate

on: [pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # required for SonarCloud blame

      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.x'

      - name: Install tools
        run: |
          dotnet tool install --global dotnet-sonarscanner
          dotnet tool install --global dotnet-coverage

      - name: Begin SonarCloud scan
        run: dotnet sonarscanner begin /k:"my-project" /o:"my-org"
          /d:sonar.token="${{ secrets.SONAR_TOKEN }}"
          /d:sonar.cs.vscoveragexml.reportsPaths=coverage.xml

      - name: Build & test with coverage
        run: |
          dotnet build
          dotnet-coverage collect "dotnet test" -f xml -o coverage.xml

      - name: End SonarCloud scan
        run: dotnet sonarscanner end /d:sonar.token="${{ secrets.SONAR_TOKEN }}"
        # Pipeline fails here if quality gate conditions are not met
```

### Metrics to enforce as blocking

| Metric | Typical threshold | Why it matters |
|---|---|---|
| **New code coverage** | ≥ 80% | New code without tests is a future maintenance risk |
| **New bugs** | 0 | No new defects allowed to merge |
| **New security vulnerabilities** | 0 | Security issues must never reach production |
| **New code smells** | ≤ 5 (or 0 for critical) | Keeps debt from accumulating sprint by sprint |
| **Duplicated lines (new code)** | < 3% | Duplicate code is a maintenance liability |
| **Cyclomatic complexity** | ≤ 10 per method | High complexity correlates with defects |

### Key principle: gate on new code, not overall

Enforce thresholds on **new code introduced in the PR**, not on the entire codebase. Trying to fix all existing debt at once is impractical. Gradually raising the bar sprint by sprint is sustainable.

### Making gates visible

- Post gate status as a required PR check — merging is blocked if it fails
- Post a summary comment on the PR with the specific failures
- Track quality gate pass rate over time to measure team improvement
