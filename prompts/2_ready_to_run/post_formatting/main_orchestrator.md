# Post-Formatting Orchestrator

## Your task

Read the answer files in `prompts/3_output/answers/` — **except `stored_procedures.md`** — as a source of truth, then update the Firestore database directly.

Do **not** modify any files. All changes go to the database only.

---

## Topics to process

- advanced_prompting_techniques
- asynchrony_and_non_blocking_environments
- code_quality
- containerization
- data_abstraction
- data_sending_and_retrieval
- data_validation
- framework_http_clients

---

## How to spawn the agents

For each topic, spawn **both agents at the same time** (parallel). Pass each agent its full prompt verbatim from the templates below — fill in `[TOPIC_SLUG]` with the actual topic slug.

Wait for all agents across all topics to finish before reporting completion.

---

## Sub-agent 1 — Add Code Examples to Firestore

**Prompt template** (replace `[TOPIC_SLUG]` before sending):

```
Read `prompts/3_output/answers/[TOPIC_SLUG].md` and `scripts/update-sp-ratings.mjs` (for the Firebase config and connection pattern).

Your task: for every answer in the file that does NOT already have a "Code example:" block, generate a minimal code example and insert it as a new node in the matching Firestore document's Tiptap content.

## How to find the right Firestore document

Fetch all docs from the `learning_items` collection. Match each question by its title field.
The title in Firestore may already have a level prefix (e.g. "L1 What does it mean...") or may be the raw question text — try both.

## What to generate

Use the language implied by the topic:
- async/non-blocking → C#
- containerization → Dockerfile / bash
- data_abstraction, data_validation, data_sending_and_retrieval, framework_http_clients → C# or relevant language from context
- advanced_prompting_techniques → plain text / pseudocode

Keep examples minimal — only what proves the point. No imports unless they matter.

## Tiptap node to insert

Add a `codeBlock` node immediately after the last paragraph node that contains elaboration text, before any blockquote (ratings) node:

{
  type: 'codeBlock',
  attrs: { language: '<language>' },
  content: [{ type: 'text', text: '<the code string>' }]
}

Do NOT insert a code block if one already exists in the document content.

## Save the script

Write the full script to `scripts/post-format-code-[TOPIC_SLUG].mjs` using the same Firebase import pattern from `scripts/update-sp-ratings.mjs`, then run it with:
node scripts/post-format-code-[TOPIC_SLUG].mjs

Report how many items received a code example and how many were skipped (conceptual or already had one) and how many were not found in Firestore.
```

---

## Sub-agent 2 — Line Breaks + Level Labels in Firestore

**Prompt template** (replace `[TOPIC_SLUG]` before sending):

```
Read `prompts/3_output/answers/[TOPIC_SLUG].md` and `scripts/update-sp-ratings.mjs` (for the Firebase config and connection pattern).

You have two tasks to apply directly in Firestore. Do NOT modify any files.

---

### Task 1 — Split elaboration sentences into separate paragraph nodes

The answer file shows each question's elaboration as a multi-sentence paragraph. In Firestore, the Tiptap `content` field stores these as paragraph nodes.

For each document, find all `paragraph` nodes whose text content corresponds to an elaboration paragraph (multi-sentence text that isn't the Bottom line blockquote and isn't the Ratings blockquote). Split each such paragraph so every sentence becomes its own `paragraph` node.

Sentence boundary: split on `. `, `! `, or `? ` followed by a capital letter, or at the end of the string. Do not split inside inline code spans.

The Tiptap paragraph node structure:
{ type: 'paragraph', content: [{ type: 'text', text: '...' }] }

Preserve all marks (bold, italic, code) on text nodes. Preserve all other node types (blockquote, codeBlock, heading) untouched.

---

### Task 2 — Add level prefix to the title field

The answer file is divided into sections like `## Level 1 — Definition & Basics`, `## Level 2 — Core Concepts`, etc. Use those section boundaries to determine each question's level.

Update the Firestore document's `title` field:
- If the title does NOT already start with `L1`, `L2`, etc. → prepend the level: `L1 <original title>`
- If the title already has a level prefix → leave it unchanged

---

### How to find the right Firestore document

Fetch all docs from the `learning_items` collection. Match each question by comparing the raw question text (from the `**Q:` line in the markdown) against the `title` field. The stored title may or may not already have a level prefix — try both variants.

---

### Save and run the script

Write the full script to `scripts/post-format-text-[TOPIC_SLUG].mjs` using the same Firebase import pattern from `scripts/update-sp-ratings.mjs`, then run it with:
node scripts/post-format-text-[TOPIC_SLUG].mjs

Report how many items were updated and how many were not found in Firestore.
```

---

## Done

When all agents complete, print a summary: how many topics processed, total items updated per agent type, and list any topics where agents reported unmatched questions.
