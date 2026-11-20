import { describe, expect, it } from 'vitest'
import type { AttemptLog, CardProgress, LearningItem } from '@/database/types'
import {
  HOUR_LABELS,
  computeProgressStats,
  groupLogsByCard,
  newCardCount,
  recentLogs,
  replayCardStrength,
  strengthBuckets,
  weakestCollections,
  learningCurve,
  revisionsToMaster,
  hardestCards
} from '@/views/studyProgress/aggregation'

const log = (itemId: string, ease: number, day: number): AttemptLog => ({
  learning_item_id: itemId,
  ease_score: ease,
  is_correct: ease > 0,
  created_at: `2026-03-${String(day).padStart(2, '0')}T10:00:00Z`
})

const progress = (itemId: string, strength: number): CardProgress => ({
  learning_item_id: itemId,
  strength_score: strength,
  total_attempts: 1,
  weighted_attempts: 0,
  last_reviewed_at: '2026-03-01T10:00:00Z'
})

const item = (id: string): LearningItem => ({
  id,
  collectionId: 'c1',
  title: id,
  dateCreated: '2026-01-01T00:00:00Z',
  lastModified: '2026-01-01T00:00:00Z'
})

// Card a is listed out of order on purpose: replayed by date it starts at 0
// (the -0.15 is clamped) and masters on its 2nd attempt; replayed in array
// order it would master on the 1st. Card b never masters; card c masters at once.
const logs = [
  log('a', 0.8, 2),
  log('a', -0.15, 1),
  log('b', 0.1, 1),
  log('b', 0.1, 2),
  log('c', 1, 1)
]
const progressRows = [progress('a', 0.8), progress('b', 0.2), progress('c', 1)]
const items = ['a', 'b', 'c', 'd', 'e'].map(item)

describe('computeProgressStats', () => {
  it('replays each card by date to find attempts to master, and projects the rest', () => {
    expect(computeProgressStats({ logs, progress: progressRows, items })).toEqual({
      totalAttempts: 5,
      cardsLearned: 2,
      avgRevisionsToMaster: 1.5,
      totalCards: 5,
      // Only attempt 1 has the 3 cards a curve point needs: avg 0.367. Past it
      // the curve carries on at that slope, reaching 0.75 at attempt ~2.05:
      // b (at 0.2, attempt ~0.55) needs ~1.5, d and e (new) ~2.05 each.
      projectedAttemptsToFinish: 6
    })
  })

  it('reports no average to master when nothing has mastered yet', () => {
    const stats = computeProgressStats({ logs: [log('b', 0.1, 1)], progress: [], items: [item('b')] })
    expect(stats.avgRevisionsToMaster).toBe(0)
  })

  it('projects nothing without enough history for a curve', () => {
    expect(computeProgressStats({ logs: [], progress: [], items: [item('a')] }).projectedAttemptsToFinish).toBe(0)
    const oneCard = computeProgressStats({ logs: [log('b', 0.1, 1)], progress: [], items: [item('b')] })
    expect(oneCard.projectedAttemptsToFinish).toBe(0)
  })
})

describe('learning curve projection', () => {
  // Three cards, each gaining 0.2 per revision, four revisions each.
  const steady = ['p', 'q', 'r'].flatMap(id => [1, 2, 3, 4].map(day => log(id, 0.2, day)))

  it('averages strength after each revision number', () => {
    expect(learningCurve(steady).map(([x, s]) => [x, Math.round(s * 100) / 100])).toEqual([
      [1, 0.2],
      [2, 0.4],
      [3, 0.6],
      [4, 0.8],
    ])
  })

  it('reads the curve backwards from a card\'s strength to mastered (0.75)', () => {
    const curve = learningCurve(steady)
    // 0.75 sits three quarters of the way from attempt 3 to 4.
    expect(revisionsToMaster(0, curve)).toBeCloseTo(3.75)
    expect(revisionsToMaster(0.4, curve)).toBeCloseTo(1.75)
    expect(revisionsToMaster(0.9, curve)).toBe(0)
  })

  it('extends the curve along its last slope when it stops short of mastered', () => {
    const slow = ['p', 'q', 'r'].flatMap(id => [1, 2].map(day => log(id, 0.1, day)))
    // 0.1 per revision: 0.75 at attempt 7.5.
    expect(revisionsToMaster(0, learningCurve(slow))).toBeCloseTo(7.5)
  })
})

describe('strengthBuckets', () => {
  it('counts progress rows per scored tier', () => {
    expect(strengthBuckets(progressRows)).toEqual({ weak: 1, fair: 0, good: 0, mastered: 2 })
  })
})

describe('newCardCount', () => {
  it('counts items with neither a progress row nor an attempt log', () => {
    const data = { logs: [...logs, log('d', 0.1, 3)], progress: progressRows, items }
    expect(newCardCount(data)).toBe(1)
  })
})

describe('replayCardStrength', () => {
  it('reports clamped cumulative strength per attempt, in date order', () => {
    const steps: [string, number, number][] = []
    replayCardStrength(logs.filter(l => l.learning_item_id === 'a'), (id, n, s) => steps.push([id, n, s]))
    expect(steps).toEqual([['a', 1, 0], ['a', 2, 0.8]])
  })
})

describe('groupLogsByCard', () => {
  it('groups logs under their card id, keeping their order', () => {
    const grouped = groupLogsByCard(logs)
    expect([...grouped.keys()]).toEqual(['a', 'b', 'c'])
    expect(grouped.get('a')!.map(l => l.ease_score)).toEqual([0.8, -0.15])
  })
})

describe('recentLogs', () => {
  it('keeps logs at or after the cutoff', () => {
    const kept = recentLogs(logs, new Date('2026-03-02T10:00:00Z'))
    expect(kept).toEqual([logs[0], logs[3]])
  })
})

describe('HOUR_LABELS', () => {
  it('labels the 24 hours in 12-hour format', () => {
    expect(HOUR_LABELS).toHaveLength(24)
    expect([HOUR_LABELS[0], HOUR_LABELS[11], HOUR_LABELS[12], HOUR_LABELS[23]]).toEqual(['12am', '11am', '12pm', '11pm'])
  })
})


describe('what to study next', () => {
  const items: LearningItem[] = [
    { ...item('a'), collectionId: 'c1' },
    { ...item('b'), collectionId: 'c1' },
    { ...item('c'), collectionId: 'c2' },
    { ...item('d'), collectionId: 'c3' },
  ]
  const progressRows = [progress('a', 0.9), progress('b', 0.1), progress('c', 0.05), progress('d', 0.95)]

  it('ranks collections by how little is known, skipping fully known ones', () => {
    const cols = [{ id: 'c1', title: 'One' }, { id: 'c2', title: 'Two' }, { id: 'c3', title: 'Three' }, { id: 'c4', title: 'Empty' }]
    expect(weakestCollections(cols, items, progressRows).map(c => [c.id, c.known])).toEqual([
      ['c2', 0],
      ['c1', 0.5],
    ])
  })

  it('lists studied cards below good, weakest first', () => {
    expect(hardestCards(progressRows, items).map(c => c.id)).toEqual(['c', 'b'])
  })
})
