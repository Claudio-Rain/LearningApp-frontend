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

  for (const item of pending) {
    try {
      await remote.setExcludedItem(item)
      await local.updateExcludedItem({ ...item, syncStatus: 'synced' })
    } catch {
      await local.updateExcludedItem({ ...item, syncStatus: 'error' })
    }
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

export async function removeExcludedItem(id: string) {
  await local.deleteExcludedItem(id)
  if (navigator.onLine) {
    await remote.deleteExcludedItem(id)
  }
}
