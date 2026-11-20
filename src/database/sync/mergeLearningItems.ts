import { isAfter, parseISO } from 'date-fns'
import type { LearningItem } from '../types'

export interface LearningItemsPullPlan {
  puts: LearningItem[]
  deletes: string[]
}

/**
 * Decide what a pull writes locally, without touching the database, so the
 * whole pull can be applied in one IndexedDB transaction.
 *
 * `collectionIds` are the collections being pulled; `remoteItems` must be the
 * remote items of exactly those collections. `localItems` is the whole local
 * store: an item another device moved between two pulled collections is then
 * matched by id (and updated) rather than deleted from one and re-added in the
 * other. Only local items in a pulled collection are candidates for deletion.
 *
 * Rules (see docs/sync-deletion-cases.md):
 * - `pending` / `error` local items are never overwritten or deleted.
 * - A remote item newer than the local one (or missing locally) is written.
 * - A local item without a syncStatus that's already up to date is marked synced.
 * - A synced (or status-less) local item missing from remote is deleted.
 */
export function planLearningItemsPull(
  collectionIds: ReadonlySet<string>,
  remoteItems: LearningItem[],
  localItems: LearningItem[],
): LearningItemsPullPlan {
  const localMap = new Map(localItems.map(i => [i.id, i]))
  const puts: LearningItem[] = []
  const deletes: string[] = []

  for (const remoteItem of remoteItems) {
    const id = remoteItem.remoteId || remoteItem.id
    const localItem = localMap.get(id)

    if (localItem?.syncStatus === 'pending' || localItem?.syncStatus === 'error') continue

    if (!localItem || isAfter(parseISO(remoteItem.lastModified), parseISO(localItem.lastModified))) {
      const syncStatus = localItem ? 'synced' : remoteItem.syncStatus
      puts.push({ ...remoteItem, id, syncStatus })
    } else if (!localItem.syncStatus) {
      puts.push({ ...localItem, syncStatus: 'synced' })
    }
  }

  const remoteIds = new Set(remoteItems.map(r => r.remoteId || r.id))
  for (const localItem of localItems) {
    if (vanishedFromRemote(localItem, collectionIds, remoteIds)) deletes.push(localItem.id!)
  }

  return { puts, deletes }
}

// Pending / error items are kept even when missing remotely (cases 3 & 4).
function vanishedFromRemote(item: LearningItem, collectionIds: ReadonlySet<string>, remoteIds: Set<string | undefined>) {
  if (!item.id || !collectionIds.has(item.collectionId) || remoteIds.has(item.id)) return false
  return item.syncStatus === 'synced' || item.syncStatus === undefined
}
