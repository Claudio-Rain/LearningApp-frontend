# L3 How do you deal with code quality issues — for example, by refactoring code or adding new rules to your analyzers?

## Answer

Dealing with code quality issues is an ongoing process, not a one-time cleanup. A sustainable strategy combines **immediate tactical fixes**, **systematic refactoring**, and **automated prevention** through tooling.

---

## 1. Identify and Prioritize

Before changing anything, assess what you have:

- Run your full static analysis suite and collect all findings.
- Categorize issues: **correctness bugs** (fix immediately), **security vulnerabilities** (fix immediately), **maintainability / style** (address in sprints), **minor suggestions** (address opportunistically).
- Use SonarQube's Technical Debt view or NDepend's issue severity to prioritize.

**Boy Scout Rule**: Always leave the code a little cleaner than you found it. Fix small issues in files you're already modifying, even if they're not in your ticket.

---

## 2. Refactoring Strategies

### Extract Method
Break large, high-complexity methods into smaller, named units.

```csharp
// Before: one method doing too much (CC = 12)
public void ProcessOrder(Order order)
{
    // validate...
    // calculate totals...
    // apply discounts...
    // send email...
    // save to DB...
}

// After: each concern is isolated and testable
public void ProcessOrder(Order order)
{
    Validate(order);
    var total = CalculateTotal(order);
    var discounted = ApplyDiscounts(order, total);
    _emailService.SendConfirmation(order);
    _repository.Save(order);
}
```

### Replace Conditional with Polymorphism
High cyclomatic complexity from `switch`/`if-else` chains often signals a missing abstraction.

```csharp
// Before: switch grows every time a new shape is added
public double CalculateArea(Shape shape)
{
    return shape.Type switch
    {
        ShapeType.Circle    => Math.PI * shape.Radius * shape.Radius,
        ShapeType.Rectangle => shape.Width * shape.Height,
        ShapeType.Triangle  => 0.5 * shape.Base * shape.Height,
        _ => throw new ArgumentOutOfRangeException()
    };
}

// After: Open/Closed — add a shape without modifying existing code
public abstract class Shape { public abstract double CalculateArea(); }

public class Circle    : Shape { public override double CalculateArea() => Math.PI * Radius * Radius; }
public class Rectangle : Shape { public override double CalculateArea() => Width * Height; }
public class Triangle  : Shape { public override double CalculateArea() => 0.5 * Base * Height; }
```

### Introduce Dependency Injection
Replace `new` with injected abstractions to reduce coupling and enable testing.

### Remove Code Duplication
Extract shared logic into shared services, base classes, or extension methods.

---

## 3. Adding Analyzer Rules to Prevent Regression

Once you fix a category of issue, add a rule so it cannot reappear:

```ini
# .editorconfig — enforce the fix as a build error going forward
dotnet_diagnostic.CA1062.severity = error   # Validate public method arguments
dotnet_diagnostic.CA2000.severity = error   # Dispose objects before losing scope
dotnet_diagnostic.S2583.severity = error    # Condition is always true/false (SonarAnalyzer)
```

### Writing Custom Roslyn Analyzers
For domain-specific rules (e.g., "all repository classes must be sealed"):

```csharp
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class RepositoryMustBeSealedAnalyzer : DiagnosticAnalyzer
{
    private static readonly DiagnosticDescriptor Rule = new(
        id: "CUSTOM001",
        title: "Repository classes must be sealed",
        messageFormat: "'{0}' implements IRepository but is not sealed",
        category: "Design",
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true);

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics => [Rule];

    public override void Initialize(AnalysisContext context)
    {
        context.RegisterSymbolAction(AnalyzeSymbol, SymbolKind.NamedType);
    }

    private static void AnalyzeSymbol(SymbolAnalysisContext context)
    {
        var type = (INamedTypeSymbol)context.Symbol;
        bool implementsRepository = type.AllInterfaces.Any(i => i.Name == "IRepository");
        if (implementsRepository && !type.IsSealed)
            context.ReportDiagnostic(Diagnostic.Create(Rule, type.Locations[0], type.Name));
    }
}
```

---

## 4. Process and Culture

- **Code reviews** — reviewers check that new code doesn't introduce quality regressions.
- **Quality gates in CI** — block merges when SonarQube Quality Gate fails.
- **Dedicated refactoring sprints** — allocate time specifically for paying down technical debt.
- **Track trends** — monitor technical debt ratio and complexity trends; celebrate measurable improvements.

The combination of tooling (automated prevention) and discipline (active refactoring) is what keeps quality sustainable long-term.
