# L1 What are code smells? Give three examples and explain why they matter.

## Answer

A **code smell** is a surface indicator in code that suggests a deeper problem — not necessarily a bug, but a design weakness that makes code harder to understand, maintain, and extend. Code smells are detected by reading code, not by running it.

### Why they matter

- They increase the cost of future changes (more code to read, test, and modify)
- They tend to grow — a small smell attracts more bad code around it
- They correlate with higher defect rates in empirical studies

---

### Example 1 — Long Method

A method that does too many things at once. The rule of thumb is that a method should fit on one screen and have a single responsibility.

```csharp
// Smell: one method handles validation, DB lookup, calculation, formatting, and email
public string ProcessOrder(int orderId)
{
    if (orderId <= 0) throw new ArgumentException("Invalid");
    var order = db.Orders.Find(orderId);
    if (order == null) throw new NotFoundException();
    decimal tax = order.Total * 0.21m;
    string formatted = $"Order #{order.Id}: {order.Total + tax:C}";
    emailService.Send(order.CustomerEmail, formatted);
    return formatted;
}

// Better: split into focused methods
public string ProcessOrder(int orderId)
{
    var order = GetValidatedOrder(orderId);
    var summary = FormatOrderSummary(order);
    NotifyCustomer(order, summary);
    return summary;
}
```

---

### Example 2 — Magic Numbers

Numeric or string literals used inline with no explanation of their meaning.

```csharp
// Smell
if (user.FailedLogins > 5) LockAccount(user);
decimal vat = price * 0.21m;

// Better
private const int MaxFailedLogins = 5;
private const decimal VatRate = 0.21m;

if (user.FailedLogins > MaxFailedLogins) LockAccount(user);
decimal vat = price * VatRate;
```

---

### Example 3 — Feature Envy

A method that uses data or methods from another class more than its own, suggesting it belongs in that other class.

```csharp
// Smell: OrderProcessor obsessed with Customer internals
public class OrderProcessor
{
    public decimal CalculateDiscount(Order order)
    {
        if (order.Customer.MembershipLevel == "Gold" && order.Customer.YearsActive > 3)
            return order.Total * 0.15m;
        return 0;
    }
}

// Better: move the logic to where the data lives
public class Customer
{
    public decimal GetDiscountRate() =>
        MembershipLevel == "Gold" && YearsActive > 3 ? 0.15m : 0m;
}
```

---

### Other common smells worth knowing

| Smell | Brief description |
|---|---|
| Duplicate code | Same logic copied in multiple places |
| Large class (God object) | One class knows and does everything |
| Long parameter list | Method takes more than 3–4 parameters |
| Dead code | Unreachable or unused code |
| Inappropriate intimacy | Classes too tightly coupled to each other's internals |
