# Learning App — Frontend

A spaced-repetition learning app built with Vue 3, Vuetify, and IndexedDB (synced to Firebase).

---

## Claude Side Chat — Action Plan

A collapsible AI assistant panel that lives alongside every view. The agent has full context of the app and open-ended capability — the user is never told "I can't do that." Claude figures out how to fulfill any reasonable request using the data and tools available to it.

### Philosophy

> Give Claude access to the data layer and let it decide what to do — don't enumerate capabilities upfront.

The user never needs to know what "tools" exist. They just talk to the app:

- *"Here's a CSV — turn these into learning items"*
- *"Export this collection to CSV"*
- *"Fill this collection with 10 items about React hooks"*
- *"Split this item into 5 more atomic questions"*
- *"Which items am I weakest on? Show me a summary"*
- *"Rename everything in this collection to be phrased as a question"*
- *"Delete items I've answered correctly more than 10 times"*
- *"Give me a markdown summary of my progress this week"*

None of these are pre-programmed. Claude composes them from the available data and context.

---

### Architecture

```
┌──────────────────────────────────────────────────────┐
│  Vue App                                             │
│  ┌───────────────────────┐  ┌──────────────────────┐ │
│  │   Router View         │  │   ClaudePanel.vue    │ │
│  │  (collections, items, │  │                      │ │
│  │   study, progress)    │  │  context injected    │ │
│  │                       │  │  every turn:         │ │
│  │                       │  │  · current route     │ │
│  │                       │  │  · collection data   │ │
│  │                       │  │  · items + progress  │ │
│  │                       │  │                      │ │
│  │                       │  │  💬 messages         │ │
│  │                       │  │  [confirmation cards]│ │
│  │                       │  │  ──────────────────  │ │
│  │                       │  │  [input]    [Send]   │ │
│  └───────────────────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**API key:** `VITE_ANTHROPIC_API_KEY` in `.env`. Direct calls from the Vue app to the Anthropic API — no backend needed.

---

### What Claude Has Access To

**Read (always, no confirmation needed):**
- All collections and their metadata
- All learning items in any collection
- Card progress scores and attempt logs
- Current route / active view context
- Any data the user pastes into the chat (CSV, JSON, plain text, etc.)

**Write (shows a confirmation card before executing):**
- Create, update, or delete learning items
- Create or delete collections
- Bulk operations of any kind

Claude is free to compose these however needed to fulfill the user's request.

---

### Safety Boundaries

These are the only hard constraints baked into the system prompt:

1. **Destructive operations require confirmation** — before any delete or bulk overwrite, Claude lists exactly what will be affected and waits for the user to approve
2. **Batch cap** — max 20 items created or modified in a single turn without confirmation
3. **Transparency** — Claude always describes what it's about to do before doing it
4. **No sync internals** — Claude never manipulates `syncStatus` or Firebase directly

---

### Files to Create / Modify

```
src/
  config/
    claudeTools.ts            NEW  4 broad tool schemas (read, write, delete, analyze)
    claudeSystemPrompt.ts     NEW  Injects live app context into every turn
  composables/
    useClaudeAgent.ts         NEW  Streaming loop, tool execution, message history
  shared/components/
    ClaudePanel.vue           NEW  Chat UI, message bubbles, confirmation cards
  layout/
    AppBar.vue                MOD  Claude toggle button
  App.vue                     MOD  Two-column layout with <ClaudePanel>
.env                          NEW  VITE_ANTHROPIC_API_KEY=sk-ant-...
```

---

### The 4 Broad Tools

Rather than one tool per operation, Claude gets four general-purpose tools it can compose freely:

| Tool | What it does |
|---|---|
| `read_data` | Read any entity: collections, items, progress, attempt logs |
| `write_items` | Create or update any number of learning items |
| `delete_items` | Delete items or collections by id |
| `analyze_progress` | Compute insights from progress + attempt log data |

Claude decides how to chain them. A request like *"convert this CSV to learning items"* has Claude parse the user's input, call `write_items` with the result — no special CSV tool needed.

---

### Prerequisites

```bash
npm install @anthropic-ai/sdk
```

```env
# .env
VITE_ANTHROPIC_API_KEY=sk-ant-...
```
