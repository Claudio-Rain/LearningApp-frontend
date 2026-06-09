# Content Widget Options — Remote Persistence Plan

## Overview
The **content widget option** — the set of collections the widget studies from
(`contentCollectionIds`) — is currently saved **only** in `chrome.storage.local`, so it doesn't
survive a profile reset and doesn't follow the user across devices. This plan adds **remote
persistence in Firestore** as the cross-device source of truth, while keeping `chrome.storage.local`
as the fast local cache that the background worker and content script already read synchronously.

### Scope — content widget only
**In scope:** `contentCollectionIds` (`string[]`) — written today from
`StudyOptionsView.saveNotificationSettings()` and read by `contentService.fetchNextContentItem()`.

**Out of scope (do NOT touch):** `notificationCollectionId`, `sessionStartHour`, `sessionEndHour`,
`notificationIntervalSeconds`, `studyViewCollectionId`, and all runtime/session keys
(`content_session`, `content_learning_item_id`, `notification_learning_item_id`, `panelPosition`,
`darkMode`). These stay exactly as they are.

### Key difference vs. the Excluded Items plan
Excluded items are a **list of entities**, so they got IndexedDB + Firestore + the full sync engine.
This is a **single value** (one array), and `chrome.storage.local` already provides the
offline-durable local copy that every consumer reads. So:

- **No IndexedDB store, no new object store, no DB version bump.**
- Local store = `chrome.storage.local` (unchanged consumers).
- Remote store = **one Firestore document** (singleton).
- Reconciliation = `lastModified`-wins, tracked with a single `lastModified` string and a `pending`
  flag in `chrome.storage.local`.

---

## Architecture / Data flow

```
                         write (save)                 push (online or sync)
StudyOptionsView ────────────────────────► chrome.storage.local ──────────────► Firestore
   (Vue UI)                                contentCollectionIds              app_settings/content_widget
                                                  ▲                                   │
            background worker / content.js ───────┘                                   │
              (getStudySettings reads cache)                                          │
                                                  ▲             pull (startup/syncAll) │
                                                  └───────────────────────────────────┘
                                                       (lastModified-wins → cache)
```

- **Source of truth across devices:** the Firestore singleton doc.
- **Source of truth on a device (synchronous reads):** `chrome.storage.local`.
- Background worker and content script keep reading `chrome.storage.local` — **no changes to their
  read path required.** They simply see synced values after a pull hydrates the cache.

---

## Phase 1 — Data Layer

### 1.1 Type definition (`src/database/types.ts`)
Add a small interface. It carries `lastModified` for conflict resolution; no `id`/`syncStatus`
because it is a singleton living in `chrome.storage.local`, not the IndexedDB sync tables.

```ts
export interface ContentWidgetSettings {
  contentCollectionIds: string[]
  lastModified: string   // ISO — drives lastModified-wins reconciliation
}
```

### 1.2 Remote CRUD (`src/database/remote/contentWidget.ts`) — **new**
A single fixed Firestore document. Mirror the Firestore-import style of `remote/excludedItems.ts`.

```ts
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { ContentWidgetSettings } from '../types'

const SETTINGS_DOC = doc(db, 'app_settings', 'content_widget')

export async function getContentWidgetSettings(): Promise<ContentWidgetSettings | null> {
  const snap = await getDoc(SETTINGS_DOC)
  return snap.exists() ? (snap.data() as ContentWidgetSettings) : null
}

export async function setContentWidgetSettings(settings: ContentWidgetSettings): Promise<void> {
  await setDoc(SETTINGS_DOC, settings)
}
```

- Collection `app_settings`, doc id `content_widget` (fixed singleton — consistent with the app's
  current non-user-scoped Firestore usage). If per-user scoping is added later, swap the doc id for
  the user id.
- Export from `src/database/remote/index.ts`.

### 1.3 Local cache accessor (`src/database/local/contentWidget.ts`) — **new**
Thin wrapper over `chrome.storage.local` so the operations layer doesn't poke chrome APIs directly
and so it no-ops cleanly outside the extension. **Only touches the content-widget keys.**

```ts
import type { ContentWidgetSettings } from '../types'

export async function getLocalContentWidget(): Promise<{
  contentCollectionIds?: string[]; lastModified?: string; pending?: boolean
}> { /* chrome.storage.local.get(['contentCollectionIds', 'contentWidgetLastModified', 'contentWidgetPending']) */ }

export async function setLocalContentWidget(
  settings: ContentWidgetSettings, opts?: { pending?: boolean }
): Promise<void> {
  /* chrome.storage.local.set({
       contentCollectionIds, contentWidgetLastModified, contentWidgetPending
     }) — leaves all other keys untouched */
}

export async function markContentWidgetSynced(): Promise<void> {
  /* chrome.storage.local.set({ contentWidgetPending: false }) */
}
```

- Guard every call with `typeof chrome !== 'undefined' && chrome.storage` (matches existing code).
- Export from `src/database/local/index.ts`.

### 1.4 Operations layer (`src/database/operations/contentWidget.ts`) — **new**
Mirror the role of `operations/excludedItems.ts` (pull + write), adapted for a singleton.

