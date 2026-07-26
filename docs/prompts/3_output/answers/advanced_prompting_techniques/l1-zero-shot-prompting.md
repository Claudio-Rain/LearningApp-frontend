# L1 — What is zero-shot prompting and when would you use it over other prompting strategies?

## Definition

Zero-shot prompting means giving a model a task instruction with no examples — you rely entirely on the model's pre-trained knowledge and instruction-following capability to produce the desired output.

```
Prompt: "Classify the sentiment of the following review as Positive, Neutral, or Negative.

Review: 'The delivery was late but the product works great.'

Sentiment:"
```

The model answers without ever seeing a labeled example.

## When to prefer zero-shot

| Situation | Why zero-shot fits |
|---|---|
| Task is well-defined and common in training data | The model already "knows" how to do it |
| Low latency / cost budget | No extra tokens for examples |
| Fast prototyping | Get a baseline answer before investing in examples |
| Output format is simple (yes/no, short label) | Less ambiguity means less guidance needed |
| Proprietary / sensitive data that cannot appear in examples | Avoids leaking data in the prompt |

## When to move away from zero-shot

- The task is domain-specific or unusual — use **few-shot**.
- The model produces inconsistent output formats — use explicit format instructions or few-shot.
- The task requires multi-step reasoning — use **chain-of-thought**.
- Accuracy is consistently below threshold — use **fine-tuning** or RAG.

## Handling complex context with zero-shot

For tasks with complex context (long documents, multi-domain inputs), zero-shot remains viable if:

1. The instruction is highly specific and unambiguous.
2. The output format is explicitly declared (e.g., "Respond only in JSON with keys: summary, sentiment, action_items").
3. A role assignment is added to activate relevant knowledge.

```
You are a senior financial analyst. Read the following earnings report and extract:
1. Revenue figures (current quarter vs. prior year)
2. Key risks mentioned by management
3. Guidance for next quarter

Respond in structured JSON.

[EARNINGS REPORT TEXT HERE]
```

## Efficiency angle

Zero-shot keeps prompts short, directly reducing token consumption and latency. For high-volume pipelines — e.g., classifying thousands of support tickets per minute — the difference between a 50-token zero-shot prompt and a 400-token few-shot prompt compounds significantly. Start zero-shot, measure quality, and escalate only when the quality gap justifies the cost.

## Summary

| | Zero-shot | Few-shot | CoT |
|---|---|---|---|
| Token cost | Low | Medium–High | Medium–High |
| Setup effort | Minimal | Requires examples | Requires reasoning traces |
| Best for | General tasks | Specialized formats | Complex reasoning |
| Risk | Output ambiguity | Example quality bias | Verbosity / latency |

Zero-shot prompting is the right default when the task is general enough for the model's training to cover it and when efficiency (latency, tokens, setup cost) matters.
