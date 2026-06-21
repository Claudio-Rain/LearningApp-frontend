import * as local from '../local'
import * as remote from '../remote'
import {
  pullCategories,
  pullCollections,
  pullLearningItems,
  pullCardProgress,
  pullAttemptLogs,
  pullExcludedItems,
  pushExcludedItems,
  pullContentWidget,
  pushContentWidget
} from '../operations'

export { pullCategories, pullCollections, pullLearningItems, pullCardProgress, pullAttemptLogs, pullExcludedItems, pullContentWidget, pushContentWidget }

export async function pullAllLearningItems() {
  const collections = await local.getCollections()
  for (const col of collections) {
    if (col.id) await pullLearningItems(col.id)
  }
}

export async function syncCategories() {
  const categories = await local.getCategories()
  const pending = categories.filter(c => c.syncStatus === 'pending')

  for (const cat of pending) {
    try {
      await remote.setCategory(cat)
      await local.updateCategory({ ...cat, syncStatus: 'synced' })
    } catch {
      await local.updateCategory({ ...cat, syncStatus: 'error' })
    }
  }
}

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

export async function syncCardProgress() {
  const progress = await local.getAllCardProgress()
  const pending = progress.filter(p => p.syncStatus === 'pending')

  for (const p of pending) {
    try {
      await remote.setCardProgress(p)
      await local.updateCardProgress({ ...p, syncStatus: 'synced' })
    } catch {
      await local.updateCardProgress({ ...p, syncStatus: 'error' })
    }
  }
}

export async function syncAttemptLogs() {
  const logs = await local.getAllAttemptLogs()
  const pending = logs.filter(l => l.syncStatus === 'pending')

  for (const log of pending) {
    try {
      await remote.setAttemptLog(log)
      await local.updateAttemptLog({ ...log, syncStatus: 'synced' })
    } catch {
      await local.updateAttemptLog({ ...log, syncStatus: 'error' })
    }
  }
}

export async function syncAll() {
  if (!navigator.onLine) return
  await pullCategories()
  await pullCollections()
  await pullAllLearningItems()
  await pullCardProgress()
  await pullAttemptLogs()
  await pullExcludedItems()
  await pullContentWidget()
  await syncCategories()
  await syncCollections()
  await syncLearningItems()
  await syncCardProgress()
  await syncAttemptLogs()
  await pushExcludedItems()
  await pushContentWidget()
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
