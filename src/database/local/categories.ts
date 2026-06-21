import type { Category } from '../types'
import { dbPromise, CATEGORIES_STORE } from './db'

export async function getCategories(): Promise<Category[]> {
  return (await dbPromise).getAll(CATEGORIES_STORE)
}

export async function addCategory(category: Category): Promise<IDBValidKey> {
  const newCategory = { ...category, id: crypto.randomUUID() }
  return (await dbPromise).add(CATEGORIES_STORE, newCategory)
}

export async function deleteCategory(id: string): Promise<void> {
  await (await dbPromise).delete(CATEGORIES_STORE, id)
}

export async function updateCategory(category: Category): Promise<void> {
  await (await dbPromise).put(CATEGORIES_STORE, category)
}
