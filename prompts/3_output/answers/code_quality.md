# Model Answers: Code Quality

---

**Q: What are code quality metrics and why do teams bother measuring them instead of just relying on code reviews?**

> **Bottom line:** Code quality metrics are objective, quantitative measurements of source code properties that reveal maintainability, complexity, and structural health — things that code review alone often misses at scale.

**Elaboration:** Code reviews are subjective and depend on reviewer expertise; two reviewers can pass the same bloated method. Metrics give a consistent, automated signal that doesn't tire out. They also trend over time, so you can see whether a codebase is improving or degrading sprint by sprint. That said, metrics are proxies — a method can score perfectly and still be logically wrong, so they complement rather than replace review.

---

**Q: Name at least five categories of code quality metrics.**

> **Bottom line:** Key categories are complexity (cyclomatic complexity), size (lines of code), coupling (afferent/efferent), inheritance depth (DIT), and maintainability index.

**Elaboration:** Complexity metrics quantify decision paths; size metrics catch bloated methods. Coupling metrics reveal how tightly components depend on each other, which predicts ripple-effect bugs. Inheritance depth tells you how far a class is from the root, affecting how hard it is to reason about behavior. Maintainability index combines several into a single 0–100 score for a quick health check.

---

**Q: What is the difference between a static code metric and a dynamic one?**

> **Bottom line:** Static metrics are derived from source code without running the program; dynamic metrics (like branch coverage) require execution.

**Elaboration:** Static metrics — complexity, coupling, DIT — are fast and can run in a pre-commit hook. Dynamic metrics like code coverage need the test suite to run, so they cost more time but reveal runtime behavior that static analysis cannot. Use static metrics to catch structural problems early and dynamic metrics to validate that tests actually exercise the code you care about.

---

**Q: What is cyclomatic complexity and how is it computed? Walk me through a simple example.**

> **Bottom line:** Cyclomatic complexity counts the number of linearly independent paths through a method; M = E − N + 2P, where E = edges, N = nodes, P = connected components (usually 1).

**Elaboration:** In practice you can count decision points and add 1: each `if`, `else if`, `case`, `&&`, `||`, or loop adds 1. For a method with a single `if` and an `else`, M = 2. This directly maps to the minimum number of test cases needed for full branch coverage.

```csharp
// Cyclomatic complexity = 3
public string Classify(int score)
{
    if (score >= 90) return "A";       // +1
    else if (score >= 75) return "B";  // +1
    else return "C";                   // baseline
}
```

---

**Q: What threshold values for cyclomatic complexity are acceptable, risky, and dangerous?**

> **Bottom line:** 1–10 is low-risk; 11–20 warrants attention; above 20 is high-risk; above 50 is practically untestable.

**Elaboration:** The thresholds come from Thomas McCabe's 1976 paper, which recommended 10 as a practical upper bound per module. Teams sometimes relax to 15 for legitimate cases like state machines. The real value is the conversation it forces — if a method scores 30, that's a sign to ask why. I'd gate CI at 15 and treat anything above 10 as a code-review flag.

---

**Q: What is the maintainability index and what does a score of 20 versus 80 mean?**

> **Bottom line:** The maintainability index is a composite 0–100 score from Halstead volume, cyclomatic complexity, and lines of code — higher is better, with 0–9 meaning difficult to maintain and 85–100 meaning highly maintainable.

**Elaboration:** The original formula is `MI = 171 − 5.2 × ln(HV) − 0.23 × CC − 16.2 × ln(LOC)`, normalized to 0–100 by Visual Studio. A score of 20 means the method is dense and hard to change safely. A score of 80 means it's straightforward and easy to understand. The color bands (red < 10, yellow 10–19, green ≥ 20) are a quick triage tool.

---

**Q: What are the known weaknesses of the maintainability index?**

> **Bottom line:** It can be gamed by adding comments or blank lines, and the Halstead volume component is noisy and not well-validated for modern OO code.

**Elaboration:** A developer can raise a score by adding boilerplate XML doc comments without changing any logic. The metric was calibrated on 1970s–80s code and doesn't account for readability factors like good naming. I treat it as a directional signal — a very low score is a reliable red flag, but a high score is not a certification of quality.

---

**Q: What is class coupling and how does high coupling hurt a codebase?**

> **Bottom line:** Class coupling measures how many other types a class directly depends on; high coupling means changes ripple unpredictably across many other classes.

**Elaboration:** When that number is high, the class is hard to test in isolation and hard to change without breaking downstream consumers. High coupling is the structural cause of the "shotgun surgery" smell — one business change forces edits across a dozen classes. Targeting a maximum of 9–10 unique type dependencies per class is a reasonable heuristic.

---

**Q: What is the difference between afferent coupling (Ca) and efferent coupling (Ce), and what does I = Ce / (Ca + Ce) tell you?**

