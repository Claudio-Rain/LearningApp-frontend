# L3 How do you evaluate and test prompt quality systematically — what metrics or frameworks do you use?

## Answer

Ad-hoc testing ("it looks good") doesn't scale. Systematic prompt evaluation treats prompts as software: versioned, tested against a fixed dataset, and measured by defined metrics.

### Step 1 — Build a golden dataset

A curated set of inputs with known-good expected outputs covering:
- **Happy path** — typical, well-formed inputs
- **Edge cases** — empty input, ambiguous phrasing, boundary values
- **Adversarial** — inputs designed to expose failure modes

Aim for at least 50–100 examples. The dataset must be held fixed across evaluations so comparisons are meaningful.

### Step 2 — Choose metrics by task type

| Task type | Metric |
|---|---|
| Classification | Accuracy, F1, precision, recall |
| Extraction | Exact match, partial match, token-level F1 |
| Summarization | ROUGE-L, BERTScore |
| Open-ended generation | Human preference rating, LLM-as-judge score |
| Structured output | Schema validation pass rate |

### Step 3 — LLM-as-judge (scalable human-quality evaluation)

Use a strong model to score outputs automatically:

```
System: You are an expert evaluator.

User:
Question: {question}
Reference answer: {reference}
Model answer: {output}

Rate the model answer:
- Correctness (1–5): does it answer the question accurately?
- Completeness (1–5): does it cover all required points?

Return JSON: { "correctness": N, "completeness": N, "reasoning": "..." }
```

Validate the judge against human labels on a sample (≥20 examples) to check calibration before using at scale.

### Step 4 — Iterate and compare

```python
# Pseudocode for a prompt evaluation loop
baseline_score = evaluate(baseline_prompt, golden_dataset)
new_score      = evaluate(modified_prompt, golden_dataset)

if new_score > baseline_score + MIN_IMPROVEMENT:
    accept_change()
    update_baseline(modified_prompt, new_score)
else:
    reject_change()
```

Always compare on the same dataset. Accept a change only if improvement is statistically meaningful (not just noise).

### Step 5 — Regression prevention in CI

```yaml
# CI step: fail if prompt quality drops below threshold
- name: Evaluate prompt quality
  run: python eval/run_eval.py --threshold 0.82
  # Returns exit code 1 if score < 0.82, blocking the merge
```

### Tooling options

| Tool | Strength |
|---|---|
| **LangSmith** | Dataset management, tracing, LLM-as-judge |
| **Braintrust** | Prompt versioning + scoring |
| **PromptFlow** (Azure) | Pipeline orchestration + eval |
| **Custom scripts** | Full control; store results in a DB for trending |

### Key principle

A prompt that passes manual testing but fails on 15% of the eval set is not ready for production. Systematic eval surfaces those failure modes before users do.
