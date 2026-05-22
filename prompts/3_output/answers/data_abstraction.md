# Interview Answers: Data Abstraction

---

## Level 1 — Definition & Basics

---

**Q: L1 What is data abstraction and why is it essential in OOP?**

> Data abstraction means hiding how something works internally and only exposing what callers need to use it.

It's the difference between a public API and a private implementation. When I call `list.Sort()`, I don't care whether it uses quicksort or merge sort — I just need the result. This lets you change internals without breaking callers, which is what makes large codebases maintainable over time.

```csharp
// Caller doesn't need to know the implementation
List<int> numbers = new List<int> { 3, 1, 2 };
numbers.Sort(); // Works the same regardless of internal algorithm
```

---

**Q: L1 What problems result from exposing all internal implementation details?**

> Every caller becomes coupled to the internals, so any internal change can break unrelated code.

You end up in a situation where a simple refactor — renaming a field, changing a data structure — requires touching dozens of files. Worse, callers start relying on behavior that was never meant to be a contract, and you can no longer evolve the implementation freely. It's basically the opposite of encapsulation, and it kills velocity at scale.

```csharp
// Bad: exposing internals
class User { public string _firstName; public string _lastName; }
// Callers directly access fields
string name = user._firstName + " " + user._lastName;

// Good: encapsulation
class User 
{ 
    private string _firstName; 
    private string _lastName;
    public string GetFullName() => $"{_firstName} {_lastName}";
}
// Now you can change the internal representation without breaking callers
```

---

**Q: L1 What's the difference between concrete and abstract types?**

> A concrete type is something you can create an instance of; an abstract type is a template that says "here's the shape, you fill it in."

Think of an abstract type like a job description — it lists the responsibilities but doesn't tell you who does the work. A concrete type is the actual person hired to fill that role. In code, `Animal` might be abstract with a `Speak()` method, and `Dog` is the concrete class that actually barks.

```csharp
abstract class Animal { public abstract void Speak(); } // abstract — can't instantiate
class Dog : Animal { public override void Speak() => Console.WriteLine("Woof"); } // concrete

// Animal a = new Animal(); // compile error
Dog d = new Dog(); // works
```

---

**Q: L1 What is an abstract class, and what makes it different from a regular class?**

> An abstract class is a class you cannot instantiate directly — it's meant to be a base that subclasses must complete.

It can have a mix of implemented and unimplemented members. The unimplemented ones (marked `abstract`) are promises that every concrete subclass must fulfill. A regular class is fully self-contained; an abstract class is intentionally incomplete by design.

---

**Q: L1 What is an interface, and what contract does it impose on any class that implements it?**

> An interface defines a set of members that any implementing class must provide — it's a pure contract with no implementation.

When a class says `implements IFoo`, it's promising the compiler and every caller that it has every member `IFoo` declares. This lets you program against the interface rather than a concrete type, which is the foundation of dependency injection and testability.

```csharp
interface IPaymentProcessor { void ProcessPayment(decimal amount); }

class CreditCardProcessor : IPaymentProcessor 
{ 
    public void ProcessPayment(decimal amount) => Console.WriteLine($"Charged {amount}");
}
// If ProcessPayment is missing, compile error
```

---

**Q: L1 Why can't you instantiate an abstract class directly?**

> It's intentionally incomplete — it has abstract members with no implementation. The restriction enforces that it's only useful as a base.

```csharp
abstract class Logger { public abstract void Log(string msg); }
// Logger log = new Logger(); // compile error
// Missing implementation for Log(), so you can't create an instance
```

---

**Q: L1 Why does C# have both abstract classes and interfaces?**

> Abstract classes let you share implementation and state; interfaces cannot. Abstract classes model "is a, with shared DNA" while interfaces model "can do."

```csharp
// Abstract class: shared state and behavior
abstract class Animal { protected int _age; public void Grow() => _age++; }
class Dog : Animal { } // inherits _age and Grow()

// Interface: pure contract
interface IMovable { void Move(); }
class Dog : Animal, IMovable { public void Move() { } } // can mix with any class
```

---

## Level 2 — Core Concepts

---

**Q: L2 What does `abstract` mean on a class vs. on a method?**

> On a class it means "not instantiable, must be subclassed"; on a member it means "no implementation here — subclasses must provide one."

