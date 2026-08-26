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

/**
 * Add many exclusions in ONE transaction. Building a study set excludes
 * everything the set filtered out — hundreds of rows — and one transaction is
 * the difference between an instant save and a visible stall.
 *
 * Returns the rows as written, ids included, so the caller can push them
 * remotely without reading them back.
 */
export async function addExcludedItems(items: ExcludedItem[]): Promise<ExcludedItem[]> {
  if (items.length === 0) return []
  const db = await dbPromise
  const rows = items.map(item => ({ ...item, id: crypto.randomUUID() }))

  const tx = db.transaction(EXCLUDED_ITEMS_STORE, 'readwrite')
  await Promise.all([...rows.map(row => tx.store.add(row)), tx.done])
  return rows
}

/** Update many rows in one transaction — the bulk counterpart of updateExcludedItem. */
export async function updateExcludedItems(items: ExcludedItem[]): Promise<void> {
  if (items.length === 0) return
  const db = await dbPromise
  const tx = db.transaction(EXCLUDED_ITEMS_STORE, 'readwrite')
  await Promise.all([...items.map(item => tx.store.put(item)), tx.done])
}

export async function deleteExcludedItem(id: string): Promise<void> {
  await (await dbPromise).delete(EXCLUDED_ITEMS_STORE, id)
}

export async function updateExcludedItem(item: ExcludedItem): Promise<void> {
  await (await dbPromise).put(EXCLUDED_ITEMS_STORE, item)
}