> **Bottom line:** Ca is the number of types that depend on this component (incoming), Ce is the number it depends on (outgoing), and instability I ranges from 0 (maximally stable) to 1 (maximally unstable).

**Elaboration:** A utility library with Ca = 50 and Ce = 2 has I ≈ 0.04 — many things depend on it, so you must be conservative about changing it. A high-level service with Ca = 1 and Ce = 12 has I ≈ 0.92 — it's volatile and should depend on stable abstractions. The Stable Dependencies Principle says I should decrease as you move toward lower-level components.

---

**Q: What is depth of inheritance (DIT) and what range is healthy?**

> **Bottom line:** DIT counts ancestor classes from a class up to the root; 1–3 is healthy, above 5 is a warning sign, and above 8 is generally too deep.

**Elaboration:** DIT = 1 means a class inherits only from `object`. Each level adds behavior the developer must trace to understand a derived class. Deep hierarchies often indicate that composition was the better design choice — a DIT of 8 usually means an abstract base that tries to serve too many sub-use-cases.

---

**Q: How does high DIT interact with coupling? Give a concrete scenario where DIT of 8 causes a real problem.**

> **Bottom line:** Deep inheritance multiplies coupling because each derived class implicitly depends on every ancestor's implementation details.

**Elaboration:** Imagine `BaseController → AuthController → TenantController → CachedController → LoggingController → AuditController → RateLimitedController → MyController` (DIT = 8). Adding a virtual method to `BaseController` forces you to check whether any of 7 subclass levels override it. A change to caching in level 4 silently breaks audit logging in level 6. The fix is to extract cross-cutting concerns (logging, caching, rate limiting) into middleware or decorators instead of inheritance layers.

---

**Q: Walk me through setting up SonarQube on a new .NET project from zero.**

> **Bottom line:** Install SonarQube, add the SonarScanner for .NET to CI, run begin/build/test/end, configure quality gates, and break the build on failures.

**Elaboration:** Start with `docker run sonarqube` locally or provision a managed instance. In CI: `dotnet sonarscanner begin /k:"project-key" /d:sonar.login=$TOKEN`, then `dotnet build`, then `dotnet test --collect:"XPlat Code Coverage"`, then `dotnet sonarscanner end`. In the SonarQube UI, define a quality gate (e.g., new code: 0 blocker issues, coverage ≥ 80%). Enable the webhook so pull requests are decorated with findings before merge.

---

**Q: How do you configure a ReSharper rule and share it across a team?**

> **Bottom line:** Configure inspections in a `.DotSettings` team-shared file checked into source control, which ReSharper picks up automatically for every developer.

**Elaboration:** In ReSharper options, set the inspection severity, then export the layer as a "Team-shared" `.DotSettings` file at the solution level and commit it. Every developer with ReSharper inherits the rules instantly. For magic numbers, also add a SonarAnalyzer or StyleCop rule as a fallback for developers not running ReSharper.

---

**Q: What is an .editorconfig file and how does it complement StyleCop or ReSharper?**

> **Bottom line:** `.editorconfig` defines editor-agnostic formatting and style rules that IDEs and analyzers enforce at the syntax level, while StyleCop and ReSharper add deeper semantic rules on top.

**Elaboration:** `.editorconfig` is understood by Visual Studio, VS Code, Rider, and the Roslyn compiler (`dotnet format`). Roslyn diagnostic rules like `IDE0011` (add braces) can be set to `error`, causing CI to fail on violations without needing ReSharper. The combination: `.editorconfig` for baseline formatting enforced by the compiler, StyleCop for documentation and ordering, and ReSharper for team-specific semantic inspections.

---

**Q: You inherit a legacy codebase with average cyclomatic complexity of 25. What's your strategy?**

> **Bottom line:** Establish a baseline, add characterization tests to lock current behavior, then refactor incrementally using the boy-scout rule and targeted sprints for the worst offenders.

**Elaboration:** First, run Code Metrics and SonarQube to get a full heat map — the top 10% of methods by complexity usually account for 50%+ of the risk. Write characterization tests against those methods before touching any logic. Then apply the ratchet: set a CI gate that rejects any new method above complexity 10, so the problem can't grow. Refactor the worst methods using extract method, replace conditional with polymorphism, or introduce a strategy pattern.

---

**Q: Why can chasing a low cyclomatic complexity score make code harder to read?**

> **Bottom line:** Mechanically splitting a method to reduce its score can create a swarm of tiny, poorly named helper methods with no conceptual cohesion.

**Elaboration:** Consider a validation method with 12 conditions. Splitting it into 12 single-condition private methods achieves complexity of 1 per method but forces the reader to jump through 12 call sites to understand one validation rule. The goal is reducing cognitive load, not the number itself — if the extraction increases it, the metric is being optimized rather than the code.

