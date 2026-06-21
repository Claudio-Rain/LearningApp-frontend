# Skill Coverage Report

Assessment of the **LearningApp-frontend** project (a Vue 3 + Vuetify Chrome-extension flashcard/spaced-repetition app with a Firebase backend, an offline IndexedDB layer, a background service worker, and a content-generation script pipeline).

**Scale:** `0` = no evidence · `1` = incidental/shallow · `2` = clearly used · `3` = strong, idiomatic, central to the codebase.

Only skills with meaningful coverage get a code sample below; the full scoring is in the table at the end.

---

## 1. LANGUAGE — JavaScript

### Client-side storage — 3
IndexedDB (via `idb`) is the primary offline store, with a versioned schema and migrations; `chrome.storage.local` holds extension settings.
```ts
// src/database/local/db.ts
export const dbPromise = openDB(DB_NAME, 5, {
  upgrade(db, oldVersion) {
    if (oldVersion < 5) {
      if (!db.objectStoreNames.contains(EXCLUDED_ITEMS_STORE)) {
        db.createObjectStore(EXCLUDED_ITEMS_STORE, { keyPath: 'id' })
      }
    }
  }
})
```
```js
// background/utils/storage.js
const stored = await chrome.storage.local.get(['notificationCollectionId', 'sessionStartHour'])
```

### Modules — 3
Clean module boundaries: the data layer is split into `local/`, `remote/`, `operations/`, and `sync/`, each re-exported through a barrel `index.ts`.
```ts
// src/database/sync/syncEngine.ts
import * as local from '../local'
import * as remote from '../remote'
import { pullCollections, pullLearningItems } from '../operations'
```

### Async / non-blocking — 3
`async/await` is the default style across the data layer, service worker, and views; offline-aware writes branch on `navigator.onLine`.
```ts
// src/database/operations/cardProgress.ts
export async function updateCardProgress(progress: CardProgress) {
  await local.updateCardProgress({ ...progress, syncStatus: 'pending' })
  if (navigator.onLine) {
    await remote.setCardProgress(progress)
    await local.updateCardProgress({ ...progress, syncStatus: 'synced' })
  }
}
```

### Concurrency — 2
`Promise.all` is used to parallelize independent reads/writes in a few places (progress view, sync, notifications), but there is no advanced concurrency control (queues, semaphores, races).

### Filesystem — 2
Only in the Node script pipeline (`scripts/`), which reads answer files from disk with `fs`.
```js
// scripts/post-format-code-data_sending_and_retrieval.mjs
import { readFileSync } from 'fs'
const content = readFileSync(ANSWER_FILE, 'utf-8')
```

### Date & time — 3
`date-fns` is used pervasively across operations, views, and the background scheduler.
```ts
// src/database/operations/cardProgress.ts
if (!localP || isAfter(parseISO(remoteP.last_reviewed_at), parseISO(localP.last_reviewed_at))) { ... }
```
```js
// background/services/alarmService.js
const hour = getHours(new Date())
```

### Data sending and retrieval — 3
The remote layer sends/retrieves data over the network through the Firestore SDK (get/add/update/set/delete).
```ts
// src/database/remote/collections.ts
export async function getCollections(): Promise<Collection[]> {
  const snapshot = await getDocs(collection(db, 'collections'))
  return snapshot.docs.map(doc => ({ ...doc.data(), remoteId: doc.id } as Collection))
}
```

### Math — 2
Used for the spaced-repetition strength scoring, chart aggregations, and progress stats — applied arithmetic rather than a math-heavy domain.

### Regex — 2
HTML/markdown parsing and notification text formatting use regular expressions.
```js
// background/utils/notification.js
const text = extractPlainText(content).replace(/\n+/g, ' • ').trim()
```
```js
// scripts/...framework_http_clients.mjs
const levelMatch = line.match(/^## Level (\d+)/)
```

---

## 2. FRAMEWORK — Vue JS

### Routing — 3
`vue-router` with hash history, redirects, dynamic params, and `props: true` route mapping.
```ts
// src/router/index.ts
{ path: '/collections/:id/:itemId', name: 'collectionItemView', component: CollectionItemView, props: true }
```

### Forms — 3
Vuetify forms with inline validation rules and derived validity state.
```vue
<!-- src/views/BulkInsertView.vue -->
<v-text-field :rules="[v => !!v || 'Enter a name']" />
```
```ts
const validItems = computed(() => parsedItems.value.filter(i => i.valid))
```

### Reusability — 3
Shared components (`LearningItem`, `CollectionList`, `TiptapDisplay`, …) plus composables encapsulating reusable stateful logic.

