# L2 What is the Maintainability Index and how is it calculated or measured?

## Answer

The **Maintainability Index (MI)** is a composite software metric that estimates how easy a codebase is to maintain. It was developed by Paul Oman and Jack Hagemeister (1991) and later adopted by Microsoft as part of Visual Studio's Code Metrics tooling.

### Formula

The original formula is:

```
MI = 171 − 5.2 × ln(V) − 0.23 × CC − 16.2 × ln(LOC)
```

Where:
- **V** = Halstead Volume (measures program size based on operators and operands)
- **CC** = Cyclomatic Complexity (number of independent paths)
- **LOC** = Lines of Code (logical)

Visual Studio uses a normalized variant scaled to **0–100**:

```
MI_normalized = MAX(0, (171 − 5.2×ln(V) − 0.23×CC − 16.2×ln(LOC)) × 100 / 171)
```

### Interpretation (Visual Studio thresholds)

| Score | Color  | Meaning                              |
|-------|--------|--------------------------------------|
| 20–100 | Green  | Good maintainability                |
| 10–19  | Yellow | Moderate — consider refactoring     |
| 0–9    | Red    | Low — difficult to maintain         |

### How to Measure

- **Visual Studio** — `Analyze → Calculate Code Metrics` produces MI per method, class, and assembly.
- **NDepend** — Provides more granular MI analysis with trend charts.
- **SonarQube** — Does not use MI directly but tracks the underlying inputs (complexity, LOC, duplication) to estimate technical debt.

### Limitations

- MI is a heuristic — it correlates with maintainability but does not capture naming clarity, architecture, or test quality.
- Scores can be gamed (e.g., splitting code without meaningful decomposition).
- Best used as a trend indicator over time rather than an absolute threshold.

---

*Include short code examples in C#.*

```csharp
// Low MI candidate: large method, high complexity, cryptic logic
public void P(List<int> d)
{
    int s = 0; int c = 0;
    for (int i = 0; i < d.Count; i++) { if (d[i] > 0) { s += d[i]; c++; } }
    if (c > 0) Console.WriteLine(s / c); else Console.WriteLine(0);
}

// High MI refactor: meaningful names, single responsibility, readable
public void PrintAverageOfPositives(IEnumerable<int> values)
{
    var positives = values.Where(v => v > 0).ToList();
    double average = positives.Count > 0 ? positives.Average() : 0;
    Console.WriteLine(average);
}
```
