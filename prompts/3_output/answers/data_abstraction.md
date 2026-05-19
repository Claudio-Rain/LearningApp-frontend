# Interview Answers: Data Abstraction

---

## Level 1 — Definition & Basics

---

**Q: In your own words, what does "data abstraction" mean, and why do we need it in object-oriented design?**

> **Bottom line:** Data abstraction means hiding how something works internally and only exposing what callers need to use it.

**Elaboration:** It's the difference between a public API and a private implementation. When I call `list.Sort()`, I don't care whether it uses quicksort or merge sort — I just need the result. This lets you change internals without breaking callers, which is what makes large codebases maintainable over time.

---

**Q: What problem would arise if every class in a large codebase exposed all of its internal implementation details to callers?**

> **Bottom line:** Every caller becomes coupled to the internals, so any internal change can break unrelated code.

**Elaboration:** You end up in a situation where a simple refactor — renaming a field, changing a data structure — requires touching dozens of files. Worse, callers start relying on behavior that was never meant to be a contract, and you can no longer evolve the implementation freely. It's basically the opposite of encapsulation, and it kills velocity at scale.

---

**Q: How would you explain the difference between a concrete type and an abstract type to a junior developer who has never heard either term?**

> **Bottom line:** A concrete type is something you can create an instance of; an abstract type is a template that says "here's the shape, you fill it in."

**Elaboration:** Think of an abstract type like a job description — it lists the responsibilities but doesn't tell you who does the work. A concrete type is the actual person hired to fill that role. In code, `Animal` might be abstract with a `Speak()` method, and `Dog` is the concrete class that actually barks.

---

**Q: What is an abstract class, and what makes it different from a regular class?**

> **Bottom line:** An abstract class is a class you cannot instantiate directly — it's meant to be a base that subclasses must complete.

**Elaboration:** It can have a mix of implemented and unimplemented members. The unimplemented ones (marked `abstract`) are promises that every concrete subclass must fulfill. A regular class is fully self-contained; an abstract class is intentionally incomplete by design.

---

**Q: What is an interface, and what contract does it impose on any class that implements it?**

> **Bottom line:** An interface defines a set of members that any implementing class must provide — it's a pure contract with no implementation.

**Elaboration:** When a class says `implements IFoo`, it's promising the compiler and every caller that it has every member `IFoo` declares. This lets you program against the interface rather than a concrete type, which is the foundation of dependency injection and testability.

---

**Q: Why can't you create an instance of an abstract class directly? What design intent does that restriction enforce?**

> **Bottom line:** Because the class is intentionally incomplete — it has abstract members with no implementation.

**Elaboration:** If the compiler allowed it, you'd have an object with methods that have no body to call, which is nonsensical. The restriction enforces the intent that this class is only useful as a base — it's saying "you must specialize me before I make sense."

---

**Q: If both abstract classes and interfaces can define a "shape" that other types must follow, why does C# provide both constructs instead of just one? What would you lose if you only had interfaces?**

> **Bottom line:** Abstract classes let you share implementation and state; interfaces cannot — so without abstract classes, you'd lose the ability to provide a partial, reusable base.

**Elaboration:** If I have ten subclasses that all share the same constructor logic and two concrete helper methods, an abstract class puts that shared code in one place. Interfaces can't hold instance fields or constructors, so without abstract classes I'd have to duplicate that shared logic or resort to composition patterns that add complexity. They solve different problems — interfaces model "can do," abstract classes model "is a, with shared DNA."

---

## Level 2 — Core Concepts

---

**Q: What does the `abstract` modifier mean when applied to a class? What does it mean when applied to a method or property inside that class?**

> **Bottom line:** On a class it means "not instantiable, must be subclassed"; on a member it means "no implementation here — subclasses must provide one."

**Elaboration:** They're related but distinct. A class can be abstract without having any abstract members — maybe you just want to prevent direct instantiation. But if a class has even one abstract member, the class itself must be abstract. It's a two-level contract: the class says "I'm incomplete," and each abstract member says "this specific slot must be filled."

---

**Q: Can an abstract class contain non-abstract (concrete) members? If so, what is the point of mixing both?**

> **Bottom line:** Yes, and that's actually the main advantage of abstract classes over interfaces — shared implementation lives in the concrete members.

