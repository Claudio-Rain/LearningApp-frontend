# Interview Questions: Advanced Prompting Techniques for Generative AI

## Coverage map

| Item | Type | Level |
|---|---|---|
| Zero-shot prompting | `[FROM JD]` | 1–3 |
| Few-shot prompting | `[FROM JD]` | 1–3 |
| Chain-of-thought (CoT) prompting | `[FROM JD]` | 2–5 |
| Complex context management | `[FROM JD]` | 3–6 |
| Prompt efficiency & token optimization | `[FROM JD]` | 4–6 |
| Reasoning vs. instruction tradeoffs | `[INFERRED]` | 5–7 |
| Self-consistency & ensemble prompting | `[INFERRED]` | 5–6 |
| ReAct & tool-augmented prompting | `[INFERRED]` | 5–7 |
| Prompt injection & security | `[INFERRED]` | 4–5 |
| System prompt vs. user prompt roles | `[INFERRED]` | 2–4 |
| Temperature & sampling controls | `[INFERRED]` | 3–5 |
| Prompt chaining & orchestration | `[INFERRED]` | 4–6 |
| Evaluation & regression of prompts | `[INFERRED]` | 6–7 |
| Model-specific quirks & adaptation | `[INFERRED]` | 6–7 |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate has a working vocabulary and can distinguish fundamental concepts._

### Prompting Fundamentals
- ❓ What is prompt engineering, and why does it matter when working with large language models? `[FROM JD]`
- ❓ How would you define zero-shot prompting, and in what situations would you reach for it first? `[FROM JD]`
- ❓ What is the difference between a zero-shot and a few-shot prompt? When does adding examples help, and when might it hurt? `[FROM JD]`
- ❓ What do the terms "system prompt" and "user prompt" mean in a chat-style API, and why does that separation exist? `[INFERRED]`
- ❓ **Trade-off:** A teammate says "just write longer, more detailed prompts to get better results." Do you agree? What are the costs of that approach? `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Verify the candidate understands the mechanics behind major techniques and can explain them clearly._

### Chain-of-Thought & Reasoning
- ❓ What is chain-of-thought (CoT) prompting, and what property of transformer models does it exploit? `[FROM JD]`
- ❓ How does zero-shot CoT (e.g., appending "Let's think step by step") differ from few-shot CoT, and when would you prefer each? `[FROM JD]`
- ❓ Why can forcing a model to reason step-by-step before producing a final answer improve accuracy on multi-step problems? `[FROM JD]`

### Instruction & Role Framing
- ❓ How does framing a system prompt with a specific role or persona (e.g., "You are a senior security auditor") affect model output quality and style? `[INFERRED]`
- ❓ **Trade-off:** Role-prompting can improve output specificity but also introduce unwanted biases or hallucinations. How do you balance those risks? `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Assess whether the candidate can translate techniques into real workflows and production scenarios._

### Applying Techniques to Real Tasks
- ❓ Walk me through how you would prompt a model to summarize a 10,000-word technical document when the model's context window is 4,096 tokens. `[FROM JD]`
- ❓ You need the model to extract structured JSON from unstructured customer feedback. Describe your prompt design step by step. `[FROM JD]`
- ❓ When would you use few-shot examples inside the prompt versus fine-tuning the model? What factors drive that decision? `[FROM JD]`
- ❓ How do temperature and top-p sampling settings interact with prompting strategy? Give a concrete example where mismatched settings undermine a well-designed prompt. `[INFERRED]`
- ❓ **Trade-off:** Adding many few-shot examples improves in-context learning but increases latency and cost. How do you decide how many examples are "enough"? `[INFERRED]`

### Debugging Scenario
- ❓ A model consistently produces outputs that are too verbose despite instructions to "be concise." Walk me through your debugging process — how would you identify and fix this with prompt changes alone? `[INFERRED]`

---

## Level 4 — Common Pitfalls
_Goal: Probe awareness of failure modes, security issues, and subtle bugs that only emerge in production._

### Failure Modes
- ❓ What is prompt leakage, and how does it manifest in a deployed chat application? How would you mitigate it? `[INFERRED]`
- ❓ What is prompt injection, and how can an adversarial user exploit it in a system that passes user text directly into a prompt template? `[INFERRED]`
- ❓ Describe a scenario where chain-of-thought prompting makes things worse. What properties of the task cause CoT to fail or hallucinate? `[FROM JD]`
- ❓ Why do LLMs sometimes "ignore" instructions placed early in a long prompt? What is the "lost in the middle" phenomenon, and how do you design around it? `[INFERRED]`
- ❓ **Trade-off:** Strict output format constraints (e.g., "respond only in JSON") can break the model's reasoning flow. How do you get structured output without sacrificing reasoning quality? `[INFERRED]`

