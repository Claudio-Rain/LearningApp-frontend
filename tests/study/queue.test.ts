import { describe, expect, it } from 'vitest'
import type { CardProgress, LearningItem } from '@/database/types'
import { buildStudyQueue, isNewProgress, mergeCollectionItems, summarizeProgress } from '@/views/study/queue'

const item = (id: string, title = id): LearningItem => ({
  id,
  collectionId: 'c1',
  title,
  dateCreated: '2026-01-01T00:00:00Z',
  lastModified: '2026-01-01T00:00:00Z'
})

const progress = (id: string, strength: number, attempts: number, reviewed?: string): CardProgress => ({
  learning_item_id: id,
  strength_score: strength,
  total_attempts: attempts,
  weighted_attempts: 0,
  last_reviewed_at: reviewed ?? '2026-01-01T00:00:00Z'
})

const mapOf = (...rows: CardProgress[]) => new Map(rows.map(p => [p.learning_item_id, p]))

describe('isNewProgress', () => {
  it('treats missing progress and zero attempts as new', () => {
    expect(isNewProgress(undefined)).toBe(true)
    expect(isNewProgress(progress('a', 0.5, 0))).toBe(true)
    expect(isNewProgress(progress('a', 0.5, 1))).toBe(false)
  })
})

describe('buildStudyQueue', () => {
  it('puts new cards first, then weakest, then least recently reviewed, then by title', () => {
    const items = [item('strong'), item('weak'), item('new'), item('old'), item('b', 'B'), item('a', 'A')]
    const map = mapOf(
      progress('strong', 0.9, 3),
      progress('weak', 0.1, 3),
      progress('old', 0.5, 2, '2025-01-01T00:00:00Z'),
      progress('a', 0.5, 2, '2026-06-01T00:00:00Z'),
      progress('b', 0.5, 2, '2026-06-01T00:00:00Z')
    )
    expect(buildStudyQueue(items, map).map(i => i.id)).toEqual(['new', 'weak', 'old', 'a', 'b', 'strong'])
  })

  it('attaches each card its progress', () => {
    const [queued] = buildStudyQueue([item('x')], mapOf(progress('x', 0.3, 1)))
    expect(queued!.progress?.strength_score).toBe(0.3)
  })
})

describe('mergeCollectionItems', () => {
  it('drops excluded items and duplicates across collections', () => {
    const merged = mergeCollectionItems([[item('a'), item('b')], [item('b'), item('c')]], new Set(['c']))
    expect(merged.map(i => i.id)).toEqual(['a', 'b'])
  })
})

describe('summarizeProgress', () => {
  it('counts new and revised cards, revisions and tiers', () => {
    const items = [item('n1'), item('n2'), item('w'), item('m')]
    const map = mapOf(progress('n2', 0.9, 0), progress('w', 0.1, 2), progress('m', 0.95, 5))
    expect(summarizeProgress(items, map)).toEqual({
      newCount: 2,
      revisedCount: 2,
      totalRevisions: 7,
      tierCounts: { new: 2, weak: 1, fair: 0, good: 0, mastered: 1 }
    })
  })
})
