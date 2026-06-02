# L2 What happens if you call a virtual method from a constructor — what is the risk?

## Answer

When a constructor calls a virtual method, the **most-derived override runs** — even though the derived class constructor has not yet executed. This means the derived class's fields are still at their default values (`0`, `null`, `false`) when the override runs, which can cause subtle and hard-to-diagnose bugs.

---

## Concrete example

```csharp
public class Base
{
    public Base()
    {
        Console.WriteLine("Base constructor");
        Print(); // calls virtual method — dangerous!
    }

    public virtual void Print() => Console.WriteLine("Base.Print");
}

public class Derived : Base
{
    private readonly string _label;

    public Derived(string label) : base() // base() runs first
    {
        _label = label;
        Console.WriteLine("Derived constructor");
    }

    public override void Print() => Console.WriteLine($"Label: {_label}");
}

var d = new Derived("Hello");
```

**Output:**
```
Base constructor
Label:            <-- _label is null here! Derived constructor hasn't run yet
Derived constructor
```

The override runs but `_label` is `null` because the `Derived` constructor body hasn't executed. If the override dereferenced `_label` (e.g., `_label.Length`), this would throw a `NullReferenceException`.

---

## Construction order in .NET

1. Memory is allocated and all fields zero-initialised.
2. Field initialisers in the **most-derived** class run (e.g., `private string _label = "default"`).
3. The **base** constructor body runs — this is where the virtual call happens.
4. The **derived** constructor body runs.

So a virtual call inside the base constructor executes at step 3, before the derived constructor (step 4) has had a chance to set up state.

---

## Why this is risky

- The derived override may access uninitialised fields.
- The base class author cannot know what the derived override will do.
- The bug only manifests when there is a subclass — the base class alone works fine.
- Static analysis tools (e.g., ReSharper, Roslyn analysers) warn about this pattern explicitly.

---

## How to avoid it

**Option 1 — Use a factory method or `Initialize()` pattern**
```csharp
public class Base
{
    public Base() { } // no virtual calls here

    public virtual void Initialize() => Console.WriteLine("Base.Initialize");
}

// Caller is responsible for calling Initialize() after construction
var b = new Derived("Hello");
b.Initialize();
```

**Option 2 — Make the method private or sealed**
```csharp
public class Base
{
    public Base() => Print(); // safe: private cannot be overridden

    private void Print() => Console.WriteLine("Base.Print");
}
```

**Option 3 — Pass needed data via constructor parameters instead**
```csharp
public abstract class Base
{
    protected Base(string label) => Console.WriteLine($"Label: {label}");
}
```

---

## Summary

Calling a virtual method from a constructor is legal but dangerous. The derived override runs before the derived constructor, so any fields initialised in that constructor are still at their defaults. Prefer sealed methods, private helpers, or post-construction initialisation patterns to avoid this trap.
