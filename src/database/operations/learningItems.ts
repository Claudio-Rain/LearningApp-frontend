import { isAfter, parseISO } from 'date-fns'
import type { LearningItem } from '../types'
import * as local from '../local'
import * as remote from '../remote'

export async function pullLearningItems(collectionId: string) {
  try {
    const remoteItems = await remote.getLearningItems(collectionId)
    const localItems = await local.getLearningItems(collectionId)
    const localMap = new Map(localItems.map(i => [i.id, i]))

    // Log only for Data Sending and Retrieval collection
    if (collectionId === '6PC8xL7Fe0rNDy6P8pt8') {
      console.log('Remote items:', remoteItems)
      console.log('Local items:', localItems)
    }

    for (const remoteItem of remoteItems) {
      const localItem = localMap.get(remoteItem.remoteId || remoteItem.id)

      if (localItem?.syncStatus === 'pending' || localItem?.syncStatus === 'error') {
        continue
      }

      if (!localItem || isAfter(parseISO(remoteItem.lastModified), parseISO(localItem.lastModified))) {
        const syncStatus = localItem ? 'synced' : remoteItem.syncStatus
        await local.updateLearningItem({ ...remoteItem, id: remoteItem.remoteId || remoteItem.id, syncStatus })
      } else if (localItem && !localItem.syncStatus) {
        await local.updateLearningItem({ ...localItem, syncStatus: 'synced' })
      }
    }

    // Cases 2-4: check local items that vanished from remote
    const remoteIds = new Set(remoteItems.map(r => r.remoteId || r.id))
    console.log('[pull] remoteIds:', [...remoteIds])
    for (const localItem of localItems) {
      console.log('[pull] localItem', localItem.id, 'syncStatus:', localItem.syncStatus, 'inRemote:', remoteIds.has(localItem.id!))
      if (localItem.id && !remoteIds.has(localItem.id) && (localItem.syncStatus === 'synced' || localItem.syncStatus === undefined)) {
        await local.deleteLearningItem(localItem.id)
      }
      // pending/error items are preserved (Cases 3 & 4)
    }
  } catch (err) {
    console.error('Failed to pull learning items:', err)
  }
}

export async function createLearningItem(data: Omit<LearningItem, 'id' | 'syncStatus'>) {
  return local.addLearningItem({
    ...data,
    syncStatus: 'pending'
  })
}

export async function editLearningItem(item: LearningItem) {
  await local.updateLearningItem({ ...item, syncStatus: 'pending' })
  if (navigator.onLine) {
    await remote.setLearningItem(item)
    await local.updateLearningItem({ ...item, syncStatus: 'synced' })
  }
}

export async function removeLearningItem(id: string) {
  // Cascade: drop card progress for this item (single row keyed by learning_item_id).
  const progress = await local.getCardProgress(id)
  if (progress?.id) {
    await local.deleteCardProgress(progress.id)
    if (navigator.onLine) {
      await remote.deleteCardProgress(progress.id)
    }
  }

  // Cascade: drop all attempt logs for this item.
  await local.deleteAttemptLogsByItemId(id)
  if (navigator.onLine) {
    await remote.deleteAttemptLogsByItemId(id)
  }

  await local.deleteLearningItem(id)
  if (navigator.onLine) {
    await remote.deleteLearningItem(id)
  }
}
