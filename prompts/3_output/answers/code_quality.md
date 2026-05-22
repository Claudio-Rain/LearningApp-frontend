# Interview Answers: Code Quality

---

## Level 1 — Definition & Basics

### Code Quality Fundamentals

**Q: L1 Define code quality and name its key properties.**

> High-quality code is code that works correctly today and is easy to change tomorrow.

Correctness means the code does what it's supposed to do and has tests that prove it. Changeability means the next developer can read it quickly, understand intent, and modify one part without breaking others. Readability, low coupling, high cohesion, and test coverage deliver both.

---

**Q: L1 Name four categories of quality metrics with one example each and what they measure.**

> Quality metrics fall into four main categories: complexity, maintainability, coupling/structure, and test coverage.

Cyclomatic complexity counts execution paths (higher = harder to test). Maintainability Index combines volume, complexity, and size. Class coupling measures inter-class dependencies. Coverage metrics measure code exercised by tests (but not assertion quality).

---

**Q: L1 Why is automated measurement useful over code review alone? What limits does human review have?**

> Automated metrics catch things consistently and at scale that humans miss due to fatigue, bias, and bandwidth.

Humans catch intent and design but miss structural issues consistently. Tools run the same rules every time and flag regressions automatically. Both have blind spots — use code review for design, automation for metrics.

---

### Metrics Basics

**Q: L1 Define cyclomatic complexity, who introduced it, and what the numeric value means.**

> Cyclomatic complexity, introduced by Thomas McCabe in 1976, counts the number of independent paths through a piece of code.

In practice, count 1 for every `if`, `for`, `while`, `case`, `catch`, and `&&`/`||` operator. A method with CC=1 is straight-line code; CC=10 means 10 distinct paths and requires 10+ test cases for branch coverage. Threshold: 10 is acceptable, above 15 is high risk.

```csharp
// CC = 1: straight-line, one path
public decimal CalculateTotal(List<Item> items)
{
    return items.Sum(i => i.Price);
}

// CC = 5: one if, one for, one && counts as 3 paths
public bool IsEligibleForDiscount(User user, Order order)
{
    if (user == null) return false;           // +1 (if)
    if (order.Total < 100) return false;      // +1 (if)
    if (user.IsActive && order.Age > 30)      // +2 (if + &&)
        return true;
    return false;
}

// CC = 8: multiple nested conditions
public string ValidatePayment(Payment p)
{
    if (p == null) return "Invalid";          // +1
    if (p.Amount <= 0) return "Invalid";      // +1
    if (p.CardNumber == null) return "Invalid"; // +1
    if (p.CardNumber.Length != 16) return "Invalid"; // +1
    if (p.Expiry < DateTime.Now) return "Invalid"; // +1
    if (p.CVV == null || p.CVV.Length != 3)  // +2 (if + ||)
        return "Invalid";
    return "Valid";                           // Total: 8 paths
}
```

---

**Q: L1 What is the maintainability index, its value range, and what the scale means?**

> The maintainability index is a composite score from 0 to 100 that estimates how easy a code unit is to maintain, where higher is better.

The formula combines Halstead volume, cyclomatic complexity, and lines of code on a 0–100 scale. Scores 0–9 (red) signal refactoring is needed. Scores 10–19 need attention. Above 20 is maintainable.

---

**Q: L1 Explain afferent and efferent coupling. Why is high coupling a problem?**

> Class coupling measures how many other types a class depends on or is depended upon by, and high coupling makes changes expensive and unpredictable.

Afferent coupling (how many depend on you) indicates blast radius of changes. Efferent coupling (how many you depend on) indicates fragility. High efferent coupling is more dangerous day-to-day because external changes can break your class.

```csharp
// HIGH EFFERENT COUPLING: depends on many classes, fragile
public class OrderService
{
    private IEmailService _email;
    private IPaymentGateway _payment;
    private IInventoryService _inventory;
    private ITaxCalculator _tax;
    private ILogger _logger;
    private IAuditService _audit;
    // If any of these 6 interfaces change, OrderService breaks
}

// HIGH AFFERENT COUPLING: many depend on this class
public class Customer
{
    // Used by: OrderService, InvoiceService, ReportService,
    // ShippingService, MarketingService, AnalyticsService...
    // Changing Customer cascades to 6+ services
}

// BETTER: Stable Abstraction Principle
// New classes depend only on interfaces (stable)
// Old core classes have low efferent coupling
public class OrderService
{
    private IOrderProcessor _processor; // abstraction, not concrete
}
```

