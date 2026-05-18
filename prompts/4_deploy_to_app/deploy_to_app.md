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

For each answer, the content structure is:
1. **Bottom line** sentence → `paragraph` with the text wrapped in `bold` marks
2. **Elaboration** sentences → plain `paragraph`
3. **Code example** (if present) → `codeBlock`

---

## Script requirements

- Use **Firebase Admin SDK** (`firebase-admin` npm package)
- Use a service account key file at `prompts/4_deploy_to_app/serviceAccountKey.json`
- The Firestore project ID is `learningapp-f7d22`
- Parse all answers from a single topic file, then batch-insert using Firestore `WriteBatch`
- Create the collection document first, then all learning items referencing its ID
- Use `new Date().toISOString()` for all date fields
- Script filename: `prompts/4_deploy_to_app/scripts/<topic_slug>.mjs`

---

## Script structure

```js
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { createRequire } from 'module'

const serviceAccount = JSON.parse(readFileSync('./prompts/4_deploy_to_app/serviceAccountKey.json', 'utf8'))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

// 1. Parse prompts/3_output/answers/<topic_slug>.md into Q&A pairs
// 2. Convert each answer from markdown to Tiptap JSONContent
// 3. Create collection document
// 4. Batch-insert all learning_items
// 5. Log: "Inserted X items into collection '<title>' (id: <id>)"
```

---

## After generating the script

Run it with:
```bash
node prompts/4_deploy_to_app/scripts/<topic_slug>.mjs
```

If `serviceAccountKey.json` does not exist, stop and print:
```
⚠ Missing service account key.
Download it from Firebase Console → Project Settings → Service accounts → Generate new private key
Save it to: prompts/4_deploy_to_app/serviceAccountKey.json
```

---

## Output

After all scripts have run successfully, print a summary:

| Topic | Collection ID | Items inserted |
|---|---|---|
| dotnet_regex | abc123 | 42 |
