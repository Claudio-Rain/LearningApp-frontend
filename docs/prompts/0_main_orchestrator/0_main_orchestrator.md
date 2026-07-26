# Main Orchestrator

Read:
- Topic list: `prompts/0_main_orchestrator/topics.md`
- Question template: `prompts/0_main_orchestrator/questions.md`
- Answer coordinator template: `prompts/0_main_orchestrator/answer_coordinator.md`

The `topic_slug` must be lowercase with words separated by underscores (e.g. `data_abstraction`, `azure_service_bus`).

---

## Step 1 — Spawn question agents (all in parallel)

For each topic, fill in the question template:
- Replace `[TOPIC]` → the topic name
- Replace `[PASTE KNOWLEDGE LIST HERE]` → the knowledge list (or `NONE`)
- Replace `[PASTE SKILLS LIST HERE]` → the skills list (or `NONE`)

Spawn one agent per topic whose entire prompt is the filled-in template — verbatim, nothing added.

---

## Step 2 — Spawn answer coordinator agents (each starts only after its question file exists)

For each topic, once `prompts/3_output/questions/<topic_slug>.md` has been written:

Fill in the answer coordinator template:
- Replace `[TOPIC_SLUG]` → the topic slug

Spawn one agent per topic whose entire prompt is the filled-in coordinator template — verbatim, nothing added.
