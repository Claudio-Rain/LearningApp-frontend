# L3 How do you apply advanced prompting techniques specifically to tasks with complex, multi-domain context — such as combining retrieved documents, user history, and structured data in a single prompt?

## Answer

Multi-domain context prompts are challenging because: (1) the total context can exceed the model's attention budget, (2) different context types have different reliability and relevance, and (3) the model must synthesise across sources without hallucinating connections.

### Structural approach to composing multi-domain context

Organise the prompt into clearly labelled sections so the model knows what each piece of context is and how to weight it:

```
[System]
You are a financial advisor assistant. Answer questions using only the
provided context. If information is insufficient, say so.

[User Profile]
Name: Jane Doe | Risk tolerance: moderate | Portfolio: equities + bonds
Recent actions: sold AAPL (2026-05-01), queried retirement projections

[Retrieved Documents]
Source 1 (2026-05-30, Morningstar): "Q1 earnings beat estimates by 12%..."
Source 2 (2026-05-28, FT): "Fed signals two rate cuts in H2 2026..."

[Structured Data]
Current holdings (JSON):
{ "MSFT": { "shares": 50, "avg_cost": 310.00 }, "BND": { "shares": 200, ... } }

[Question]
Should Jane rebalance her portfolio given the current macro environment?
```

### Techniques for managing complexity

#### 1. Hierarchical summarisation before injection
Pre-summarise long documents to key facts relevant to the query. This preserves semantics while reducing token count.

```python
# Step 1: retrieve top-5 documents
docs = retriever.search(query, top_k=5)

# Step 2: summarise each to 2 sentences
summaries = [llm(f"Summarise in 2 sentences, focusing on {query}:\n{doc}") for doc in docs]

# Step 3: inject summaries into the main prompt
context = "\n".join(summaries)
```

#### 2. Source attribution instruction
Instruct the model to cite which source each claim comes from. This reduces hallucination and makes outputs auditable.

```
"For each claim in your answer, cite the source (e.g., [Source 1])."
```

#### 3. Context ordering — most relevant last
Models tend to attend more strongly to content near the end of the prompt (recency bias). Place the most critical context (retrieved documents, structured data) just before the question.

#### 4. Chain-of-thought for multi-source synthesis
Explicitly ask the model to reason across sources before giving the final answer:

```
"First, summarise what each source says about the question.
Then, identify any conflicts.
Finally, give your recommendation."
```

#### 5. Conflict resolution instruction
When sources may contradict each other (e.g., a user's stated preference vs. their behaviour):

```
"If the user's stated preference conflicts with their recent actions, flag the conflict
and ask a clarifying question rather than assuming either is correct."
```

#### 6. Structured output to prevent context bleed
Request a JSON response with explicit fields for each context domain, so it's clear which part of the answer is derived from which source.

### Key principles

- **Label everything** — unnamed context blocks are merged and confused by the model.
- **Summarise before injecting** — don't paste raw documents; distil them.
- **Validate the output** — multi-domain answers are high-risk for hallucination; use LLM-as-judge or human review.
- **Test with conflicting context** — deliberately inject contradictory data and verify the model handles it gracefully.