They're related but distinct. A class can be abstract without having any abstract members — maybe you just want to prevent direct instantiation. But if a class has even one abstract member, the class itself must be abstract. It's a two-level contract: the class says "I'm incomplete," and each abstract member says "this specific slot must be filled."

```csharp
abstract class Base { } // class-level: not instantiable
abstract class Base { abstract void Foo(); } // member-level: Foo must be implemented

class Derived : Base { public override void Foo() { } } // subclass fulfills the contract
```

---

**Q: L2 Can an abstract class have concrete members, and why would you mix both?**

> Yes — that's the main advantage over interfaces. Concrete members hold shared logic; abstract members define what subclasses must customize.

Template Method is built on this: the concrete method in the base orchestrates the flow, abstract methods are the steps subclasses override.

```csharp
abstract class DataProcessor
{
    public void Process(string[] data) // concrete — shared flow
    {
        ValidateData(data);
        TransformData(data);
        SaveData(data);
    }
    protected abstract void ValidateData(string[] data); // abstract — subclasses customize
    protected abstract void TransformData(string[] data);
}
```

---

**Q: L2 What happens if a subclass doesn't implement all inherited abstract members?**

> It's a compile error — the class must either implement all abstract members or be declared abstract itself.

The compiler won't let you ship a class that's claiming to be concrete but has unresolved abstract slots. The fix is either to implement the missing member or mark the subclass `abstract` too, pushing the obligation down to the next level. This is one of the key safety guarantees abstraction gives you.

```csharp
abstract class Shape { public abstract double Area { get; } }
class Circle : Shape { } // compile error: must implement Area

class Circle : Shape { public override double Area => 3.14; } // fixed
```

---

**Q: L2 What is polymorphism and how do `virtual`/`override` enable it?**

> Polymorphism means one reference type can behave differently at runtime depending on the actual object it holds, and `virtual`/`override` is the mechanism that wires that up.

When you mark a method `virtual` in a base class, you're telling the runtime "look at the actual object type when deciding which method to call." `override` in a subclass says "I'm replacing that slot." So a `Shape` reference pointing to a `Circle` will call `Circle.Area` — the decision is made at runtime, not compile time.

```csharp
abstract class Shape { public abstract double Area { get; } }
class Circle : Shape { public double Radius { get; set; }
    public override double Area => Math.PI * Radius * Radius;
}
class Square : Shape { public double Side { get; set; }
    public override double Area => Side * Side;
}

Shape s1 = new Circle { Radius = 5 };
Shape s2 = new Square { Side = 4 };
Console.WriteLine(s1.Area); // calls Circle.Area at runtime
Console.WriteLine(s2.Area); // calls Square.Area at runtime
```

---

**Q: L2 What's the difference between `virtual`, `override`, and `new`?**

> `virtual` opens a slot for overriding, `override` fills that slot polymorphically, and `new` hides the base method without participating in polymorphism.

The dangerous one is `new`. If you call the method through a base-class reference, you get the base version — `new` just creates a separate method that shadows the name but doesn't replace the vtable slot. `override` actually replaces the vtable entry, so the runtime always dispatches to the most derived override regardless of the reference type. In almost every case where you think you want `new`, you actually want `override`.

```csharp
Base b = new Derived();
b.Method(); // virtual+override → Derived.Method; new → Base.Method
```

---

**Q: L2 Why does C# require `virtual` while Java makes all methods virtual by default?**

> C# is opt-in (non-virtual by default) for performance and design clarity — you're explicit about what's extensible, not just what subclass authors happened to override.

---

**Q: L2 What are the key differences between interfaces and abstract classes?**

> Inheritance multiplicity (one class vs. many interfaces), state (abstract classes have fields; interfaces don't), constructors (abstract classes can enforce initialization; interfaces can't), and access levels (protected helpers vs. public only).

A class can implement many orthogonal interfaces (`IDisposable`, `IComparable`) but inherit only one abstract class. Abstract classes share state and initialization; interfaces are pure contracts.

---

**Q: L2 Why can't interfaces hold state?**

> Interfaces are pure behavioral contracts. If they held fields, two interfaces with the same field would be ambiguous. State belongs in concrete classes, not contracts.

```csharp
// If interfaces could have fields, this would be ambiguous:
interface IA { int Id; } // which Id wins?
interface IB { int Id; }
class MyClass : IA, IB { } // conflicting fields from two sources

// Instead, state goes in the class:
class MyClass : IA, IB { private int _id; }
```

