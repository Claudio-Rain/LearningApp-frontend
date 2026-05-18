# Interview Questions: Advanced Prompting Techniques for Generative AI

## Coverage map

| Item | Type | Level |
|------|------|-------|
| Applies advanced prompting techniques for complex context tasks (zero-shot, chain of thought, etc.) | Skill | Level 3 — Practical Usage |
| Zero-shot and few-shot prompting | Knowledge (inferred) | Level 1 — Definition & Basics |
| Chain-of-thought prompting | Knowledge (inferred) | Level 2 — Core Concepts |
| ReAct and tool-use patterns | Knowledge (inferred) | Level 3 — Practical Usage |
| Self-consistency and majority voting | Knowledge (inferred) | Level 3 — Practical Usage |
| Prompt chaining and decomposition | Knowledge (inferred) | Level 3 — Practical Usage |
| System prompts and persona setting | Knowledge (inferred) | Level 2 — Core Concepts |
| Temperature, top-p, and sampling parameters | Knowledge (inferred) | Level 2 — Core Concepts |
| Hallucination mitigation | Knowledge (inferred) | Level 4 — Common Pitfalls |
| Prompt evaluation and testing | Knowledge (inferred) | Level 6 — Trade-offs & Design Decisions |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate understands what a prompt is and the vocabulary of prompting._

### Foundations
- ❓ What is a prompt in the context of a Large Language Model? `[INFERRED]`
- ❓ What is the difference between zero-shot and few-shot prompting? `[INFERRED]`
- ❓ What is a system prompt? How does it differ from a user message? `[INFERRED]`
- ❓ What does "context window" mean and why does it constrain prompting strategies? `[INFERRED]`
- ❓ What are tokens? Why does token count matter for both cost and capability? `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Test understanding of the core prompting mechanisms._

### Prompting Techniques
- ❓ What is chain-of-thought (CoT) prompting and why does it improve reasoning accuracy? `[INFERRED]`
- ❓ What is the difference between standard CoT and zero-shot CoT ("Let's think step by step")? `[INFERRED]`
- ❓ What are temperature and top-p sampling parameters? How do they affect output? `[INFERRED]`
- ❓ When would you set temperature to 0 vs. 0.7 vs. 1.0? `[INFERRED]`
- ❓ What is a system prompt best used for? What should you avoid putting in it? `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Test ability to apply advanced techniques to real tasks._

### Applying Techniques
- ❓ You need an LLM to extract structured data (name, date, amount) from unstructured invoice text. What prompting approach would you use? `[FROM JD]`
- ❓ How would you use few-shot examples to teach an LLM a custom output format? `[INFERRED]`
- ❓ What is the ReAct pattern? How does it combine reasoning and tool use? `[INFERRED]`
- ❓ What is prompt chaining and when is it better than a single long prompt? `[INFERRED]`
- ❓ What is self-consistency prompting? How does majority voting over multiple completions improve reliability? `[INFERRED]`
- ❓ How do you instruct a model to output valid JSON reliably? What techniques help? `[INFERRED]`
- ❓ You need to summarize a 50-page document that exceeds the context window. What strategies can you use? `[FROM JD]`

---

## Level 4 — Common Pitfalls
_Goal: Surface common prompting mistakes and failure modes._

### Mistakes and Hallucinations
- ❓ What is hallucination in an LLM? Why does it happen and what can you do to reduce it? `[INFERRED]`
- ❓ A model confidently gives a wrong answer. How do you prompt it to express uncertainty? `[INFERRED]`
- ❓ What is prompt injection and why is it a security concern in agent-based systems? `[INFERRED]`
- ❓ You ask the model to "avoid using bullet points" but it keeps using them. What is the issue and how do you fix it? `[INFERRED]`
- ❓ What is the "lost in the middle" problem in long-context prompting? `[INFERRED]`
- ❓ A few-shot prompt works well in testing but degrades in production. What are the likely causes? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Test understanding of why these techniques work._

### How LLMs Process Prompts
- ❓ Why does chain-of-thought prompting actually improve accuracy — what is happening inside the model? `[INFERRED]`
- ❓ What is attention and why does position in the prompt affect how much weight the model gives to different parts? `[INFERRED]`
- ❓ What is in-context learning? How does a model "learn" from few-shot examples without any weight updates? `[INFERRED]`
- ❓ Why does asking a model to output its reasoning before its answer tend to produce better answers than asking for the answer first? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate judgment about when and how to use prompting techniques._

### Design Decisions
- ❓ What are the pros and cons of third-party prompting libraries vs. hand-crafted prompts? `[INFERRED]`
- ❓ When does it make sense to fine-tune a model vs. relying on clever prompting? `[INFERRED]`
- ❓ How do you evaluate and regression-test prompts? What does a prompt test suite look like? `[INFERRED]`
- ❓ Chain-of-thought is slower and more expensive than direct prompting. How do you decide when the cost is worth it? `[INFERRED]`
- ❓ Retrieval-Augmented Generation (RAG) vs. long-context prompting: what are the trade-offs? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Architecture-level thinking about LLM systems._

### Advanced Scenarios
- ❓ What is an LLM agent? How do you design a reliable multi-step agentic workflow? `[INFERRED]`
- ❓ What is the "constitutional AI" approach to steering model behavior? How does it compare to system prompt instructions? `[INFERRED]`
- ❓ How do you prevent a model from leaking its system prompt to the user? `[INFERRED]`
- ❓ What is meta-prompting? How can you use an LLM to generate or refine its own prompts? `[INFERRED]`
- ❓ How do you design a prompting strategy that degrades gracefully when the model returns malformed output? `[INFERRED]`
