# L3 What is the SOLID principle and how does applying it improve measurable code quality metrics?

## Answer

**SOLID** is an acronym for five object-oriented design principles that, when applied together, produce code that is easier to maintain, extend, and test.

---

### S — Single Responsibility Principle

A class should have only one reason to change.

```csharp
// Violation: OrderProcessor handles business logic AND persistence AND email
public class OrderProcessor { void ProcessOrder() { /* validate + save + email */ } }

// Better: separate concerns
public class OrderValidator  { bool Validate(Order o) { ... } }
public class OrderRepository { void Save(Order o)     { ... } }
public class OrderNotifier   { void Notify(Order o)   { ... } }
```

**Metric impact:** reduces class coupling and depth of inheritance; keeps cyclomatic complexity per class low.

---

### O — Open/Closed Principle

Classes should be open for extension but closed for modification.

```csharp
// Violation: adding a new discount type requires modifying the class
// Better: use an interface, add new types without touching existing code
public interface IDiscountStrategy { decimal Apply(decimal price); }
public class GoldDiscount   : IDiscountStrategy { ... }
public class SeniorDiscount : IDiscountStrategy { ... }
```

**Metric impact:** reduces the churn (lines changed) when adding features; lowers defect injection risk.

---

### L — Liskov Substitution Principle

Subtypes must be substitutable for their base types without breaking behavior.

```csharp
// Violation: Square overrides Width setter and breaks the Rectangle contract
// Better: don't force Square to inherit Rectangle; use a Shape abstraction
```

**Metric impact:** reduces unexpected runtime bugs; improves test reliability.

---

### I — Interface Segregation Principle

Clients should not be forced to depend on interfaces they don't use.

```csharp
// Violation: one fat interface forces implementors to have empty methods
public interface IWorker { void Work(); void Eat(); void Sleep(); }

// Better: split into role-specific interfaces
public interface IWorkable { void Work(); }
public interface IFeedable { void Eat(); }
```

**Metric impact:** reduces class coupling; keeps depth of inheritance shallow.

---

### D — Dependency Inversion Principle

High-level modules should not depend on low-level modules; both should depend on abstractions.

```csharp
// Violation: OrderService directly instantiates SqlOrderRepository
// Better: inject IOrderRepository; high-level code doesn't know about SQL
public class OrderService
{
    private readonly IOrderRepository _repo;
    public OrderService(IOrderRepository repo) => _repo = repo;
}
```

**Metric impact:** dramatically improves testability (enables mocking); reduces afferent/efferent coupling metrics.

---

### How SOLID maps to measurable metrics

| Principle | Metric improved |
|---|---|
| SRP | Cyclomatic complexity ↓, class size ↓ |
| OCP | Lines changed per feature ↓ |
| LSP | Runtime defect rate ↓ |
| ISP | Class coupling ↓ |
| DIP | Testability ↑, coupling ↓, maintainability index ↑ |
