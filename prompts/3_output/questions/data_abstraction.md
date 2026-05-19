# Interview Questions: Data Abstraction

## Coverage map

| Item | Type | Level |
|------|------|-------|
| How to define abstract classes and interfaces | FROM JD | 1–2 |
| How to implement multiple inheritance using interfaces | FROM JD | 3 |
| What is explicit interface implementation | FROM JD | 3–4 |
| Difference between interface and abstract class | FROM JD | 2 |
| Understanding of abstract modifiers | FROM JD | 2 |
| What is polymorphism and how to define/implement virtual methods | FROM JD | 2–3 |
| Defines abstract class with abstract methods and properties | FROM JD | 3 |
| Defines non-abstract class with all inherited abstract members implemented | FROM JD | 3 |
| Implements multiple inheritance using interfaces | FROM JD | 3 |
| Uses explicit interface implementations | FROM JD | 4 |
| Uses combination of interfaces and abstract classes | FROM JD | 6 |
| Defines and implements virtual methods | FROM JD | 3 |
| Why abstraction exists / purpose and value | INFERRED | 1 |
| Abstract vs concrete types — vocabulary | INFERRED | 1 |
| Sealed classes and preventing inheritance | INFERRED | 4 |
| Default interface members (C# 8+) | INFERRED | 5 |
| vtable and virtual dispatch internals | INFERRED | 5 |
| Abstract class constructor behavior | INFERRED | 4 |
| Covariance and contravariance in interfaces | INFERRED | 7 |
| Interface segregation principle (ISP) | INFERRED | 6 |
| Liskov Substitution Principle and abstraction | INFERRED | 6 |
| Diamond problem and how C# resolves it | INFERRED | 4–5 |
| Debugging broken polymorphism / missing override | INFERRED | 4 |
| Performance implications of virtual dispatch | INFERRED | 5–6 |
| Composition over inheritance trade-offs | INFERRED | 6–7 |
| Marker interfaces and their modern alternatives | INFERRED | 7 |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate understands what data abstraction is, why it exists, and can use core vocabulary correctly._

### What abstraction is and why it matters
- ❓ In your own words, what does "data abstraction" mean, and why do we need it in object-oriented design? `[INFERRED]`
- ❓ What problem would arise if every class in a large codebase exposed all of its internal implementation details to callers? `[INFERRED]`
- ❓ How would you explain the difference between a *concrete* type and an *abstract* type to a junior developer who has never heard either term? `[INFERRED]`

### Interfaces and abstract classes — first contact
- ❓ What is an abstract class, and what makes it different from a regular class? `[FROM JD]`
- ❓ What is an interface, and what contract does it impose on any class that implements it? `[FROM JD]`
- ❓ Why can't you create an instance of an abstract class directly? What design intent does that restriction enforce? `[INFERRED]`

### Trade-off question (required at every level)
- ❓ If both abstract classes and interfaces can define a "shape" that other types must follow, why does C# provide both constructs instead of just one? What would you lose if you only had interfaces? `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Verify deep understanding of the building blocks: abstract modifier, virtual methods, polymorphism, and the interface-vs-abstract-class distinction._

### Abstract modifier
- ❓ What does the `abstract` modifier mean when applied to a class? What does it mean when applied to a method or property inside that class? `[FROM JD]`
- ❓ Can an abstract class contain non-abstract (concrete) members? If so, what is the point of mixing both? `[INFERRED]`
- ❓ What happens at compile time if a concrete subclass does not implement every abstract member it inherits? `[INFERRED]`

### Virtual methods and polymorphism
- ❓ What is polymorphism, and how does the `virtual`/`override` keyword pair enable it in C#? `[FROM JD]`
- ❓ What is the difference between `virtual`, `override`, and `new` when used on a method? What runtime behavior does each produce? `[FROM JD]`
- ❓ Why must you explicitly mark a method `virtual` in C# for it to be overridable, whereas in Java all instance methods are virtual by default? What are the implications of each design choice? `[INFERRED]`

### Interface vs. abstract class
- ❓ List at least four concrete differences between an interface and an abstract class in C#. For each difference, explain the design scenario where that difference matters. `[FROM JD]`
- ❓ An interface cannot hold state (instance fields). Why is that restriction intentional, and how does it shape the way you model behavior? `[INFERRED]`

### Trade-off question
- ❓ A teammate argues "just use interfaces everywhere — they're more flexible." When would you push back on that advice, and why? `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Assess whether the candidate can write correct, idiomatic code using abstract classes, interfaces, virtual methods, and multiple inheritance._

### Defining and implementing abstract types
- ❓ Write a short C# example that defines an abstract class `Shape` with an abstract property `Area` and an abstract method `Describe()`. Then write a concrete class `Circle` that inherits from it and provides full implementations. `[FROM JD]`
- ❓ If `Shape` also has a concrete method `PrintInfo()` that calls `Describe()` internally, how does polymorphism ensure the correct `Describe()` implementation runs at runtime? `[FROM JD]`

### Virtual methods in practice
- ❓ Define a base class `Logger` with a virtual method `Log(string message)`. Show how two subclasses — `FileLogger` and `ConsoleLogger` — override it, and demonstrate calling `Log` through a `Logger` reference. `[FROM JD]`
- ❓ When overriding a virtual method, should you call `base.Method()` inside the override? What are the rules of thumb for deciding? `[INFERRED]`

### Multiple inheritance via interfaces
- ❓ C# does not allow a class to inherit from more than one base class, but it does allow implementing multiple interfaces. Write an example where a single class `Robot` implements both `IMovable` and `IChargeable`. Why does allowing multiple interface implementation not cause the same problems as multiple class inheritance? `[FROM JD]`

### Explicit interface implementation
- ❓ What is explicit interface implementation, and how does its syntax differ from implicit implementation? Write a short example showing a class that explicitly implements `IFoo.Bar()`. `[FROM JD]`
- ❓ When is explicit interface implementation the right choice? Give a concrete scenario where it solves a real problem. `[FROM JD]`

### Trade-off question
- ❓ You are designing a plugin system where third-party developers provide custom data processors. Should the contract you publish be an interface or an abstract class? Walk through the reasoning. `[INFERRED]`

---

## Level 4 — Common Pitfalls
_Goal: Surface misconceptions, edge cases, and bugs that real engineers encounter._

### Abstract class pitfalls
- ❓ A developer defines an abstract class with a constructor that performs important initialization. A subclass forgets to call `base(...)`. What goes wrong, and how would you design the class to make this mistake harder to make? `[INFERRED]`
- ❓ Can an abstract class implement an interface? If so, does it have to implement all of the interface's members? What happens if it leaves some unimplemented? `[INFERRED]`

### Virtual method pitfalls
- ❓ A developer uses the `new` keyword instead of `override` to redefine a virtual method in a subclass, then calls the method through a base-class reference. Describe exactly what happens and why this is usually a bug. `[INFERRED]`
- ❓ **Debugging scenario:** You have a method marked `virtual` in the base class and `override` in the subclass, yet at runtime the base-class version always executes. What are the possible causes, and how would you diagnose this? `[INFERRED]`

### Explicit interface implementation pitfalls
- ❓ A class explicitly implements `IFoo.Bar()`. A teammate writes `obj.Bar()` where `obj` is declared as the concrete class type, and gets a compile error. Why does this happen, and what are the two ways to fix it? `[FROM JD]`
- ❓ What happens when two interfaces that a class implements declare a member with the same signature? How does explicit interface implementation resolve the conflict, and what are the risks? `[FROM JD]`

### Diamond problem
- ❓ C# does not have multiple class inheritance, but you can still construct a "diamond" scenario through interfaces with default members (C# 8+). Describe how this can arise and how C# resolves the ambiguity. `[INFERRED]`

### Sealed classes
- ❓ What does the `sealed` modifier do to a class or a method, and why would you use it? Is sealing a virtual method a contradiction in terms? `[INFERRED]`

### Trade-off question
- ❓ Explicit interface implementation hides members from the public API of a class. Is that hiding a feature or a footgun? In what scenarios can it lead to surprising behavior for callers? `[FROM JD]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Probe how the runtime actually implements these features._

### Virtual dispatch and vtable
- ❓ How does the CLR implement virtual method dispatch? Describe the role of the vtable and explain what happens step by step when you call a virtual method through a base-class reference. `[INFERRED]`
- ❓ Abstract methods have no body in the base class, yet the vtable must have an entry for them. How does the CLR handle this, and what prevents instantiating a class that leaves an abstract slot unfilled? `[INFERRED]`

### Interface dispatch internals
- ❓ When you cast a class instance to an interface type and call a method through the interface reference, how does the CLR locate the correct method implementation? How does this differ from virtual dispatch through a class hierarchy? `[INFERRED]`

### Default interface members (C# 8+)
- ❓ C# 8 introduced default interface implementations. How are they stored and dispatched at the CLR level? Why can a class that implements the interface not "see" the default implementation without casting to the interface type? `[INFERRED]`

### Memory layout
- ❓ Does adding more virtual methods to a class change the size of each instance on the heap? What about adding more interface implementations? Explain the memory layout implications. `[INFERRED]`

### Trade-off question
- ❓ Virtual dispatch has a measurable cost compared to non-virtual calls, particularly in hot loops. At what point would you consider sealing a class or devirtualizing calls for performance, and what tools would you use to confirm the problem? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate judgment — when to use abstraction constructs, when not to, and how to balance competing concerns._

### Interface vs. abstract class (design level)
- ❓ You are building a framework that will be consumed by external teams over many years. When would you choose to publish an abstract class as the extension point rather than an interface, given that adding members to an abstract class is a breaking change for subclasses while adding default members to an interface (C# 8+) is not? `[FROM JD]`
- ❓ How do you decide how many members to put in a single interface? What design principle guides that decision, and what goes wrong when you violate it? `[INFERRED]`

### Combining interfaces and abstract classes
- ❓ Describe a design where you use both an abstract class *and* one or more interfaces together to model a type hierarchy. What does each layer contribute, and why can't a single construct do both jobs? `[FROM JD]`
- ❓ The Template Method pattern relies on an abstract class with a concrete method that calls abstract methods. The Strategy pattern replaces that with interfaces and composition. Walk through the trade-offs of each approach in the context of a data-processing pipeline. `[INFERRED]`

### Liskov Substitution and abstraction
- ❓ The Liskov Substitution Principle says a subtype must be substitutable for its supertype without altering correctness. How does a poorly designed abstract class hierarchy violate LSP, and what are the symptoms you'd see at runtime? `[INFERRED]`

### Composition over inheritance
- ❓ "Favor composition over inheritance" is a well-known guideline. When does a deep abstract class hierarchy become a liability, and how would you refactor it toward composition without breaking existing consumers? `[INFERRED]`

### Trade-off question
- ❓ A codebase uses a wide interface (20+ members) as the main abstraction boundary. Callers that only need 3 of those members are forced to implement or mock all 20. What refactoring would you apply, and what risks does it carry? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Distinguish principal engineers — architecture-level thinking, nuanced edge cases, optimization, and emerging patterns._

### Covariance and contravariance
- ❓ C# allows generic interfaces to be declared covariant (`out`) or contravariant (`in`). Explain what this means using `IEnumerable<T>` (covariant) and `IComparer<T>` (contravariant) as examples. Why can't a generic class be declared covariant or contravariant? `[INFERRED]`
- ❓ You have `IRepository<T>`. A team member wants to make it covariant. Walk through whether that is safe, and what constraints it would impose on how `T` can be used inside the interface members. `[INFERRED]`

### Marker interfaces and modern alternatives
- ❓ Marker interfaces (e.g., `ISerializable` in older Java, `ICloneable` in C#) carry no members — they exist only to tag a type. What are the problems with this pattern, and what modern C# constructs (attributes, source generators, generic constraints) replace them more effectively? `[INFERRED]`

### Abstractions at architectural scale
- ❓ In a large microservices system you own, multiple teams depend on a shared domain abstraction (an interface published as a NuGet package). One team needs to add a new method to the interface. Walk through the full impact analysis and the options available, including their versioning implications. `[INFERRED]`
- ❓ How do you use abstraction boundaries to enable parallel team development, and what signals tell you an abstraction boundary is in the wrong place? `[INFERRED]`

### Performance and devirtualization
- ❓ The JIT compiler can sometimes devirtualize a virtual call and inline it. What conditions must hold for this to happen, and how does `sealed` assist the JIT? Give a realistic example where this matters. `[INFERRED]`

### Trade-off question
- ❓ You are reviewing a design where every class in the system implements at least one interface "just in case" it needs to be mocked in tests. The architect calls this "good abstraction hygiene." What are the hidden costs of this approach, and at what granularity would you actually draw abstraction boundaries? `[INFERRED]`
