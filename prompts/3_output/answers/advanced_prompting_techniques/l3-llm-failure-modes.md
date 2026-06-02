# L3 What are the main failure modes of LLMs and how do prompting techniques address each?

## Answer

### 1. Hallucination

**What it is:** The model generates plausible-sounding but factually incorrect content with false confidence — inventing citations, statistics, or facts that don't exist.

**Why it happens:** Models predict the next token based on patterns, not truth. They don't "know" when they don't know something.

**Prompting mitigations:**
- **RAG** — ground the model in retrieved documents; instruct it to answer only from provided context
- **Explicit uncertainty instruction** — "If you are not certain, say 'I don't know'"
- **Citation requirement** — "For every claim, cite the source document (e.g., [Source 2])"
- **Verification step** — add a second prompt asking the model to check its own answer against the provided context

---

### 2. Context window limits

**What it is:** The model can only process a fixed number of tokens. Long documents, chat histories, or complex tasks exceed this limit, causing truncation or degraded performance near the edges.

**Why it happens:** Transformer attention scales quadratically with context length; models are trained with a fixed context size.

**Prompting mitigations:**
- **Chunking + summarization** — split long documents, summarize earlier turns
- **RAG** — retrieve only the relevant excerpt rather than the full document
- **Map-reduce prompting** — process chunks independently, then combine results
- **Selective context** — include only the most relevant parts of a long history

---

### 3. Instruction following failures

**What it is:** The model ignores, misinterprets, or partially follows complex instructions — especially when instructions are long, buried, or contradictory.

**Why it happens:** Attention can dilute for instructions that appear early in a long prompt; ambiguous phrasing is interpreted in unintended ways.

**Prompting mitigations:**
- **Structured prompts** — use clear section headers (Role, Instructions, Context, Output format)
- **Output format specification** — "Respond only in JSON with keys: answer, confidence, sources"
- **Repetition at the end** — re-state critical constraints just before the model responds
- **Chain-of-thought** — asking the model to reason step-by-step reduces shortcutting
- **Few-shot examples** — show the desired behavior rather than describing it

---

### 4. Reasoning errors in multi-step problems

**What it is:** The model reaches a wrong answer by making logical or mathematical errors across multiple reasoning steps.

**Prompting mitigations:**
- **Chain-of-thought (CoT)** — "Think step by step" forces intermediate reasoning to be explicit and checkable
- **Self-consistency** — generate multiple reasoning paths and take the majority answer
- **Least-to-most prompting** — decompose into sub-problems before tackling the main question

---

### Summary

| Failure mode | Primary mitigation |
|---|---|
| Hallucination | RAG, citation requirement, uncertainty instructions |
| Context limits | Chunking, RAG, summarization |
| Instruction following | Structured prompts, output format, examples |
| Multi-step reasoning | CoT, self-consistency, decomposition |
