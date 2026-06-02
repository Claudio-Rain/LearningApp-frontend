# L3 How would you combine interfaces and abstract classes together to design a well-structured type hierarchy? Describe the trade-offs and give a concrete example.

## Answer

## The strategy: interfaces for contracts, abstract classes for shared implementation

A robust type hierarchy typically uses:

- **Interfaces** to define capabilities and roles (what a type can do) — enabling multiple inheritance and loose coupling.
- **Abstract classes** to provide shared implementation, state, and a common identity (what a type is).

The two tools complement each other:

| Concern | Best tool |
|---|---|
| Define a contract / capability | Interface |
| Share implementation across types | Abstract class |
| Allow multiple inheritance | Interface |
| Carry instance state/fields | Abstract class |
| Enable constructor injection into base | Abstract class |
| Decouple unrelated types | Interface |

---

## Trade-offs

### Interfaces
- **Pro:** multiple inheritance, maximum flexibility, no coupling on implementation.
- **Con:** no shared state, can lead to duplicate code across implementors, default implementations (C# 8+) can get messy.

### Abstract classes
- **Pro:** shared fields, constructors, and concrete logic; no duplication.
- **Con:** single inheritance limit — a class that inherits an abstract base cannot inherit another base.

### Combining both
- **Pro:** you get shared implementation AND flexibility. Interfaces define the "what"; the abstract class handles the "how" for common behaviour; concrete classes add the specifics.
- **Con:** more types to maintain; can increase complexity if overused.

---

## Concrete example: a notification system

```csharp
// --- Interfaces: define capabilities / contracts ---

public interface INotification
{
    string Title { get; }
    string Body { get; }
    void Send();
}

public interface ISchedulable
{
    DateTime ScheduledAt { get; }
    bool IsDue { get; }
}

public interface IRetryable
{
    int MaxRetries { get; }
    void Retry();
}

// --- Abstract class: shared implementation for all notifications ---

public abstract class BaseNotification : INotification
{
    // Shared state — impossible in an interface
    public string Title { get; }
    public string Body { get; }
    protected int AttemptCount { get; private set; }

    protected BaseNotification(string title, string body)
    {
        Title = title;
        Body = body;
    }

    // Concrete method — shared by all notifications
    public void Send()
    {
        AttemptCount++;
        Console.WriteLine($"[Attempt {AttemptCount}] Sending: {Title}");
        Deliver(); // abstract step — derived class provides channel-specific logic
    }

    // Abstract method — each channel delivers differently
    protected abstract void Deliver();
}

// --- Concrete classes: specific channels, optional extra capabilities ---

public class EmailNotification : BaseNotification, IRetryable
{
    public string RecipientEmail { get; }
    public int MaxRetries => 3;

    public EmailNotification(string title, string body, string email)
        : base(title, body)
    {
        RecipientEmail = email;
    }

    protected override void Deliver()
    {
        Console.WriteLine($"Email sent to {RecipientEmail}: {Body}");
    }

    public void Retry()
    {
        Console.WriteLine($"Retrying email to {RecipientEmail}...");
        Send();
    }
}

public class SmsNotification : BaseNotification, ISchedulable, IRetryable
{
    public string PhoneNumber { get; }
    public DateTime ScheduledAt { get; }
    public bool IsDue => DateTime.Now >= ScheduledAt;
    public int MaxRetries => 1;

    public SmsNotification(string title, string body, string phone, DateTime scheduledAt)
        : base(title, body)
    {
        PhoneNumber = phone;
        ScheduledAt = scheduledAt;
    }

    protected override void Deliver()
    {
        Console.WriteLine($"SMS sent to {PhoneNumber}: {Body}");
    }

    public void Retry()
    {
        Console.WriteLine("Retrying SMS...");
        Send();
    }
}

public class PushNotification : BaseNotification
{
    public string DeviceToken { get; }

    public PushNotification(string title, string body, string token)
        : base(title, body)
    {
        DeviceToken = token;
    }

    protected override void Deliver()
    {
        Console.WriteLine($"Push sent to device {DeviceToken}: {Body}");
    }
}
```

### Usage

```csharp
// All notifications share the INotification contract
INotification[] notifications =
{
    new EmailNotification("Welcome", "Thanks for joining!", "user@example.com"),
    new SmsNotification("Reminder", "Your meeting starts soon.", "+1234567890", DateTime.Now),
    new PushNotification("New Message", "You have 1 new message.", "abc-token-xyz"),
};

foreach (var n in notifications)
{
    n.Send(); // Polymorphic — calls each channel's Deliver() internally
}

// Type-specific capabilities via interface
if (notifications[0] is IRetryable retryable)
{
    retryable.Retry();
}

if (notifications[1] is ISchedulable schedulable && schedulable.IsDue)
{
    notifications[1].Send();
}
```

---

## Design takeaways

1. **Start with interfaces** to define capabilities — they impose no inheritance cost.
2. **Add an abstract base class** when you find yourself duplicating code across implementations.
3. **Combine them** so the abstract class implements one or more interfaces, providing shared behaviour, while concrete classes remain free to implement additional interfaces.
4. **Avoid deep abstract hierarchies** — more than two levels usually signals a need to refactor to composition.
