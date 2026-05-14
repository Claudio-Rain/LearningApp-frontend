import { isAfter, parseISO } from 'date-fns'
import type { CardProgress } from '../types'
import * as local from '../local'
import * as remote from '../remote'

export async function pullCardProgress() {
  try {
    const remoteProgress = await remote.getAllCardProgress()
    const localProgress = await local.getAllCardProgress()
    const localMap = new Map(localProgress.map(p => [p.id, p]))

    for (const remoteP of remoteProgress) {
      const localP = localMap.get(remoteP.remoteId || remoteP.id)

      if (localP?.syncStatus === 'pending') {
        continue
      }

      if (!localP || isAfter(parseISO(remoteP.last_reviewed_at), parseISO(localP.last_reviewed_at))) {
        await local.updateCardProgress({ ...remoteP, id: remoteP.remoteId || remoteP.id })
      }
    }
  } catch (err) {
    console.error('Failed to pull card progress:', err)
  }
}

export async function createCardProgress(data: Omit<CardProgress, 'id' | 'syncStatus'>) {
  return local.addCardProgress({
    ...data,
    syncStatus: 'pending'
  })
}

export async function updateCardProgress(progress: CardProgress) {
  await local.updateCardProgress({ ...progress, syncStatus: 'pending' })
  if (navigator.onLine) {
    await remote.setCardProgress(progress)
    await local.updateCardProgress({ ...progress, syncStatus: 'synced' })
  }
}

export async function deleteCardProgress(id: string) {
  await local.deleteCardProgress(id)
  if (navigator.onLine) {
    await remote.deleteCardProgress(id)
  }
}