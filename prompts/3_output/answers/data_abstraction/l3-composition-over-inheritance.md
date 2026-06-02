# L3 When would you choose composition over inheritance, and what problem does it solve?

## Answer

**Composition over inheritance** is the design principle of building behaviour by combining smaller, focused objects rather than by extending a class hierarchy. The Gang of Four stated it plainly: *"Favour object composition over class inheritance."*

---

## The problem with inheritance

Inheritance creates **tight coupling** between parent and child:

- The child is bound to the parent's implementation at compile time.
- A change in the parent silently breaks all children (the "fragile base class" problem).
- Deep hierarchies become hard to understand and test.
- Multiple inheritance of behaviour is not possible in C# (only multiple interfaces).

```csharp
// Inheritance — brittle hierarchy
public class Animal
{
    public virtual void Breathe() => Console.WriteLine("Breathing...");
}

public class Dog : Animal
{
    public void Bark() => Console.WriteLine("Woof!");
}

public class RobotDog : Dog // RobotDog doesn't breathe — but it inherits Breathe()!
{
}
```

`RobotDog` inherits `Breathe()` even though it makes no sense. This is an LSP violation forced by the wrong abstraction.

---

## Composition solves this

Instead of "is-a", think "has-a" — inject the behaviour the class needs as a dependency.

```csharp
// Behaviours as interfaces + implementations
public interface IBreathing
{
    void Breathe();
}

public interface IMovement
{
    void Move();
}

public class LungBreathing : IBreathing
{
    public void Breathe() => Console.WriteLine("Breathing with lungs");
}

public class MotorMovement : IMovement
{
    public void Move() => Console.WriteLine("Moving with motors");
}

// Dog composes the behaviours it needs
public class Dog
{
    private readonly IBreathing _breathing;
    private readonly IMovement  _movement;

    public Dog(IBreathing breathing, IMovement movement)
    {
        _breathing = breathing;
        _movement  = movement;
    }

    public void Breathe() => _breathing.Breathe();
    public void Move()    => _movement.Move();
    public void Bark()    => Console.WriteLine("Woof!");
}

// RobotDog gets MotorMovement but no breathing — clean and honest
public class RobotDog
{
    private readonly IMovement _movement;

    public RobotDog(IMovement movement) => _movement = movement;

    public void Move() => _movement.Move();
}
```

---

## When to prefer composition

| Scenario | Why composition wins |
|---|---|
| Behaviour changes at runtime | Swap injected implementations without touching the class |
| Combination of multiple abilities | Compose as many interfaces as needed; no diamond problem |
| Reusing behaviour across unrelated classes | Share an implementation without forcing an artificial hierarchy |
| The "is-a" relationship is not truly permanent | Avoids painting yourself into a corner with a deep hierarchy |
| Testability | Replace collaborators with mocks/fakes via constructor injection |

---

## When inheritance is still appropriate

- There is a genuine, stable "is-a" relationship (e.g., `SqlConnection : DbConnection`).
- You need to override a small number of well-defined extension points on an otherwise-shared implementation.
- The hierarchy is shallow (1–2 levels) and unlikely to grow.

---

## Summary

Choose composition when behaviour varies independently, when you want to mix-and-match abilities, or when the "is-a" relationship is forced. Composition keeps classes small, decoupled, and easy to test. Reserve inheritance for genuine taxonomic relationships where the parent's full contract truly applies to the child.