```ts
import { formatISO, isAfter, parseISO } from 'date-fns'
import type { ContentWidgetSettings } from '../types'
import * as local from '../local'
import * as remote from '../remote'

// Pull remote → cache, lastModified-wins. If a local change is pending, push it instead.
export async function pullContentWidget() {
  try {
    const localS = await local.getLocalContentWidget()
    const remoteS = await remote.getContentWidgetSettings()

    if (localS.pending) {            // local edit not yet pushed → push, don't clobber
      await pushContentWidget()
      return
    }
    if (!remoteS) return             // nothing remote yet
    if (!localS.lastModified ||
        isAfter(parseISO(remoteS.lastModified), parseISO(localS.lastModified))) {
      await local.setLocalContentWidget(remoteS, { pending: false })
    }
  } catch (err) {
    console.error('Failed to pull content widget settings:', err)
  }
}

// Persist a user change: write cache immediately, push to remote if online (else stays pending).
export async function saveContentWidget(contentCollectionIds: string[]) {
  const settings: ContentWidgetSettings = {
    contentCollectionIds,
    lastModified: formatISO(new Date()),
  }
  await local.setLocalContentWidget(settings, { pending: true })
  if (navigator.onLine) {
    try {
      await remote.setContentWidgetSettings(settings)
      await local.markContentWidgetSynced()
    } catch {
      // stays pending; syncAll will retry
    }
  }
}

// Retry path used by the sync engine.
export async function pushContentWidget() {
  const localS = await local.getLocalContentWidget()
  if (!localS.pending || !localS.lastModified || !localS.contentCollectionIds) return
  await remote.setContentWidgetSettings(localS as ContentWidgetSettings)
  await local.markContentWidgetSynced()
}
```

- Export from `src/database/operations/index.ts`.

### 1.5 Sync engine (`src/database/sync/syncEngine.ts`)
- Add `pullContentWidget()` to `syncAll()` (in the pull group).
- Add `pushContentWidget()` to `syncAll()` (in the push group) so offline edits flush on reconnect.

### 1.6 Public database export (`src/database/index.ts`)
Re-export `pullContentWidget`, `saveContentWidget`, `pushContentWidget`, and the
`ContentWidgetSettings` type.

---

## Phase 2 — UI wiring (`src/views/StudyOptionsView.vue`)

`saveNotificationSettings()` currently writes **all** settings in one
`chrome.storage.local.set({...})`. **Keep that call as-is for the other keys**, and additionally
route `contentCollectionIds` through `saveContentWidget()` so it also pushes to remote and gets the
`lastModified`/`pending` bookkeeping.

```ts
// existing set() keeps the other (out-of-scope) keys:
await chrome.storage.local.set({
  notificationCollectionId: notificationCollectionId.value,
  sessionStartHour: startHour.value,
  sessionEndHour: endHour.value,
  notificationIntervalSeconds: intervalSeconds.value,
})
// content widget only → cache + remote:
await saveContentWidget([...contentCollectionIds.value])
```

> `saveContentWidget` writes `contentCollectionIds` itself, so drop that key from the bulk `set()`
> to avoid a double write / racing `lastModified`.

**Loading:** in `onMounted`, before the existing `chrome.storage.local.get([...])`, call
`await pullContentWidget()` so a freshly-installed device hydrates `contentCollectionIds` from
Firestore first. The rest of the load (including the stale-collection-ID filtering already guarding
`contentCollectionIds`) stays unchanged.

---

## Phase 3 — Cross-device hydration for the background worker

The background worker reads `chrome.storage.local` via `getStudySettings()` and never runs the Vue
`onMounted` pull. On a fresh device the cache may be empty until the user opens the SPA. Recommended
minimal fix: call `pullContentWidget()` from the background **startup** path (where
`initializeAlarms()` / sync is kicked off). The worker already imports from `src/database`, so it's
a one-line import + call. (Only hydrates `contentCollectionIds`; nothing else changes.)

---

## Phase 4 — Edge cases & notes

- **Offline save:** `saveContentWidget` writes the cache and sets `contentWidgetPending: true`; the
  widget keeps working from cache; `syncAll()` flushes via `pushContentWidget()` on reconnect.
- **Conflict (two devices):** `lastModified`-wins on pull. Acceptable for a single selection.
- **Stale collection IDs:** unchanged — validated against existing collections on load
  (StudyOptionsView) and in `contentService.fetchNextContentItem`. See `study-collection-preference`
  memory.
- **No DB migration:** no IndexedDB store and no `db.ts` version bump.
- **Other settings untouched:** notifications, session hours, and study-view collection keep their
  current chrome.storage.local-only behavior.

---

## File summary

| File | Action |
|---|---|
| `src/database/types.ts` | Add `ContentWidgetSettings` interface |
| `src/database/remote/contentWidget.ts` | **New** — singleton Firestore doc get/set |
| `src/database/remote/index.ts` | Re-export |
| `src/database/local/contentWidget.ts` | **New** — chrome.storage.local cache accessors (content keys only) |
| `src/database/local/index.ts` | Re-export |
| `src/database/operations/contentWidget.ts` | **New** — pull / save / push |
| `src/database/operations/index.ts` | Re-export |
| `src/database/sync/syncEngine.ts` | Add pull + push to `syncAll()` |
| `src/database/index.ts` | Re-export ops + type |
| `src/views/StudyOptionsView.vue` | Route `contentCollectionIds` through `saveContentWidget` + `pullContentWidget` on load |
| `background/` startup | Call `pullContentWidget()` on boot |
```
