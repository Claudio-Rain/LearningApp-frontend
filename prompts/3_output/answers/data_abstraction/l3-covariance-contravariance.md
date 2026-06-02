# L3 What are covariant (`out`) and contravariant (`in`) type parameters in generic interfaces, and when do you need them?

## Answer

Variance controls whether a generic type `G<Derived>` is assignable to `G<Base>` (or vice versa). By default, generic types in C# are **invariant** — `List<Dog>` is not assignable to `List<Animal>` even though `Dog : Animal`. The `out` and `in` keywords opt individual type parameters into safe variance.

---

## Covariance (`out`) — "producer" direction

`out T` means the type parameter only appears in **output** positions (return types). A `G<Derived>` can be assigned to a `G<Base>`.

```csharp
// IEnumerable<T> is declared: IEnumerable<out T>
IEnumerable<string> strings = new List<string> { "hello", "world" };
IEnumerable<object> objects = strings; // OK because T is covariant (out)

foreach (object o in objects)
    Console.WriteLine(o); // safe — we only read, never write
```

Real-world example from the BCL:

```csharp
public interface IEnumerable<out T>  // produces T, never consumes it
{
    IEnumerator<T> GetEnumerator();
}

public interface IReadOnlyList<out T> : IEnumerable<T>
{
    T this[int index] { get; }  // returns T — output only
}
```

**Why is it safe?** You can only get a `T` out of the interface — you never put one in. A method that reads `Animal` objects is perfectly happy receiving `Dog` objects.

---

## Contravariance (`in`) — "consumer" direction

`in T` means the type parameter only appears in **input** positions (method parameters). A `G<Base>` can be assigned to a `G<Derived>`.

```csharp
// IComparer<T> is declared: IComparer<in T>
IComparer<object> objectComparer = Comparer<object>.Default;
IComparer<string> stringComparer = objectComparer; // OK — contravariant

int result = stringComparer.Compare("a", "b"); // safe
```

Real-world example:

```csharp
public interface IComparer<in T>   // consumes T, never produces it
{
    int Compare(T x, T y);         // T only in input positions
}

public interface Action<in T>      // conceptually — Action<Animal> works for Dog
{
    void Invoke(T arg);
}
```

**Why is it safe?** A method that can consume `Animal` objects can certainly consume `Dog` objects — `Dog` is a kind of `Animal`. The direction is reversed: a more general consumer can substitute for a more specific one.

---

## Side-by-side mental model

```
Covariance  (out):  Producer — you get T out      G<Derived> → G<Base>
Contravariance (in): Consumer — you put T in       G<Base>    → G<Derived>
```

```csharp
// Covariance in action — return type only
public interface IFactory<out T>
{
    T Create();                   // T in output position — OK
    // void Accept(T item);       // would be a compile error — input position
}

// Contravariance in action — parameter only
public interface IHandler<in T>
{
    void Handle(T item);          // T in input position — OK
    // T Produce();               // would be a compile error — output position
}
```

---

## Defining your own variant interface

```csharp
// Covariant — safe to assign IRepository<Dog> to IRepository<Animal>
public interface IRepository<out T>
{
    T GetById(int id);
    IEnumerable<T> GetAll();
    // void Save(T item); -- NOT allowed; T would appear in input position
}

// Contravariant — safe to assign IValidator<Animal> to IValidator<Dog>
public interface IValidator<in T>
{
    bool IsValid(T item);
}
```

---

## When do you need variance?

| Situation | Use |
|---|---|
| Returning a sequence of a derived type from a method expecting base type | `out` (covariance) |
| Passing a handler/comparer/callback for a base type where a derived type is expected | `in` (contravariance) |
| Read-only abstractions (`IReadOnlyList`, `IEnumerable`) | `out` |
| Strategy/policy interfaces that only consume (`IComparer`, `Action<T>`) | `in` |
| Mutable collections or interfaces that both produce and consume | Invariant — no annotation |

---

## Summary

- `out` (covariant): the interface is a **producer** — `G<Derived>` is assignable to `G<Base>`.
- `in` (contravariant): the interface is a **consumer** — `G<Base>` is assignable to `G<Derived>`.
- Variance only applies to **interfaces and delegates**, not classes.
- The compiler enforces the restriction: `out` types cannot appear as method parameters, `in` types cannot appear as return types.
