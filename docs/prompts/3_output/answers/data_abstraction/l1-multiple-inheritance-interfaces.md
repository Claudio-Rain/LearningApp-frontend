# L1 How do you implement multiple inheritance in C# using interfaces?

## Answer

C# does not support multiple class inheritance — a class can only inherit from one base class. However, a class can implement **any number of interfaces**, which is the primary mechanism for achieving multiple inheritance of behaviour in C#.

### Syntax

```csharp
public class MyClass : IInterfaceA, IInterfaceB, IInterfaceC
{
    // Must implement all members from all interfaces
}
```

If the class also inherits from a base class, the base class comes first:

```csharp
public class MyClass : BaseClass, IInterfaceA, IInterfaceB
{
    // ...
}
```

### Why use interfaces for multiple inheritance?

- A class can take on multiple roles/capabilities independently of the type hierarchy.
- Promotes the **Interface Segregation Principle** (ISP) — small, focused contracts.
- Enables polymorphism: an instance can be referenced by any of its implemented interface types.

### Full example

Include short code examples in C#.

```csharp
public interface IFlyable
{
    void Fly();
    int MaxAltitude { get; }
}

public interface ISwimmable
{
    void Swim();
    int MaxDepth { get; }
}

public interface IRunnable
{
    void Run();
    double MaxSpeed { get; }
}

// Duck inherits multiple capabilities via interfaces
public class Duck : IFlyable, ISwimmable, IRunnable
{
    public int MaxAltitude => 100;
    public int MaxDepth => 2;
    public double MaxSpeed => 8.0;

    public void Fly()  => Console.WriteLine("Duck is flying!");
    public void Swim() => Console.WriteLine("Duck is swimming!");
    public void Run()  => Console.WriteLine("Duck is waddling!");
}

// Usage — the Duck can be used as any of its interface types
Duck duck = new Duck();
duck.Fly();
duck.Swim();
duck.Run();

// Polymorphic usage
IFlyable flyer     = duck;
ISwimmable swimmer = duck;
IRunnable runner   = duck;

flyer.Fly();       // Duck is flying!
swimmer.Swim();    // Duck is swimming!
runner.Run();      // Duck is waddling!
```

### Combining with a base class

```csharp
public abstract class Bird
{
    public string Name { get; }
    protected Bird(string name) => Name = name;
}

// Inherits from Bird AND implements multiple interfaces
public class Pelican : Bird, IFlyable, ISwimmable
{
    public Pelican() : base("Pelican") { }

    public int MaxAltitude => 300;
    public int MaxDepth => 5;

    public void Fly()  => Console.WriteLine($"{Name} soaring!");
    public void Swim() => Console.WriteLine($"{Name} diving!");
}
```

### Summary

Multiple inheritance in C# is achieved through interfaces. A class implements multiple interfaces by listing them (comma-separated) after the `:`. The class must provide concrete implementations for all members of all interfaces. This pattern is both flexible and safe — it avoids the diamond problem associated with multiple class inheritance.