---

**Q: L2 When should you use abstract classes instead of interfaces?**

> When you have shared implementation or state that subclasses need — abstract classes for "is-a with shared DNA," interfaces for "can-do."

Without abstract classes, shared logic gets duplicated or scattered into utility classes.

```csharp
// Good use of abstract class: shared logic
abstract class Repository<T>
{
    protected Database _db;
    public void BeginTransaction() => _db.Begin();
    public abstract T GetById(int id);
}
class UserRepository : Repository<User> { public override User GetById(int id) => _db.Query<User>($"..."); }
```

---

## Level 3 — Practical Usage

---

**Q: L3 Write a short C# example that defines an abstract class `Shape` with an abstract property `Area` and an abstract method `Describe()`. Then write a concrete class `Circle` that inherits from it and provides full implementations.**

> Abstract classes define the contract; concrete subclasses fulfill it.

The compiler enforces that `Circle` must implement both `Area` and `Describe()` — you get a build error otherwise. This is the basic pattern for the Template Method family of designs.

```csharp
abstract class Shape
{
    public abstract double Area { get; }
    public abstract void Describe();
}

class Circle : Shape
{
    private double _radius;
    public Circle(double radius) => _radius = radius;

    public override double Area => Math.PI * _radius * _radius;
    public override void Describe() => Console.WriteLine($"Circle with radius {_radius}");
}
```

---

**Q: L3 How does polymorphism ensure the correct `Describe()` is called inside `PrintInfo()`?**

> Because `Describe()` is virtual (abstract implies virtual), the runtime dispatches to the actual object's type, not the reference type.

Even though `PrintInfo()` is defined in `Shape` and called on a `Shape` reference, when it calls `this.Describe()`, the vtable lookup happens on the actual runtime object. So if `this` is a `Circle`, `Circle.Describe()` runs. This is the Template Method pattern — the base class orchestrates the flow, subclasses fill in the steps.

```csharp
abstract class Shape
{
    public abstract void Describe();
    public void PrintInfo() => Describe(); // always calls the most-derived override
}
```

---

**Q: L3 Define a base class `Logger` with a virtual method `Log(string message)`. Show how two subclasses — `FileLogger` and `ConsoleLogger` — override it, and demonstrate calling `Log` through a `Logger` reference.**

> Virtual dispatch lets you call the right logger through a base-class reference without knowing the concrete type.

```csharp
class Logger
{
    public virtual void Log(string message) => Console.WriteLine(message);
}

class FileLogger : Logger
{
    public override void Log(string message) => File.AppendAllText("log.txt", message);
}

class ConsoleLogger : Logger
{
    public override void Log(string message) => Console.WriteLine($"[CONSOLE] {message}");
}

Logger logger = new FileLogger();
logger.Log("started"); // writes to file
```

---

**Q: L3 When should you call `base.Method()` in an override?**

> Call `base` when it has side effects or initialization your override depends on; skip it when you're fully replacing the behavior.

In UI `OnDraw()`, call base because it's essential. In a `Logger`, you might not — you're replacing output entirely. Check what the base does and document expectations.

```csharp
class Logger { public virtual void Log(string msg) => Console.WriteLine(msg); }
class FileLogger : Logger 
{ 
    public override void Log(string msg) => File.AppendAllText("log.txt", msg); // don't call base, replacing entirely
}

class UIControl { public virtual void OnDraw() => ClearBackground(); }
class Button : UIControl
{
    public override void OnDraw() 
    { 
        base.OnDraw(); // must call base to clear background first
        DrawText("Click me");
    }
}
```

---

**Q: L3 Why can a class implement multiple interfaces but only inherit one base class?**

> Interfaces carry no implementation or state, so there's nothing to conflict or duplicate when a class implements multiple of them.

The classic diamond problem with multiple class inheritance is about conflicting implementations and ambiguous state — which base class's field wins? Interfaces sidestep this because they define contracts, not data. The implementing class provides a single, unambiguous implementation of each member.

```csharp
interface IMovable   { void Move(int x, int y); }
interface IChargeable { void Charge(); }

class Robot : IMovable, IChargeable
{
    public void Move(int x, int y) => Console.WriteLine($"Moving to {x},{y}");
    public void Charge() => Console.WriteLine("Charging...");
}
```

---

**Q: L3 What is explicit interface implementation and when do you use it?**

