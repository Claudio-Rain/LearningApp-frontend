# L1 — What is chain-of-thought (CoT) prompting and why does it help with complex reasoning?

## What is CoT prompting?

Chain-of-thought prompting instructs the model — through examples or a direct directive — to produce intermediate reasoning steps before arriving at a final answer. Instead of jumping straight to a conclusion, the model "thinks out loud," generating a logical sequence that leads to the answer.

## Two main forms

**1. Few-shot CoT** — examples include the reasoning trace:
```
Q: A store sells apples for $2 each and oranges for $3 each.
   Maria buys 4 apples and 2 oranges. How much does she spend?
A: 4 apples × $2 = $8. 2 oranges × $3 = $6. Total = $8 + $6 = $14.

Q: A store sells pens for $1.50 each and notebooks for $4 each.
   Tom buys 3 pens and 5 notebooks. How much does he spend?
A:
```

**2. Zero-shot CoT** — a reasoning trigger is appended:
```
Q: A store sells pens for $1.50 each and notebooks for $4 each.
   Tom buys 3 pens and 5 notebooks. How much does he spend?
A: Let's think step by step.
```

## Why does CoT help with complex reasoning?

Language models predict the next token. For multi-step problems, the "correct" next token is often an intermediate reasoning step — not the final answer. CoT works because it:

1. **Breaks down complexity**: Forces decomposition of a problem into manageable sub-steps before synthesizing a conclusion.
2. **Reduces reasoning shortcuts**: Without CoT, models often pattern-match to superficially similar training examples and produce plausible-sounding but incorrect answers.
3. **Makes errors visible**: Intermediate steps can be inspected, verified, or corrected — by downstream systems or the model itself.
4. **Improves accuracy on arithmetic, logic, and multi-hop tasks**: Research (Wei et al., 2022) shows significant accuracy gains on benchmarks like GSM8K when CoT is applied.
5. **Enables self-correction**: The model can revisit earlier steps mid-chain if a contradiction is detected.

## When CoT is most effective

- Mathematical word problems
- Multi-hop question answering (reasoning across multiple facts)
- Code generation with logical dependencies
- Planning tasks (scheduling, resource allocation)
- Logical deduction and syllogisms

## Limitations

- Increases token usage and latency.
- Smaller models may not benefit as much or may produce incoherent reasoning chains.
- The chain can contain correct steps that lead to a wrong conclusion (hallucinated reasoning).

## Key takeaway

CoT prompting improves performance on complex reasoning tasks by externalizing the thought process, forcing step-by-step decomposition rather than direct answer prediction. It is most valuable when the task requires multiple logical or arithmetic operations, and when intermediate steps can be verified.