---

**Q: L1 What is depth of inheritance? What does DIT=1 vs DIT=8 signify?**

> DIT measures how many ancestor classes a class has, and a high value signals that behavior is spread across a deep chain that's hard to reason about.

DIT=1 is flat and easy to understand. DIT=8 requires tracing through seven levels to understand behavior, making testing hard because you must satisfy all ancestor constructors. Prefer composition over inheritance beyond DIT 3–4.

---

**Q: L1 Is lower cyclomatic complexity always better? When might reducing it harm code?**

> No — blindly reducing cyclomatic complexity can obscure intent and fragment logic into meaningless fragments.

Extracting complex conditionals into many tiny methods (`CheckA()`, `CheckB()`) drives CC down but fragments logic across methods with no clear narrative. Replacing readable `switch` statements with strategy patterns improves metrics but obscures business logic. CC is a heuristic, not a goal—understandable code is.

---

## Level 2 — Core Concepts

### Cyclomatic Complexity

**Q: L2 How does cyclomatic complexity relate to minimum test cases needed for full branch coverage?**

> Cyclomatic complexity equals the minimum number of linearly independent paths, which directly corresponds to the minimum test cases for full branch coverage.

CC directly maps to minimum test cases needed for branch coverage: CC=8 requires at least 8 test cases. A method with CC=25 signals it's doing too much and needs refactoring.

---

**Q: L2 How does high cyclomatic complexity relate to Single Responsibility Principle violations?**

> High cyclomatic complexity is almost always a symptom of an SRP violation — a method handling multiple concerns accumulates branches for each one.

A method handling validation, transformation, persistence, and error handling accumulates branches for each responsibility, driving CC above 10. Decomposing by responsibility brings CC down naturally without artificial fragmentation.

---

### Maintainability Index

**Q: L2 A class has maintainability index of 12 (red zone). What issues would you investigate first?**

> I'd start by looking at method length and cyclomatic complexity, because those are the most actionable levers.

Start with the longest methods—a single 300-line method usually accounts for most of the penalty. Then check class-level: 20+ public methods suggests SRP violation. Finally, look for duplicated logic. The goal is making code understandable in 15 minutes, not hitting a threshold.

---

**Q: L2 What are the maintainability index's known shortcomings and when might it mislead?**

> The MI was calibrated on Fortran and C code, and its formula breaks down for modern object-oriented and functional patterns.

MI penalizes LINQ chains and functional pipelines (Halstead volume counts all operators), and gives no credit for naming, abstractions, or tests. A well-tested 50-line method may score yellow. Use MI as a conversation starter, not a blocker—always look at the code.

---

### Class Coupling & Depth of Inheritance

**Q: L2 Define the instability metric (I = efferent / (afferent + efferent)) and its use in refactoring priority.**

> Instability measures how likely a class is to change when its dependencies change, and pairing it with afferent coupling tells you which unstable classes are also widely used.

I=1.0 (pure efferent) is unstable but low-risk to change; nothing depends on it. I=0.0 (many dependents, no dependencies) is stable and safe to change. The danger zone is high instability + high afferent coupling (widely used but fragile). Use it to find violations of the stable dependencies principle.

---

**Q: L2 Why does high depth of inheritance increase coupling and reduce testability? Give an example.**

> Deep inheritance couples every subclass to all ancestor implementations, making it impossible to test a subclass in isolation.

A `ReportController` at DIT=7 requires satisfying six ancestor constructors in tests (database, HTTP dependencies), forcing full integration setup to test a single method. Any ancestor change can break all descendants unpredictably.