> Explicit implementation ties a method directly to the interface, making it invisible on the class type — only accessible through an interface reference.

The syntax drops the access modifier and prefixes the member name with the interface name. Implicit implementation is just a normal public method with the right signature. The key behavioral difference is that explicit members don't show up on `obj.Bar()` if `obj` is declared as the concrete class type.

```csharp
interface IFoo { void Bar(); }

class MyClass : IFoo
{
    void IFoo.Bar() => Console.WriteLine("explicit Bar");
}

// Usage:
MyClass obj = new MyClass();
// obj.Bar();          // compile error
((IFoo)obj).Bar();     // works
```

---

**Q: L3 When should you use explicit interface implementation?**

> Use it when two interfaces have a member with the same name but different intended semantics, or when you want to hide infrastructure-level interface members from the public API.

Classic example: a class implements both `IEnumerable<T>` and the older non-generic `IEnumerable`. Both have `GetEnumerator()`. You implement the generic one implicitly (public) and the non-generic one explicitly so callers only see the typed version. Another use case is `IDisposable` — sometimes you want `Dispose()` hidden from the main API, only visible when the caller is managing the lifetime explicitly through a `using` block.

---

**Q: L3 Should a plugin system contract be an interface or abstract class?**

> Publish an interface — it gives third-party developers maximum flexibility and doesn't constrain their class hierarchy.

Third parties may already have a base class they need to inherit from. If you publish an abstract class, you're consuming their one inheritance slot, which is a significant constraint you're imposing on code you don't own. An interface lets them integrate your contract into whatever design they already have. The only reason to lean toward an abstract class is if you have significant shared logic that would be painful to duplicate — but even then, you can provide an abstract base class as an optional convenience alongside the interface contract.

---

## Level 4 — Common Pitfalls

---

**Q: L4 What happens if a subclass doesn't call `base(...)` in its constructor?**

> The initialization in the base constructor is skipped, leaving the object in an invalid state that may cause null refs or wrong behavior later.

The best defense is to not rely on the subclass to remember — if you have required initialization parameters, make the base constructor take them as arguments, which forces the subclass to call `base(...)` with `: base(arg)` syntax because C# has no default constructor to fall back on. You can also put critical validation in the constructor body so the failure is loud and immediate rather than a silent bad state.

```csharp
class Logger { protected FileStream _file; public Logger() => _file = File.Create("log.txt"); }
class BadLogger : Logger { public BadLogger() { /* skipped base() */ } } // _file is null!

class GoodLogger : Logger { public GoodLogger() : base() { } } // forces base() call
```

---

**Q: L4 Can an abstract class implement an interface without implementing all members?**

> Yes, and it doesn't have to implement all members — it can declare the unimplemented ones as abstract, pushing the obligation to concrete subclasses.

This is a useful pattern. The abstract class implements the easy or shared members and leaves the complex ones abstract. Any concrete class that extends it must then fulfill the remaining interface contract. The compiler tracks this correctly — it will error if a concrete subclass is still missing required implementations.

```csharp
interface IRepository<T> { T GetById(int id); IEnumerable<T> GetAll(); void Save(T entity); }

abstract class RepositoryBase<T> : IRepository<T>
{
    protected Database _db;
    public void Save(T entity) => _db.Insert(entity); // shared implementation
    public abstract T GetById(int id); // leave to subclass
    public abstract IEnumerable<T> GetAll();
}

class UserRepository : RepositoryBase<User>
{
    public override User GetById(int id) => _db.Query<User>($"WHERE id = {id}").First();
    public override IEnumerable<User> GetAll() => _db.Query<User>("SELECT *");
}
```

---

**Q: L4 What happens when you use `new` instead of `override`?**

> The base-class version runs because `new` hides the method without replacing the vtable slot, so the runtime doesn't know about the subclass version.

`new` creates a brand-new method that happens to share a name, but it's not connected to the virtual dispatch chain. When you hold a `Base` reference to a `Derived` object and call the method, the runtime looks up the vtable on `Base` and finds the original implementation. The subclass's `new` method is invisible from that reference. It's almost always unintentional — developers use `new` when they meant `override`.

---

**Q: L4 A virtual method override isn't being called. What are the possible causes?**

> The most common cause is that the object is actually of the base type, not the derived type — check what's actually being instantiated.

