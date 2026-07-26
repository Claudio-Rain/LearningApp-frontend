# L2 What is the depth of inheritance and how do you measure it?

## Answer

**Depth of Inheritance (DIT)** is a metric that counts the number of levels in a class's inheritance hierarchy from the root base class down to the class being measured.

A class that derives directly from `object` (the implicit base in C#) has DIT = 1. Each additional level of inheritance adds 1.

### Why It Matters

- **High DIT** means a class inherits behavior from many ancestors, making it harder to understand, predict, and test. A change in a base class ripples down through all descendants.
- **Low DIT** (1–2) indicates flat, explicit designs that are easier to reason about.
- Excessive inheritance is often a sign that **composition** should be preferred over inheritance.

### Measurement Guidelines

| DIT | Assessment |
|-----|------------|
| 1   | Minimal — only `object` |
| 2–3 | Acceptable |
| 4+  | High — review design |

### How to Measure

- **Visual Studio Code Metrics** — Reports DIT as *Depth of Inheritance* per class.
- **NDepend** — Provides CQLinq queries to find classes with DIT above a threshold.
- **SonarQube** — Has a built-in rule that warns when inheritance depth exceeds a configurable limit.
- **ReSharper / Rider** — Type hierarchy diagrams show inheritance chains visually.

### Relationship to Other Metrics

High DIT often correlates with:
- High **class coupling** (inheriting from many types)
- Low **cohesion** (a class doing too many things via inherited methods)
- Violation of the **Liskov Substitution Principle**

---

*Include short code examples in C#.*

```csharp
// Deep inheritance chain — DIT = 4, fragile and hard to follow
public class Vehicle { }                    // DIT 1
public class MotorVehicle : Vehicle { }     // DIT 2
public class Car : MotorVehicle { }         // DIT 3
public class ElectricCar : Car { }          // DIT 4

// Every layer adds hidden state and overrides; a change in Vehicle
// may break ElectricCar in non-obvious ways.

// Preferred: shallow hierarchy + composition (DIT = 1 or 2)
public interface IDrivable { void Drive(); }
public interface IChargeable { void Charge(); }

public class ElectricCar : IDrivable, IChargeable   // DIT 1 (from object)
{
    private readonly IMotor _motor;
    private readonly IBattery _battery;

    public ElectricCar(IMotor motor, IBattery battery)
    {
        _motor   = motor;
        _battery = battery;
    }

    public void Drive()   => _motor.Run();
    public void Charge()  => _battery.Recharge();
}
```

Using interfaces and composition keeps DIT low while still enabling polymorphism and extensibility.