**Elaboration:** The abstract members define the variable parts that each subclass customizes, while the concrete members contain the logic that's the same for everyone. The Template Method pattern is built entirely on this idea: a concrete method in the base calls abstract methods that subclasses override. It's a clean way to enforce structure while reusing code.

---

**Q: What happens at compile time if a concrete subclass does not implement every abstract member it inherits?**

> **Bottom line:** It's a compile error — the class must either implement all abstract members or be declared abstract itself.

**Elaboration:** The compiler won't let you ship a class that's claiming to be concrete but has unresolved abstract slots. The fix is either to implement the missing member or mark the subclass `abstract` too, pushing the obligation down to the next level. This is one of the key safety guarantees abstraction gives you.

---

**Q: What is polymorphism, and how does the `virtual`/`override` keyword pair enable it in C#?**

> **Bottom line:** Polymorphism means one reference type can behave differently at runtime depending on the actual object it holds, and `virtual`/`override` is the mechanism that wires that up.

**Elaboration:** When you mark a method `virtual` in a base class, you're telling the runtime "look at the actual object type when deciding which method to call." `override` in a subclass says "I'm replacing that slot." So a `Shape` reference pointing to a `Circle` will call `Circle.Area` — the decision is made at runtime, not compile time.

---

**Q: What is the difference between `virtual`, `override`, and `new` when used on a method? What runtime behavior does each produce?**

> **Bottom line:** `virtual` opens a slot for overriding, `override` fills that slot polymorphically, and `new` hides the base method without participating in polymorphism.

**Elaboration:** The dangerous one is `new`. If you call the method through a base-class reference, you get the base version — `new` just creates a separate method that shadows the name but doesn't replace the vtable slot. `override` actually replaces the vtable entry, so the runtime always dispatches to the most derived override regardless of the reference type. In almost every case where you think you want `new`, you actually want `override`.

```csharp
Base b = new Derived();
b.Method(); // virtual+override → Derived.Method; new → Base.Method
```

---

**Q: Why must you explicitly mark a method `virtual` in C# for it to be overridable, whereas in Java all instance methods are virtual by default? What are the implications of each design choice?**

> **Bottom line:** C# chose opt-in to make non-virtual calls the default, which is both a performance and a design-intent decision.

**Elaboration:** In Java, every method dispatch goes through the vtable unless you're calling on a `final` method — convenient, but it means callers can override things you never intended to be extensible. C#'s opt-in model forces you to be explicit about what's part of your contract and what's an implementation detail. It also gives the JIT better devirtualization opportunities. The trade-off is more ceremony, but you get a clearer API surface.

---

**Q: List at least four concrete differences between an interface and an abstract class in C#. For each difference, explain the design scenario where that difference matters.**

> **Bottom line:** The key differences are: inheritance multiplicity, instance state, constructor support, and access modifiers on members.

**Elaboration:** First, a class can implement many interfaces but only inherit one abstract class — this matters when you need to model orthogonal capabilities like `IDisposable` and `IComparable` on the same type. Second, abstract classes can have instance fields; interfaces cannot — you need the abstract class when subclasses share state. Third, abstract classes have constructors, which matters when you need guaranteed initialization logic. Fourth, interface members are public by default; abstract classes can have `protected` members, which is essential when you want base-class helpers only visible to subclasses.

---

**Q: An interface cannot hold state (instance fields). Why is that restriction intentional, and how does it shape the way you model behavior?**

> **Bottom line:** It keeps interfaces as pure behavioral contracts, preventing the fragile base class problem and diamond-problem complications around shared state.

**Elaboration:** If interfaces could hold fields, implementing two interfaces with the same field name would be ambiguous or conflicting. More importantly, interfaces are meant to describe *what* a type can do, not *how* it stores data. The restriction pushes state into the concrete class where it belongs and keeps the interface honest as a contract.

---

**Q: A teammate argues "just use interfaces everywhere — they're more flexible." When would you push back on that advice, and why?**

> **Bottom line:** When you have shared implementation or shared state that belongs in a base type, an abstract class is the right tool — interfaces can't do that job.

**Elaboration:** If I have five subclasses that all need the same validation logic and share a couple of protected helper methods, putting that in an interface means duplicating code or creating a separate utility class that everyone has to know about. Abstract classes exist precisely to avoid that. "Interfaces everywhere" is a good default, but it can lead to anemic base types and scattered shared logic. Use the right tool — abstract classes for "is-a with shared DNA," interfaces for "can-do."