```csharp
// DEEP INHERITANCE (DIT=5): Hard to test
public class Controller { }  // 1
public class ApiController : Controller { }  // 2
public class AuthenticatedController : ApiController { }  // 3
public class TenantAwareController : AuthenticatedController { }  // 4
public class ReportController : TenantAwareController { }  // 5

// Testing ReportController requires:
[Test]
public void GetReport_ShouldReturn200()
{
    // IMPOSSIBLE to test in isolation - need all ancestors' dependencies
    var db = new MockDatabase();
    var auth = new MockAuthService();
    var tenantSvc = new MockTenantService();
    var httpCtx = new MockHttpContext();
    
    var controller = new ReportController(db, auth, tenantSvc, httpCtx);
    // If any ancestor adds a required dependency, test breaks
}

// BETTER: Flat structure with composition
public class ReportController
{
    private readonly IReportService _reports;
    private readonly IAuthService _auth;
    private readonly ITenantContext _tenant;
    
    public ReportController(IReportService reports, IAuthService auth, ITenantContext tenant)
    {
        _reports = reports;
        _auth = auth;
        _tenant = tenant;
    }
    
    public IActionResult GetReport(int id)
    {
        if (!_auth.IsAuthenticated()) return Unauthorized();
        var report = _reports.Get(id, _tenant.CurrentTenant);
        return Ok(report);
    }
}

// Testing is now trivial, explicit dependencies
[Test]
public void GetReport_ShouldReturn200()
{
    var reports = new Mock<IReportService>();
    var auth = new Mock<IAuthService>();
    var tenant = new Mock<ITenantContext>();
    
    reports.Setup(r => r.Get(1, 5)).Returns(new Report { Id = 1 });
    auth.Setup(a => a.IsAuthenticated()).Returns(true);
    tenant.Setup(t => t.CurrentTenant).Returns(5);
    
    var controller = new ReportController(reports.Object, auth.Object, tenant.Object);
    var result = controller.GetReport(1);
    
    Assert.AreEqual(typeof(OkObjectResult), result.GetType());
}
```

---

**Q: L2 How do you distinguish framework-imposed depth of inheritance from design-problem depth?**

> I exclude the framework's own inheritance chain from the DIT count and measure only the depth your team added on top of it.

Subtract framework DIT from the total. Ask: does the chain carry meaningful behavior I'm extending, or just boilerplate? `Controller` → `ApiController` → `ProductsController` is three deep but only one layer is yours. `ApiController` → `AuthenticatedController` → `TenantAwareController` → `ProductsController` is your team's design problem.

---

### Code Smells

**Q: L2 Name five code smells and map each to metrics it affects.**

> Long Method inflates CC, LOC, and volume. Feature Envy shows as high efferent coupling. Data Clumps inflate size and coupling. Deep Inheritance maps to high DIT. Shotgun Surgery appears as high afferent coupling and scattered duplication.

```csharp
// LONG METHOD: bloated, high CC, high LOC
public void ProcessOrder(Order order)
{
    if (order.Items.Count == 0) throw new Exception("Empty");
    decimal total = 0;
    foreach (var item in order.Items)
    {
        if (item.Price < 0) throw new Exception("Invalid price");
        total += item.Price * item.Quantity;
    }
    if (total > 10000) total *= 0.9; // discount logic
    if (order.Customer.IsPremium) total *= 0.95;
    
    var payment = new Payment { Amount = total };
    if (!ValidateCard(payment.Card)) throw new Exception("Invalid card");
    // ... 50 more lines of persistence, email, logging
}

// FEATURE ENVY: method spends more time with another class
public decimal CalculateOrderValue(Order order)
{
    return order.Items.Sum(i => i.Price * i.Quantity) // accessing Items
         + order.Shipping.Cost  // accessing Shipping
         + order.Taxes.Amount;  // accessing Taxes (efferent coupling = 3)
}
// Better: move to Order class: order.GetTotalValue()

// DATA CLUMPS: same fields appear together everywhere
public class OrderProcessor
{
    public void Process(string custName, string custEmail, string custPhone, Order o) { }
}
public class PaymentService
{
    public bool Charge(string custName, string custEmail, string custPhone, decimal amt) { }
}
// Better: extract Customer class, pass single object
```

---

## Level 3 — Practical Usage

### Measuring Metrics

**Q: L3 What inline code quality tools are available in Visual Studio for .NET? How do they complement SonarQube?**

> Roslyn-based analyzers, built-in Code Metrics, and SonarLint provide real-time IDE feedback; SonarQube provides project-wide enforcement and trends.

Built-in Code Analyzers run at compile time with IDE squiggles and quick fixes. 
Access: View → Error List shows all violations. 
Code Metrics: Analyze → Calculate Code Metrics gives per-method CC, MI, coupling, DIT snapshots. 
SonarLint: install from VS Extensions (Tools → Extensions and Updates, search "SonarLint"), then configure SonarQube connection in Tools → Options → SonarLint. 
Together: SonarLint catches issues as you type, SonarQube enforces in CI and tracks trends.

---

**Q: L3 How do you set up SonarQube for C#? Show the workflow and where results appear.**

