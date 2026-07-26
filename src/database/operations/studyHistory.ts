import * as local from '../local'
import { deleteAttemptLog } from './attemptLog'
import { deleteCardProgress } from './cardProgress'

// Reports deletion progress: `done` records removed out of `total`.
export type ClearProgress = (done: number, total: number) => void

// Clears all study history — attempt logs and card progress — for the given
// learning items, both locally and remotely, so they can be studied again from
// scratch. The learning items themselves (title/content) are left untouched.
// `onProgress` (optional) fires after each record is deleted so callers can show
// a live count — the work is sequential (one remote round-trip per record).
export async function clearStudyHistoryForItems(
  itemIds: string[],
  onProgress?: ClearProgress
): Promise<void> {
  const idSet = new Set(itemIds)

  const allLogs = await local.getAllAttemptLogs()
  const logs = allLogs.filter(log => log.id && idSet.has(log.learning_item_id))

  const allProgress = await local.getAllCardProgress()
  const progressRecords = allProgress.filter(p => p.id && idSet.has(p.learning_item_id))

  const total = logs.length + progressRecords.length
  let done = 0
  onProgress?.(done, total)

  for (const log of logs) {
    await deleteAttemptLog(log.id!)
    onProgress?.(++done, total)
  }

  for (const progress of progressRecords) {
    await deleteCardProgress(progress.id!)
    onProgress?.(++done, total)
  }
}