### Debugging Scenario
- ❓ You deploy a prompt to production and it works well, but after the model provider silently updates the underlying model, your outputs degrade. What processes would you put in place to catch and recover from this? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Separate candidates who have surface knowledge from those who understand why techniques work at a mechanistic level._

### How Transformers Process Prompts
- ❓ At an attention-mechanism level, why does placing critical instructions at the beginning or end of a prompt tend to be more effective than placing them in the middle? `[INFERRED]`
- ❓ What is "recency bias" in autoregressive models, and how does it interact with the placement of examples in a few-shot prompt? `[INFERRED]`
- ❓ How does self-consistency prompting work, and what probabilistic principle justifies sampling multiple reasoning chains and taking a majority vote? `[INFERRED]`
- ❓ Explain how ReAct (Reason + Act) prompting differs from pure CoT. What additional capabilities does it unlock, and what infrastructure does it require? `[INFERRED]`
- ❓ **Trade-off:** Self-consistency improves answer reliability but multiplies inference cost by N. In what real-world scenarios is that trade-off acceptable, and how would you reduce the cost while keeping the benefit? `[INFERRED]`

### Debugging Scenario
- ❓ A CoT prompt that works correctly on GPT-4 produces wrong reasoning chains on a smaller open-source model. Without fine-tuning, what prompt-level interventions would you try, and why might the same technique behave differently? `[FROM JD]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Test architectural thinking — how candidates make deliberate choices when building systems around LLMs._

### Prompt Architecture & Orchestration
- ❓ When does it make sense to break a complex task into a chain of smaller prompts rather than attempting it in a single mega-prompt? What are the failure modes of each approach? `[FROM JD]`
- ❓ How do you design a prompt-chaining pipeline that is resilient to partial failures — e.g., one step in the chain returns malformed output? `[INFERRED]`
- ❓ Compare retrieval-augmented generation (RAG) with pure few-shot prompting for a knowledge-intensive task. When does each approach win? `[INFERRED]`
- ❓ You need to support 12 different languages in a single prompt-based feature. How do you structure the prompt system to handle language diversity without writing 12 separate prompts? `[FROM JD]`
- ❓ **Trade-off:** Storing conversation history in the context window (full history) versus summarizing it periodically — analyze the quality, cost, and latency trade-offs of each strategy. `[INFERRED]`

### Evaluation
- ❓ How would you build a regression test suite for prompts? What metrics and tooling would you use, and how do you handle the non-determinism of LLM outputs? `[INFERRED]`
- ❓ A product manager wants to A/B test two prompting strategies in production. What statistical and practical pitfalls should you warn them about? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Distinguish staff/principal engineers who reason about emergent model behaviors, research trends, and systemic design._

### Expert-Level Reasoning
- ❓ What is "prompt sensitivity," and why do small lexical changes (e.g., rephrasing a question) sometimes cause large swings in model output? How do you design prompts that are robust to this? `[INFERRED]`
- ❓ Explain the concept of "emergent prompting" behaviors — capabilities that appear only in sufficiently large models. How does this affect prompting strategy decisions when you must support multiple model tiers in the same product? `[FROM JD]`
- ❓ How would you approach prompt optimization algorithmically — e.g., using automatic prompt optimization tools (APE, DSPy, TextGrad)? What are the risks of letting an algorithm generate your production prompts? `[INFERRED]`
- ❓ In a multi-agent system where LLMs pass outputs to each other, how does prompt design at each agent boundary affect error propagation? How do you prevent cascading hallucinations? `[INFERRED]`
- ❓ **Trade-off:** A customer demands maximum output quality and is willing to pay for it. Another customer needs minimum latency at scale. How do you design a single prompting architecture that serves both with configuration, rather than two completely separate codebases? `[FROM JD]`

### Debugging Scenario
- ❓ Your multi-step ReAct agent enters an infinite reasoning loop — it keeps calling the same tool with the same arguments and never concludes. Diagnose the root cause at the prompt level and describe your fix. `[INFERRED]`

### Forward-Looking
- ❓ As models develop longer and more reliable context windows (1M+ tokens), which advanced prompting techniques become less necessary, and which remain essential or become more important? Justify your answer. `[INFERRED]`
