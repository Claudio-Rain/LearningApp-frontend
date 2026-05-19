# Main Orchestrator

Read the topic list from `prompts/0_main_orchestrator/topics.md`.
Read the question template from `prompts/1_templates/questions.md`.
Read the answer template from `prompts/1_templates/answers.md`.

The `topic_slug` must be lowercase with words separated by underscores (e.g. `data_abstraction`, `azure_service_bus`).

---

## Step 1 — Prepare ready-to-run prompts (you do this, no agents yet)

For each topic entry, produce two files by filling in the templates:

**`prompts/2_ready_to_run/<topic_slug>/stage1_questions.md`**
Replace in the questions template:
- `[TOPIC]` → the topic name
- `[PASTE KNOWLEDGE LIST HERE]` → the knowledge bullet list (or `NONE`)
- `[PASTE SKILLS LIST HERE]` → the skills bullet list (or `NONE`)

**`prompts/2_ready_to_run/<topic_slug>/stage2_answers.md`**
Replace in the answers template:
- `[PASTE QUESTION LIST HERE]` → the literal text `{{QUESTIONS_PLACEHOLDER}}`

Do this for every topic before spawning any agents.

---

## Step 2 — Spawn question agents (all in parallel)

For each topic, spawn one agent whose entire prompt is the content of `prompts/2_ready_to_run/<topic_slug>/stage1_questions.md` — verbatim, nothing added.

The agent's only job: generate the question set and save it to `prompts/3_output/questions/<topic_slug>.md`. Nothing else.

k---

## Step 3 — Spawn answer agents (each starts only after its question file exists)

For each topic, once `prompts/3_output/questions/<topic_slug>.md` has been written:

1. Read `prompts/2_ready_to_run/<topic_slug>/stage2_answers.md`
2. Replace `{{QUESTIONS_PLACEHOLDER}}` with the full content of the questions file
3. Spawn one agent whose entire prompt is that filled-in content — verbatim, nothing added

The agent's only job: generate the model answers and save them to `prompts/3_output/answers/<topic_slug>.md`. Nothing else.
