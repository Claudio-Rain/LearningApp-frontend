# L1 What are Code Quality Metrics and what kinds of metrics do you know?

## Answer

**Code Quality Metrics** are quantitative measurements used to evaluate how well-written, maintainable, and reliable a codebase is. They give teams objective data to assess the health of a project, identify problematic areas, and track improvement over time.

### Categories of Code Quality Metrics

#### 1. Complexity Metrics
- **Cyclomatic Complexity** — Measures the number of independent paths through a method. Lower is better (target ≤ 10).
- **Depth of Inheritance (DIT)** — How many levels deep a class sits in an inheritance hierarchy.
- **Class Coupling (CBO)** — How many other classes a given class depends on.

#### 2. Size Metrics
- **Lines of Code (LOC)** — Total or effective lines; very large classes/methods are warning signs.
- **Number of Methods per Class** — Helps spot God classes.
- **Number of Parameters** — Long parameter lists indicate poor design.

#### 3. Maintainability Metrics
- **Maintainability Index** — A composite score (0–100) combining cyclomatic complexity, LOC, and Halstead volume.
- **Code Duplication (%)** — Amount of copy-pasted code detected by tools like SonarQube.

#### 4. Test Quality Metrics
- **Code Coverage (%)** — What percentage of production code is exercised by tests.
- **Test-to-Code Ratio** — Number of test lines vs. production lines.
- **Mutation Score** — Percentage of artificially introduced bugs caught by tests.

#### 5. Defect Metrics
- **Bug Density** — Number of bugs per 1,000 lines of code.
- **Technical Debt Ratio** — Estimated remediation time vs. the cost to build from scratch (SonarQube's model).

### Why They Matter

Metrics should guide decisions, not replace judgment. A single metric in isolation can be misleading; combine several to get a realistic picture of quality.

---

*Include short code examples in C#.*

```csharp
// High cyclomatic complexity — hard to test and maintain
public string Classify(int score)
{
    if (score >= 90) return "A";
    else if (score >= 80) return "B";
    else if (score >= 70) return "C";
    else if (score >= 60) return "D";
    else return "F";
}

// Refactored using a lookup — lower complexity, easier to extend
public string Classify(int score) =>
    score switch
    {
        >= 90 => "A",
        >= 80 => "B",
        >= 70 => "C",
        >= 60 => "D",
        _     => "F"
    };
```
