import { formatISO } from 'date-fns'
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
  const newItem = JSON.parse(JSON.stringify({ ...item, id: crypto.randomUUID() }))
  return (await dbPromise).add(LEARNING_ITEMS_STORE, newItem)
}

export async function deleteLearningItem(id: string): Promise<void> {
  await (await dbPromise).delete(LEARNING_ITEMS_STORE, id)
}

export async function updateLearningItem(item: LearningItem): Promise<void> {
  await (await dbPromise).put(LEARNING_ITEMS_STORE, JSON.parse(JSON.stringify(item)))
}

export async function updateLearningItemTitle(id: string, title: string): Promise<void> {
  const db = await dbPromise
  const item = await db.get(LEARNING_ITEMS_STORE, id)
  await db.put(LEARNING_ITEMS_STORE, { ...item, title, lastModified: formatISO(new Date()) })
}

/**
 * Merge label fields into one item, leaving `content` untouched. Every key in
 * `patch` is written as given, so the caller drops the ones it isn't setting
 * rather than passing `undefined` (which would erase an existing label).
 * No-ops if the item is gone.
 */
export async function updateLearningItemLabels(
  id: string,
  patch: Partial<Pick<LearningItem, 'priority' | 'difficulty' | 'lastModified' | 'syncStatus'>>,
): Promise<void> {
  const db = await dbPromise
  const item = await db.get(LEARNING_ITEMS_STORE, id)
  if (!item) return
  await db.put(LEARNING_ITEMS_STORE, { ...item, ...patch })
}
