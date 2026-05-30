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