> You install SonarScanner for .NET, configure a `sonar-project.properties` file or pass properties inline, wrap the build, and metrics appear under the project's Measures tab.

Create the project in SonarQube, get a token, then run: `sonarscanner begin`, `dotnet build`, `sonarscanner end`. The Measures tab shows Complexity, Maintainability, Reliability, Security, Coverage drillable to file/function. Issues shows violations; Activity shows trends for sprint reviews.

---

### Configuring Static Analysis

**Q: L3 What is a Quality Profile? How do you create a custom one with stricter cyclomatic complexity thresholds?**

> A Quality Profile is a named collection of active rules and their parameters, and you create a custom one by copying "Sonar way" and modifying specific rule thresholds.

In SonarQube, go to Quality Profiles, copy "Sonar way", find rule S1541 (CC), change its threshold, and assign the custom profile to your project. Note: it's a fork, not inheritance—updates to "Sonar way" won't automatically apply.

---

### Refactoring for Quality

**Q: L3 Refactor a method with cyclomatic complexity 22, maintainability index 8 without breaking behavior.**

> I'd first add characterization tests to lock in current behavior, then decompose by responsibility, never touching functionality until tests are green.

Write characterization tests first for a safety net. Identify distinct responsibilities in the method. Extract innermost clusters into private methods, run tests after each. Once separated, consider moving to separate classes. Re-run metrics after each change. Target clarity, not metrics—metrics follow.

```csharp
// BEFORE: CC=22, MI=8 (monster method)
public string ProcessOrder(Order order)
{
    if (order == null) return "Invalid order";
    if (order.Items.Count == 0) return "No items";
    
    // Validation responsibility
    foreach (var item in order.Items)
    {
        if (item.Quantity <= 0) return "Bad qty";
        if (item.Price < 0) return "Bad price";
        if (!inventory.HasStock(item.Id, item.Quantity)) return "Out of stock";
    }
    
    // Pricing responsibility
    decimal total = 0;
    foreach (var item in order.Items)
    {
        total += item.Price * item.Quantity;
    }
    
    if (order.Customer.IsVIP) total *= 0.85;
    else if (order.Total > 1000) total *= 0.90;
    else if (order.Items.Count > 10) total *= 0.95;
    
    if (order.HasCoupon) total -= order.CouponAmount;
    
    // Tax responsibility
    decimal tax = 0;
    if (order.Shipping.Country == "US")
        tax = total * 0.08;
    else if (order.Shipping.Country == "CA")
        tax = total * 0.05;
    else if (order.Shipping.Country == "UK")
        tax = total * 0.20;
    
    // Persistence responsibility
    order.Total = total + tax;
    db.Orders.Add(order);
    db.SaveChanges();
    
    // Notification responsibility
    email.SendConfirmation(order);
    if (order.Customer.SubscribedToPromo)
        email.SendPromo(order.Customer);
    
    return "Success";
}

// AFTER: Decomposed by responsibility, each with lower CC
public string ProcessOrder(Order order)
{
    var validation = ValidateOrder(order);
    if (!validation.IsValid) return validation.Error;
    
    var pricing = CalculatePricing(order);
    order.Total = pricing.Total + pricing.Tax;
    
    _repository.Save(order);
    NotifyCustomer(order);
    
    return "Success";
}

private ValidationResult ValidateOrder(Order order)
{
    if (order == null) return ValidationResult.Error("Invalid order");
    if (order.Items.Count == 0) return ValidationResult.Error("No items");
    
    foreach (var item in order.Items)
    {
        if (item.Quantity <= 0) return ValidationResult.Error("Bad qty");
        if (!_inventory.HasStock(item.Id, item.Quantity))
            return ValidationResult.Error("Out of stock");
    }
    return ValidationResult.Success();
}

private PricingResult CalculatePricing(Order order)
{
    decimal total = order.Items.Sum(i => i.Price * i.Quantity);
    total = _discounts.ApplyDiscount(total, order.Customer, order.Items.Count);
    if (order.HasCoupon) total -= order.CouponAmount;
    decimal tax = _taxService.Calculate(total, order.Shipping.Country);
    return new PricingResult { Total = total, Tax = tax };
}

private void NotifyCustomer(Order order)
{
    _email.SendConfirmation(order);
    if (order.Customer.SubscribedToPromo)
        _email.SendPromo(order.Customer);
}
// Now: CC~3 per method, clear intent, testable in isolation
```