---

## Level 3 — Practical Usage

---

**Q: Write a short C# example that defines an abstract class `Shape` with an abstract property `Area` and an abstract method `Describe()`. Then write a concrete class `Circle` that inherits from it and provides full implementations.**

> **Bottom line:** Abstract classes define the contract; concrete subclasses fulfill it.

**Elaboration:** The compiler enforces that `Circle` must implement both `Area` and `Describe()` — you get a build error otherwise. This is the basic pattern for the Template Method family of designs.

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

**Q: If `Shape` also has a concrete method `PrintInfo()` that calls `Describe()` internally, how does polymorphism ensure the correct `Describe()` implementation runs at runtime?**

> **Bottom line:** Because `Describe()` is virtual (abstract implies virtual), the runtime dispatches to the actual object's type, not the reference type.

**Elaboration:** Even though `PrintInfo()` is defined in `Shape` and called on a `Shape` reference, when it calls `this.Describe()`, the vtable lookup happens on the actual runtime object. So if `this` is a `Circle`, `Circle.Describe()` runs. This is the Template Method pattern — the base class orchestrates the flow, subclasses fill in the steps.

```csharp
abstract class Shape
{
    public abstract void Describe();
    public void PrintInfo() => Describe(); // always calls the most-derived override
}
```

---

**Q: Define a base class `Logger` with a virtual method `Log(string message)`. Show how two subclasses — `FileLogger` and `ConsoleLogger` — override it, and demonstrate calling `Log` through a `Logger` reference.**

> **Bottom line:** Virtual dispatch lets you call the right logger through a base-class reference without knowing the concrete type.

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

**Q: When overriding a virtual method, should you call `base.Method()` inside the override? What are the rules of thumb for deciding?**

> **Bottom line:** Call `base` when the base implementation does something useful that should still happen; skip it when you're fully replacing the behavior.

**Elaboration:** A good signal is whether the base method has side effects or initialization logic that your override depends on. In UI frameworks, for example, you almost always call `base.OnDraw()` because the base does essential rendering. In a `Logger` override, maybe you don't — you're replacing the output entirely. When in doubt, check what the base actually does. And document clearly whether subclasses are expected to call base.

---

**Q: C# does not allow a class to inherit from more than one base class, but it does allow implementing multiple interfaces. Write an example where a single class `Robot` implements both `IMovable` and `IChargeable`. Why does allowing multiple interface implementation not cause the same problems as multiple class inheritance?**

> **Bottom line:** Interfaces carry no implementation or state, so there's nothing to conflict or duplicate when a class implements multiple of them.

**Elaboration:** The classic diamond problem with multiple class inheritance is about conflicting implementations and ambiguous state — which base class's field wins? Interfaces sidestep this because they define contracts, not data. The implementing class provides a single, unambiguous implementation of each member.

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

**Q: What is explicit interface implementation, and how does its syntax differ from implicit implementation? Write a short example showing a class that explicitly implements `IFoo.Bar()`.**

> **Bottom line:** Explicit implementation ties a method directly to the interface, making it invisible on the class type — only accessible through an interface reference.

**Elaboration:** The syntax drops the access modifier and prefixes the member name with the interface name. Implicit implementation is just a normal public method with the right signature. The key behavioral difference is that explicit members don't show up on `obj.Bar()` if `obj` is declared as the concrete class type.

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

**Q: When is explicit interface implementation the right choice? Give a concrete scenario where it solves a real problem.**

> **Bottom line:** Use it when two interfaces have a member with the same name but different intended semantics, or when you want to hide infrastructure-level interface members from the public API.

**Elaboration:** Classic example: a class implements both `IEnumerable<T>` and the older non-generic `IEnumerable`. Both have `GetEnumerator()`. You implement the generic one implicitly (public) and the non-generic one explicitly so callers only see the typed version. Another use case is `IDisposable` — sometimes you want `Dispose()` hidden from the main API, only visible when the caller is managing the lifetime explicitly through a `using` block.

---

**Q: You are designing a plugin system where third-party developers provide custom data processors. Should the contract you publish be an interface or an abstract class? Walk through the reasoning.**

> **Bottom line:** Publish an interface — it gives third-party developers maximum flexibility and doesn't constrain their class hierarchy.

