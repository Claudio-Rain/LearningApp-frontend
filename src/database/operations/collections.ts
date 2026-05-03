import type { Collection } from '../types'
import * as local from '../local'
import * as remote from '../remote'

export async function createCollection(data: Omit<Collection, 'id' | 'syncStatus'>) {
  return local.addCollection({
    ...data,
    syncStatus: 'pending'
  })
}

export async function editCollection(collection: Collection) {
  await local.updateCollection({ ...collection, syncStatus: 'pending' })
  if (navigator.onLine) {
    await remote.setCollection(collection)
    await local.updateCollection({ ...collection, syncStatus: 'synced' })
  }
}

export async function removeCollection(id: string) {
  await local.deleteCollection(id)
  if (navigator.onLine) {
    await remote.deleteCollection(id)
  }
}
