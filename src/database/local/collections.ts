import type { Collection } from '../types'
import { dbPromise, COLLECTIONS_STORE } from './db'

export async function getCollections(): Promise<Collection[]> {
  return (await dbPromise).getAll(COLLECTIONS_STORE)
}

export async function addCollection(collection: Collection): Promise<IDBValidKey> {
  const newCollection = { ...collection, id: crypto.randomUUID() }
  return (await dbPromise).add(COLLECTIONS_STORE, newCollection)
}

export async function deleteCollection(id: string): Promise<void> {
  await (await dbPromise).delete(COLLECTIONS_STORE, id)
}

export async function updateCollection(collection: Collection): Promise<void> {
  await (await dbPromise).put(COLLECTIONS_STORE, collection)
}
