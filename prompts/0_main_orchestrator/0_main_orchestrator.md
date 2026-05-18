# Main Orchestrator

Read the topic list from `prompts/0_main_orchestrator/topics.md`.

Spawn one background agent per topic entry. Each agent must run the full pipeline independently:

1. Read `prompts/1_templates/questions.md`
2. Fill in `[TOPIC]`, `[PASTE KNOWLEDGE LIST HERE]`, and `[PASTE SKILLS LIST HERE]` from the topic entry
3. Generate the question set and save it to `prompts/3_output/questions/<topic_slug>.md`
4. Read `prompts/1_templates/answers.md`
5. Fill in `[PASTE QUESTION LIST HERE]` with the question set just generated
6. Generate the model answers and save them to `prompts/3_output/answers/<topic_slug>.md`
7. Read `prompts/4_deploy_to_app/deploy_to_app.md` and generate the TSV output for this topic, saving it to `prompts/4_deploy_to_app/output/<topic_slug>.tsv`

The `topic_slug` must be lowercase with words separated by underscores (e.g. `data_abstraction`, `azure_service_bus`).

All agents run in parallel. Do not wait for one to finish before starting the next.
