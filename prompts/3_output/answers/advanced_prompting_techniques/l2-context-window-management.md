# L2 Context Window Management

## Question
What strategies do you use to manage long or complex context windows effectively (e.g., chunking, summarization, retrieval-augmented prompting)?

## Answer

### Why context window management matters

Every model has a finite context window (e.g., 8K, 32K, 128K tokens). Even with large windows, indiscriminately stuffing all available information degrades performance due to:
- **Lost-in-the-middle effect**: Models attend less reliably to information in the middle of long contexts.
- **Higher latency and cost**: More tokens = slower and more expensive inference.
- **Noise dilution**: Irrelevant content reduces the signal-to-noise ratio for the model.

Effective context management selects, compresses, or structures information to maximize relevance per token.

---

### Strategy 1: Chunking

**What it is**: Split large documents into smaller segments (chunks) of manageable size (e.g., 512–1024 tokens), then process each chunk independently or sequentially.

**When to use**: Document processing, long-text analysis, batch extraction tasks.

**Patterns**:
- **Sequential chunking**: Process chunk 1 → summarize → feed summary + chunk 2 → repeat.
- **Parallel chunking**: Process all chunks independently and aggregate results.
- **Sliding window**: Overlap chunks (e.g., 20% overlap) to avoid losing context at boundaries.

**Trade-off**: May lose cross-chunk context. Overlapping mitigates boundary issues but increases token usage.

---

### Strategy 2: Summarization (Progressive Compression)

**What it is**: Use the model itself to compress prior context into a concise summary, then replace the full history with the summary in subsequent prompts.

**When to use**: Multi-turn conversations, long document analysis, iterative refinement tasks.

**Pattern**:
```
[Previous conversation summary]: <summary of turns 1-10>
[Current turn]: User says: "..."
```

**Trade-off**: Summary quality depends on model accuracy. Important details may be lost in compression. Use structured summaries (key facts, decisions, open questions) rather than prose to minimize loss.

---

### Strategy 3: Retrieval-Augmented Generation (RAG)

**What it is**: Instead of loading all documents into the context, embed documents into a vector store and retrieve only the most semantically relevant chunks at query time.

**When to use**: Knowledge bases, document QA, any scenario where the full corpus exceeds the context window or is too large to include efficiently.

**Pipeline**:
1. Chunk and embed all documents into a vector database (e.g., Pinecone, Weaviate, pgvector).
2. At query time, embed the user query and retrieve top-K most similar chunks.
3. Insert retrieved chunks into the prompt as context.
4. Model answers grounded in retrieved content.

**Trade-off**: Retrieval quality is the bottleneck. If the retriever fails to surface the right chunk, the model will either hallucinate or say it doesn't know. Requires embedding infrastructure and retrieval tuning.

---

### Strategy 4: Selective Context Inclusion

**What it is**: Programmatically filter which parts of available context are included in each prompt, based on relevance to the current task.

**When to use**: Agent pipelines with tool outputs, multi-step workflows with accumulated state.

**Techniques**:
- Include only the N most recent messages in a conversation.
- Filter tool outputs to only the fields relevant to the next step.
- Use a lightweight classifier or keyword filter to gate what enters the context.

---

### Strategy 5: Hierarchical Summarization (Map-Reduce)

**What it is**: Process large documents in a map-reduce pattern — summarize each chunk independently (map), then synthesize the summaries into a final answer (reduce).

**When to use**: Summarization of book-length documents, legal discovery, large codebase analysis.

**Pattern**:
```
Map:    [Chunk 1] → Summary 1
        [Chunk 2] → Summary 2
        ...
Reduce: [Summary 1 + Summary 2 + ...] → Final Summary / Answer
```

---

### Strategy 6: Positional Placement Optimization

**What it is**: Place the most critical instructions and context at the **beginning** and **end** of the prompt — not in the middle — to exploit the model's primacy and recency attention bias.

**When to use**: Any long prompt.

**Rule of thumb**:
- System instructions and role: top of prompt.
- The question or task: bottom of prompt (immediately before the model's response).
- Supporting context: middle (and keep it as concise as possible).

---

### Comparison of strategies

| Strategy | Handles window overflow | Preserves cross-document context | Token cost | Setup complexity |
|---|---|---|---|---|
| Chunking | Yes | Partially | Low | Low |
| Summarization | Yes | Partially | Medium | Low |
| RAG | Yes | Yes (via retrieval) | Low (per query) | High |
| Selective inclusion | Partial | Depends on filtering | Low | Medium |
| Map-Reduce | Yes | At reduce step | High | Medium |

---

### Key takeaway

No single strategy fits all scenarios. Production systems typically combine multiple approaches: RAG for large knowledge bases, chunking + summarization for document processing pipelines, and selective context inclusion for agent state management. The goal in every case is to maximize the relevance-per-token ratio within the context window.
