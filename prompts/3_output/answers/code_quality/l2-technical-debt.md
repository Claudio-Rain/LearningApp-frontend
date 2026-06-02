# L2 What is technical debt, how do you quantify it, and how do you decide when to pay it down?

## Answer

**Technical debt** is the implied cost of rework caused by choosing an easier, faster solution now instead of a better approach that would take longer. Like financial debt, it accrues "interest" — the longer it stays, the more expensive future changes become.

### Types of technical debt

| Type | Description | Example |
|---|---|---|
| Deliberate / reckless | Knowingly cut corners | "Ship it now, refactor later" |
| Deliberate / prudent | Conscious trade-off with a plan | "Quick MVP, proper design post-launch" |
| Inadvertent | Didn't know better at the time | Poor design from inexperience |
| Bit rot | Codebase drifts from best practices over time | Old dependencies, outdated patterns |

### How to quantify it

**SonarQube** is the most common tool — it assigns a "remediation effort" in person-hours to each issue based on configured rules:

```
Technical Debt Ratio = Remediation Cost / Development Cost
```

A ratio above 5% is considered high risk. SonarQube displays this as the **SQALE rating** (A–E).

Other signals used to estimate debt:
- Cyclomatic complexity hotspots
- Test coverage gaps (uncovered code = hidden debt)
- Number of code smells / duplications
- Time spent on bug fixes vs. features (high ratio = high debt)

### When to pay it down

Use a **cost-benefit decision**:

1. **Pay immediately** if the debt is in a file/module you're actively changing — "Boy Scout Rule" (leave code better than you found it)
2. **Schedule it** if it's causing measurable slowdowns (feature development taking 2× longer than expected)
3. **Tolerate it** if it's in stable, rarely-touched code with low risk of change

A practical heuristic: if a bug or feature in an area takes more than 20–30% longer than expected because of existing mess, that area has crossed the threshold where paying down debt yields immediate return.

### Making it visible

```
// Track debt explicitly in backlogs:
// - "Tech Debt" label on tickets
// - Allocate 20% of each sprint to debt reduction
// - Debt items appear on the team radar / tech radar
```

Never let debt be invisible — if it's not tracked, it won't be prioritized.
