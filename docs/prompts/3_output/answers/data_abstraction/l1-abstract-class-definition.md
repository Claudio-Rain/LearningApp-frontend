# L1 How do you define an abstract class in C#, and what makes it different from a regular class?

## Answer

An **abstract class** in C# is defined using the `abstract` keyword before the `class` keyword. It serves as an incomplete blueprint that other classes must inherit from and complete.

### Key differences from a regular class

| Feature | Abstract Class | Regular Class |
|---|---|---|
| Instantiation | Cannot be instantiated directly | Can be instantiated with `new` |
| Abstract members | Can declare abstract (body-less) members | Cannot have abstract members |
| Purpose | Serves as a base/template | Fully functional on its own |
| Inheritance requirement | Derived classes must implement all abstract members | No requirement on derived classes |

### What makes an abstract class special

1. **Cannot be instantiated** — you cannot call `new AbstractClass()` directly.
2. **Can contain abstract members** — methods and properties declared without an implementation body; derived classes are required to provide them.
3. **Can contain concrete members** — fully implemented methods, fields, constructors, and properties that derived classes inherit as-is.
4. **Supports constructor** — even though you cannot instantiate it directly, abstract classes can have constructors called via `base()` from derived classes.

### Code example

```csharp
// Abstract class — cannot be instantiated
public abstract class Shape
{
    // Abstract property — no implementation, must be overridden
    public abstract string Name { get; }

    // Abstract method — no body, must be overridden
    public abstract double CalculateArea();

    // Concrete method — shared implementation available to all derived classes
    public void PrintInfo()
    {
        Console.WriteLine($"{Name} has area: {CalculateArea():F2}");
    }
}

// Concrete class — must implement all abstract members
public class Circle : Shape
{
    private double _radius;

    public Circle(double radius) => _radius = radius;

    public override string Name => "Circle";

    public override double CalculateArea() => Math.PI * _radius * _radius;
}

// Usage
// Shape s = new Shape(); // ERROR: cannot instantiate abstract class
Shape c = new Circle(5);
c.PrintInfo(); // Output: Circle has area: 78.54
```

### Summary

Use an abstract class when you want to provide a common base with some shared implementation while enforcing that derived classes supply specific behaviour. It is the right tool when you have an "is-a" relationship and shared state or logic among related types.