**Elaboration:** Third parties may already have a base class they need to inherit from. If you publish an abstract class, you're consuming their one inheritance slot, which is a significant constraint you're imposing on code you don't own. An interface lets them integrate your contract into whatever design they already have. The only reason to lean toward an abstract class is if you have significant shared logic that would be painful to duplicate — but even then, you can provide an abstract base class as an optional convenience alongside the interface contract.

---

## Level 4 — Common Pitfalls

---

**Q: A developer defines an abstract class with a constructor that performs important initialization. A subclass forgets to call `base(...)`. What goes wrong, and how would you design the class to make this mistake harder to make?**

> **Bottom line:** The initialization in the base constructor is skipped, leaving the object in an invalid state that may cause null refs or wrong behavior later.

**Elaboration:** The best defense is to not rely on the subclass to remember — if you have required initialization parameters, make the base constructor take them as arguments, which forces the subclass to call `base(...)` with `: base(arg)` syntax because C# has no default constructor to fall back on. You can also put critical validation in the constructor body so the failure is loud and immediate rather than a silent bad state.

---

**Q: Can an abstract class implement an interface? If so, does it have to implement all of the interface's members? What happens if it leaves some unimplemented?**

> **Bottom line:** Yes, and it doesn't have to implement all members — it can declare the unimplemented ones as abstract, pushing the obligation to concrete subclasses.

**Elaboration:** This is a useful pattern. The abstract class implements the easy or shared members and leaves the complex ones abstract. Any concrete class that extends it must then fulfill the remaining interface contract. The compiler tracks this correctly — it will error if a concrete subclass is still missing required implementations.

---

**Q: A developer uses the `new` keyword instead of `override` to redefine a virtual method in a subclass, then calls the method through a base-class reference. Describe exactly what happens and why this is usually a bug.**

> **Bottom line:** The base-class version runs because `new` hides the method without replacing the vtable slot, so the runtime doesn't know about the subclass version.

**Elaboration:** `new` creates a brand-new method that happens to share a name, but it's not connected to the virtual dispatch chain. When you hold a `Base` reference to a `Derived` object and call the method, the runtime looks up the vtable on `Base` and finds the original implementation. The subclass's `new` method is invisible from that reference. It's almost always unintentional — developers use `new` when they meant `override`.

---

**Q: Debugging scenario: You have a method marked `virtual` in the base class and `override` in the subclass, yet at runtime the base-class version always executes. What are the possible causes, and how would you diagnose this?**

> **Bottom line:** The most common cause is that the object is actually of the base type, not the derived type — check what's actually being instantiated.

**Elaboration:** I'd start by logging or inspecting `obj.GetType()` at the call site to confirm the runtime type. Other causes: the variable is declared as the concrete base type and the method was accidentally marked `new` somewhere up the chain; or there's a factory/DI container returning the base type when you expect the derived one. A third gotcha is calling a virtual method from a constructor before the derived object is fully initialized — at that point the vtable is set to the base class's version.

---

**Q: A class explicitly implements `IFoo.Bar()`. A teammate writes `obj.Bar()` where `obj` is declared as the concrete class type, and gets a compile error. Why does this happen, and what are the two ways to fix it?**

> **Bottom line:** Explicit interface members are invisible on the concrete type — they only exist on the interface type, so the compiler can't find `Bar()` on `obj`.

**Elaboration:** The two fixes are: cast to the interface — `((IFoo)obj).Bar()` — or change the declaration to store `obj` as `IFoo` instead of the concrete type. If the explicit implementation is causing widespread friction, a third option is to add a separate implicit public method alongside it, though that can cause its own confusion about which one gets called.

---

**Q: What happens when two interfaces that a class implements declare a member with the same signature? How does explicit interface implementation resolve the conflict, and what are the risks?**

> **Bottom line:** Without explicit implementation, one shared public method satisfies both interfaces; explicit implementation lets you provide distinct implementations for each.

**Elaboration:** If `IFoo` and `IBar` both declare `void Process()` and you need them to do different things, you implement  `void IFoo.Process()` and `void IBar.Process()` separately. The risk is confusion — callers get different behavior depending on which interface type they're holding. It's a design smell if you need to do this often; it usually means the interfaces are poorly named or the class is trying to do too much.

---

**Q: C# does not have multiple class inheritance, but you can still construct a "diamond" scenario through interfaces with default members (C# 8+). Describe how this can arise and how C# resolves the ambiguity.**

