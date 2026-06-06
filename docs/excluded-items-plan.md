# Excluded Learning Items — Implementation Plan
## Overview
A global "excluded items" list stored as its own entity (IndexedDB + Firestore), synced like every other entity, and injected as a filter into all study algorithms. Managed from a single section at the bottom of StudyOptionsView.

---
## Phase 1 — Data Layer
### 1.1 Type definition (`src/database/types.ts`)
Add the new interface:
```ts
export interface ExcludedItem extends Syncable {
  id?: string
  learningItemId: string   // FK to LearningItem
  dateCreated: string
  lastModified: string
}

```
### 1.2 IndexedDB store (`src/database/local/db.ts`)
- Bump DB version to **5**
- Add `excluded_items` object store with `keyPath: 'id'` in the `oldVersion < 5` migration block

### 1.3 Local CRUD (`src/database/local/excludedItems.ts`)
Mirror the pattern from `learningItems.ts`:
- `getAllExcludedItems(): Promise<ExcludedItem[]>`
- `getExcludedItem(id): Promise<ExcludedItem | undefined>`
- `addExcludedItem(item): Promise<IDBValidKey>`
- `deleteExcludedItem(id): Promise<void>`
- `updateExcludedItem(item): Promise<void>`

Export from `src/database/local/index.ts`.

### 1.4 Remote CRUD (`src/database/remote/excludedItems.ts`)
Mirror the pattern from `remote/learningItems.ts` using Firestore collection `excluded_items`:
- `getExcludedItems(): Promise<ExcludedItem[]>` (all for current user — no collectionId filter needed)
- `addExcludedItem(item)`
- `deleteExcludedItem(remoteId)`
- `setExcludedItem(item)`

Export from `src/database/remote/index.ts`.

### 1.5 Operations layer (`src/database/operations/excludedItems.ts`)
Mirror the pattern from `operations/learningItems.ts`:
- `pullExcludedItems()` — pull from remote, reconcile with local (same lastModified-wins logic)
- `createExcludedItem(learningItemId)` — write local as `pending`, return id
- `removeExcludedItem(id)` — delete local + remote if online
- No "edit" needed — an excluded item either exists or it doesn't

Export from `src/database/operations/index.ts`.

### 1.6 Sync engine (`src/database/sync/syncEngine.ts`)
- Add `syncExcludedItems()` — same pending-loop pattern as `syncLearningItems()`
- Add `pullExcludedItems()` call inside `syncAll()`
- Add `syncExcludedItems()` call inside `syncAll()`

### 1.7 Public database export (`src/database/index.ts`)
Re-export `createExcludedItem`, `removeExcludedItem`, `pullExcludedItems`.

---
## Phase 2 — Composable

### `src/composables/useExcludedItems.ts`
Single source of truth for the UI:
```ts
const excludedItemIds = ref<Set<string>>(new Set())

async function load() { /* getAllExcludedItems → populate set */ }
async function toggleExclusion(learningItemId, exclude: boolean) { /* create or remove */ }
function isExcluded(learningItemId) { return excludedItemIds.value.has(learningItemId) }
```
This composable is imported wherever items need to be filtered.

---

## Phase 3 — StudyOptionsView UI

Add a new section **below** the three collection selectors and **above** the time/interval selectors:

```
[ Excluded Items ]
Collection to browse: [ dropdown — defaults to studyViewCollectionId ]

[ checklist of items from selected collection ]
  ☑ "Photosynthesis"
  ☐ "Mitosis"
  ☑ "Cell membrane"

  0 excluded / 12 total
```

- The collection dropdown pre-fills from `studyViewCollectionId`
- Checklist items load from `getLearningItems(selectedCollectionId)`
- Checked = **excluded** (inverted from the usual checkbox meaning — consider labeling it clearly)
- Toggling a checkbox calls `toggleExclusion()` from the composable
- No extra Save button needed — changes are immediate

---

## Phase 4 — Inject into study algorithms

Every place that builds a `studyQueue` or picks an item to display needs one extra filter step.

### 4.1 StudyView (`src/views/StudyView.vue`)
After loading `learningItems`, filter before building `studyQueue`:
```ts
const { excludedItemIds } = useExcludedItems()
// ...
const filtered = learningItems.value.filter(i => !excludedItemIds.value.has(i.id!))
```

### 4.2 Content widget (`src/content.js`)
Reads `contentCollectionId` from `chrome.storage.local`. Add `excludedItemIds` to the same storage key. When picking a random item to display, filter the list before selection.

### 4.3 Background / notifications (`src/background.js`)
Same approach — read `excludedItemIds` from `chrome.storage.local` and filter before picking the notification item.

### 4.4 Sync excluded IDs to chrome.storage
In the composable (or in `saveNotificationSettings`), whenever `excludedItemIds` changes, persist the raw array to `chrome.storage.local` under `excludedItemIds` so `content.js` and `background.js` can read it synchronously.

---

## Phase 5 — Cascade on LearningItem deletion

In `operations/learningItems.ts` → `removeLearningItem()`, add cleanup:
```ts
const excluded = await local.getAllExcludedItems()
const match = excluded.find(e => e.learningItemId === id)
if (match?.id) {
  await local.deleteExcludedItem(match.id)
  if (navigator.onLine) await remote.deleteExcludedItem(match.id)
}
```
This prevents stale exclusions for deleted items.

---

## File summary

| File | Action |
|---|---|
| `database/types.ts` | Add `ExcludedItem` interface |
| `database/local/db.ts` | Bump to v5, add store |
| `database/local/excludedItems.ts` | New |
| `database/local/index.ts` | Re-export |
| `database/remote/excludedItems.ts` | New |
| `database/remote/index.ts` | Re-export |
| `database/operations/excludedItems.ts` | New |
| `database/operations/index.ts` | Re-export |
| `database/sync/syncEngine.ts` | Add sync + pull calls |
| `database/index.ts` | Re-export operations |
| `composables/useExcludedItems.ts` | New |
| `views/StudyOptionsView.vue` | Add exclusion section |
| `views/StudyView.vue` | Filter studyQueue |
| `content.js` | Filter item selection |
| `background.js` | Filter item selection |
| `operations/learningItems.ts` | Cascade delete |
