import * as local from '../local'
import * as remote from '../remote'
import {
  pullCategories,
  pullCollections,
  pullLearningItems,
  pullAllLearningItems,
  pullCardProgress,
  pullAttemptLogs,
  pullExcludedItems,
  pushExcludedItems,
  pullContentWidget,
  pushContentWidget
} from '../operations'

export { pullCategories, pullCollections, pullLearningItems, pullAllLearningItems, pullCardProgress, pullAttemptLogs, pullExcludedItems, pullContentWidget, pushContentWidget }

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
  // The pulls don't depend on each other, except that items are pulled for the
  // local collections, so those wait for the collections pull. Each pull
  // catches its own errors.
  await Promise.all([
    pullCategories(),
    pullCollections().then(pullAllLearningItems),
    pullCardProgress(),
    pullAttemptLogs(),
    pullExcludedItems(),
    pullContentWidget()
  ])
  // Pushes run after every pull, so a pull never reads a half-pushed row.
  // They write to different stores, so they can run side by side. allSettled
  // so one failing push doesn't hide the others; the first failure is rethrown.
  const pushes = await Promise.allSettled([
    syncCategories(),
    syncCollections(),
    syncLearningItems(),
    syncCardProgress(),
    syncAttemptLogs(),
    pushExcludedItems(),
    pushContentWidget()
  ])
  const failed = pushes.find((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (failed) throw failed.reason
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
