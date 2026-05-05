import type { AttemptLog } from '../types'
import * as local from '../local'
import * as remote from '../remote'

export async function createAttemptLog(data: Omit<AttemptLog, 'id' | 'syncStatus'>) {
  return local.addAttemptLog({
    ...data,
    syncStatus: 'pending'
  })
}

export async function updateAttemptLog(log: AttemptLog) {
  await local.updateAttemptLog({ ...log, syncStatus: 'pending' })
  if (navigator.onLine) {
    await remote.setAttemptLog(log)
    await local.updateAttemptLog({ ...log, syncStatus: 'synced' })
  }
}

export async function deleteAttemptLog(id: string) {
  await local.deleteAttemptLog(id)
  if (navigator.onLine) {
    await remote.deleteAttemptLog(id)
  }
}