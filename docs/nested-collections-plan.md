# Sub-collections — Implementation Plan

## Overview
A collection can hold its own learning items **and** other collections (sub-collections), at any depth, like pages inside pages in Notion. Frontend only for now (IndexedDB + Firestore); the .NET backend catches up later.

You organise by **drag & drop** in the Collections list: drop a collection onto another and it becomes its sub-collection, carrying everything inside it along.

**The one rule:**
> Choosing a collection (to study, for the widget, in Progress, in a study set…) always includes its sub-collections.

What gets saved is what you chose, not the expanded list — so a sub-collection added later is picked up automatically.

Example:
```
.NET developer
├─ Junior
│  ├─ C# language
│  └─ DB concepts   ☑
└─ Middle
   └─ DB concepts   ☑   → studies only these two, no duplicates
```

### Phases
| Phase | What |
|---|---|
| **1** | Sub-collections: data, drag & drop in the Collections list, every study path includes sub-collections, delete removes everything inside |
| 2 | Polish: breadcrumbs and sub-collection list in the collection view, reordering, per-collection totals in charts |
| 3 | Categories become top-level collections; `Category` goes away |
| 4 | Tags / properties, saved study sets |

---
## Phase 1

### 1.1 Data (`src/database/types.ts`)
```ts
export interface Collection extends Syncable {
  ...
  // The collection this one lives in. null/undefined = top level.
  // Choosing a collection anywhere in the app includes its sub-collections.
  parentId?: string | null
}
```
- **No data migration**: no `parentId` = top level, so every existing collection is already valid. No IndexedDB version bump.
- **Firestore rejects `undefined`** (`setCollection` passes the object straight to `setDoc`). Write `parentId: null` or leave the key out — never `parentId: undefined`.
- `numberOfItems` stays the collection's **own** item count. Totals including sub-collections are computed when shown, never stored.

### 1.2 Helpers (`src/utils/subCollections.ts`)
Pure functions, no database access, so they can be unit-tested like `studySet.ts`.

| Function | Does |
|---|---|
| `withSubCollections(ids, collections): Set<string>` | The chosen ids plus every sub-collection under them, no duplicates. |
| `canMoveInto(id, targetId, collections)` | `false` when the target is the collection itself or one of its sub-collections. |
| `collectionPath(id, collections)` | `"Junior › DB concepts"` — tells apart collections with the same name. |

Two sync edge cases are handled inside them, not exposed: a collection whose parent was deleted on another device shows at the top level, and two devices moving A into B and B into A at the same time can never loop.

**Tests** — `tests/utils/subCollections.test.ts`:
- no `parentId` anywhere ⇒ `withSubCollections(ids)` returns exactly `ids` ← nothing changes for today's data
- deep nesting; parent + child chosen ⇒ no duplicates
- missing parent ⇒ top level; A↔B loop ⇒ terminates
- `canMoveInto` rejects itself and its own sub-collections
- `collectionPath` with the same name in different branches

### 1.3 Places that load items for chosen collections
Today they all call `getLearningItems(id)` per collection (exact id only). New pattern, also cheaper (one read instead of one per collection):
```ts
const ids = withSubCollections(chosenIds, await getCollections())
const items = (await getAllLearningItems()).filter(i => ids.has(i.collectionId))
```

| # | File | Change |
|---|---|---|
| 1 | `src/views/StudyView.vue` `loadData` (~L940-960) | Include sub-collections. The header still shows what was chosen. |
| 2 | `src/views/StudyView.vue` `createCards` (~L1158) | A card created in a sub-collection must join the current session too. |
| 3 | `background/services/contentService.js` (~L28-52) | Widget includes sub-collections. |
| 4 | `background/services/notificationService.js` (~L11-14) | Notifications include sub-collections. |
| 5 | `src/views/studyProgress/composables/useProgressData.ts` (~L39, ~L84) | Progress filter includes sub-collections. |
| 6 | `src/views/studyOptions/composables/useCollectionCatalog.ts` | Keep `parentId` on the catalog collections; one `getAllLearningItems()`. |
| 7 | `src/views/studyOptions/components/StudySetAssistant.vue` (~L369) | "Study whole collections" includes sub-collections. |
| 8 | `src/views/studyOptions/composables/useExclusionTable.ts` (~L64) | Counts include sub-collections. |

