import { startSyncEngine, syncCollections, syncLearningItems } from './sync/syncEngine'
import type { Collection, LearningItem } from './types'
import {
  getCollections,
  addCollection,
  deleteCollection,
  updateCollection,
  getLearningItems,
  addLearningItem,
  deleteLearningItem,
  updateLearningItem,
  updateLearningItemTitle
} from './local/idb'
import * as remote from './remote/firestore'

export { startSyncEngine, syncCollections, syncLearningItems}
export type { Collection, LearningItem }

export async function createCollection(data: Omit<Collection, 'id' | 'syncStatus'>) {
  return addCollection({
    ...data,
    syncStatus: 'pending'
  })
}

export async function editCollection(collection: Collection) {
  await updateCollection({ ...collection, syncStatus: 'pending' })
  if (navigator.onLine) {
    await remote.setCollection(collection)
    await updateCollection({ ...collection, syncStatus: 'synced' })
  }
}

export async function removeCollection(id: string) {
  await deleteCollection(id)
  if (navigator.onLine) {
    await remote.deleteCollection(id)
  }
}

export async function createLearningItem(data: Omit<LearningItem, 'id' | 'syncStatus'>) {
  return addLearningItem({
    ...data,
    syncStatus: 'pending'
  })
}

export async function editLearningItem(item: LearningItem) {
  await updateLearningItem({ ...item, syncStatus: 'pending' })
  if (navigator.onLine) {
    await remote.setLearningItem(item)
    await updateLearningItem({ ...item, syncStatus: 'synced' })
  }
}

export async function removeLearningItem(id: string) {
  await deleteLearningItem(id)
  if (navigator.onLine) {
    await remote.deleteLearningItem(id)
  }
}
export {
  getCollections,
  deleteCollection,
  updateCollection,
  getLearningItems,
  deleteLearningItem,
  updateLearningItem,
  updateLearningItemTitle
}