I'd start by logging or inspecting `obj.GetType()` at the call site to confirm the runtime type. Other causes: the variable is declared as the concrete base type and the method was accidentally marked `new` somewhere up the chain; or there's a factory/DI container returning the base type when you expect the derived one. A third gotcha is calling a virtual method from a constructor before the derived object is fully initialized — at that point the vtable is set to the base class's version.

---

**Q: L4 Why can't you call an explicitly implemented interface method on a concrete type?**

> Explicit interface members are invisible on the concrete type — they only exist on the interface type, so the compiler can't find `Bar()` on `obj`.

The two fixes are: cast to the interface — `((IFoo)obj).Bar()` — or change the declaration to store `obj` as `IFoo` instead of the concrete type. If the explicit implementation is causing widespread friction, a third option is to add a separate implicit public method alongside it, though that can cause its own confusion about which one gets called.

---

**Q: L4 What happens when two interfaces declare the same member?**

> Without explicit implementation, one shared public method satisfies both interfaces; explicit implementation lets you provide distinct implementations for each.

If `IFoo` and `IBar` both declare `void Process()` and you need them to do different things, you implement  `void IFoo.Process()` and `void IBar.Process()` separately. The risk is confusion — callers get different behavior depending on which interface type they're holding. It's a design smell if you need to do this often; it usually means the interfaces are poorly named or the class is trying to do too much.

---

**Q: L4 How does C# resolve diamond inheritance in interfaces with default members?**

> If two interfaces provide a default implementation of the same method and a third interface or class inherits both, the compiler forces you to explicitly override to resolve the ambiguity.

Say `IA` and `IB` both provide a default `void Log()`, and `IC` extends both. A class implementing `IC` will get a compile error unless it explicitly overrides `Log()`. C# does not silently pick one — it makes you resolve it deliberately. This is a good safety mechanism, but it means default interface members require careful governance in large codebases.

---

**Q: L4 What does `sealed` do and why would you use it?**

> `sealed` on a class prevents inheritance; on a method it prevents further overriding — and no, it's not a contradiction, it's how you close an override chain.

You'd seal a class when you want a finalized implementation that shouldn't be extended — both for design clarity and JIT optimization. Sealing a method is specifically for stopping a subclass from overriding a method that was already overridden — you put `sealed override` to say "this is the final word." It makes sense: you opened the slot with `virtual`, someone overrode it, and now you're closing it.

---

**Q: L4 Is explicit interface implementation a feature or a footgun?**

> It's a feature when used deliberately for API hygiene, but a footgun when callers don't know the interface exists or aren't working at the interface level.

The surprise happens most often with auto-complete — developers type `obj.` and the method doesn't appear, so they assume it doesn't exist or write duplicate code. Another trap: if a method behaves differently based on whether you call it through the interface or the class, callers passing the object as a concrete type silently get different behavior than callers using the interface. Document it, use it sparingly, and prefer it only for genuine disambiguation or infrastructure hiding like `IDisposable`.

---

## Level 5 — Trade-offs & Design Decisions

---

**Q: L5 Should a framework extension point be an abstract class or interface?**

> Choose an abstract class when you have shared implementation or state to offer; but with C# 8+ default interface members, the versioning argument for abstract classes has weakened significantly.

Historically, abstract classes were preferred for long-lived frameworks because you could add new virtual methods without breaking existing subclasses — interfaces couldn't do that. With default interface implementations, interfaces now have that same flexibility. I'd still lean toward abstract classes when I have real shared logic to provide. But if the extension point is purely behavioral with no shared state, I'd publish an interface today — it's more flexible for consumers and default members handle versioning gracefully.

---

**Q: L5 How many members should an interface have?**

> Apply Interface Segregation — keep them small so callers only depend on what they use.

If you have to mock 15 methods to test something using 2, it's too wide. If you can't describe it in one sentence without "and," it's probably conflating responsibilities.

---

**Q: L5 How do you combine abstract classes and interfaces in a design?**

> Interface defines the contract; abstract class provides shared implementation. Example: `IRepository<T>` is the interface, `RepositoryBase<T>` implements common CRUD logic, concrete classes inherit from it but are coded to the interface.

