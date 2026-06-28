import { isAfter, parseISO } from 'date-fns'
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

      if (!localCol || isAfter(parseISO(remoteCol.lastModified), parseISO(localCol.lastModified))) {
        await local.updateCollection({ ...remoteCol, id: remoteCol.remoteId || remoteCol.id })
      }
    }
  } catch (err) {
    console.error('Failed to pull collections:', err)
  }
}

export async function createCollection(data: Omit<Collection, 'id' | 'syncStatus'>) {
  const id = await local.addCollection({
    ...data,
    syncStatus: 'pending'
  }) as string

  if (navigator.onLine) {
    const col: Collection = { ...data, id, syncStatus: 'synced' }
    try {
      await remote.setCollection(col)
      await local.updateCollection(col)
    } catch (err) {
      console.error('Failed to push new collection to remote:', err)
    }
  }

  return id
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
