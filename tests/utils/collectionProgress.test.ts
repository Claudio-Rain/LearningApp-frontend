import { describe, it, expect } from 'vitest'
import { knownShare, sumTierCounts, tierCountsByCollection, tierSummary, totalOf } from '@/utils/collectionProgress'

const items = [
  { id: 'a', collectionId: 'c1' },
  { id: 'b', collectionId: 'c1' },
  { id: 'c', collectionId: 'c1' },
  { id: 'd', collectionId: 'c2' },
]
const strength = new Map([
  ['a', 0.1],
  ['b', 0.9],
])

describe('collection progress', () => {
  const byCollection = tierCountsByCollection(items, strength)

  it('counts each collection\'s items per tier, unstudied ones as new', () => {
    expect(byCollection.get('c1')).toEqual({ new: 1, weak: 1, fair: 0, good: 0, mastered: 1 })
    expect(byCollection.get('c2')).toEqual({ new: 1, weak: 0, fair: 0, good: 0, mastered: 0 })
  })

  it('adds collections up, skipping ones without items', () => {
    const total = sumTierCounts([byCollection.get('c1'), byCollection.get('c2'), undefined])
    expect(totalOf(total)).toBe(4)
    expect(total.new).toBe(2)
  })

  it('gives the share known well, or null for an empty collection', () => {
    expect(knownShare(byCollection.get('c1')!)).toBeCloseTo(1 / 3)
    expect(knownShare(sumTierCounts([]))).toBeNull()
  })

  it('summarises the non-empty tiers', () => {
    expect(tierSummary(byCollection.get('c1')!)).toBe('New 1 · Weak 1 · Mastered 1')
  })
})
