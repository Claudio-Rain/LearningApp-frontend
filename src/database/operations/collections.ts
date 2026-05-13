import type { Collection } from '../types'
import * as local from '../local'
import * as remote from '../remote'
import { removeLearningItem } from './learningItems'

export async function pullCollections() {
  try {
    const remoteCollections = await remote.getCollections()
    const localCollections = await local.getCollections()
    const localMap = new Map(localCollections.map(c => [c.id, c]))

    for (const remoteCol of remoteCollections) {
      const localCol = localMap.get(remoteCol.remoteId || remoteCol.id)

      if (localCol?.syncStatus === 'pending') {
        continue
      }

      if (!localCol || new Date(remoteCol.lastModified) > new Date(localCol.lastModified)) {
        await local.updateCollection({ ...remoteCol, id: remoteCol.remoteId || remoteCol.id })
      }
    }
  } catch (err) {
    console.error('Failed to pull collections:', err)
  }
}

export async function createCollection(data: Omit<Collection, 'id' | 'syncStatus'>) {
  return local.addCollection({
    ...data,
    syncStatus: 'pending'
  })
}

export async function editCollection(collection: Collection) {
  await local.updateCollection({ ...collection, syncStatus: 'pending' })
  if (navigator.onLine) {
    await remote.setCollection(collection)
    await local.updateCollection({ ...collection, syncStatus: 'synced' })
  }
}

export async function removeCollection(id: string) {
  // Cascade through removeLearningItem so each item also drops its progress + attempt logs.
  const items = await local.getLearningItems(id)
  for (const item of items) {
    if (item.id) await removeLearningItem(item.id)
  }

  await local.deleteCollection(id)
  if (navigator.onLine) {
    await remote.deleteCollection(id)
  }
}
