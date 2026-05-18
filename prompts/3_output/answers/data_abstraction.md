# Model Answers: Data Abstraction

---

**Q: What does "abstraction" mean in object-oriented programming, and why is it useful?**

> **Bottom line:** Abstraction means exposing only the relevant behavior of an object while hiding the implementation details.

**Elaboration:** It lets you work at a higher level — you care that a `Shape` has an `Area()`, not how a specific shape calculates it. This reduces coupling between components and makes code easier to reason about and extend. It's the foundation of programming to interfaces rather than implementations.

---

**Q: What is an abstract class in C#? Can you instantiate it directly?**

> **Bottom line:** An abstract class is a base class that cannot be instantiated — it's meant to be derived from.

**Elaboration:** It can define both concrete methods (with implementations) and abstract methods (without). You declare it with the `abstract` keyword and you cannot call `new AbstractClass()` — the compiler prevents it. A derived class must implement all abstract members before it can be instantiated.

```csharp
abstract class Shape
{
    public abstract double Area();
    public void Describe() => Console.WriteLine($"Area: {Area()}");
}
```

---

**Q: What is an interface in C#? How is it different from a concrete class?**

> **Bottom line:** An interface is a contract that defines what a type must do, with no implementation (before C# 8).

**Elaboration:** Unlike a concrete class, an interface has no state and — historically — no method bodies. Any class implementing it must provide all the required members. This makes interfaces ideal for defining capabilities that unrelated types can share without forcing a common ancestor.

---

**Q: What keyword do you use to mark a class or method as abstract in C#?**

> **Bottom line:** The `abstract` keyword, applied to the class declaration and to any method that has no body.

```csharp
abstract class Animal
{
    public abstract void Speak(); // no body
}
```

---

**Q: What are the key differences between an abstract class and an interface in C#? When would you choose one over the other?**

> **Bottom line:** Use an abstract class when types share state or base behavior; use an interface when you want to define a capability that unrelated types can implement.

**Elaboration:** Abstract classes can have fields, constructors, and concrete methods — they model an "is-a" relationship with shared implementation. Interfaces model a "can-do" relationship and allow multiple implementation, which abstract classes don't. I reach for interfaces by default and add an abstract base class only when I find myself duplicating implementation across implementors.

---

**Q: Can an abstract class have a constructor? Can it have fields? What about an interface?**

> **Bottom line:** Abstract classes can have constructors and fields; interfaces cannot have instance fields or constructors.

**Elaboration:** The abstract class constructor runs when a derived class is instantiated via `base()`. This is useful for initializing shared state. Interfaces, on the other hand, are pure contracts — no storage, no initialization logic. With C# 8+ interfaces can have static members and default method bodies, but still no instance fields.

---

**Q: As of C# 8+, interfaces can have default method implementations. Does that blur the line between interfaces and abstract classes?**

> **Bottom line:** It narrows the gap but doesn't eliminate it — interfaces still can't have instance state, constructors, or destructors.

**Elaboration:** Default interface methods let library authors add methods without breaking existing implementors, which is genuinely useful. But I treat them as a backward-compatibility tool, not a design pattern. If I need shared behavior backed by shared state, an abstract class is still the right choice.

---

**Q: What does the `abstract` modifier mean when applied to a method? What does the derived class have to do?**

> **Bottom line:** An abstract method has no body in the declaring class; every non-abstract derived class must override it.

**Elaboration:** It signals that the method is part of the type's contract but the implementation is intentionally deferred. The derived class uses the `override` keyword to provide the body. If a derived class is itself abstract, it can leave the method unimplemented.

```csharp
abstract class Animal { public abstract void Speak(); }
class Dog : Animal { public override void Speak() => Console.WriteLine("Woof"); }
```

---

**Q: Can you mark a property or an event as abstract? What would that look like?**

> **Bottom line:** Yes — both properties and events can be abstract, using the same `abstract` keyword.

```csharp
abstract class Shape
{
    public abstract double Area { get; }
    public abstract event EventHandler Resized;
}
```

---

**Q: What happens if a derived class does not implement all inherited abstract members — will it compile?**

> **Bottom line:** No — the compiler emits an error unless the derived class is itself declared abstract.

**Elaboration:** This is one of the guarantees that abstract classes provide: you cannot accidentally create an incomplete concrete type. If you want to defer implementation further down the hierarchy, mark the derived class abstract too.

---

**Q: What is polymorphism in OOP? Give a practical example of runtime polymorphism in C#.**

> **Bottom line:** Polymorphism lets you treat objects of different types through a common base type, with each type providing its own behavior.

**Elaboration:** Runtime polymorphism (dynamic dispatch) means the correct method is chosen at runtime based on the actual object type, not the declared reference type. This is the mechanism that makes strategy and template-method patterns work.

```csharp
Shape[] shapes = { new Circle(5), new Rectangle(4, 6) };
foreach (var s in shapes)
    Console.WriteLine(s.Area()); // dispatches to correct override
```

---

**Q: What is the difference between `virtual` and `abstract` methods?**

> **Bottom line:** A `virtual` method has a default implementation that derived classes *may* override; an `abstract` method has no implementation and derived classes *must* override it.

**Elaboration:** Use `virtual` when there's a sensible default behavior. Use `abstract` when the base class genuinely has no meaningful implementation to offer — the concept only makes sense in the subclass.

---

**Q: What does the `override` keyword do? What happens if you omit it on a derived class method that shadows a virtual method?**

> **Bottom line:** `override` replaces the base class virtual method in the vtable, enabling proper runtime dispatch; omitting it hides the base method instead.

**Elaboration:** Without `override`, you create a new method that shadows the base class one — the compiler warns you with CS0108. The base reference will still call the base implementation even if the object is a derived type. That's almost never what you want, and it's a common source of subtle bugs.

---

**Q: What is the `sealed` modifier and when would you use it on a method?**

> **Bottom line:** `sealed` on a method prevents further overriding in subclasses.

**Elaboration:** You typically use it when you override a virtual method and want to lock down that implementation for downstream classes. It also gives the JIT a hint that it may be able to de-virtualize the call, which can improve performance in hot paths.

---

**Q: Write an abstract class `Shape` that has an abstract method `Area()` and a concrete method `Describe()`.**

> **Bottom line:** The abstract class defines the skeleton; concrete classes fill in the specific behavior.

```csharp
abstract class Shape
{
    public abstract double Area();
    public void Describe() => Console.WriteLine($"{GetType().Name} area: {Area():F2}");
}

class Circle : Shape
{
    private readonly double _radius;
    public Circle(double radius) => _radius = radius;
    public override double Area() => Math.PI * _radius * _radius;
}
```

---

**Q: Can an abstract class implement an interface? Does it have to implement all interface members?**

> **Bottom line:** Yes it can, and no it doesn't — it can leave interface members abstract for derived classes to implement.

```csharp
interface IDrawable { void Draw(); }

abstract class Shape : IDrawable
{
    public abstract void Draw(); // deferred to subclass
}
```

---

**Q: C# does not support multiple class inheritance. How do you achieve multiple inheritance behavior?**

> **Bottom line:** By implementing multiple interfaces on a single class.

**Elaboration:** A class can implement any number of interfaces, each adding a different capability. The class provides the concrete implementation for all of them. This is safer than multiple class inheritance because there's no ambiguous shared state.

---

**Q: Write a class that implements two interfaces, both of which declare a method with the same name and signature. What problem does this create?**

> **Bottom line:** The ambiguity means the compiler doesn't know which interface's method a call on the concrete type refers to.

```csharp
interface IA { void Print(); }
interface IB { void Print(); }

class MyClass : IA, IB
{
    void IA.Print() => Console.WriteLine("IA");
    void IB.Print() => Console.WriteLine("IB");
}
```

---

**Q: How does explicit interface implementation solve name collisions? Show an example.**

> **Bottom line:** Explicit implementation ties the method to a specific interface, resolving ambiguity at the call site.

**Elaboration:** When you prefix the method name with the interface name (`void IA.Print()`), the compiler knows exactly which interface's contract it satisfies. The method becomes callable only through a reference of that interface type.

```csharp
MyClass obj = new MyClass();
((IA)obj).Print(); // "IA"
((IB)obj).Print(); // "IB"
```

---

**Q: When you use explicit interface implementation, can you call that method on the concrete type directly? Why or why not?**

> **Bottom line:** No — explicitly implemented methods are not accessible through the concrete type; you must cast to the interface first.

**Elaboration:** This is by design. It keeps the method out of the type's public API when it only makes sense in the context of a specific interface. It's also useful for hiding lower-level or legacy interface members that you don't want cluttering the primary API.

---

**Q: Write a base class with a virtual method and two derived classes that each override it.**

> **Bottom line:** The key point is that calling the method through a base reference dispatches to the actual runtime type.

```csharp
class Animal
{
    public virtual void Speak() => Console.WriteLine("...");
}
class Dog : Animal { public override void Speak() => Console.WriteLine("Woof"); }
class Cat : Animal { public override void Speak() => Console.WriteLine("Meow"); }

Animal a = new Dog();
a.Speak(); // "Woof" — runtime dispatch
```

---

**Q: A colleague marks every method in a class as `virtual` "just in case." What problems can this cause?**

> **Bottom line:** It opens every method to unintended overriding, breaks encapsulation, and can cause subtle bugs in derived classes.

**Elaboration:** Virtual dispatch has a small cost, but the bigger risk is behavioral: a derived class can override anything and break invariants the base class relies on. Only mark a method virtual if you actually intend it to be an extension point.

---

**Q: You call a virtual method from a base class constructor. What is the risk here?**

> **Bottom line:** The derived class override runs before the derived class constructor, potentially accessing uninitialized fields.

**Elaboration:** When you construct a derived class, the base constructor runs first. If it calls a virtual method, the derived class override fires — but the derived object isn't fully constructed yet. This is a well-known C# pitfall and can cause `NullReferenceException` or corrupt state.

---

**Q: A developer creates an interface with 15 methods. A class only needs 3 of them. What principle is being violated?**

> **Bottom line:** The Interface Segregation Principle — clients should not be forced to depend on methods they don't use.

**Elaboration:** The fix is to split the fat interface into several smaller, focused ones. That way implementors only take on the contracts they need. It also makes mocking and testing much easier.

---

**Q: When would you accidentally hide a virtual method instead of overriding it, and how does C# signal this?**

> **Bottom line:** It happens when you declare a method with the same signature in a derived class without `override`, and C# signals it with a compiler warning (CS0108).

```csharp
class Base { public virtual void Foo() { } }
class Derived : Base
{
    public void Foo() { } // CS0108: hides Base.Foo; use 'new' if intentional
}
```

---

**Q: Can an abstract class inherit from a concrete class?**

> **Bottom line:** Yes — an abstract class can extend a concrete class and add abstract members on top.

**Elaboration:** This is less common but valid. The abstract class inherits all the concrete implementation and can add new abstract methods that further subclasses must provide. Just watch out for adding abstract members that depend on state in the concrete base — the interactions can get confusing quickly.

---

**Q: How does the CLR implement virtual method dispatch? What is a vtable?**

> **Bottom line:** Each type has a virtual method table (vtable) — an array of function pointers — and virtual calls are resolved by looking up the correct slot at runtime.

**Elaboration:** When you override a method, the derived class's vtable entry for that slot points to the override instead of the base implementation. The JIT can sometimes de-virtualize a call if it can prove the exact type at compile time, turning it into a direct call and eliminating the lookup cost.

---

**Q: What is the performance overhead of virtual dispatch compared to a direct method call?**

> **Bottom line:** The overhead is a pointer indirection and (potentially) a cache miss — measurable only in extremely hot loops, negligible in typical application code.

**Elaboration:** Modern CPUs have branch predictors that handle stable vtable patterns well. I wouldn't avoid virtual methods for performance reasons unless a profiler has shown it to be an actual bottleneck. Correctness and design clarity should win first.

---

**Q: You're designing a plugin system where third parties will implement core behaviors. Should you expose abstract classes or interfaces as the extension point?**

> **Bottom line:** Interfaces — they impose no base-class constraint on the plugin author and allow them to integrate with their own class hierarchy.

**Elaboration:** Abstract classes force plugin authors into your inheritance chain, which is a heavy constraint. Interfaces give them freedom while still enforcing the contract. If you find yourself wanting to provide default behavior, pair the interface with an optional abstract helper class (the "optional base" pattern) that plugin authors can choose to extend.

---

**Q: When is it appropriate to use both an interface and an abstract class together?**

> **Bottom line:** The interface defines the public contract; the abstract class provides optional scaffolding to reduce boilerplate for common implementors.

**Elaboration:** The classic example is `IList<T>` + `Collection<T>` in the BCL. Third parties implement `IList<T>` directly if they need full control, or extend `Collection<T>` to get sensible defaults for free. This is the "abstract base class as optional convenience" pattern.

---

**Q: How do covariance and contravariance on generic interfaces interact with polymorphism?**

> **Bottom line:** `out T` (covariance) lets you assign `IEnumerable<Dog>` to `IEnumerable<Animal>`; `in T` (contravariance) lets you assign `IComparer<Animal>` to `IComparer<Dog>`.

**Elaboration:** These are compile-time guarantees about type safety in generic assignments. Covariance works for read-only producers because you can safely widen the type; contravariance works for write-only consumers because you can safely narrow. They only apply to interface and delegate type parameters, not class generics.

---

**Q: How do the SOLID principles constrain inheritance hierarchy design?**

> **Bottom line:** LSP says derived classes must be substitutable for their base type; ISP says interfaces should be small and focused — violating either produces fragile hierarchies.

**Elaboration:** A classic LSP violation is a `Square` extending `Rectangle` where setting width also changes height, breaking the assumption that the two are independent. Once you have a hierarchy like that, every consumer of `Rectangle` has to guard against `Square` behavior. The fix is usually to flatten the hierarchy or use composition.