### State management — 2
No Pinia store is actually wired up (it's a dependency only). State sharing is done with the composable pattern — module-level `ref`s shared across components.
```ts
// src/composables/useExcludedItems.ts
const excludedItemIds = ref<Set<string>>(new Set())
export function useExcludedItems() { ... }
```

### Custom events — 2
Child→parent communication via emits in the editor/item components.
```js
// src/views/LearningItemEditor.vue, LearningItemView.vue
emit('update', ...)
```

### Security — 2
Manual HTML escaping in the content renderer to avoid injection when building notification/card HTML; secrets read from `import.meta.env`. (Note: `dompurify` is a dependency but unused, and Firebase keys are hard-coded in `scripts/`.)
```js
// src/content.js
let text = escapeHtml(node.text || '');
```

### Debugging — 1
Extensive `console.log` tracing (esp. the editor and background worker) but no use of framework devtools tooling or structured debug utilities.

### Internationalization — 0
No i18n framework or message catalogs. (Grep hits were `date-fns` locale formatting, not app i18n.)

---

## 3. LIBRARIES — Vue JS

### Immutability — 3
Updates are consistently expressed as new objects via spread rather than mutation — the core sync pattern.
```ts
await local.updateCollection({ ...col, syncStatus: 'synced' })
```

### Data validation — 2
Form rules + manual structural validation of parsed bulk items. (`zod` is a dependency but not used in the app code.)
```ts
// src/views/BulkInsertView.vue
valid: question.length > 0 && answer.length > 0
```

### Utilities — 2
`date-fns`, plus shared util modules (`htmlToTiptap`, notification formatting). `@vueuse/core` is installed but not imported in `src/`.

### Network troubleshooting — 2
Offline detection and per-record `syncStatus: 'pending' | 'synced' | 'error'` to recover from failed network writes.
```ts
// src/database/sync/syncEngine.ts
try { await remote.setCollection(col); ... } catch { await local.updateCollection({ ...col, syncStatus: 'error' }) }
```

### Framework Http Client — 2
The app's HTTP/data access goes through the Firebase SDK rather than a raw client; `axios` is installed but unused. (The C#/HTTP-client material lives in the content-generation scripts as learning content, not as app infrastructure.)

### Package versioning — 2
`package.json` with semver ranges + committed `package-lock.json`; `firebase-tools` and build toolchain pinned.

### Image upload — 1
`@tiptap/extension-image` is enabled in the editor; no upload backend/pipeline.

### Localization — 1
Limited to `date-fns` date formatting.

### Documentation — 1
Rich hand-written Markdown (`README.md`, `ARCHITECTURE.md`, design diagrams) but nothing generated through a doc tool/library.

### Browser support — 1
Chrome-extension targeted; Vite build only.

### File upload — 0/1, Scroll detection — 0, Immutability libs — see above
No dedicated file-upload or scroll-detection libraries are wired up.

---

## 4. Markup and Styling

### Advanced layouts — 2
Flexbox/grid layouts, notably the multi-chart progress dashboard.
```
/* src/views/StudyProgressView.vue */
.charts-container { display: grid; ... }
```

### Responsive design — 2
Vuetify's responsive grid/breakpoints plus a `full-width` chart wrapper.

### Animations — 1
Some CSS `transition`/`transform` usage; no keyframe animation system.

### CSS methodologies — 1
Scoped component styles; no formal methodology (BEM/ITCSS).

### Embedded content — 1
Highcharts renders into mounted `<div ref>` containers (programmatic mount, not `<iframe>` embedding).

### Preprocessors — 1
`sass` is a devDependency but there are no `.scss/.sass` files; styling is plain CSS.

### Transforms — 1
Incidental CSS transforms only.

---

## 5. Code-based Testing — Vue JS

### Async testing — 0 · Mocking — 0 · Integration testing — 0 · Accessibility testing — 0
`vitest`, `@vue/test-utils`, and `@testing-library/vue` are installed, but **there are no test files in the repository.** This is the weakest area.

---

## 6. Design

### Design patterns — 3
A clear Repository pattern (`local` / `remote` / `operations`), a Sync Engine, and a service-layer background worker.
```
src/database/{local,remote,operations,sync}/   ← repository + sync orchestration
background/services/{progress,alarm,content,notification,message}Service.js  ← service layer
```

### Refactoring — 2
Evidence of deliberate restructuring (layered data module; commit `rename Views to views for case-sensitive filesystem compatibility`).

### Requirements elicitation — 1 · Requirement sources — 1
Captured only in prose docs/prompts, not in code structure.

---

## 7. Development Environments

### Environment setup — 3
Vite + `vue-tsc`, multiple `tsconfig.*`, ESLint flat config, `.env` handling, Firebase config.
```js
// eslint.config.js — flat config with vue + ts parsers
```

### Version control — 3
Active Git repo with feature branches (`ios-develop`, `main`) and a meaningful commit history.

### Code quality — 2
ESLint (flat config) + TypeScript with typed interfaces enforce quality; no CI gate.

### Dependency management — 2
npm with lockfile; clearly separated deps/devDeps.

### Containerization — 1
No `Dockerfile`/compose for the app itself (deploys via Firebase Hosting). Docker appears only as generated *learning content* in `scripts/post-format-code-containerization.mjs`.

### Code security — 1
Env-var config + HTML escaping, but hard-coded Firebase credentials in `scripts/` and no Firestore security rules file weaken this.

---

## 8. Cloud Environments

### Cloud access — 3
Firebase end-to-end: Firestore as the remote DB and Firebase Hosting for deploys.
```json
// firebase.json — SPA hosting with rewrites to /index.html
// package.json: "firebase:deploy": "npm run build && firebase deploy --only hosting"
```

---

## 10. Technical Process

### Technical debt — 1
Managed informally (inline notes, the unused-dependency situation). No tracked debt process.

---

## 12. Generative AI

### Prompt templates — 2 · AI integration — 2
A structured prompt pipeline (`prompts/0_main_orchestrator` → `2_ready_to_run` → `3_output` → `4_deploy_to_app`) feeds generated Q&A/code content that the `scripts/` then post-format and push to Firebase.

### Advanced prompting — 1
Implied by the orchestrator/coordinator prompt structure but not explicitly templated as named techniques.

### AI community engagement — 0
Not representable in code.

---

## Coverage Summary

| # | Skill | Category | Coverage (0–3) |
|---|-------|----------|:--:|
| 1 | Client-side storage | 1. Language – JS | 3 |
| 2 | Modules | 1. Language – JS | 3 |
| 3 | Async | 1. Language – JS | 3 |
| 4 | Concurrency | 1. Language – JS | 2 |
| 5 | Filesystem | 1. Language – JS | 2 |
| 6 | Date & time | 1. Language – JS | 3 |
| 7 | Data sending and retrieval | 1. Language – JS | 3 |
| 8 | Math | 1. Language – JS | 2 |
| 9 | Regex | 1. Language – JS | 2 |
| 10 | Security | 2. Framework – Vue | 2 |
| 11 | Custom events | 2. Framework – Vue | 2 |
| 12 | Internationalization | 2. Framework – Vue | 0 |
| 13 | State management | 2. Framework – Vue | 2 |
| 14 | Routing | 2. Framework – Vue | 3 |
| 15 | Forms | 2. Framework – Vue | 3 |
| 16 | Reusability | 2. Framework – Vue | 3 |
| 17 | Debugging | 2. Framework – Vue | 1 |
| 18 | Documentation | 3. Libraries – Vue | 1 |
| 19 | Package versioning | 3. Libraries – Vue | 2 |
| 20 | Localization | 3. Libraries – Vue | 1 |
| 21 | File upload | 3. Libraries – Vue | 0 |
| 22 | Image upload | 3. Libraries – Vue | 1 |
| 23 | Scroll detection | 3. Libraries – Vue | 0 |
| 24 | Utilities | 3. Libraries – Vue | 2 |
| 25 | Browser support | 3. Libraries – Vue | 1 |
| 26 | Network troubleshooting | 3. Libraries – Vue | 2 |
| 27 | Framework Http Client | 3. Libraries – Vue | 2 |
| 28 | Immutability | 3. Libraries – Vue | 3 |
| 29 | Data validation | 3. Libraries – Vue | 2 |
| 30 | Animations | 4. Markup & Styling | 1 |
| 31 | CSS methodologies | 4. Markup & Styling | 1 |
| 32 | Advanced layouts | 4. Markup & Styling | 2 |
| 33 | Responsive design | 4. Markup & Styling | 2 |
| 34 | Embedded content | 4. Markup & Styling | 1 |
| 35 | Preprocessors | 4. Markup & Styling | 1 |
| 36 | Transforms | 4. Markup & Styling | 1 |
| 37 | Async testing | 5. Testing – Vue | 0 |
| 38 | Mocking | 5. Testing – Vue | 0 |
| 39 | Integration testing | 5. Testing – Vue | 0 |
| 40 | Accessibility testing | 5. Testing – Vue | 0 |
| 41 | Requirements elicitation | 6. Design | 1 |
| 42 | Refactoring | 6. Design | 2 |
| 43 | Design patterns | 6. Design | 3 |
| 44 | Requirement sources | 6. Design | 1 |
| 45 | Environment setup | 7. Dev Environments | 3 |
| 46 | Containerization | 7. Dev Environments | 1 |
| 47 | Version control | 7. Dev Environments | 3 |
| 48 | Code quality | 7. Dev Environments | 2 |
| 49 | Dependency management | 7. Dev Environments | 2 |
| 50 | Code security | 7. Dev Environments | 1 |
| 51 | Cloud access | 8. Cloud Environments | 3 |
| 52 | Technical debt | 10. Technical Process | 1 |
| 53 | AI integration | 12. Generative AI | 2 |
| 54 | Advanced prompting | 12. Generative AI | 1 |
| 55 | Prompt templates | 12. Generative AI | 2 |
| 56 | AI community engagement | 12. Generative AI | 0 |

### Totals

- **Skills with any coverage (≥1):** 48 / 56 = **85.7%**
- **Skills well-covered (≥2):** 30 / 56 = **53.6%**
- **Skills strongly covered (3):** 12 / 56
- **Weighted score:** 105 / 168 points = **62.5% overall coverage**

### Biggest gaps
- **All of Code-based Testing (37–40)** — libraries installed, zero tests written.
- **Internationalization, File upload, Scroll detection, AI community engagement** — no evidence.
- **Containerization & Code security** — minimal; Docker only appears as learning content, and credentials are hard-coded in scripts.

### Strongest areas
- Data/storage architecture (storage, modules, async, immutability, design patterns, cloud access), routing, forms, reusability, and dev-environment setup.