---

**Q: L3 Legacy codebase with depth of inheritance 9, coupling 47. How do you prioritize improvements?**

> I'd start with the classes that are both high-coupling and on the critical path of current feature work, not the worst numbers overall.

Don't refactor the worst metrics in isolation—prioritize classes that change frequently and have high coupling. Cross-reference metrics with git log and incident history. Focus on high-afferent-coupling classes (central nodes) for maximum leverage. In the first quarter, establish a trend and prevent regression in new code.

---

## Level 4 — Common Pitfalls

### Tool Misconfiguration

**Q: L4 CI shows 0 coverage despite tests passing locally. What are three likely causes and how do you diagnose?**

> The three most likely causes are missing coverage report paths, the wrong coverage format, and tests not running before the SonarScanner end command.

Check: (1) coverage report is generated in CI at expected path; (2) format is OpenCover or Cobertura XML, not binary `.coverage`; (3) command order is correct: `sonarscanner end` after tests; (4) test project isn't excluded by SonarQube patterns.

---

**Q: L4 Enabling StyleCop creates 4,000 warnings. What's the right strategy?**

> Triage rules by value and risk, suppress pre-existing violations as a baseline, and enforce rules only on new code going forward.

Categorize warnings: cosmetic (documentation, spacing) vs substantive (unused variables, null refs). Disable cosmetic rules that don't fit your team. Suppress existing violations as a baseline, then enforce rules only on new code. Chip away at the baseline in refactoring sprints.

---

**Q: L4 A dev suppresses 30 warnings in one file. How do you handle it and prevent it?**

> I'd reject the PR as-is, require each suppression to have a justification comment, and look at why 30 warnings exist in a single file.

Thirty suppressions signal the file needs refactoring, not silencing. In review, ask the developer to justify each—most aren't legitimate. Prevent with a Roslyn analyzer or SonarQube's S1309 rule that requires justification comments.

---

### Metric Misinterpretation

**Q: L4 Should generated files be in quality gates? How do you exclude them in SonarQube?**

> Generated code should be excluded from quality gates because the metrics measure problems you can fix, and you can't fix generated output.

Generated code pollutes baselines and hides real regressions. Exclude in SonarQube via Analysis Scope → Excluded Files with patterns like `**/*.g.cs`. Use separate `sonar.coverage.exclusions` for coverage. Name generated files with `.g.cs` or `.generated.cs` suffix.

---

**Q: L4 Average cyclomatic complexity drops but code isn't better. What two mechanisms explain this?**

> The average can drop by deleting or hiding complex code, or by adding a large volume of trivially simple new code that pulls the average down.

Developers extract complex logic into private methods (numbers improve, complexity stays). Adding many simple classes pulls the average down without touching complex methods. Watch the distribution and worst-case tail, not just the average. Correlate metrics with defect rates to validate improvement.

---

**Q: L4 95% code coverage but methods still flagged as high-risk. Why is coverage a poor proxy? What additional metrics help?**

> Coverage tells you which lines were executed, not whether the tests actually assert correct behavior — you can have 100% coverage with zero meaningful assertions.

A test calling every method with no assertions has perfect coverage and zero quality. 95% line coverage may miss critical error-handling paths (5% of lines, 80% of incidents). Complement coverage with mutation testing to verify tests catch bugs. Pair with cognitive complexity and incident analysis.

---

### Refactoring Pitfalls

**Q: L4 Colleague says splitting into 12 methods made code harder. How do you evaluate the refactoring?**

> The refactoring was worthwhile if each extracted method has a name that communicates intent and can be understood independently — if you need to read all 12 to understand any one of them, it wasn't.

Can a developer read the high-level method without reading the extracted methods? If names describe behavior (`ValidatePaymentDetails`, `ApplyDiscountPolicy`) and each is cohesive, the split improves readability. If named `DoStep1` or `ProcessPart2`, it's mechanical. Check testability: can you test extracted methods independently?

---

**Q: L4 What is shotgun surgery? How can strict rules accidentally encourage it?**

> Shotgun surgery is when one logical change requires edits in many unrelated classes, and static analysis can induce it by forcing developers to touch every class that uses a pattern rather than fixing the root abstraction.

A rule requiring parameter validation creates 40 boilerplate copies across 15 classes. Technically compliant, but changes require shotgun surgery. The tool enforced local pattern without rewarding the shared validation abstraction. Pair static analysis with architectural guidance to fix root causes, not symptoms.

