import { openDB } from 'idb'
import type { Collection, LearningItem } from '../types'

const DB_NAME = 'collections-db'
const STORE_NAME = 'collections'

// Update DB version to 2 to add a new store
export const dbPromise = openDB(DB_NAME, 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        })
      }
    }
    if (oldVersion < 2) {
      if (!db.objectStoreNames.contains('learning_items')) {
        db.createObjectStore('learning_items', {
          keyPath: 'id',
        })
      }
    }
  }
})

export async function getCollections() {
  return (await dbPromise).getAll(STORE_NAME)
}

export async function addCollection(collection: Collection) {
  const newCollection = { ...collection, id: crypto.randomUUID() }
  return (await dbPromise).add(STORE_NAME, newCollection)
}

export async function deleteCollection(id: string) {
  return (await dbPromise).delete(STORE_NAME, id)
}

export async function updateCollection(collection: Collection) {
  return (await dbPromise).put(STORE_NAME, collection)
}

// Learning Item CRUD
export async function getLearningItems(collectionId: string) {
  const db = await dbPromise
  const all = await db.getAll('learning_items')
  return all.filter(item => item.collectionId === collectionId)
}

export async function getAllLearningItems() {
  return (await dbPromise).getAll('learning_items')
}

export async function addLearningItem(item: LearningItem) {
  const newItem = { ...item, id: crypto.randomUUID() }
  return (await dbPromise).add('learning_items', newItem)
}
export async function deleteLearningItem(id: string) {
  return (await dbPromise).delete('learning_items', id)
}

export async function updateLearningItem(item: LearningItem) {
  return (await dbPromise).put('learning_items', item)
}

export async function updateLearningItemTitle(id: string, title: string) {
  const db = await dbPromise
  const item = await db.get('learning_items', id)
  return db.put('learning_items', { ...item, title, lastModified: new Date().toISOString() })
}