```csharp
// Interface: the contract
public interface IRepository<T> { T GetById(int id); void Save(T entity); }

// Abstract class: shared implementation
public abstract class RepositoryBase<T> : IRepository<T>
{
    protected Database _db;
    public void Save(T entity) => _db.Insert(entity); // shared
    public abstract T GetById(int id); // subclasses fill in
}

// Concrete: specialization
public class UserRepository : RepositoryBase<User>
{
    public override User GetById(int id) => _db.Query<User>($"WHERE id = {id}").First();
}

// Code against the interface
public void ProcessUser(IRepository<User> repo) { var user = repo.GetById(1); }
```

---

**Q: L5 What are the trade-offs between Template Method and Strategy patterns?**

> Template Method couples to a hierarchy and varies along one axis; Strategy is more flexible but adds indirection.

Use Template Method for single-axis variation (different subclasses for different algorithms). Use Strategy when you need to compose behaviors independently (mix any parser with any validator).

---

**Q: L5 How can a class hierarchy violate the Liskov Substitution Principle?**

> A subclass violates LSP by narrowing the contract — throwing unexpected exceptions, ignoring parameters, or failing on inputs the base class handles.

Classic example: `Square` as a `Rectangle` subclass that constrains width and height to be equal breaks code expecting independent width/height setters. Red flags: `is`/`as` type checks in callers, unexpected exceptions, or tests passing on the base type but failing on subclasses.

```csharp
class Rectangle { public virtual int Width { get; set; } public virtual int Height { get; set; } }
class Square : Rectangle 
{ 
    public override int Width { set => base.Width = base.Height = value; } // violates LSP
}
// Code expecting Rectangle to set width and height independently breaks with Square
Rectangle r = new Square();
r.Width = 5;
r.Height = 10; // but now Width is also 10!
```

---

**Q: L5 When should you refactor deep inheritance hierarchies toward composition?**

> When you need to vary behavior along multiple independent dimensions — inheritance only gives you one axis.

Extract varying behaviors into injectable interfaces instead of subclasses. Do it incrementally: add constructor parameters, let subclasses pass their own logic as defaults, then migrate callers.

```csharp
// Before: inheritance — stuck in a tree
class Vehicle { } class Car : Vehicle { } class ElectricCar : Car { } class FastElectricCar : ElectricCar { }

// After: composition — mix any behavior
interface IEngine { void Start(); }
interface IFuel { string Type { get; } }
class Vehicle 
{ 
    private IEngine _engine; private IFuel _fuel;
    public Vehicle(IEngine engine, IFuel fuel) { _engine = engine; _fuel = fuel; }
}

var car = new Vehicle(new GasolineEngine(), new GasolineFuel());
var fastElectric = new Vehicle(new FastElectricEngine(), new BatteryFuel());
```

---

**Q: L5 How do you refactor a wide interface (20+ members)?**

> Split into focused role interfaces: `IReader`, `IWriter`, `IValidator`, then have the original extend all of them for backward compatibility.

Callers can depend on just `IReader` and mock fewer methods. But analyze first — if every caller needs most members, splitting creates fragmentation without benefit.

```csharp
// Before: wide interface
interface IDataService { T Read(int id); void Write(T data); void Delete(int id); bool Validate(T data); }

// After: split by role
interface IReader<T> { T Read(int id); }
interface IWriter<T> { void Write(T data); void Delete(int id); }
interface IValidator<T> { bool Validate(T data); }

interface IDataService<T> : IReader<T>, IWriter<T>, IValidator<T> { } // backward compatible

// Callers can now depend on just IReader
public void ProcessData(IReader<User> reader) { var user = reader.Read(1); }
```

---

## Level 7 — Advanced & Expert

---

**Q: L7 What are covariance and contravariance in generic interfaces?**

> Covariance means you can use a more-derived type where a base is expected; contravariance is the reverse — and classes can't have these because they have mutable state that would make it unsafe.

`IEnumerable<Dog>` can be assigned to `IEnumerable<Animal>` because you only ever get animals out — you never put anything in, so there's no type safety risk. `IComparer<Animal>` can be used where `IComparer<Dog>` is expected because a comparer that handles any animal can certainly handle dogs. Classes can't do this because they have fields — if `List<Dog>` were covariant to `List<Animal>`, you could call `.Add(new Cat())` through the `List<Animal>` reference and corrupt the typed list.

