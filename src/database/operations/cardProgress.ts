import type { CardProgress } from '../types'
import * as local from '../local'
import * as remote from '../remote'

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