# Deploy to App

Read every file in `prompts/3_output/answers/`. Each file contains model answers for one topic.

For each file, generate and run a Node.js script that inserts the topic's cards directly into Firestore — replicating exactly what `src/views/HtmlBulkInsertView.vue` does when the user pastes TSV content and clicks Insert.

---

## What the app does (replicate this exactly)

In `HtmlBulkInsertView.vue`, the TSV flow does:
1. Creates a new collection document in the `collections` Firestore collection with this shape:
```json
{
  "title": "<topic name>",
  "dateCreated": "<ISO string>",
  "lastModified": "<ISO string>",
  "numberOfItems": <count>
}
```
2. For each Q&A pair, creates a document in the `learning_items` Firestore collection:
```json
{
  "collectionId": "<collection doc id>",
  "title": "<question text>",
  "content": { "type": "doc", "content": [ ...tiptap nodes ] },
  "dateCreated": "<ISO string>",
  "lastModified": "<ISO string>"
}
```

> `syncStatus` is a local-only field used by IndexedDB to track sync state. It is stripped before writing to Firestore (see `src/database/remote/learningItems.ts` → `setLearningItem`). Do **not** include it in the Firestore document.

The `content` field is a Tiptap `JSONContent` document. The app converts HTML to this format via `src/utils/htmlToTiptap.ts`. The script must produce the same JSON structure directly from the markdown answer — no browser DOM needed.

---

## Markdown → Tiptap JSON rules

Parse each answer's markdown and map it to Tiptap nodes using these rules:

| Markdown | Tiptap node |
|---|---|
| Regular paragraph | `{ type: "paragraph", content: [{ type: "text", text: "..." }] }` |
| `**bold**` | `{ type: "text", text: "...", marks: [{ type: "bold" }] }` |
| `` `inline code` `` | `{ type: "text", text: "...", marks: [{ type: "code" }] }` |
| ` ```code block``` ` | `{ type: "codeBlock", attrs: { language: "plaintext" }, content: [{ type: "text", text: "..." }] }` |
| `- bullet` | `{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [...] }] }] }` |
| `1. ordered` | `{ type: "orderedList", content: [...] }` |
| `> blockquote` | Strip the `>` prefix and treat the line as a regular paragraph (no blockquote node in this app) |

For each answer, the content structure is:
1. **Bottom line** sentence → `paragraph` with the text wrapped in `bold` marks
2. **Elaboration** sentences → plain `paragraph`
3. **Code example** (if present) → `codeBlock`

---

## Script requirements

- Use the **Firebase client SDK** (`firebase` npm package) — same SDK the app uses, no service account needed
- Read the Firebase config from `src/database/remote/firebase.ts` — use these exact values:
  ```js
  const firebaseConfig = {
    apiKey: "AIzaSyCMwyu5jelRDJ39rEeq0_huAntu52ne8EQ",
    authDomain: "learningapp-f7d22.firebaseapp.com",
    projectId: "learningapp-f7d22",
    storageBucket: "learningapp-f7d22.firebasestorage.app",
    messagingSenderId: "89331298111",
    appId: "1:89331298111:web:91475d009ad1af427a2d8a"
  }
  ```
- Parse all answers from a single topic file, then batch-insert using Firestore `WriteBatch`
- Create the collection document first, then all learning items referencing its ID
- Use `new Date().toISOString()` for all date fields
- Script filename: `prompts/4_deploy_to_app/scripts/<topic_slug>.mjs`

---

## Script structure

```js
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore'
import { readFileSync } from 'fs'

const firebaseConfig = {
  apiKey: "AIzaSyCMwyu5jelRDJ39rEeq0_huAntu52ne8EQ",
  authDomain: "learningapp-f7d22.firebaseapp.com",
  projectId: "learningapp-f7d22",
  storageBucket: "learningapp-f7d22.firebasestorage.app",
  messagingSenderId: "89331298111",
  appId: "1:89331298111:web:91475d009ad1af427a2d8a"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// 1. Parse prompts/3_output/answers/<topic_slug>.md into Q&A pairs
// 2. Convert each answer from markdown to Tiptap JSONContent
// 3. Create collection document ref (doc(collection(db, 'collections')))
// 4. WriteBatch: set collection doc + all learning_items docs
// 5. await batch.commit()
// 6. Log: "Inserted X items into collection '<title>' (id: <id>)"
```

---

## Local database

The local database is IndexedDB (browser-only) and cannot be written to from Node. It is not necessary to do so directly — the app's sync engine (`src/database/sync/syncEngine.ts`) pulls from Firestore into IndexedDB automatically when the app is opened. When it does, it marks each pulled document with `syncStatus: "synced"` locally, so there are no duplicates or conflicts. The script does **not** need to set this field (it is stripped from Firestore writes anyway).

**After running the script, open the app — the new collection will appear immediately.**

---

## After generating the script

Run it with:
```bash
node prompts/4_deploy_to_app/scripts/<topic_slug>.mjs
```

---

## Output

After all scripts have run successfully, print a summary:

| Topic | Collection ID | Items inserted |
|---|---|---|
| regex | abc123 | 61 |
