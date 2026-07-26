# L2 What does the `abstract` modifier mean when applied to a class, method, or property, and what constraints does it impose on derived types?

## Answer

The `abstract` modifier signals that something is **incomplete** and must be completed by a derived type. Its exact meaning and constraints depend on where it is applied.

---

## `abstract` on a class

- The class **cannot be instantiated** with `new`.
- The class **may contain** both abstract members (no body) and concrete members (with body).
- It is intended to be a base class only.

```csharp
public abstract class Animal { }

// Animal a = new Animal(); // ERROR: Cannot create an instance of the abstract class 'Animal'
```

**Constraint on derived types:** A derived class that does not implement all inherited abstract members must itself be declared `abstract`.

---

## `abstract` on a method

- The method has **no body** (no `{}` or `=>`).
- It can only appear inside an `abstract class`.
- The derived concrete class **must override it** with `override`.

Include short code examples in C#.

```csharp
public abstract class Shape
{
    // No body — derived class must provide the implementation
    public abstract double CalculateArea();
}

public class Square : Shape
{
    private double _side;
    public Square(double side) => _side = side;

    // Required override
    public override double CalculateArea() => _side * _side;
}
```

**Constraint:** Forgetting to override in a concrete derived class causes a compile-time error:
`error CS0534: 'Square' does not implement inherited abstract member 'Shape.CalculateArea()'`

---

## `abstract` on a property

- The property has **no accessor bodies**.
- The derived class must override it and provide the accessor bodies.
- You declare which accessors exist (`get`, `set`, or both) and the derived class must honour that.

```csharp
public abstract class Employee
{
    public abstract string JobTitle { get; }          // read-only contract
    public abstract decimal Salary { get; set; }      // read-write contract
}

public class Manager : Employee
{
    public override string JobTitle => "Manager";

    private decimal _salary;
    public override decimal Salary
    {
        get => _salary;
        set => _salary = value > 0 ? value : throw new ArgumentOutOfRangeException();
    }
}
```

**Constraint:** The override must provide at least the accessors declared in the abstract property. You cannot remove a `set` from an override if the base declared one.

---

## Summary table

| Target | What it means | Constraint on derived type |
|---|---|---|
| Class | Cannot be instantiated; may have abstract members | Must implement all abstract members, or itself be abstract |
| Method | No body; pure declaration | Must provide `override` with a body |
| Property | No accessor bodies | Must provide `override` with the required accessor(s) |

The `abstract` modifier is the compiler's way of saying: *"I declare what must exist — you decide how it works."*