---

## Level 5 — Internals & Deep Mechanics

### How Static Analyzers Work

**Q: L5 How do Roslyn analyzers work? Define syntax tree, semantic model, and diagnostic.**

> A Roslyn analyzer registers for syntax or semantic events on the compilation, inspects the tree or model, and emits a diagnostic if a rule is violated.

The syntax tree is the structural representation (tokens, keywords, punctuation). The semantic model adds meaning (types, symbol references). An analyzer registers callbacks for syntax nodes, checks syntax and semantic properties, and emits `Diagnostic` objects which Roslyn surfaces as IDE squiggles or CI build errors.

---

**Q: L5 How does cognitive complexity differ from cyclomatic complexity? Which nesting constructs are penalized more heavily?**

> Cognitive complexity penalizes nesting depth with increasing weight, while cyclomatic complexity counts all branches equally regardless of where they appear.

Cyclomatic complexity counts all branches equally. Cognitive complexity weights nesting (nesting adds incremental cost). Cognitive complexity better predicts readability difficulty; cyclomatic better predicts test case requirements.

```csharp
// SAME CYCLOMATIC COMPLEXITY, DIFFERENT COGNITIVE COMPLEXITY
// CC = 4, but cognitive differs

// Flat: cognitive = 4 (easy to read, one concern per line)
public bool IsValid(User u, Order o)
{
    if (u == null) return false;              // +1
    if (o == null) return false;              // +1
    if (u.IsActive == false) return false;    // +1
    if (o.Total > 0) return true;             // +1
    return false;
}

// Nested: CC = 4, but cognitive = 7 (harder to track state)
public bool IsValid(User u, Order o)
{
    if (u != null)                            // +1
    {
        if (u.IsActive)                       // +2 (nesting adds cost)
        {
            if (o != null)                    // +3 (deeper nesting)
            {
                if (o.Total > 0)              // +4
                    return true;
            }
        }
    }
    return false;
}
// Cognitive complexity = 10; CC = 4
// Nesting makes it harder to hold in mind simultaneously
```

---

### Writing Custom Rules

**Q: L5 Write a Roslyn analyzer flagging public methods with >4 params. Interfaces and pattern?**

> You inherit `DiagnosticAnalyzer`, register for `MethodDeclaration` syntax nodes, and emit a diagnostic if the parameter count exceeds 4 and the method is public.

Inherit `DiagnosticAnalyzer`. In `Initialize`, register a syntax node action for `MethodDeclaration`. In the action, check parameter count > 4 and public visibility. If both true, call `context.ReportDiagnostic(Diagnostic.Create(Rule, node.GetLocation()))`.

```csharp
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class TooManyParametersAnalyzer : DiagnosticAnalyzer
{
    public static readonly DiagnosticDescriptor Rule = new(
        "CQ001", "Too many parameters",
        "Method '{0}' has {1} parameters; max is 4.",
        "Design", DiagnosticSeverity.Warning, isEnabledByDefault: true);

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => ImmutableArray.Create(Rule);

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(Analyze, SyntaxKind.MethodDeclaration);
    }

    private static void Analyze(SyntaxNodeAnalysisContext context)
    {
        var method = (MethodDeclarationSyntax)context.Node;
        if (method.ParameterList.Parameters.Count <= 4) return;
        if (!method.Modifiers.Any(SyntaxKind.PublicKeyword)) return;

        context.ReportDiagnostic(Diagnostic.Create(Rule,
            method.Identifier.GetLocation(),
            method.Identifier.Text,
            method.ParameterList.Parameters.Count));
    }
}
```

---

**Q: L5 Add a custom rule to SonarQube for C#. What are prerequisites and steps?**

> You build a Java plugin that implements SonarQube's plugin API, defines a rule with metadata, and uses a Roslyn analyzer (packaged as a NuGet) as the actual analysis engine via the SonarQube C# plugin bridge.

Write a Roslyn analyzer, package as NuGet, then write a thin Java plugin registering rule metadata. SonarQube's C# plugin invokes the analyzer and maps diagnostics to issues. Prerequisites: Java SDK, Maven, sonar-packaging-maven-plugin, sonar-csharp-plugin. More complex than standalone analyzers—only needed for SonarQube UI integration.

---

**Q: L5 When is a custom rule justified vs architecture or code generation?**

