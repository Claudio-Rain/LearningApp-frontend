import type { AttemptLog } from '../types'
import { dbPromise, ATTEMPT_LOG_STORE } from './db'

export async function getAttemptLogs(itemId: string): Promise<AttemptLog[]> {
  const db = await dbPromise
  const all = await db.getAll(ATTEMPT_LOG_STORE)
  return all.filter(log => log.learning_item_id === itemId)
}

export async function getAllAttemptLogs(): Promise<AttemptLog[]> {
  return (await dbPromise).getAll(ATTEMPT_LOG_STORE)
}

export async function addAttemptLog(log: AttemptLog): Promise<IDBValidKey> {
  const newLog = { ...log, id: crypto.randomUUID() }
  return (await dbPromise).add(ATTEMPT_LOG_STORE, newLog)
}

export async function deleteAttemptLog(id: string): Promise<void> {
  await (await dbPromise).delete(ATTEMPT_LOG_STORE, id)
}

export async function updateAttemptLog(log: AttemptLog): Promise<void> {
  await (await dbPromise).put(ATTEMPT_LOG_STORE, log)
}

export async function deleteAttemptLogsByItemId(itemId: string): Promise<void> {
  const db = await dbPromise
  const logs = await getAttemptLogs(itemId)
  for (const log of logs) {
    if (log.id) {
      await db.delete(ATTEMPT_LOG_STORE, log.id)
    }
  }
}