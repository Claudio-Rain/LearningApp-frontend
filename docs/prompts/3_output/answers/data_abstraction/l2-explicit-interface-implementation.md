# L2 What is explicit interface implementation, and why would you use it instead of implicit implementation?

## Answer

## Implicit vs. Explicit interface implementation

When a class implements an interface, each member can be implemented **implicitly** or **explicitly**.

### Implicit implementation

The member is declared as a normal public member of the class. It is accessible both through the class type and through the interface type.

Include short code examples in C#.

```csharp
public interface ILogger
{
    void Log(string message);
}

public class ConsoleLogger : ILogger
{
    // Implicit — accessible as ConsoleLogger.Log AND ILogger.Log
    public void Log(string message)
    {
        Console.WriteLine($"[LOG] {message}");
    }
}

ConsoleLogger logger = new ConsoleLogger();
logger.Log("hello");          // Works directly on the class type

ILogger iLogger = logger;
iLogger.Log("hello");         // Also works through the interface
```

### Explicit implementation

The member is prefixed with the interface name (`InterfaceName.MemberName`) and has **no access modifier**. It is only accessible through a variable of the interface type, not through the class type directly.

```csharp
public interface ILogger
{
    void Log(string message);
}

public class ConsoleLogger : ILogger
{
    // Explicit — only accessible through ILogger
    void ILogger.Log(string message)
    {
        Console.WriteLine($"[LOG] {message}");
    }
}

ConsoleLogger logger = new ConsoleLogger();
// logger.Log("hello");  // ERROR — Log is not visible on ConsoleLogger directly

ILogger iLogger = logger;
iLogger.Log("hello");    // Works — accessed through the interface type
```

---

## Why use explicit interface implementation?

### 1. Resolving naming conflicts between two interfaces

When two interfaces declare a member with the same name but you need different behaviour for each:

```csharp
public interface IPrinter  { void Print(); }
public interface IScanner  { void Print(); } // same name, different intent

public class AllInOneMachine : IPrinter, IScanner
{
    void IPrinter.Print() => Console.WriteLine("Printer: printing document...");
    void IScanner.Print() => Console.WriteLine("Scanner: scanning document...");
}

AllInOneMachine machine = new AllInOneMachine();
((IPrinter)machine).Print();  // Printer: printing document...
((IScanner)machine).Print();  // Scanner: scanning document...
```

### 2. Hiding interface members from the class's public API

Some interface members may be implementation details that you don't want to expose to consumers of the class directly:

```csharp
public class Connection : IDisposable
{
    public void Close() => Console.WriteLine("Connection closed.");

    // Dispose is an implementation detail — hidden from the class surface
    void IDisposable.Dispose()
    {
        Close();
    }
}

Connection c = new Connection();
c.Close();              // Natural API
// c.Dispose();         // Not visible — keeps the class API clean
using (IDisposable d = new Connection()) { } // Works through interface
```

### 3. Providing different implementations for the same logical operation

```csharp
public interface IMetric   { double Value { get; } }
public interface IImperial { double Value { get; } }

public class Distance : IMetric, IImperial
{
    private double _metres;
    public Distance(double metres) => _metres = metres;

    double IMetric.Value   => _metres;
    double IImperial.Value => _metres * 3.28084; // feet
}

Distance d = new Distance(10);
Console.WriteLine(((IMetric)d).Value);    // 10
Console.WriteLine(((IImperial)d).Value);  // 32.8084
```

---

## Summary

| | Implicit | Explicit |
|---|---|---|
| Access modifier | `public` | None |
| Accessible on class type | Yes | No |
| Accessible through interface | Yes | Yes |
| Use case | Standard, default approach | Conflict resolution, API hiding, dual behaviour |

Choose **explicit** when you need to resolve naming conflicts, hide members from the class's public surface, or provide different implementations for the same member name across multiple interfaces.