> Write a custom rule when the constraint is structural and can't be enforced by the type system or code generation — otherwise, make the wrong thing impossible by design.

Enforce via architecture when possible (DI container checks). Use analyzers for constraints hard to enforce architecturally (e.g., `ISystemClock` usage). Use code generation for boilerplate. Custom rules have maintenance costs—only if they catch real bugs.

---

### Technical Debt

**Q: L5 SonarQube shows 47 days debt; stakeholder wants <5 days. What's wrong and how do you reframe?**

> The 47-day estimate is based on arbitrary remediation time assumptions, and cutting it to 5 days in one release would require either cosmetic fixes that don't reduce real risk or disabling rules.

Debt estimates multiply violations by fixed constants not calibrated to your codebase. You can reduce 47 days to 5 by adding documentation without reducing risk. Reframe: focus on violations correlating with incidents. Attack critical/blocker debt first; tackle style debt over sprints.

---

**Q: L5 How does SonarQube calculate debt? What SQALE assumptions can break down?**

> SQALE assigns a fixed time cost to each rule violation and sums them up, assuming remediating any violation is independent and takes a predictable, uniform amount of time.

SQALE assumes each violation costs the same remediation time regardless of context. In reality, one violation takes 5 minutes in greenfield code, two weeks in legacy code. SQALE also assumes violations are independent; 100 violations in one class might be fixed in one refactoring, not 100 separate fixes. Breaks down when violations cluster in architecturally constrained code.

---

## Level 6 — Trade-offs & Design Decisions

### Policy & Process Design

**Q: L6 Should enforcement be at commit, merge, or IDE? What are the failure modes?**

> All three layers have value and different failure modes — IDE for fast feedback, CI gate for enforcement, pre-commit as optional middle ground.

IDE warnings are fast but ignored under pressure. Pre-commit hooks get skipped with `--no-verify`. CI gates fail late. Recommend: aggressive IDE/SonarLint feedback, fast CI gate (under 5min) blocking on critical rules, pre-commit only for millisecond checks.

---

**Q: L6 Shared `.editorconfig` and profile across 20 teams (.NET, Python, TypeScript). Governance model?**

> I'd recommend a federated model: a platform team owns the baseline, and language guilds own language-specific rules, with a documented exception process.

Centralized: bottleneck and lack domain knowledge. Decentralized: no consistency. Federated: platform team defines non-overridable baseline, language guilds own language-specific rules. Risk: SonarQube inheritance is one-level; keeping 20 profiles synced requires automation.

---

**Q: L6 Roll out stricter gates on legacy code without blocking work. "New code" vs "all code" strategy?**

> Apply the new-code gate immediately to enforce quality going forward, and treat existing violations as bounded technical debt with a dedicated paydown plan.

Use "new code" gates for legacy codebases: new code passes strict rules, existing code is tracked but doesn't block. Stops regression without blocking features. Use "all code" gates for new projects or after debt paydown. Risk: teams avoid refactoring old code; pair with refactoring sprints that relax gates on targeted files.

---

**Q: L6 Engineer says code review alone is enough, tools have too many false positives. How do you respond with data?**

> Human review and static analysis are complementary, and the research shows that even experienced reviewers consistently miss the classes of issues automated tools catch.

Empirical data: research shows metrics predict defect density better than human review alone. Operational: incidents cluster in high-complexity, high-coupling files. False positives exist, but configuration reduces them. A well-tuned SonarQube has <10% false positive rate—the 80% of real issues caught justify it.

---

### Metrics as Leading Indicators

**Q: L6 Which metrics best predict bug density (per research)? How do you prioritize refactoring?**

> Change frequency combined with complexity and coupling is more predictive than any single metric — files that change often and have high complexity are where bugs live.

No single metric predicts defects universally, but combinations of complexity, coupling, and churn do. Join git change frequency with CC and efferent coupling; files in the top quartile on all three are highest-risk. This filters stable complex code and focuses on actively changing complex code.

---

**Q: L6 Single metrics can be gamed. How do you design a harder-to-game quality score?**

> Use a composite score with multiple independent dimensions, and track behavioral outcomes (defect rates, change failure rate) as a sanity check on the composite.

Composite scores are harder to game: improving one dimension usually worsens another. Include outcome metrics (defect rate) as a sanity check. Weight metrics by empirical correlation with defects in your codebase, recalibrated annually. This makes the score meaningful to the team.

---

