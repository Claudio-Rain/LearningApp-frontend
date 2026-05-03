import * as local from '../local'
import * as remote from '../remote'

export async function syncCollections() {
  const collections = await local.getCollections()
  const pending = collections.filter(c => c.syncStatus === 'pending')

  for (const col of pending) {
    try {
      await remote.setCollection(col)
      await local.updateCollection({ ...col, syncStatus: 'synced' })
    } catch {
      await local.updateCollection({ ...col, syncStatus: 'error' })
    }
  }
}

export async function syncLearningItems() {
  const items = await local.getAllLearningItems()
  const pending = items.filter(i => i.syncStatus === 'pending')

  for (const item of pending) {
    try {
      await remote.setLearningItem(item)
      await local.updateLearningItem({ ...item, syncStatus: 'synced' })
    } catch {
      await local.updateLearningItem({ ...item, syncStatus: 'error' })
    }
  }
}

export async function syncAll() {
  if (!navigator.onLine) return
  await syncCollections()
  await syncLearningItems()
}

export function startSyncEngine() {
  // Sincroniza cuando vuelve la conexión
  window.addEventListener('online', syncAll)

  // Sincroniza al iniciar si hay conexión
  if (navigator.onLine) syncAll()
}

export function stopSyncEngine() {
  window.removeEventListener('online', syncAll)
}