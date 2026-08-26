import { formatISO } from 'date-fns'
import { isAfter, parseISO } from 'date-fns'
import type { ExcludedItem } from '../types'
import * as local from '../local'
import * as remote from '../remote'

export async function pullExcludedItems() {
  try {
    const remoteItems = await remote.getExcludedItems()
    const localItems = await local.getAllExcludedItems()
    const localMap = new Map(localItems.map(i => [i.id, i]))

    for (const remoteItem of remoteItems) {
      const localItem = localMap.get(remoteItem.remoteId || remoteItem.id)

      if (localItem?.syncStatus === 'pending' || localItem?.syncStatus === 'error') {
        continue
      }

      if (!localItem || isAfter(parseISO(remoteItem.lastModified), parseISO(localItem.lastModified))) {
        const syncStatus = localItem ? 'synced' : remoteItem.syncStatus
        await local.updateExcludedItem({ ...remoteItem, id: remoteItem.remoteId || remoteItem.id, syncStatus })
      } else if (localItem && !localItem.syncStatus) {
        await local.updateExcludedItem({ ...localItem, syncStatus: 'synced' })
      }
    }

    const remoteIds = new Set(remoteItems.map(r => r.remoteId || r.id))
    for (const localItem of localItems) {
      if (localItem.id && !remoteIds.has(localItem.id) && (localItem.syncStatus === 'synced' || localItem.syncStatus === undefined)) {
        await local.deleteExcludedItem(localItem.id)
      }
    }
  } catch (err) {
    console.error('Failed to pull excluded items:', err)
  }
}

// Push locally-pending/errored excluded items up to Firestore. Mirrors
// pushContentWidget(); used by both syncAll() and the two-way syncExcludedItems().
export async function pushExcludedItems() {
  const items = await local.getAllExcludedItems()
  const pending = items.filter(i => i.syncStatus === 'pending' || i.syncStatus === 'error')
  if (pending.length === 0) return

  // Batched: one round trip per 500 rows rather than one per row. Building a
  // study set can leave hundreds pending at once, and the per-row loop this
  // replaces took that many sequential requests to drain.
  try {
    await remote.setExcludedItems(pending)
    await local.updateExcludedItems(pending.map(i => ({ ...i, syncStatus: 'synced' as const })))
  } catch {
    // A failed batch wrote none of its rows; leave them for the next sync.
    await local.updateExcludedItems(pending.map(i => ({ ...i, syncStatus: 'error' as const })))
  }
}

// Full two-way sync of excluded items: pull remote → local (last-write-wins by
// lastModified, never clobbering pending local edits), then push pending
// local → remote. Cheap enough for a view to call on entry.
export async function syncExcludedItems() {
  if (!navigator.onLine) return
  await pullExcludedItems()
  await pushExcludedItems()
}

export async function createExcludedItem(learningItemId: string) {
  const now = formatISO(new Date())
  const id = await local.addExcludedItem({
    learningItemId,
    dateCreated: now,
    lastModified: now,
    syncStatus: 'pending'
  } as ExcludedItem)

  if (navigator.onLine) {
    try {
      const item = await local.getExcludedItem(String(id))
      if (item) {
        await remote.addExcludedItem(item)
        await local.updateExcludedItem({ ...item, syncStatus: 'synced' })
      }
    } catch {
      // stays as pending, syncAll will retry
    }
  }

  return id
}

/**
 * Exclude many items at once — the write path behind building a study set,
 * which excludes everything the set filtered out.
 *
 * Local-first and deliberately so: the rows land in one IndexedDB transaction
 * and the function returns, so the set is usable immediately. The remote push
 * is batched (one round trip per 500) and its failure is not the caller's
 * problem — anything unsent stays `pending` and the next sync drains it.
 *
 * Ids already excluded are skipped, so re-running a set is not a duplicate.
 */
export async function createExcludedItems(learningItemIds: string[]): Promise<ExcludedItem[]> {
  const existing = await local.getAllExcludedItems()
  const alreadyExcluded = new Set(existing.map(i => i.learningItemId))
  const toAdd = [...new Set(learningItemIds)].filter(id => id && !alreadyExcluded.has(id))
  if (toAdd.length === 0) return []

  const now = formatISO(new Date())
  const rows = await local.addExcludedItems(
    toAdd.map(learningItemId => ({
      learningItemId,
      dateCreated: now,
      lastModified: now,
      syncStatus: 'pending'
    }) as ExcludedItem)
  )

  if (navigator.onLine) {
    try {
      await remote.setExcludedItems(rows)
      await local.updateExcludedItems(rows.map(r => ({ ...r, syncStatus: 'synced' as const })))
    } catch {
      // Stays pending; syncExcludedItems() retries.
    }
  }

  return rows
}

/** Remove many exclusions at once. Mirrors createExcludedItems. */
export async function removeExcludedItems(ids: string[]): Promise<void> {
  for (const id of ids) {
    await local.deleteExcludedItem(id)
  }
  if (navigator.onLine) {
    await Promise.allSettled(ids.map(id => remote.deleteExcludedItem(id)))
  }
}

export async function removeExcludedItem(id: string) {
  await local.deleteExcludedItem(id)
  if (navigator.onLine) {
    await remote.deleteExcludedItem(id)
  }
}
