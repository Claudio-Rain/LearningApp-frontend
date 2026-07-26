Your task is to generate a set of interview questions for the topic of [TOPIC].

## Job requirements (use these as the source of truth)

When a structured job description is provided below, use it to define exactly what must be covered.

- The job description is the **baseline** — every item listed under Knowledge and Skills becomes one question (reformat it as a question if needed).

### Knowledge requirements
[PASTE KNOWLEDGE LIST HERE — or write NONE]

### Skills requirements
[PASTE SKILLS LIST HERE — or write NONE]

---

## Progression levels labels

Mark each question as L1, L2, etc. based on the level you consider it to be. it should be "L1 lorem ipsum dolor sit?".

---

## Output format

Produce a **Markdown file** with the following structure:

```
# Interview Questions: [TOPIC]

## Level 1

### [Area name]
- Question here `[FROM JD]`
```
---

## Output location

Save the generated question file to `prompts/3_output/questions/<topic_slug>.md`. If the folder does not exist, create it.

---

Start by building the **coverage map**, then generate the questions **level by level**.
