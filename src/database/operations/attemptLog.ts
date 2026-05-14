import { isAfter, parseISO } from 'date-fns'
import type { AttemptLog } from '../types'
import * as local from '../local'
import * as remote from '../remote'

export async function pullAttemptLogs() {
  try {
    const remoteLogs = await remote.getAllAttemptLogs()
    const localLogs = await local.getAllAttemptLogs()
    const localMap = new Map(localLogs.map(l => [l.id, l]))

    for (const remoteLog of remoteLogs) {
      const localLog = localMap.get(remoteLog.remoteId || remoteLog.id)

      if (localLog?.syncStatus === 'pending') {
        continue
      }

      // Attempt logs are append-only; insert if missing, otherwise prefer the newer record.
      if (!localLog || isAfter(parseISO(remoteLog.created_at), parseISO(localLog.created_at))) {
        await local.updateAttemptLog({ ...remoteLog, id: remoteLog.remoteId || remoteLog.id })
      }
    }
  } catch (err) {
    console.error('Failed to pull attempt logs:', err)
  }
}

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