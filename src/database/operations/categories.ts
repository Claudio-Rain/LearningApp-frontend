import { isAfter, parseISO } from 'date-fns'
import type { Category } from '../types'
import * as local from '../local'
import * as remote from '../remote'
import { editCollection } from './collections'

export async function pullCategories() {
  try {
    const remoteCategories = await remote.getCategories()
    const localCategories = await local.getCategories()
    const localMap = new Map(localCategories.map(c => [c.id, c]))

    for (const remoteCat of remoteCategories) {
      const localCat = localMap.get(remoteCat.remoteId || remoteCat.id)

      if (localCat?.syncStatus === 'pending') {
        continue
      }

      if (!localCat || isAfter(parseISO(remoteCat.lastModified), parseISO(localCat.lastModified))) {
        await local.updateCategory({ ...remoteCat, id: remoteCat.remoteId || remoteCat.id })
      }
    }
  } catch (err) {
    console.error('Failed to pull categories:', err)
  }
}

export async function createCategory(data: Omit<Category, 'id' | 'syncStatus'>) {
  return local.addCategory({
    ...data,
    syncStatus: 'pending'
  })
}

export async function editCategory(category: Category) {
  await local.updateCategory({ ...category, syncStatus: 'pending' })
  if (navigator.onLine) {
    await remote.setCategory(category)
    await local.updateCategory({ ...category, syncStatus: 'synced' })
  }
}

export async function removeCategory(id: string) {
  // Don't cascade: orphan the collections instead. A collection belongs to 0 or 1
  // category, so dropping its category just makes it uncategorized.
  const collections = await local.getCollections()
  for (const col of collections) {
    if (col.categoryId === id) {
      // Bump lastModified so the orphaning wins last-modified-wins reconciliation.
      await editCollection({ ...col, categoryId: null, lastModified: new Date().toISOString() })
    }
  }

  await local.deleteCategory(id)
  if (navigator.onLine) {
    await remote.deleteCategory(id)
  }
}
