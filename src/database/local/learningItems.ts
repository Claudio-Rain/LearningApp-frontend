import type { LearningItem } from '../types'
import { dbPromise, LEARNING_ITEMS_STORE } from './db'

export async function getLearningItems(collectionId: string): Promise<LearningItem[]> {
  const db = await dbPromise
  const all = await db.getAll(LEARNING_ITEMS_STORE)
  return all.filter(item => item.collectionId === collectionId)
}

export async function getAllLearningItems(): Promise<LearningItem[]> {
  return (await dbPromise).getAll(LEARNING_ITEMS_STORE)
}

export async function addLearningItem(item: LearningItem): Promise<IDBValidKey> {
  const newItem = { ...item, id: crypto.randomUUID() }
  return (await dbPromise).add(LEARNING_ITEMS_STORE, newItem)
}

export async function deleteLearningItem(id: string): Promise<void> {
  await (await dbPromise).delete(LEARNING_ITEMS_STORE, id)
}

export async function updateLearningItem(item: LearningItem): Promise<void> {
  await (await dbPromise).put(LEARNING_ITEMS_STORE, item)
}

export async function updateLearningItemTitle(id: string, title: string): Promise<void> {
  const db = await dbPromise
  const item = await db.get(LEARNING_ITEMS_STORE, id)
  await db.put(LEARNING_ITEMS_STORE, { ...item, title, lastModified: new Date().toISOString() })
}