```csharp
// Covariance (out T — only returns)
IEnumerable<Dog> dogs = new List<Dog> { new Dog() };
IEnumerable<Animal> animals = dogs; // safe — only reads

// Contravariance (in T — only accepts)
IComparer<Animal> animalComparer = (a, b) => 0;
IComparer<Dog> dogComparer = animalComparer; // safe — accepts any Dog

// Classes are invariant (no variance modifier)
List<Dog> dogList = new List<Dog>();
// List<Animal> animalList = dogList; // compile error — could corrupt with cats
```

---

**Q: L7 Can you make `IRepository<T>` covariant?**

> Covariance is only safe if `T` only appears in output positions — return types — never as a method parameter or in-out position.

If `IRepository<T>` has `T GetById(int id)` that's fine for covariance. But if it has `void Save(T entity)` or `IEnumerable<T> Query(Func<T, bool> predicate)` where T appears as input, covariance breaks type safety. In practice, most repositories have both read and write members, so making the full interface covariant usually isn't possible. The common solution is to split it: `IReadRepository<out T>` is covariant, `IWriteRepository<T>` is invariant.

```csharp
// Can't be covariant — Save(T) takes input
public interface IRepository<T> { T GetById(int id); void Save(T entity); }

// Can be covariant — only returns T
public interface IReadRepository<out T> { T GetById(int id); }

// Safe:
IReadRepository<Dog> dogReader = ...;
IReadRepository<Animal> animalReader = dogReader; // covariance works

// But not:
IRepository<Dog> dogRepo = ...;
// IRepository<Animal> animalRepo = dogRepo; // compile error — saves would be unsafe
```

---

**Q: L7 What are the problems with marker interfaces and what replaces them?**

> Marker interfaces pollute the type hierarchy and can't carry metadata — attributes, generic constraints, and source generators do the job better.

The problem with a marker interface is you discover at runtime whether it's there via `is` checks, there's no way to attach metadata, and every type that wants the tag must commit to a class hierarchy change. `[Serializable]` as an attribute is cleaner — it's declarative metadata the framework can read without affecting the type system. Generic constraints like `where T : IComparable<T>` give you compile-time enforcement. Source generators can inspect attributes and generate code without any runtime tagging. Marker interfaces still occasionally appear for legacy reasons, but they're not the right default.

---

**Q: L7 How do you add a method to a published interface without breaking consumers?**

> Adding a member to a published interface is a breaking change for all implementors — version carefully and prefer additive strategies.

First, assess all consumers: how many teams implement this interface vs. just depend on it? Adding a method forces every implementor to update. Options: add a default implementation (C# 8+) so existing implementors don't break — lowest friction, but default behavior may not be correct for all. Or version the package — `IMyInterface` stays, `IMyInterfaceV2 : IMyInterface` adds the new member — letting teams migrate gradually. A third option is a new, separate interface that the new functionality lives on, keeping the original intact. I'd lean toward default implementation for low-risk additions and interface versioning for anything requiring real implementation per consumer.

---

**Q: L7 How do abstraction boundaries enable parallel team development?**

> Good abstraction boundaries let teams own their domain, change internals independently, and only coordinate at the interface contract level.

The signal that a boundary is in the wrong place is when teams have to coordinate on every change — if team A always needs to talk to team B to ship a feature, the boundary is drawn through the middle of a logical unit of work rather than around it. Other signals: the interface is leaking implementation details (a method named `GetUserFromSqlById` belongs inside a boundary, not on it), or the interface is too fine-grained and requires many cross-boundary calls to accomplish anything meaningful. Conway's Law is real — align abstraction boundaries with team ownership.

---

**Q: L7 When does the JIT devirtualize virtual calls?**

> The JIT devirtualizes when it can prove at compile time there's only one possible implementation — sealed classes and concrete-type references are the main enablers.

If a variable is declared as a `sealed` concrete type, the JIT knows there are no subclasses and can inline the call directly. With `sealed` on a method in a non-sealed class, the JIT can devirtualize that specific method. The realistic example is `List<T>` — it's sealed, so `list.Add(item)` in a tight loop gets devirtualized and inlined by the JIT, avoiding the vtable overhead on every iteration. Without `sealed`, the JIT has to be conservative because a derived class could theoretically override `Add`.

---

**Q: L7 Is implementing interfaces on every class for testability a good idea?**

> No. Abstractions should be earned, not applied by default. The costs are real: more files, more types, more drift between interface and implementation.

Draw boundaries where there's genuine variation, team seams, or external dependencies to replace. Not "everywhere, just in case." Modern tools mock concrete types anyway.
