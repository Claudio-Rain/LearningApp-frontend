# L2 Can interfaces have default implementations in C# 8+? When is this useful and what are the limitations?

## Answer

Yes. C# 8 introduced **default interface methods (DIM)** — interface members can now include a method body. This is sometimes called "interface evolution."

```csharp
public interface ILogger
{
    void Log(string message);

    // Default implementation — classes don't have to override this
    void LogError(string message) => Log($"[ERROR] {message}");
}

public class ConsoleLogger : ILogger
{
    public void Log(string message) => Console.WriteLine(message);
    // LogError is inherited from the interface — no override needed
}

// Usage
ILogger logger = new ConsoleLogger();
logger.LogError("Something went wrong"); // works via default impl
```

---

## When it is useful

**1. Non-breaking interface evolution**
Add new members to a published interface without forcing every existing implementor to update:

```csharp
// Before C# 8 — adding LogWarning would break all implementors
public interface ILogger
{
    void Log(string message);
    void LogWarning(string message) => Log($"[WARN] {message}"); // safe addition
}
```

**2. Mixin-like shared behaviour**
Provide utility methods that build on the core contract, reducing boilerplate in implementing classes.

**3. Optional contract extension points**
Mark a method as optional by giving it a no-op default, letting implementors opt in selectively.

---

## Limitations

| Limitation | Detail |
|---|---|
| Not inherited by classes | A class variable cannot call the default method — only an *interface-typed* reference can. |
| No state | Interfaces still cannot hold instance fields; defaults can only use other interface members or statics. |
| Can cause diamond ambiguity | If two interfaces provide the same default, the class must explicitly override to resolve the conflict. |
| Harder to discover | Developers reading a class won't see the default behaviour unless they inspect the interface. |
| Avoid overusing | DIM can blur the line between interface and abstract class — prefer abstract classes when shared state or richer hierarchy is needed. |

```csharp
// "Not inherited by class" example
ConsoleLogger cl = new ConsoleLogger();
// cl.LogError("x"); // compile error — ConsoleLogger does not expose LogError directly

ILogger il = cl;
il.LogError("x");   // OK — accessed through interface reference
```

---

## Summary

Default interface methods are a backward-compatibility tool for **evolving library interfaces** without breaking existing code. They are not a replacement for abstract classes and should be used sparingly to keep the design clear.
