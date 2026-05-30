import type { ExcludedItem } from '../types'
import { dbPromise, EXCLUDED_ITEMS_STORE } from './db'

export async function getAllExcludedItems(): Promise<ExcludedItem[]> {
  return (await dbPromise).getAll(EXCLUDED_ITEMS_STORE)
}

export async function getExcludedItem(id: string): Promise<ExcludedItem | undefined> {
  return (await dbPromise).get(EXCLUDED_ITEMS_STORE, id)
}

export async function addExcludedItem(item: ExcludedItem): Promise<IDBValidKey> {
  const newItem = { ...item, id: crypto.randomUUID() }
  return (await dbPromise).add(EXCLUDED_ITEMS_STORE, newItem)
}

export async function deleteExcludedItem(id: string): Promise<void> {
  await (await dbPromise).delete(EXCLUDED_ITEMS_STORE, id)
}

export async function updateExcludedItem(item: ExcludedItem): Promise<void> {
  await (await dbPromise).put(EXCLUDED_ITEMS_STORE, item)
}