> **Bottom line:** If two interfaces provide a default implementation of the same method and a third interface or class inherits both, the compiler forces you to explicitly override to resolve the ambiguity.

**Elaboration:** Say `IA` and `IB` both provide a default `void Log()`, and `IC` extends both. A class implementing `IC` will get a compile error unless it explicitly overrides `Log()`. C# does not silently pick one — it makes you resolve it deliberately. This is a good safety mechanism, but it means default interface members require careful governance in large codebases.

---

**Q: What does the `sealed` modifier do to a class or a method, and why would you use it? Is sealing a virtual method a contradiction in terms?**

> **Bottom line:** `sealed` on a class prevents inheritance; on a method it prevents further overriding — and no, it's not a contradiction, it's how you close an override chain.

**Elaboration:** You'd seal a class when you want a finalized implementation that shouldn't be extended — both for design clarity and JIT optimization. Sealing a method is specifically for stopping a subclass from overriding a method that was already overridden — you put `sealed override` to say "this is the final word." It makes sense: you opened the slot with `virtual`, someone overrode it, and now you're closing it.

---

**Q: Explicit interface implementation hides members from the public API of a class. Is that hiding a feature or a footgun? In what scenarios can it lead to surprising behavior for callers?**

> **Bottom line:** It's a feature when used deliberately for API hygiene, but a footgun when callers don't know the interface exists or aren't working at the interface level.

**Elaboration:** The surprise happens most often with auto-complete — developers type `obj.` and the method doesn't appear, so they assume it doesn't exist or write duplicate code. Another trap: if a method behaves differently based on whether you call it through the interface or the class, callers passing the object as a concrete type silently get different behavior than callers using the interface. Document it, use it sparingly, and prefer it only for genuine disambiguation or infrastructure hiding like `IDisposable`.

---

## Level 5 — Internals & Deep Mechanics

---

**Q: How does the CLR implement virtual method dispatch? Describe the role of the vtable and explain what happens step by step when you call a virtual method through a base-class reference.**

> **Bottom line:** Each object has a pointer to its type's method table (vtable), and virtual dispatch simply follows that pointer to find the right method slot at runtime.

**Elaboration:** When you call a virtual method, the CLR dereferences the object's type pointer, finds the vtable, looks up the method's slot index (determined at compile time), and calls whatever function pointer is in that slot. The key is that the vtable belongs to the actual runtime type — so a `Shape` reference pointing to a `Circle` object dereferences to Circle's vtable, which has Circle's override in that slot. It's two pointer dereferences and a call — fast, but not as fast as a direct call.

---

**Q: Abstract methods have no body in the base class, yet the vtable must have an entry for them. How does the CLR handle this, and what prevents instantiating a class that leaves an abstract slot unfilled?**

> **Bottom line:** Abstract method slots in the vtable point to a stub that throws `InvalidOperationException`, and the runtime enforces at class-load time that no abstract slots remain unfilled before allowing instantiation.

**Elaboration:** The compiler tracks which vtable slots are abstract and the CLR verifies at class load that every abstract slot has been overridden before the class can be used. If you somehow bypassed the C# compiler and tried to instantiate a type with unfilled abstract slots, the runtime would catch it. In practice, the C# compiler's check is the first line of defense — you get a compile error long before runtime.

---

**Q: When you cast a class instance to an interface type and call a method through the interface reference, how does the CLR locate the correct method implementation? How does this differ from virtual dispatch through a class hierarchy?**

> **Bottom line:** Interface dispatch uses an interface method table (IMT) or a per-type interface dispatch cache, which is a layer of indirection beyond simple vtable lookup.

**Elaboration:** The CLR maintains a mapping from interface slot to the implementing class's method table entry. This involves an extra lookup compared to class-based virtual dispatch — the runtime must first resolve which concrete method implements that interface slot for this particular type. In the common case it's cached and nearly as fast, but cold dispatch is measurably slower. This is why performance-sensitive code sometimes avoids interface calls in hot paths and prefers concrete or sealed types.

---

**Q: C# 8 introduced default interface implementations. How are they stored and dispatched at the CLR level? Why can a class that implements the interface not "see" the default implementation without casting to the interface type?**

> **Bottom line:** Default implementations live in the interface's own method table, not in the class's vtable, so the class only "sees" them when accessed through an interface reference.

