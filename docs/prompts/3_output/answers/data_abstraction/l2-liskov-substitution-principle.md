# L2 What is the Liskov Substitution Principle and how does it relate to inheritance and polymorphism?

## Answer

The **Liskov Substitution Principle (LSP)** — the "L" in SOLID — states:

> If `S` is a subtype of `T`, then objects of type `T` may be replaced with objects of type `S` without altering any of the desirable properties of the program.

In plain terms: **a derived class must be fully substitutable for its base class**. Code that works with a `Base` reference must work correctly with any `Derived` reference, with no surprises.

---

## Classic violation — the Rectangle / Square trap

```csharp
public class Rectangle
{
    public virtual int Width  { get; set; }
    public virtual int Height { get; set; }

    public int Area() => Width * Height;
}

public class Square : Rectangle
{
    // A square must keep Width == Height, so it overrides both setters
    public override int Width  { set { base.Width = base.Height = value; } }
    public override int Height { set { base.Width = base.Height = value; } }
}

// Code written against Rectangle breaks when given a Square
void DoubleWidth(Rectangle r)
{
    r.Width = 10;
    r.Height = 5;
    Console.WriteLine(r.Area()); // expected 50, prints 25 for Square!
}
```

`Square` violates LSP because setting `Width` and `Height` independently — a valid operation on `Rectangle` — produces wrong results on `Square`.

---

## A compliant design

```csharp
// Use a shared abstraction instead of inheritance
public interface IShape
{
    int Area();
}

public class Rectangle : IShape
{
    public int Width  { get; set; }
    public int Height { get; set; }
    public int Area() => Width * Height;
}

public class Square : IShape
{
    public int Side { get; set; }
    public int Area() => Side * Side;
}
```

Now neither class is a subtype of the other — there is no substitution contract to violate.

---

## Rules for LSP-compliant overrides

| Rule | Meaning |
|---|---|
| Preconditions cannot be strengthened | The override must accept at least as much as the base method does |
| Postconditions cannot be weakened | The override must guarantee at least as much as the base method does |
| Invariants must be preserved | Properties guaranteed by the base class must hold in the subclass |
| No new exceptions | The override must not throw exception types the caller doesn't expect |

---

## Relationship to polymorphism

Polymorphism lets you write code against a base type and swap in different subtypes at runtime. LSP is the **safety guarantee** that makes polymorphism reliable — without it, you need `is`/`as` checks everywhere to handle subtypes that behave unexpectedly, which defeats the purpose of polymorphism entirely.

---

## Summary

LSP keeps inheritance honest. When a subclass changes observable behaviour in a way that breaks callers relying on the base contract, it signals that the "is-a" relationship is wrong. The fix is usually to extract a shared interface, flatten the hierarchy, or use composition instead of inheritance.
