import type { LearningItem } from '../types'
import * as local from '../local'
import * as remote from '../remote'

export async function createLearningItem(data: Omit<LearningItem, 'id' | 'syncStatus'>) {
  return local.addLearningItem({
    ...data,
    syncStatus: 'pending'
  })
}

export async function editLearningItem(item: LearningItem) {
  await local.updateLearningItem({ ...item, syncStatus: 'pending' })
  if (navigator.onLine) {
    await remote.setLearningItem(item)
    await local.updateLearningItem({ ...item, syncStatus: 'synced' })
  }
}

export async function removeLearningItem(id: string) {
  await local.deleteLearningItem(id)
  if (navigator.onLine) {
    await remote.deleteLearningItem(id)
  }
}