**Elaboration:** The CLR added interface method bodies stored in the interface metadata itself. When you call through an interface reference, dispatch can fall back to the interface's own method table entry if the implementing class didn't provide an override. But the implementing class has no vtable entry for that method — it was never added to the class's own method table. That's why `((IFoo)this).Method()` works but `this.Method()` doesn't compile — the class simply has no slot for it.

---

**Q: Does adding more virtual methods to a class change the size of each instance on the heap? What about adding more interface implementations? Explain the memory layout implications.**

> **Bottom line:** Adding virtual methods does not change instance size — the vtable is shared per type, not per instance. Adding interface implementations also doesn't change instance size.

**Elaboration:** Each object on the heap has a fixed-size object header containing a pointer to the type's method table — that's one pointer regardless of how many virtual methods the type has. The vtable itself grows with more methods, but it lives in the type metadata, not in the instance. Interface implementation is handled through per-type dispatch structures, again shared across all instances. So instance size is driven by instance fields, not methods.

---

**Q: Virtual dispatch has a measurable cost compared to non-virtual calls, particularly in hot loops. At what point would you consider sealing a class or devirtualizing calls for performance, and what tools would you use to confirm the problem?**

> **Bottom line:** Only optimize this after profiling shows it's actually a bottleneck — premature sealing for performance is almost always unnecessary.

**Elaboration:** I'd use BenchmarkDotNet to measure the hot path and a profiler like PerfView or dotTrace to confirm virtual dispatch is the actual cost. The JIT already devirtualizes in many cases — sealed classes or calls through concrete types are the main hints it uses. In practice, the bigger wins are usually cache misses and allocation, not vtable lookup overhead. That said, in tight numeric loops over large datasets, sealing the type and working with concrete references can shave real nanoseconds.

---

## Level 6 — Trade-offs & Design Decisions

---

