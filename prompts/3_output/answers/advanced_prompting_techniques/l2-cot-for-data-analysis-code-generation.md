# L2 Chain-of-Thought for Data Analysis and Code Generation

## Question
How would you apply chain-of-thought prompting to increase the accuracy of a model performing multi-step data analysis or code generation?

## Answer

### Why CoT matters for data analysis and code generation

Both data analysis and code generation are inherently multi-step tasks. A model that jumps directly to a final answer or code block without reasoning through the problem is more likely to:
- Miss edge cases
- Make off-by-one errors or incorrect aggregations
- Produce syntactically valid but logically wrong code

Chain-of-thought forces the model to plan, decompose, and reason explicitly before committing to a final output.

---

### Applying CoT to Multi-Step Data Analysis

**Pattern**: Ask the model to reason about the data structure, what transformations are needed, and what the expected output looks like — before producing the analysis.

**Example prompt:**
```
You are a data analyst. I have a CSV dataset with columns: 
[user_id, purchase_date, product_category, amount].

Task: Find the top 3 product categories by total revenue for the last 30 days.

Think step by step before writing any code:
1. What filtering is needed?
2. What grouping and aggregation is required?
3. What sorting and limiting operation is needed?
4. Then write the Python/pandas code.
```

**Model reasoning (CoT output):**
```
Step 1: Filter rows where purchase_date >= today - 30 days.
Step 2: Group by product_category and sum the amount column.
Step 3: Sort descending by total amount and take the top 3.
Step 4: Code:

import pandas as pd
from datetime import datetime, timedelta

df = pd.read_csv('data.csv', parse_dates=['purchase_date'])
cutoff = datetime.now() - timedelta(days=30)
recent = df[df['purchase_date'] >= cutoff]
top3 = (recent.groupby('product_category')['amount']
        .sum()
        .sort_values(ascending=False)
        .head(3))
print(top3)
```

---

### Applying CoT to Code Generation

**Pattern**: Instruct the model to outline the algorithm and data structures before writing code. This prevents "code first, think later" errors.

**Example prompt (no language specified — this is a general pattern):**
```
Write a function that finds all pairs of integers in an array that sum to a target value.

Before writing code, reason through:
- What data structure minimizes lookup time?
- What is the time and space complexity of your approach?
- How do you handle duplicates?

Then write the implementation.
```

**Example prompt with C# code:**
```
Write a C# function that finds all pairs of integers in an array that sum to a target value.

Think step by step before writing the code.
```

**Model reasoning + C# output:**
```
Step 1: Use a HashSet to store visited numbers for O(1) lookup.
Step 2: For each number n, check if (target - n) exists in the set.
Step 3: To avoid duplicate pairs, track which pairs have been recorded.

public static List<(int, int)> FindPairs(int[] nums, int target)
{
    var seen = new HashSet<int>();
    var result = new List<(int, int)>();
    var recorded = new HashSet<string>();

    foreach (var n in nums)
    {
        int complement = target - n;
        if (seen.Contains(complement))
        {
            var key = $"{Math.Min(n, complement)},{Math.Max(n, complement)}";
            if (recorded.Add(key))
                result.Add((complement, n));
        }
        seen.Add(n);
    }
    return result;
}
```

---

### Best practices for CoT in code generation

1. **Separate reasoning from code**: Ask the model to produce the reasoning trace first, then the implementation. This prevents the reasoning from being contaminated by premature code decisions.

2. **Specify constraints explicitly**: Time complexity, memory limits, edge cases. CoT reasoning about constraints leads to better algorithm choices.

3. **Use few-shot CoT for domain-specific patterns**: Provide 1–2 examples that show the reasoning + code pattern you want (e.g., LINQ-style, async/await, specific design patterns).

4. **Validate outputs programmatically**: CoT improves but does not guarantee correctness. Always run generated code against test cases.

5. **Chain CoT steps in pipelines**: For complex features, use a pipeline where:
   - Step 1 prompt: Reason about the architecture and class design.
   - Step 2 prompt: Write the implementation based on Step 1's plan.
   - Step 3 prompt: Write unit tests for the implementation.

---

### Key takeaway

CoT prompting improves data analysis and code generation by forcing the model to plan before executing — catching logical errors, wrong assumptions, and edge cases before they manifest in the final output. The most effective pattern is to explicitly ask for the reasoning trace first, then the implementation, and to validate the output against test cases or known results.