Unchanged: `AppBar.vue` (finds the collection of the last studied item — its own collection is right), `CollectionItemView.vue` (still shows the collection's own items), `collectionOverviewChart.ts` (own counts until Phase 2).

### 1.4 Study sets
`resolveStudySet` (`studySet.ts`) divides cards by each item's `collectionId`. It stays untouched; before calling it, each item is counted under **the chosen collection it belongs to**:
- choose `Junior` ⇒ cards from C# and DB count as Junior's share
- choose `Junior` **and** `Junior › DB concepts` ⇒ DB gets its own share (so "at most 5 from DB" works) and Junior keeps the rest

`balanced`, limits and totals work as today. Study View still saves the chosen collections, not the expanded list.

### 1.5 Showing which "DB concepts" is which
Wherever collections are picked or listed by name, show `collectionPath` instead of the bare title:
- `src/shared/components/CollectionMultiSelect.vue` (Study View, widget, Progress selectors)
- Study View's "add card" collection picker
- The assistants: `studySetAssistant.ts` (collections listed with their path + card count including sub-collections, and the `collection_ids` description says *"Choosing a collection includes its sub-collections; to study part of it, choose the specific sub-collections."*) and `collectionListAssistant.ts`. Update their tests.

### 1.6 Collections list: drag & drop (`src/views/CollectionListView.vue`)
- Sub-collections show **indented under their parent**, with an expand/collapse arrow. Item count shows own items, with the total including sub-collections when it differs.
- **Drag a collection onto another** ⇒ it becomes its sub-collection, with everything inside it. Targets that `canMoveInto` rejects don't highlight.
- **Drag onto the top of the list** ("Move to top level" drop zone, visible only while dragging) ⇒ back to top level.
- Native HTML5 drag & drop; no new dependency.
- Sorting stays as today (starred first, then title), applied within each level.

### 1.7 Delete removes everything inside
`removeCollection` (`src/database/operations/collections.ts`) deletes the collection, **all its sub-collections, and all their learning items** (each through `removeLearningItem`, so progress and attempt logs go too, as today).

The confirmation states what will be lost:
> Delete "Junior"? This also deletes 2 sub-collections and 84 learning items.

### 1.8 Other writes
| File | Change |
|---|---|
| `useCollectionItems.ts` `moveItems` (~L113) | A new collection created while moving items is placed next to the current one (same `parentId`). |
| `CollectionListView` `handleAdd`, `BulkInsertView`, `HtmlBulkInsertView` | Create with `parentId: null`. |
| `BulkInsertView.vue` `resolveCollection` (~L513) | Matches by title, which can now repeat: match top-level collections only. |
| Categories | Only apply to top-level collections. A collection dropped into another loses its category and is shown with its top-level collection's. |

---
## Regression checklist (Phase 1)

**A** is the critical one: with nothing nested, everything behaves exactly as today.

### Automated
- [ ] `npm test` — existing tests green + `subCollections.test.ts`
- [ ] `npm run build` (vue-tsc), no type errors
- [ ] `npm run lint`

### A — current data, nothing nested
| View | Check |
|---|---|
| Collections | List, category filter, star, edit description, create, delete, Pull |
| Collection | View items, add, edit, move to another / a new collection, delete |
| Study View | One collection; several (`/study/a,b`); saved selection; Enter from AppBar; add card from dialog and from chat |
| Study Options | Study View selector; widget; study set via assistant (balanced + limit); excluded items |
| Progress | All / some collections, charts, stats, selection restored on reload |
| Bulk / HTML bulk insert | New and existing collection, with category |
| Extension | Widget advances and respects exclusions; notifications; add card from the page panel |
| Sync | Create/edit/delete offline ⇒ online ⇒ no Firestore `undefined` errors |

### B — nested
Drag to build `.NET › Junior › {C#, DB}` and `.NET › Middle › DB`.
- [ ] Dragging a collection carries its sub-collections; it can't be dropped into itself or its own sub-collections
- [ ] Dropping on "Move to top level" brings it back
- [ ] Study View with `.NET` ⇒ every item in it, no duplicates
- [ ] Study View with `Junior › DB` + `Middle › DB` ⇒ only those; selectors show the paths
- [ ] Parent + child chosen ⇒ no duplicates
- [ ] New sub-collection under a chosen collection ⇒ appears in Study View without re-choosing
- [ ] Card created from Study View in a sub-collection ⇒ joins the session
- [ ] Widget and notifications with a parent chosen ⇒ serve sub-collection items
- [ ] Progress filtered by a parent ⇒ includes sub-collections
- [ ] Study set: `Junior` + `Junior › DB`, at most 5 from DB ⇒ correct split
- [ ] Assistant: "study DB concepts from junior and middle" ⇒ proposes those two
- [ ] Delete `Junior` ⇒ confirmation shows counts; C#, DB and all their items (and progress) are gone
- [ ] Two browsers: the nesting syncs; a parent deleted in one ⇒ nothing left dangling in the other

---
## Phase 2 — Polish (sketch)
- Collection view: breadcrumbs (`.NET › Junior`) and its sub-collections listed above the items.
- Manual reordering by drag & drop within a level (needs an `order` field).
- `collectionOverviewChart`: optionally totals including sub-collections.
- Bulk insert accepting paths (`Junior/DB concepts`).

## Phase 3 — Categories ⇒ top-level collections (sketch)
One-off migration: each category becomes a top-level collection (same title and colour); collections in it move inside. Then remove the categories store, dialog, chip filter and `categoryId`.

## Phase 4 — Tags / properties / saved study sets (sketch)