**Q: L6 How do you measure if improvements reduced defects? What confounds the attribution?**

> You need a controlled comparison — a before/after on the same modules, ideally with a control group of modules not touched by the initiative.

Confounds: personnel changes, product complexity changes, testing improvements. Without a control group, attribution is unclear. Quasi-experimental design: pick ten high-risk modules to refactor, leave ten untouched, compare defect rates. Track leading (metrics) and lagging (defect) indicators separately; be explicit that causal links are probabilistic.

---

## Level 7 — Advanced & Expert

### Custom Tooling & Ecosystem Integration

**Q: L7 Design enforcement for 50 .NET microservices: balance team autonomy with global rules.**

> Use SonarQube's profile inheritance for global rules, per-service `.editorconfig` overrides within bounded permissions, and a tracked exception registry for justified deviations.

Root Quality Profile with non-overridable security and critical complexity rules. Service teams inherit and can tighten (not loosen). Global `.editorconfig` at monorepo root; per-service files add stricter rules. Exceptions require ticket approval and annotated suppressions. Weekly CI job audits suppressions.

---

**Q: L7 Build a time-series dashboard tracking cyclomatic complexity, maintainability index, and coupling with anomaly alerts.**

> Export SonarQube metrics via its Web API on each build, store in a time-series database, and apply a simple statistical anomaly model with alerting.

Export SonarQube metrics via REST API to InfluxDB/TimescaleDB per build. Visualize in Grafana. For anomaly detection, use Z-score: alert if CC deviates >2 std devs from 30-day moving average. Alert on delta (change), not absolute value. Link alerts to SonarQube file-level view.

---

**Q: L7 Good metrics but 60% of incidents. How do you investigate and what to add?**

> Good static metrics and high incident rates indicate the bugs are behavioral, not structural — I'd look at test quality, concurrency, external dependencies, and domain complexity.

Categorize incident root causes: logic errors, concurrency, integration, or performance. Static metrics miss concurrency (CC=3 can have race conditions). Add mutation testing to assess test quality. Add distributed tracing. Look at domain complexity (table-driven logic, configuration). Check deployment frequency—frequent deploys = more regression opportunities.

---

### Analyzer Internals & Extensibility

**Q: L7 Distinguish analyzer, source generator, and code fix. How do they work together?**

> An analyzer detects problems, a source generator produces code automatically, and a code fix provider offers IDE-triggered repairs — together they form a self-correcting code quality loop.

Example: ensure repository classes implement `IDisposable` for `DbConnection` fields. Analyzer detects and emits diagnostic. Code fix provider offers "Implement IDisposable" in IDE lightbulb. Source generator automatically produces implementation via `[Repository]` attribute, making the issue impossible. Together: generator prevents, analyzer catches old code, code fix accelerates remediation.

---

### Strategic & Organizational

**Q: L7 When is deliberately carrying tech debt rational? How do you keep it explicit and bounded?**

> Deliberate debt is rational when the uncertain future value of clean code exceeds the known short-term cost of carrying debt — but it must be documented, bounded, and revisited.

Conditions: low change frequency, not critical path, concrete payoff plan. Failure mode: "deliberate" debt becomes accidental when teams move on. Create debt records (ADR or ticket) with decision, expected cost, trigger, and owner. Link to code. Review in quarterly planning. Without documentation, trigger, and owner, it's just rationalization.

---

**Q: L7 As first developer-experience engineer in 200-person org, plan your first 90 days for quality tooling.**

> Days 1–30 are listening and measuring, days 31–60 are finding quick wins that demonstrate value, and days 61–90 are proposing a federated governance model with evidence behind it.

Days 1–30: Run SonarQube, interview teams, map inconsistencies, find leaders already doing quality well. Days 31–60: Pick quick wins (SonarLint uniformity, eliminate top 3 security issues) for visibility and credibility. Days 61–90: Propose federated governance. Use bottom-up buy-in: engage team leads before mandating from executives.

---

**Q: L7 Choose three metrics to predict maintainability and defect rates org-wide. Weights and why?**

> I'd choose change coupling (churn × complexity), efferent coupling, and mutation score — weighted roughly 40/35/25.

Change coupling (CC × frequency): 40% — most validated defect predictor. Efferent coupling: 35% — measures fragility and blast radius. Mutation score: 25% — honest measure of test effectiveness. Weight churn-complexity highest because it's actionable: it tells you exactly which files need refactoring.
