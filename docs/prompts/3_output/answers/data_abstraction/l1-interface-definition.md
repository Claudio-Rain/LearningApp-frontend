# L1 How do you define an interface in C#, and what are the rules that govern its members?

## Answer

An **interface** in C# is defined using the `interface` keyword. It declares a contract — a set of members that any implementing class or struct must provide.

### Basic syntax

```csharp
public interface IAnimal
{
    string Name { get; }       // Property
    void Speak();              // Method
    event EventHandler OnSpeak; // Event
}
```

### Rules that govern interface members

1. **All members are public by default** — you cannot apply access modifiers like `private` or `protected` to traditional interface members (before C# 8).

2. **No instance fields** — interfaces cannot declare instance fields. Only properties, methods, events, and indexers are allowed.

3. **No constructors** — interfaces cannot have constructors.

4. **No instance state** — interfaces do not hold state; they only define shape/behaviour.

5. **Implementing classes must provide all members** — unless the member has a default implementation (C# 8+).

6. **Default interface implementations (C# 8+)** — members can have a body, providing a default that implementors may optionally override.

7. **Static members allowed (C# 8+)** — interfaces can declare static methods and fields.

8. **Cannot be instantiated** — you cannot do `new IAnimal()`, but you can hold a reference of interface type.

### Full example

```csharp
public interface IVehicle
{
    // Property contract
    string Make { get; }
    int Year { get; }

    // Method contract
    void StartEngine();

    // Default implementation (C# 8+)
    void PrintInfo()
    {
        Console.WriteLine($"{Year} {Make}");
    }
}

public class Car : IVehicle
{
    public string Make { get; }
    public int Year { get; }

    public Car(string make, int year)
    {
        Make = make;
        Year = year;
    }

    public void StartEngine() => Console.WriteLine("Vroom!");
    // PrintInfo() is inherited from the interface default
}

// Usage
IVehicle car = new Car("Toyota", 2024);
car.StartEngine();   // Vroom!
car.PrintInfo();     // 2024 Toyota
```

### Summary

An interface defines a pure contract with no instance state. Every implementing type must fulfil all declared members. Use interfaces to decouple components and enable polymorphism across unrelated type hierarchies.