---

**Q: What are false positives in static analysis, and when is it acceptable to suppress a warning?**

> **Bottom line:** Suppress with a documented justification when you can write a reason a future maintainer would accept — treat suppression as a deliberate act reviewed like a code change.

**Elaboration:** Legitimate suppression: a cryptographic method intentionally has high complexity; a generated file triggers naming conventions. Illegitimate: silencing a null-dereference warning "because it never happens in practice." Track suppression counts in SonarQube; a rising count is a red flag. Prefer fixing the code or adjusting the rule's scope over blanket suppression.

---

**Q: What goes wrong when you enable every SonarQube rule on a legacy project on day one?**

> **Bottom line:** You get tens of thousands of issues, developers become desensitized (alert fatigue), and critical issues are buried.

**Elaboration:** The better approach is staged rollout: start with only blocker and critical rules for new code using SonarQube's "new code" period. Fix existing blockers in a dedicated sprint. Add major rules in the next iteration. Curate the rule set for your technology and agree on the active profile as a team.

---

**Q: Explain M = E − N + 2P in cyclomatic complexity.**

> **Bottom line:** E is directed edges (transitions), N is nodes (basic blocks), P is connected components (usually 1 per method), and the formula counts independent cycles in the control-flow graph.

**Elaboration:** Each decision statement adds an edge without adding a merge node in the same proportion, increasing E relative to N. For a straight-line method: E = N − 1, so M = 1. Each branch adds exactly 1 to M. The 2P term accounts for entry and exit pseudo-nodes; for a single method P = 1, giving M = E − N + 2.

---

**Q: How does DIP reduce efferent coupling and improve the instability metric?**

> **Bottom line:** DIP moves Ce from volatile concretes to stable interfaces — the numeric Ce stays the same but the real fragility drops dramatically.

**Elaboration:** Before DIP: `OrderService` has Ce = 8 pointing at `SqlOrderRepository`, `SmtpEmailSender`, etc. — all volatile concretes. After DIP: Ce = 8 still, but pointing at `IOrderRepository`, `IEmailSender` — stable abstractions. The concrete implementations can change without recompiling `OrderService`. This is why DIP is the principle most directly responsible for making high-level modules stable in practice.

---

**Q: Should you enforce quality gates in CI (failing builds) or make them advisory warnings?**

> **Bottom line:** CI gates on new-code metrics are better — advisory warnings are universally ignored under delivery pressure; only a failing build creates the forcing function to act.

**Elaboration:** Warnings accrue silently; I've seen codebases with 4,000 unreviewed warnings that developers filter out. A gate on new code complexity > 10 or new critical SonarQube issues = 0 costs almost nothing per PR and catches issues when the author has full context to fix them. Key: scope gates to new code, not the entire legacy baseline, so developers aren't blocked by issues they didn't create.

---

**Q: How do you balance technical debt reduction against shipping features?**

> **Bottom line:** Allocate a fixed percentage of sprint capacity (typically 20%) to debt reduction, and use metrics trend data to frame it as risk reduction for stakeholders.

**Elaboration:** Stakeholders respond to risk language: "our average complexity rose from 12 to 18 over the last quarter; bug rate in those modules is up 40%." The boy-scout rule (leave code cleaner than you found it) handles incremental improvement. Reserve dedicated sprints only for high-severity structural debt that blocks new features or causes repeated production incidents.

---

**Q: How would you design a custom Roslyn analyzer to prevent direct instantiation of a particular service class?**

> **Bottom line:** Implement a `DiagnosticAnalyzer` that registers an `IObjectCreationOperation` action and checks whether the created type matches the forbidden class, then emit a diagnostic.

```csharp
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class ForbiddenInstantiationAnalyzer : DiagnosticAnalyzer
{
    public override void Initialize(AnalysisContext ctx)
    {
        ctx.RegisterOperationAction(Analyze, OperationKind.ObjectCreation);
    }
    private void Analyze(OperationAnalysisContext ctx)
    {
        var op = (IObjectCreationOperation)ctx.Operation;
        if (op.Type?.Name == "ForbiddenService")
            ctx.ReportDiagnostic(Diagnostic.Create(Rule, op.Syntax.GetLocation()));
    }
}
```

---

**Q: Describe how you would implement a quality ratchet in CI.**

> **Bottom line:** A quality ratchet compares the current build's metrics against a stored baseline and fails the build only when values regress — never requiring all existing issues to be fixed upfront.

**Elaboration:** Store the metric snapshot as an artifact after each successful main-branch build. In PR pipelines, compute the same metrics and compare; if any value regresses beyond a tolerance, fail the build. SonarQube's "new code" period implements exactly this for its own metrics. The ratchet turns an overwhelming backlog of 4,000 issues into a simple rule: don't make it worse today, and the trend improves naturally.
