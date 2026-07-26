# L2 What is polymorphism, and how do virtual methods enable polymorphic behaviour in C#?

## Answer

## What is polymorphism?

**Polymorphism** (from Greek: "many forms") is the ability of a single variable, method call, or reference to behave differently depending on the actual runtime type of the object it points to.

In C#, polymorphism comes in two main forms:

| Form | Description | Mechanism |
|---|---|---|
| Compile-time (static) | Resolved at compile time | Method overloading, operator overloading |
| Runtime (dynamic) | Resolved at runtime | Virtual methods, abstract methods, interfaces |

The term "polymorphism" in OOP usually refers to **runtime polymorphism** — where the method that gets called is determined by the actual type of the object, not the type of the reference variable.

---

## How virtual methods enable runtime polymorphism

A **virtual method** is a method in a base class that derived classes are allowed to override. When a virtual method is called through a base-class reference, C# uses the runtime type of the object to determine which version to execute.

This is called **dynamic dispatch** and is the core mechanism behind runtime polymorphism.

### Steps

1. Declare the method in the base class with `virtual`.
2. Override it in derived classes with `override`.
3. Call it through a base-class or interface reference — C# dispatches to the correct derived version at runtime.

---

## Code example

Include short code examples in C#.

```csharp
public class Animal
{
    public string Name { get; }

    public Animal(string name) => Name = name;

    // Virtual method — derived classes MAY override
    public virtual string Speak()
    {
        return $"{Name} makes a sound.";
    }

    public void Introduce()
    {
        // Calls the overridden version at runtime — this is polymorphism
        Console.WriteLine(Speak());
    }
}

public class Dog : Animal
{
    public Dog(string name) : base(name) { }

    public override string Speak() => $"{Name} says: Woof!";
}

public class Cat : Animal
{
    public Cat(string name) : base(name) { }

    public override string Speak() => $"{Name} says: Meow!";
}

public class Fish : Animal
{
    public Fish(string name) : base(name) { }
    // Does NOT override Speak() — uses the base implementation
}
```

### Runtime dispatch in action

```csharp
Animal[] animals =
{
    new Dog("Rex"),
    new Cat("Whiskers"),
    new Fish("Nemo"),
};

foreach (Animal animal in animals)
{
    // The same call — different behaviour at runtime
    Console.WriteLine(animal.Speak());
}

// Output:
// Rex says: Woof!
// Whiskers says: Meow!
// Nemo makes a sound.

// Polymorphism through Introduce() calling the virtual method
new Dog("Buddy").Introduce();  // Buddy says: Woof!
new Cat("Luna").Introduce();   // Luna says: Meow!
```

---

## Why virtual methods matter

Without `virtual`, all method calls are resolved at compile time based on the **declared type**, not the runtime type:

```csharp
// Without virtual — no polymorphism
public class Base    { public string Info() => "Base"; }
public class Derived : Base { public string Info() => "Derived"; } // shadows, not overrides

Base obj = new Derived();
Console.WriteLine(obj.Info()); // "Base" — compile-time type wins (no dispatch)

// With virtual — polymorphism kicks in
public class Base2    { public virtual string Info() => "Base"; }
public class Derived2 : Base2 { public override string Info() => "Derived"; }

Base2 obj2 = new Derived2();
Console.WriteLine(obj2.Info()); // "Derived" — runtime type wins
```

---

## Summary

Polymorphism lets a base-class reference behave differently depending on the concrete object it holds. Virtual methods are the enabler: they tell the runtime "don't decide at compile time — look at the actual object and dispatch to its version." This is what makes it possible to write generic algorithms that work with any derived type without knowing the specific type in advance.
