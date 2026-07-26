# L2 What is retrieval-augmented generation (RAG) and how does it differ from fine-tuning?

## Answer

### RAG (Retrieval-Augmented Generation)

RAG is a pattern where relevant documents are **retrieved at inference time** and injected into the prompt as context, allowing the model to answer questions grounded in specific, up-to-date information without changing the model's weights.

```
User query
    ↓
Embed query → search vector store → retrieve top-K chunks
    ↓
Inject chunks into prompt:
  "Using the following documents: [chunks]
   Answer the question: [user query]"
    ↓
Model generates answer grounded in retrieved context
```

### Fine-tuning

Fine-tuning **adjusts the model's weights** by training it on a dataset of examples. The knowledge is baked into the model itself rather than injected at runtime.

```
Training dataset (input → output pairs)
    ↓
Training loop (gradient descent on base model)
    ↓
Fine-tuned model with updated weights
    ↓
Model answers from internalized knowledge
```

### Key differences

| Dimension | RAG | Fine-tuning |
|---|---|---|
| Knowledge location | External store (retrieved at runtime) | Model weights (baked in) |
| Update cost | Cheap — update the vector store | Expensive — retrain the model |
| Knowledge freshness | Real-time | Snapshot at training time |
| Transparency | Can cite sources | Black box |
| Data volume needed | Small (just the relevant docs) | Large (thousands of examples) |
| Best for | Factual Q&A over documents, knowledge bases | Style, tone, format, domain-specific behavior |
| Hallucination risk | Lower (grounded in retrieved text) | Higher (relies on memorized patterns) |

### When to choose each

**Choose RAG when:**
- Your knowledge base changes frequently (product docs, legal texts, news)
- You need source citations
- You have limited labeled training data
- Cost of retraining is prohibitive

**Choose fine-tuning when:**
- You need consistent output format or style the base model can't achieve with prompting
- You have thousands of high-quality labeled examples
- Latency or token cost from large context is a problem
- The task requires deep domain knowledge that prompting can't provide

**In practice:** RAG and fine-tuning are complementary — you can fine-tune a model for style/format and use RAG to supply factual grounding.
