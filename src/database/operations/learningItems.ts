import { formatISO } from 'date-fns'
import type { ItemLabelPatch, LearningItem } from '../types'
import * as local from '../local'
import * as remote from '../remote'
import { planLearningItemsPull } from '../sync/mergeLearningItems'

async function applyPull(collectionIds: ReadonlySet<string>, remoteItems: LearningItem[]) {
  await local.reconcileLearningItems(localItems =>
    planLearningItemsPull(collectionIds, remoteItems, localItems)
  )
}

export async function pullLearningItems(collectionId: string) {
  try {
    await applyPull(new Set([collectionId]), await remote.getLearningItems(collectionId))
  } catch (err) {
    console.error('Failed to pull learning items:', err)
  }
}

/**
 * Pull the items of every local collection: one Firestore query and one
 * IndexedDB transaction, instead of a query and a full store scan per
 * collection. Remote items of collections this device doesn't have are skipped.
 */
export async function pullAllLearningItems() {
  try {
    const collectionIds = new Set(
      (await local.getCollections()).map(c => c.id).filter((id): id is string => !!id)
    )
    if (collectionIds.size === 0) return
    const remoteItems = (await remote.getAllLearningItems()).filter(i => collectionIds.has(i.collectionId))
    await applyPull(collectionIds, remoteItems)
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

/**
 * Save new list positions from a drag (see utils/itemOrder.ts). Like the
 * labels, a partial write on both sides. If we're offline or the remote write
 * fails (e.g. an item that was never pushed, which a batch update can't
 * create) the items stay `pending`, so syncLearningItems() pushes them whole.
 * Returns the `lastModified` stamp written.
 */
export async function setLearningItemPositions(writes: { id: string; position: number }[]): Promise<string> {
  const lastModified = formatISO(new Date())
  if (writes.length === 0) return lastModified

  for (const { id, position } of writes) {
    await local.updateLearningItemPosition(id, { position, lastModified, syncStatus: 'pending' })
  }
  if (!navigator.onLine) return lastModified

  try {
    await remote.updateLearningItemPositions(writes, lastModified)
  } catch {
    return lastModified
  }
  for (const { id } of writes) {
    await local.updateLearningItemPosition(id, { syncStatus: 'synced' })
  }
  return lastModified
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
