import { isAfter, parseISO } from 'date-fns'
import type { LearningItem } from '../types'
import * as local from '../local'
import * as remote from '../remote'

export async function pullLearningItems(collectionId: string) {
  try {
    const remoteItems = await remote.getLearningItems(collectionId)
    const localItems = await local.getLearningItems(collectionId)
    const localMap = new Map(localItems.map(i => [i.id, i]))

    for (const remoteItem of remoteItems) {
      const localItem = localMap.get(remoteItem.remoteId || remoteItem.id)

      if (localItem?.syncStatus === 'pending') {
        continue
      }

      if (!localItem || isAfter(parseISO(remoteItem.lastModified), parseISO(localItem.lastModified))) {
        await local.updateLearningItem({ ...remoteItem, id: remoteItem.remoteId || remoteItem.id })
      }
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
