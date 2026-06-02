# L1 — What is the difference between zero-shot and few-shot prompting, and what are the trade-offs?

## Definitions

**Zero-shot prompting** gives the model a task description and input with no worked examples. The model relies solely on its pre-trained knowledge to produce the output.

**Few-shot prompting** includes one or more input–output example pairs (shots) in the prompt before the actual query. These examples demonstrate the expected behavior, format, or reasoning style.

## Side-by-side example

**Zero-shot:**
```
Translate the following English sentence to French.

Sentence: "The meeting is at 3 PM."
Translation:
```

**Few-shot (2-shot):**
```
Translate the following English sentence to French.

Sentence: "Good morning."
Translation: "Bonjour."

Sentence: "I would like a coffee."
Translation: "Je voudrais un café."

Sentence: "The meeting is at 3 PM."
Translation:
```

## Trade-offs

| Dimension | Zero-Shot | Few-Shot |
|---|---|---|
| Token cost | Low — minimal prompt length | Higher — each example adds tokens |
| Latency | Faster (shorter prompt) | Slower (longer prompt to process) |
| Setup effort | Minimal — just write the instruction | Requires curating quality examples |
| Output reliability | Can be ambiguous for niche tasks | More consistent format and style |
| Risk of bias | Model may misinterpret edge cases | Poor or biased examples degrade quality |
| Flexibility | Easy to update — just change instruction | Harder to update — must revise examples too |
| Best for | General, well-known task types | Specialized formats, domain-specific tasks |

## When to choose zero-shot

- The task is standard (sentiment analysis, summarization, translation).
- Token budget or latency is constrained.
- You have no labeled examples to draw from.
- You are prototyping quickly and need a baseline.

## When to choose few-shot

- The task has a specific, non-obvious output format (e.g., structured JSON with custom fields).
- The model consistently misinterprets the task zero-shot.
- You need the model to mimic a domain-specific style (legal, clinical, financial).
- The task involves subtle classification distinctions that benefit from demonstration.

## Practical guideline

Start with zero-shot. If accuracy or format consistency is insufficient, add 2–5 high-quality, diverse examples. For maximum reliability on complex tasks, combine few-shot with chain-of-thought reasoning traces in the examples.

## Key takeaway

Zero-shot is leaner and faster; few-shot is more reliable for specialized or format-sensitive tasks but at the cost of token usage and example curation effort. The optimal choice depends on task complexity, available examples, and production constraints.
