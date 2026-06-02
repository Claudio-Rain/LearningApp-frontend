# L2 What is class coupling and how do you measure it in a codebase?

## Answer

**Class coupling** (also called *Coupling Between Objects*, CBO) measures how many distinct types a given class depends on. A class is considered coupled to another type when it references it through field declarations, method parameters, return types, local variables, base classes, interface implementations, generic type arguments, attributes, or exception types.

### Why It Matters

High coupling makes code harder to:
- **Test** — You can't isolate a class without setting up its many dependencies.
- **Change** — Modifying one class may require changes in many others.
- **Reuse** — Tightly coupled classes drag their dependencies along wherever they go.

The goal is to follow the **Low Coupling / High Cohesion** principle: each class should know as little as possible about other classes.

### Measurement Guidelines

| CBO Range | Assessment |
|-----------|------------|
| 0–5       | Good — well-isolated class |
| 6–9       | Acceptable — watch for growth |
| 10+       | High risk — consider decomposition |

### How to Measure

- **Visual Studio Code Metrics** — `Analyze → Calculate Code Metrics` reports *Class Coupling* per class and assembly.
- **NDepend** — Rich coupling analysis: afferent (Ca) and efferent (Ce) coupling, instability metric `I = Ce / (Ca + Ce)`.
- **ReSharper** — Dependency diagrams highlight coupling visually.
- **SonarQube** — Tracks coupling as part of its architecture rules.

### Afferent vs. Efferent Coupling

- **Afferent (Ca)** — How many classes *depend on* this class (incoming). High Ca = responsible, hard to change.
- **Efferent (Ce)** — How many classes *this class depends on* (outgoing). High Ce = fragile, hard to test.

**Instability**: `I = Ce / (Ca + Ce)` — ranges 0 (stable) to 1 (unstable).

---

*Include short code examples in C#.*

```csharp
// High coupling — OrderService depends on many concrete types
public class OrderService
{
    private readonly SqlOrderRepository _repo;      // coupling
    private readonly SmtpEmailSender _email;        // coupling
    private readonly StripePaymentGateway _payment; // coupling
    private readonly AuditLogger _logger;           // coupling

    public void PlaceOrder(Order order) { /* ... */ }
}

// Low coupling — depends on abstractions (interfaces)
public class OrderService
{
    private readonly IOrderRepository _repo;
    private readonly IEmailSender _email;
    private readonly IPaymentGateway _payment;
    private readonly ILogger<OrderService> _logger;

    public OrderService(
        IOrderRepository repo,
        IEmailSender email,
        IPaymentGateway payment,
        ILogger<OrderService> logger)
    {
        _repo    = repo;
        _email   = email;
        _payment = payment;
        _logger  = logger;
    }

    public void PlaceOrder(Order order) { /* ... */ }
}
```

By depending on interfaces rather than concrete classes, `OrderService` remains loosely coupled and each dependency can be swapped or mocked independently in tests.
