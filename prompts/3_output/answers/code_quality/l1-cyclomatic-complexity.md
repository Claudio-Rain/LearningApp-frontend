# L1 What is cyclomatic complexity and how do you measure it?

## Answer

**Cyclomatic complexity** is a software metric introduced by Thomas McCabe in 1976 that quantifies the number of linearly independent paths through a piece of code. It is one of the most widely used measures of structural complexity.

### Formula

```
CC = E − N + 2P
```
- **E** = number of edges in the control flow graph
- **N** = number of nodes
- **P** = number of connected components (typically 1 for a single method)

A simpler, equivalent rule: **CC = number of decision points + 1**

Decision points include: `if`, `else if`, `while`, `for`, `foreach`, `case`, `&&`, `||`, `??`, `?:`, `catch`.

### Interpretation

| CC Range | Risk Level |
|----------|------------|
| 1–10     | Low — simple, easy to test |
| 11–20    | Moderate — some risk |
| 21–50    | High — hard to test |
| > 50     | Very high — must refactor |

### How to Measure

- **Visual Studio** — Built-in Code Metrics window (`Analyze → Calculate Code Metrics`).
- **ReSharper** — Reports complexity inline while you type.
- **SonarQube / SonarLint** — Tracks complexity per method and raises issues.
- **NDepend** — Advanced querying via CQLinq.
- **dotnet-counters / CLI tools** — Third-party CLI analyzers.

### Practical Significance

High cyclomatic complexity correlates directly with the minimum number of test cases needed for full branch coverage. A method with CC = 8 requires at least 8 unit tests to cover every path.

---

*Include short code examples in C#.*

```csharp
// CC = 5: one base path + four decision points (if, else if x2, &&)
public decimal CalculateDiscount(Customer customer, decimal orderTotal)
{
    if (customer.IsPremium && orderTotal > 500)   // +2 (&&)
        return 0.20m;
    else if (customer.IsPremium)                   // +1
        return 0.10m;
    else if (orderTotal > 500)                     // +1
        return 0.05m;
    else
        return 0m;
}

// Refactored to CC = 1 — extract decision table
private static readonly (bool isPremium, bool isLargeOrder, decimal discount)[] _rules =
{
    (true,  true,  0.20m),
    (true,  false, 0.10m),
    (false, true,  0.05m),
    (false, false, 0.00m),
};

public decimal CalculateDiscount(Customer customer, decimal orderTotal)
{
    bool isPremium    = customer.IsPremium;
    bool isLargeOrder = orderTotal > 500;
    return _rules.First(r => r.isPremium == isPremium && r.isLargeOrder == isLargeOrder).discount;
}
```
