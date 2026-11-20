import { describe, it, expect } from 'vitest'
import { planLearningItemsPull } from '@/database/sync/mergeLearningItems'
import type { LearningItem } from '@/database/types'

const OLD = '2026-01-01T00:00:00Z'
const NEW = '2026-02-01T00:00:00Z'

const item = (id: string, collectionId: string, extra: Partial<LearningItem> = {}): LearningItem =>
  ({ id, collectionId, title: id, lastModified: OLD, ...extra }) as LearningItem

// Remote items come back with their Firestore doc id as remoteId.
const remote = (id: string, collectionId: string, extra: Partial<LearningItem> = {}): LearningItem =>
  item(id, collectionId, { remoteId: id, ...extra })

const ids = (items: LearningItem[]) => items.map(i => i.id).sort()

describe('planLearningItemsPull', () => {
  const cols = new Set(['A', 'B'])

  it('adds items missing locally and updates ones newer on remote', () => {
    const local = [item('1', 'A', { syncStatus: 'synced' })]
    const plan = planLearningItemsPull(cols, [remote('1', 'A', { lastModified: NEW }), remote('2', 'B')], local)
    expect(ids(plan.puts)).toEqual(['1', '2'])
    expect(plan.puts.find(i => i.id === '1')?.syncStatus).toBe('synced')
    expect(plan.deletes).toEqual([])
  })

  it('leaves up-to-date items alone, marking status-less ones synced', () => {
    const local = [item('1', 'A', { syncStatus: 'synced' }), item('2', 'A')]
    const plan = planLearningItemsPull(cols, [remote('1', 'A'), remote('2', 'A')], local)
    expect(plan.puts).toEqual([expect.objectContaining({ id: '2', syncStatus: 'synced' })])
  })

  it('never overwrites or deletes pending / error items', () => {
    const local = [
      item('1', 'A', { syncStatus: 'pending' }),
      item('2', 'A', { syncStatus: 'error' }),
      item('3', 'A', { syncStatus: 'pending' })
    ]
    const plan = planLearningItemsPull(cols, [remote('1', 'A', { lastModified: NEW }), remote('2', 'A', { lastModified: NEW })], local)
    expect(plan.puts).toEqual([])
    expect(plan.deletes).toEqual([])
  })

  it('deletes synced items that vanished from remote, only in pulled collections', () => {
    const local = [item('1', 'A', { syncStatus: 'synced' }), item('2', 'A'), item('3', 'C', { syncStatus: 'synced' })]
    const plan = planLearningItemsPull(cols, [], local)
    expect(plan.deletes.sort()).toEqual(['1', '2'])
  })

  it('moves an item between pulled collections instead of deleting it', () => {
    const local = [item('1', 'A', { syncStatus: 'synced' })]
    const plan = planLearningItemsPull(cols, [remote('1', 'B', { lastModified: NEW })], local)
    expect(plan.puts).toEqual([expect.objectContaining({ id: '1', collectionId: 'B' })])
    expect(plan.deletes).toEqual([])
  })
})
