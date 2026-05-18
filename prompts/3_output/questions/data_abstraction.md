# Interview Questions: Data Abstraction

## Coverage map

| Item | Type | Level |
|------|------|-------|
| How to define abstract classes and interfaces? | Knowledge | Level 1 — Definition & Basics |
| Difference between interface and abstract class | Knowledge | Level 2 — Core Concepts |
| Understanding of abstract modifiers | Knowledge | Level 2 — Core Concepts |
| What is polymorphism and how to define and implement virtual methods? | Knowledge | Level 2 — Core Concepts |
| How to implement multiple inheritance using interfaces? | Knowledge | Level 3 — Practical Usage |
| What is explicit interface implementation? | Knowledge | Level 3 — Practical Usage |
| Defines an abstract class with abstract methods and properties | Skill | Level 3 — Practical Usage |
| Defines non-abstract class and includes implementations of all inherited abstract members | Skill | Level 3 — Practical Usage |
| Implements multiple inheritance using interfaces | Skill | Level 3 — Practical Usage |
| Uses explicit interface implementations | Skill | Level 3 — Practical Usage |
| Defines and implements virtual methods | Skill | Level 3 — Practical Usage |
| Uses a combination of interfaces and abstract classes to implement well-designed types | Skill | Level 6 — Trade-offs & Design Decisions |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate understands what data abstraction is and the basic vocabulary around abstract types._

### What is Abstraction
- ❓ What does "abstraction" mean in object-oriented programming, and why is it useful? `[INFERRED]`
- ❓ What is an abstract class in C#? Can you instantiate it directly? `[FROM JD]`
- ❓ What is an interface in C#? How is it different from a concrete class? `[FROM JD]`
- ❓ What keyword do you use to mark a class or method as abstract in C#? `[FROM JD]`

---

## Level 2 — Core Concepts
_Goal: Verify the candidate understands how abstract classes, interfaces, polymorphism, and virtual methods actually work._

### Abstract Classes vs Interfaces
- ❓ What are the key differences between an abstract class and an interface in C#? When would you choose one over the other? `[FROM JD]`
- ❓ Can an abstract class have a constructor? Can it have fields? What about an interface? `[INFERRED]`
- ❓ As of C# 8+, interfaces can have default method implementations. Does that blur the line between interfaces and abstract classes? `[INFERRED]`

### Abstract Modifiers
- ❓ What does the `abstract` modifier mean when applied to a method? What does the derived class have to do? `[FROM JD]`
- ❓ Can you mark a property or an event as abstract? What would that look like? `[FROM JD]`
- ❓ What happens if a derived class does not implement all inherited abstract members — will it compile? `[INFERRED]`

### Polymorphism and Virtual Methods
- ❓ What is polymorphism in OOP? Give a practical example of runtime polymorphism in C#. `[FROM JD]`
- ❓ What is the difference between `virtual` and `abstract` methods? `[FROM JD]`
- ❓ What does the `override` keyword do? What happens if you omit it on a derived class method that shadows a virtual method? `[INFERRED]`
- ❓ What is the `sealed` modifier and when would you use it on a method? `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Test whether the candidate can write and compose abstract types correctly in real code._

### Defining Abstract Classes
- ❓ Write an abstract class `Shape` that has an abstract method `Area()` and a concrete method `Describe()`. `[FROM JD]`
- ❓ Now derive a concrete class `Circle` from `Shape` and implement `Area()`. What must `Circle` include to compile? `[FROM JD]`
- ❓ Can an abstract class implement an interface? Does it have to implement all interface members? `[INFERRED]`

### Multiple Inheritance via Interfaces
- ❓ C# does not support multiple class inheritance. How do you achieve multiple inheritance behavior? `[FROM JD]`
- ❓ Write a class that implements two interfaces, both of which declare a method with the same name and signature. What problem does this create? `[FROM JD]`
- ❓ How does explicit interface implementation solve name collisions? Show an example. `[FROM JD]`
- ❓ When you use explicit interface implementation, can you call that method on the concrete type directly? Why or why not? `[FROM JD]`

### Virtual Methods
- ❓ Write a base class with a `virtual` method and two derived classes that each `override` it. Demonstrate that calling the method on a base reference invokes the derived implementation at runtime. `[FROM JD]`

---

## Level 4 — Common Pitfalls
_Goal: Expose gaps in understanding around common mistakes and misconceptions._

### Misuse and Gotchas
- ❓ A colleague marks every method in a class as `virtual` "just in case." What problems can this cause? `[INFERRED]`
- ❓ You call a virtual method from a base class constructor. What is the risk here? `[INFERRED]`
- ❓ A developer creates an interface with 15 methods. A class only needs 3 of them. What principle is being violated and how would you fix it? `[INFERRED]`
- ❓ When would you accidentally hide a virtual method instead of overriding it, and how does C# signal this? `[INFERRED]`
- ❓ Can an abstract class inherit from a concrete class? What implications does that have? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Test understanding of how the CLR and compiler implement these features under the hood._

### Virtual Dispatch
- ❓ How does the CLR implement virtual method dispatch? What is a vtable (virtual method table)? `[INFERRED]`
- ❓ How does the CLR handle explicit interface implementation at the dispatch level — how does it know which implementation to call? `[INFERRED]`
- ❓ What is the performance overhead of virtual dispatch compared to a direct method call, and does it matter in practice? `[INFERRED]`

### Interface Internals
- ❓ How are interface default implementations stored and dispatched in .NET? Are they part of the implementing type's vtable? `[INFERRED]`
- ❓ In terms of memory layout, how does a class that implements three interfaces differ from one that extends a base class? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate architectural thinking and judgment._

### Design Choices
- ❓ You're designing a plugin system where third parties will implement core behaviors. Should you expose abstract classes or interfaces as the extension point? Defend your choice. `[FROM JD]`
- ❓ When is it appropriate to use both an interface and an abstract class together (e.g., `ILogger` + `LoggerBase`)? What does each layer buy you? `[FROM JD]`
- ❓ Your team debates whether to add a new method to an existing interface vs. creating a new interface that extends it. What are the trade-offs, especially regarding backward compatibility? `[INFERRED]`
- ❓ Abstract classes can enforce a template method pattern; interfaces cannot (before C# 8). How does that change your choice between them for framework design? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Probe architecture-level thinking and nuanced edge cases._

### Advanced Scenarios
- ❓ How do covariance and contravariance on generic interfaces (`IEnumerable<out T>`, `IComparer<in T>`) interact with polymorphism? `[INFERRED]`
- ❓ You need to add behavior to a sealed third-party class that you cannot modify. What patterns give you polymorphism-like flexibility without inheritance? `[INFERRED]`
- ❓ How do the SOLID principles (especially LSP and ISP) constrain how you design inheritance hierarchies and interfaces? Give a concrete example of a hierarchy that violates LSP. `[INFERRED]`
- ❓ In a large system, abstract base classes tend to accumulate "god" state over time. How do you fight that drift, and at what point would you refactor from an abstract class hierarchy to composition? `[INFERRED]`
