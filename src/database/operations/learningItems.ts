import { formatISO, isAfter, parseISO } from 'date-fns'
import type { ItemLabelPatch, LearningItem } from '../types'
import * as local from '../local'
import * as remote from '../remote'

export async function pullLearningItems(collectionId: string) {
  try {
    const remoteItems = await remote.getLearningItems(collectionId)
    const localItems = await local.getLearningItems(collectionId)
    const localMap = new Map(localItems.map(i => [i.id, i]))

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
    for (const localItem of localItems) {
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

/**
 * Shared write path for the label setters below. Unlike editLearningItem this
 * never sends `content`: labeling runs over the whole library at once, so both
 * sides are partial writes. On failure (or offline) the item is left `pending`
 * and syncLearningItems() pushes it whole on the next run — heavier, but
 * correct.
 */
async function writeLabel(id: string, patch: ItemLabelPatch): Promise<string> {
  // One timestamp for both writes, so a later pull doesn't see the remote copy
  // as newer than the local one it was written from.
  const lastModified = formatISO(new Date())

  await local.updateLearningItemLabels(id, { ...patch, lastModified, syncStatus: 'pending' })
  if (!navigator.onLine) return lastModified

  try {
    await remote.updateLearningItemLabels(id, { ...patch, lastModified })
    await local.updateLearningItemLabels(id, { syncStatus: 'synced' })
  } catch {
    await local.updateLearningItemLabels(id, { syncStatus: 'error' })
  }
  return lastModified
}

/**
 * Set either label, or both at once. This is the single write path for labels —
 * the editor's pickers and any future automated labeler (the collection
 * assistant) go through here, so they can't drift on validation or syncing.
 *
 * Only the keys present in `patch` are written; omit a key to leave that label
 * as it is. Pass `null` to clear one. Returns the `lastModified` stamp written,
 * so callers can keep their in-memory copy of the item in step.
 */
export async function setLearningItemLabels(id: string, patch: ItemLabelPatch): Promise<string> {
  return writeLabel(id, patch)
}

/**
 * Set how much this item matters to the user's current goal (1-5). Re-run over
 * the whole library whenever that goal changes; see LearningItem.priority.
 */
export async function setLearningItemPriority(id: string, priority: number) {
  await writeLabel(id, { priority })
}

/**
 * Set how hard the card itself is (1-5), independent of the user's goal and of
 * how well they know it. Only goes stale when the item's content is edited.
 */
export async function setLearningItemDifficulty(id: string, difficulty: number) {
  await writeLabel(id, { difficulty })
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

  // Cascade: drop any excluded-item record pointing at this learning item.
  const excluded = await local.getAllExcludedItems()
  const match = excluded.find(e => e.learningItemId === id)
  if (match?.id) {
    await local.deleteExcludedItem(match.id)
    if (navigator.onLine) {
      await remote.deleteExcludedItem(match.id)
    }
  }

  await local.deleteLearningItem(id)
  if (navigator.onLine) {
    await remote.deleteLearningItem(id)
  }
}
