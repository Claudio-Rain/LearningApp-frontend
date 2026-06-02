# L2 How do you use static analysis tools to measure and track code quality in a project?

## Answer

**Static analysis** examines source code without executing it, detecting issues related to style, correctness, security, and quality metrics. Integrating these tools into the development workflow creates a quality feedback loop that catches problems early and cheaply.

### Typical Toolchain for .NET Projects

| Tool | Purpose |
|------|---------|
| **Roslyn Analyzers** | Built-in C# compiler diagnostics + NuGet analyzer packages |
| **EditorConfig** | Enforce formatting and naming rules in the IDE |
| **StyleCop.Analyzers** | C# style conventions as compiler warnings |
| **SonarLint / SonarQube** | Multi-rule quality and security analysis; tracks metrics over time |
| **ReSharper / Rider** | Real-time code inspections, refactoring suggestions |
| **NDepend** | Architectural metrics: coupling, DIT, MI, dependency rules |

### Integration Points

1. **IDE** — Immediate feedback while writing code (red/yellow squiggles). SonarLint, ReSharper, and built-in Roslyn analyzers all work here.

2. **Build** — Treat analyzer warnings as errors (`<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` or `<WarningsAsErrors>` for specific codes). This blocks broken builds.

3. **CI/CD pipeline** — Run `dotnet build` (which includes analyzers) and/or `dotnet sonarscanner` in the pipeline. Gate pull requests on zero new issues or a minimum quality gate score.

4. **Quality Gate** — In SonarQube, configure a Quality Gate (e.g., "no new blocker issues", "coverage ≥ 80%", "duplications < 3%"). PRs that fail the gate are blocked from merging.

5. **Dashboards and Trends** — SonarQube/NDepend provide historical charts so teams can see if technical debt is growing or shrinking sprint over sprint.

### Workflow Example

```
Developer writes code
  → IDE warns (SonarLint / ReSharper) immediately
  → git push triggers CI
  → dotnet build fails if new warnings-as-errors introduced
  → SonarQube analysis runs, updates Quality Gate
  → PR is approved only if Quality Gate passes
```

---

*Include short code examples in C#.*

```xml
<!-- Directory.Build.props — enable analyzers project-wide -->
<Project>
  <PropertyGroup>
    <Nullable>enable</Nullable>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <!-- Treat specific Roslyn analyzer warnings as errors -->
    <WarningsAsErrors>CS8600;CS8602;CA1062</WarningsAsErrors>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="StyleCop.Analyzers" Version="1.2.*">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>
    </PackageReference>
    <PackageReference Include="SonarAnalyzer.CSharp" Version="9.*">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>
    </PackageReference>
  </ItemGroup>
</Project>
```

```yaml
# GitHub Actions CI step — SonarQube analysis
- name: SonarQube Scan
  run: |
    dotnet sonarscanner begin \
      /k:"MyProject" \
      /d:sonar.host.url="${{ secrets.SONAR_HOST_URL }}" \
      /d:sonar.login="${{ secrets.SONAR_TOKEN }}"
    dotnet build
    dotnet sonarscanner end /d:sonar.login="${{ secrets.SONAR_TOKEN }}"
```
