# L1 How would you write an abstract class that declares abstract methods and properties?

## Answer

An abstract class can declare abstract methods and properties using the `abstract` keyword. These members have no body — they are pure declarations that derived (concrete) classes must override and implement.

### Rules for abstract members

- Must be declared inside an `abstract class`.
- Cannot have a body (no `{}` or `=>`).
- Must be marked `override` in the derived class.
- Can be `public`, `protected`, or `internal` — but not `private` (a private abstract member could never be overridden).

### Abstract method syntax

```csharp
public abstract ReturnType MethodName(parameters);
```

### Abstract property syntax

```csharp
public abstract Type PropertyName { get; }        // read-only
public abstract Type PropertyName { get; set; }   // read-write
```

### Full example

Include short code examples in C#.

```csharp
// Abstract class with abstract method and property
public abstract class Animal
{
    // Abstract read-only property — no implementation
    public abstract string Species { get; }

    // Abstract read-write property
    public abstract string Sound { get; set; }

    // Abstract method — must be implemented by derived classes
    public abstract void Describe();

    // Concrete method — shared by all derived classes
    public void Sleep()
    {
        Console.WriteLine($"{Species} is sleeping...");
    }
}

// Concrete class — must implement ALL abstract members
public class Dog : Animal
{
    private string _sound = "Woof";

    // Implementing the abstract read-only property
    public override string Species => "Canis lupus familiaris";

    // Implementing the abstract read-write property
    public override string Sound
    {
        get => _sound;
        set => _sound = value;
    }

    // Implementing the abstract method
    public override void Describe()
    {
        Console.WriteLine($"I am a {Species} and I say {Sound}!");
    }
}

// Usage
Animal dog = new Dog();
dog.Describe();   // I am a Canis lupus familiaris and I say Woof!
dog.Sleep();      // Canis lupus familiaris is sleeping...

// Changing the abstract property value through the concrete type
((Dog)dog).Sound = "Bark";
dog.Describe();   // I am a Canis lupus familiaris and I say Bark!
```

### Summary

Declare abstract members when the base class knows that every derived type must provide a specific behaviour, but the base class has no meaningful way to implement it itself. The compiler enforces that all abstract members are overridden before a class can be instantiated.
