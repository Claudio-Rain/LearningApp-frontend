Your task is to coordinate answer generation for the topic `[TOPIC_SLUG]`.

1. Read the question list from `prompts/3_output/questions/[TOPIC_SLUG].md`
2. Read the answer template from `prompts/0_main_orchestrator/answers.md`
3. For each question, replace `[PASTE QUESTION LIST HERE]` with that single question
4. Spawn one agent per question using model `claude-sonnet-4-6` whose entire prompt is the filled-in template — verbatim, nothing added

Each agent's only job: generate the model answer and save it to `prompts/3_output/answers/[TOPIC_SLUG]/<question_slug>.md`. If the folder does not exist, create it.