**Q: You are building a framework consumed by external teams over many years. When would you choose to publish an abstract class as the extension point rather than an interface, given that adding members to an abstract class is a breaking change for subclasses while adding default members to an interface (C# 8+) is not?**

> **Bottom line:** Choose an abstract class when you have shared implementation or state to offer; but with C# 8+ default interface members, the versioning argument for abstract classes has weakened significantly.

**Elaboration:** Historically, abstract classes were preferred for long-lived frameworks because you could add new virtual methods without breaking existing subclasses — interfaces couldn't do that. With default interface implementations, interfaces now have that same flexibility. I'd still lean toward abstract classes when I have real shared logic to provide. But if the extension point is purely behavioral with no shared state, I'd publish an interface today — it's more flexible for consumers and default members handle versioning gracefully.

---

**Q: How do you decide how many members to put in a single interface? What design principle guides that decision, and what goes wrong when you violate it?**

> **Bottom line:** Interface Segregation Principle — keep interfaces small and focused so callers only depend on what they actually use.

**Elaboration:** If I'm writing a unit test and I have to mock 15 methods to test something that only uses 2, the interface is too wide. Fat interfaces also force unrelated implementations to stub out methods that don't apply to them, which is a sign the interface is conflating separate responsibilities. The rule of thumb: if you can describe an interface in one sentence without saying "and," it's probably the right size.

---

**Q: Describe a design where you use both an abstract class and one or more interfaces together to model a type hierarchy. What does each layer contribute, and why can't a single construct do both jobs?**

> **Bottom line:** The interface defines the behavioral contract; the abstract class provides shared implementation while honoring that contract.

**Elaboration:** Classic example: `IRepository<T>` as the interface, and `RepositoryBase<T>` as an abstract class that implements the common CRUD wiring, leaving `GetById` and `Query` as abstract. Concrete repositories inherit from `RepositoryBase` but are coded against `IRepository`. The interface is what callers and DI containers depend on; the abstract class is what subclass authors extend to avoid repetition. A single interface can't provide shared code, and a single abstract class locks consumers into a specific inheritance chain.

---

**Q: The Template Method pattern relies on an abstract class with a concrete method that calls abstract methods. The Strategy pattern replaces that with interfaces and composition. Walk through the trade-offs of each approach in the context of a data-processing pipeline.**

> **Bottom line:** Template Method is simpler but couples the algorithm structure to a class hierarchy; Strategy is more flexible but adds indirection and more objects.

**Elaboration:** In a data pipeline, Template Method means the base class owns the steps — parse, validate, transform — and subclasses fill in the specifics. It's easy to follow and the shared steps are in one place. But if you need to mix and match steps independently (different parsers with different validators), Template Method breaks down because the hierarchy can only vary along one dimension. Strategy lets you compose behaviors freely — inject any parser, any validator — which is more powerful but requires more wiring. For a pipeline that varies in predictable, single-axis ways, Template Method is fine. For combinatorial variation, go with Strategy.

---

**Q: The Liskov Substitution Principle says a subtype must be substitutable for its supertype without altering correctness. How does a poorly designed abstract class hierarchy violate LSP, and what are the symptoms you'd see at runtime?**

> **Bottom line:** LSP is violated when a subclass narrows the behavior contract — throwing exceptions a caller doesn't expect, ignoring required parameters, or failing for inputs the base class handles.

**Elaboration:** The classic example is `Rectangle` with a `Square` subclass that overrides `Width` and `Height` setters to keep them equal — code that sets width and height independently breaks silently. Symptoms are: `is`/`as` type checks in client code (a smell that you can't trust the base contract), unexpected exceptions from methods that should "just work," and unit tests that pass on the abstract type but fail on specific subclasses. Good abstract class design means the contract in the base is a minimum guarantee, not a specific behavior that subclasses can silently reduce.

---

**Q: "Favor composition over inheritance" is a well-known guideline. When does a deep abstract class hierarchy become a liability, and how would you refactor it toward composition without breaking existing consumers?**

> **Bottom line:** Deep hierarchies become liabilities when you need to vary behavior along multiple independent dimensions — inheritance only gives you one axis of variation.

**Elaboration:** The refactor path is to extract the varying behaviors into interfaces with concrete implementations and inject them rather than inheriting them. You can do this incrementally: add a constructor parameter for the extracted behavior, have existing subclasses pass their own logic as a default, then migrate callers gradually. The key risk is if the base class's `protected` members are part of the API subclasses depend on — those need to become collaborator services or you'll need to maintain backward compatibility wrappers.

---

**Q: A codebase uses a wide interface (20+ members) as the main abstraction boundary. Callers that only need 3 of those members are forced to implement or mock all 20. What refactoring would you apply, and what risks does it carry?**

> **Bottom line:** Apply Interface Segregation — split the wide interface into focused role interfaces, then have the original wide interface extend all of them for backward compatibility.

**Elaboration:** You introduce `IReader`, `IWriter`, `IValidator` and so on, then declare `IBigInterface : IReader, IWriter, IValidator` to avoid breaking existing code. Callers can now depend on just `IReader` and only mock three methods. The risks are: if teams are using reflection or serialization that depends on the specific interface type, the split might surprise them; and if the 20 methods truly are cohesive — every caller actually needs most of them — splitting creates fragmentation without benefit. Do the analysis first: look at how many callers use fewer than half the members.

---

## Level 7 — Advanced & Expert

---

**Q: C# allows generic interfaces to be declared covariant (`out`) or contravariant (`in`). Explain what this means using `IEnumerable<T>` (covariant) and `IComparer<T>` (contravariant) as examples. Why can't a generic class be declared covariant or contravariant?**

> **Bottom line:** Covariance means you can use a more-derived type where a base is expected; contravariance is the reverse — and classes can't have these because they have mutable state that would make it unsafe.

**Elaboration:** `IEnumerable<Dog>` can be assigned to `IEnumerable<Animal>` because you only ever get animals out — you never put anything in, so there's no type safety risk. `IComparer<Animal>` can be used where `IComparer<Dog>` is expected because a comparer that handles any animal can certainly handle dogs. Classes can't do this because they have fields — if `List<Dog>` were covariant to `List<Animal>`, you could call `.Add(new Cat())` through the `List<Animal>` reference and corrupt the typed list.

---

**Q: You have `IRepository<T>`. A team member wants to make it covariant. Walk through whether that is safe, and what constraints it would impose on how `T` can be used inside the interface members.**

> **Bottom line:** Covariance is only safe if `T` only appears in output positions — return types — never as a method parameter or in-out position.

**Elaboration:** If `IRepository<T>` has `T GetById(int id)` that's fine for covariance. But if it has `void Save(T entity)` or `IEnumerable<T> Query(Func<T, bool> predicate)` where T appears as input, covariance breaks type safety. In practice, most repositories have both read and write members, so making the full interface covariant usually isn't possible. The common solution is to split it: `IReadRepository<out T>` is covariant, `IWriteRepository<T>` is invariant.

---

**Q: Marker interfaces (e.g., `ISerializable` in older Java, `ICloneable` in C#) carry no members — they exist only to tag a type. What are the problems with this pattern, and what modern C# constructs replace them more effectively?**

> **Bottom line:** Marker interfaces pollute the type hierarchy and can't carry metadata — attributes, generic constraints, and source generators do the job better.

**Elaboration:** The problem with a marker interface is you discover at runtime whether it's there via `is` checks, there's no way to attach metadata, and every type that wants the tag must commit to a class hierarchy change. `[Serializable]` as an attribute is cleaner — it's declarative metadata the framework can read without affecting the type system. Generic constraints like `where T : IComparable<T>` give you compile-time enforcement. Source generators can inspect attributes and generate code without any runtime tagging. Marker interfaces still occasionally appear for legacy reasons, but they're not the right default.

---

**Q: In a large microservices system, multiple teams depend on a shared domain abstraction published as a NuGet package. One team needs to add a new method to the interface. Walk through the full impact analysis and the options available, including their versioning implications.**

> **Bottom line:** Adding a member to a published interface is a breaking change for all implementors — version carefully and prefer additive strategies.

**Elaboration:** First, assess all consumers: how many teams implement this interface vs. just depend on it? Adding a method forces every implementor to update. Options: add a default implementation (C# 8+) so existing implementors don't break — lowest friction, but default behavior may not be correct for all. Or version the package — `IMyInterface` stays, `IMyInterfaceV2 : IMyInterface` adds the new member — letting teams migrate gradually. A third option is a new, separate interface that the new functionality lives on, keeping the original intact. I'd lean toward default implementation for low-risk additions and interface versioning for anything requiring real implementation per consumer.

---

**Q: How do you use abstraction boundaries to enable parallel team development, and what signals tell you an abstraction boundary is in the wrong place?**

> **Bottom line:** Good abstraction boundaries let teams own their domain, change internals independently, and only coordinate at the interface contract level.

**Elaboration:** The signal that a boundary is in the wrong place is when teams have to coordinate on every change — if team A always needs to talk to team B to ship a feature, the boundary is drawn through the middle of a logical unit of work rather than around it. Other signals: the interface is leaking implementation details (a method named `GetUserFromSqlById` belongs inside a boundary, not on it), or the interface is too fine-grained and requires many cross-boundary calls to accomplish anything meaningful. Conway's Law is real — align abstraction boundaries with team ownership.

---

**Q: The JIT compiler can sometimes devirtualize a virtual call and inline it. What conditions must hold for this to happen, and how does `sealed` assist the JIT? Give a realistic example where this matters.**

> **Bottom line:** The JIT devirtualizes when it can prove at compile time there's only one possible implementation — sealed classes and concrete-type references are the main enablers.

**Elaboration:** If a variable is declared as a `sealed` concrete type, the JIT knows there are no subclasses and can inline the call directly. With `sealed` on a method in a non-sealed class, the JIT can devirtualize that specific method. The realistic example is `List<T>` — it's sealed, so `list.Add(item)` in a tight loop gets devirtualized and inlined by the JIT, avoiding the vtable overhead on every iteration. Without `sealed`, the JIT has to be conservative because a derived class could theoretically override `Add`.

---

**Q: You are reviewing a design where every class in the system implements at least one interface "just in case" it needs to be mocked in tests. The architect calls this "good abstraction hygiene." What are the hidden costs of this approach, and at what granularity would you actually draw abstraction boundaries?**

> **Bottom line:** Wrapping everything in an interface "just in case" adds indirection and maintenance overhead without delivering real design value — abstractions should be earned, not applied by default.

**Elaboration:** The hidden costs are real: more files, more types to navigate, more places where behavior can diverge between the interface and the implementation, and false confidence that code is well-designed just because it has interfaces. Mockability is a poor reason to introduce an abstraction — modern tools like `Moq` can mock concrete types, and good design often makes tests possible without mocking at all. I draw abstraction boundaries where there's genuine variation — where two different implementations exist or are planned, where a seam between teams or layers needs to be stable, or where a dependency on an external system needs to be replaceable. Not "everywhere, just in case."
