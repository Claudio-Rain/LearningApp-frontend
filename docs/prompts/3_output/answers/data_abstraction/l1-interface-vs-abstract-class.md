# L1 What is the difference between an interface and an abstract class, and when would you choose one over the other?

## Answer

Both interfaces and abstract classes enable abstraction and polymorphism in C#, but they serve different design purposes.

### Key differences

| Feature | Interface | Abstract Class |
|---|---|---|
| Instantiation | Cannot be instantiated | Cannot be instantiated |
| Multiple inheritance | A class can implement many interfaces | A class can inherit only one abstract class |
| Instance fields | Not allowed | Allowed |
| Constructors | Not allowed | Allowed |
| Access modifiers on members | All public by default | Can be any access modifier |
| Shared implementation | Only via default implementations (C# 8+) | Fully supported |
| State | No instance state | Can hold instance state |
| Relationship | "Can-do" / capability | "Is-a" / identity |

### When to choose an interface

- You want to define a **capability or role** that unrelated types can share (e.g., `IDisposable`, `IComparable`, `ILogger`).
- You need **multiple inheritance** of behaviour (a class can implement many interfaces).
- You are designing a **public API or library contract** that should not force a specific inheritance chain on consumers.
- The implementing types have no meaningful shared implementation or state.

### When to choose an abstract class

- You have an **"is-a" relationship** with shared implementation logic that should not be duplicated (e.g., `Shape` is a base for `Circle` and `Rectangle`).
- You need **shared state** (fields, auto-properties) across all derived types.
- You want to provide **a constructor** that derived classes must call.
- You are building a **template method pattern** where derived classes plug in specific steps.

### Code example

Include short code examples in C#.

```csharp
// Interface: defines a capability — any type can be "printable"
public interface IPrintable
{
    void Print();
}

// Abstract class: defines a shared identity with common state and logic
public abstract class Document : IPrintable
{
    public string Title { get; }
    public DateTime CreatedAt { get; }

    protected Document(string title)
    {
        Title = title;
        CreatedAt = DateTime.Now;
    }

    // Shared concrete behaviour
    public void Print()
    {
        Console.WriteLine($"[{CreatedAt:d}] {Title}");
        PrintContent();
    }

    // Template method — derived classes fill in the specifics
    protected abstract void PrintContent();
}

public class Invoice : Document
{
    public decimal Amount { get; }

    public Invoice(string title, decimal amount) : base(title)
    {
        Amount = amount;
    }

    protected override void PrintContent()
    {
        Console.WriteLine($"Amount due: {Amount:C}");
    }
}

// A completely unrelated type can also be IPrintable
public class LogEntry : IPrintable
{
    public void Print() => Console.WriteLine("Log entry printed.");
}
```

### Rule of thumb

- **Interface** = "what you can do" (capability, contract, role).
- **Abstract class** = "what you are" (identity, shared structure, shared state).

When in doubt, prefer interfaces for maximum flexibility; use abstract classes when you have genuine shared logic or state that belongs in a base.
