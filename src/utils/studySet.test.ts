import { describe, it, expect } from 'vitest'
import { allocate, matchesFilter, resolveStudySet, type StudySetItem } from './studySet'

const item = (over: Partial<StudySetItem> & { id: string; collectionId: string }): StudySetItem => ({
  title: over.id,
  ...over
})

// n items in one collection, all with the same labels. `tag` keeps ids unique
// when a test builds two pools inside the same collection.
let nextPoolTag = 0
const pool = (collectionId: string, n: number, labels: Partial<StudySetItem> = {}) => {
  const tag = nextPoolTag++
  return Array.from({ length: n }, (_, i) =>
    item({ id: `${collectionId}-${tag}-${i}`, collectionId, ...labels })
  )
}

describe('allocate', () => {
  it('splits evenly when the pools allow it', () => {
    expect(allocate([100, 100, 100], 90)).toEqual([30, 30, 30])
  })

  it('always sums to the requested total', () => {
    // 91 across 3 does not divide evenly — largest-remainder must still land exactly.
    const taken = allocate([100, 100, 100], 91)
    expect(taken.reduce((a, b) => a + b, 0)).toBe(91)
  })

  it('never takes more than a pool holds', () => {
    const taken = allocate([120, 40, 8], 90)
    expect(taken[0]).toBeLessThanOrEqual(120)
    expect(taken[1]).toBeLessThanOrEqual(40)
    expect(taken[2]).toBeLessThanOrEqual(8)
  })

  it('does not starve a small collection — the whole point of `balanced`', () => {
    const balanced = allocate([120, 40, 8], 90, 'balanced')
    const proportional = allocate([120, 40, 8], 90, 'proportional')

    expect(proportional[2]).toBeLessThan(8) // pure proportional under-serves it
    expect(balanced[2]).toBe(8) // balanced takes everything the small pool has
    expect(balanced.reduce((a, b) => a + b, 0)).toBe(90)
  })

  it('redistributes what an exhausted pool cannot take', () => {
    // The 2-card pool cannot fill a third of 60; the others must cover it.
    const taken = allocate([100, 100, 2], 60, 'balanced')
    expect(taken[2]).toBe(2)
    expect(taken.reduce((a, b) => a + b, 0)).toBe(60)
  })

  it('caps at what is available when the total exceeds every pool', () => {
    expect(allocate([5, 5], 100)).toEqual([5, 5])
  })

  it('weights every collection the same under `equal`', () => {
    expect(allocate([100, 100, 100], 30, 'equal')).toEqual([10, 10, 10])
  })

  it('handles degenerate input without spinning', () => {
    expect(allocate([], 10)).toEqual([])
    expect(allocate([0, 0], 10)).toEqual([0, 0])
    expect(allocate([10, 10], 0)).toEqual([0, 0])
  })
})

describe('matchesFilter', () => {
  const easyEssential = item({ id: 'a', collectionId: 'c', priority: 5, difficulty: 1 })

  it('matches an inclusive range on both axes', () => {
    expect(matchesFilter(easyEssential, { priority: { min: 4 }, difficulty: { max: 2 } })).toBe(true)
    expect(matchesFilter(easyEssential, { priority: { min: 4 }, difficulty: { max: 1 } })).toBe(true)
    expect(matchesFilter(easyEssential, { difficulty: { min: 3 } })).toBe(false)
  })

  it('excludes unlabeled cards from a label filter by default', () => {
    const unlabeled = item({ id: 'b', collectionId: 'c' })
    expect(matchesFilter(unlabeled, { difficulty: { max: 2 } })).toBe(false)
    expect(matchesFilter(unlabeled, { difficulty: { max: 2 }, includeUnlabeled: true })).toBe(true)
  })

  it('leaves unlabeled cards alone when nothing filters on that label', () => {
    expect(matchesFilter(item({ id: 'b', collectionId: 'c' }), {})).toBe(true)
  })

  it('filters on strength and newness', () => {
    const weak = item({ id: 'w', collectionId: 'c', strength: 0.2 })
    const strong = item({ id: 's', collectionId: 'c', strength: 0.9 })
    const fresh = item({ id: 'n', collectionId: 'c' })

    expect(matchesFilter(weak, { maxStrength: 0.5 })).toBe(true)
    expect(matchesFilter(strong, { maxStrength: 0.5 })).toBe(false)
    expect(matchesFilter(fresh, { onlyNew: true })).toBe(true)
    expect(matchesFilter(weak, { onlyNew: true })).toBe(false)
    expect(matchesFilter(fresh, { onlyNew: false })).toBe(false)
  })
})

describe('resolveStudySet', () => {
  it('builds the easy/essential set across three collections, proportionally', () => {
    const items = [
      ...pool('a', 40, { priority: 5, difficulty: 1 }),
      ...pool('a', 60, { priority: 1, difficulty: 5 }), // noise that must not be picked
      ...pool('b', 30, { priority: 4, difficulty: 2 }),
      ...pool('c', 20, { priority: 5, difficulty: 2 })
    ]

    const plan = resolveStudySet(items, {
      collectionIds: ['a', 'b', 'c'],
      total: 45,
      filter: { priority: { min: 4 }, difficulty: { max: 2 } }
    })

    expect(plan.items).toHaveLength(45)
    expect(plan.allocations.map(a => a.pool)).toEqual([40, 30, 20])
    expect(plan.allocations.reduce((sum, a) => sum + a.taken, 0)).toBe(45)
    // Every chosen card actually qualifies.
    expect(plan.items.every(i => i.priority! >= 4 && i.difficulty! <= 2)).toBe(true)
    // Every collection is represented.
    expect(plan.allocations.every(a => a.taken > 0)).toBe(true)
  })

  it('reports which items were left out, for the exclusion write', () => {
    const items = [...pool('a', 10, { priority: 5, difficulty: 1 }), ...pool('a', 5, { priority: 1 })]
    const plan = resolveStudySet(items, {
      collectionIds: ['a'],
      total: 4,
      filter: { priority: { min: 4 }, difficulty: { max: 2 } }
    })

    expect(plan.items).toHaveLength(4)
    // 15 in scope, 4 chosen → 11 left out, including the 5 that never qualified.
    expect(plan.leftOutIds).toHaveLength(11)
    expect(new Set(plan.leftOutIds).size).toBe(11)
  })

  it('ignores collections outside the spec', () => {
    const items = [...pool('a', 5, { priority: 5 }), ...pool('z', 5, { priority: 5 })]
    const plan = resolveStudySet(items, { collectionIds: ['a'] })

    expect(plan.items.every(i => i.collectionId === 'a')).toBe(true)
    expect(plan.leftOutIds).toHaveLength(0)
  })

  it('takes everything that qualifies when no total is given', () => {
    const items = [...pool('a', 7, { priority: 5, difficulty: 1 }), ...pool('a', 3, { priority: 1 })]
    const plan = resolveStudySet(items, {
      collectionIds: ['a'],
      filter: { priority: { min: 4 } }
    })

    expect(plan.items).toHaveLength(7)
    expect(plan.shortfall).toBeUndefined()
  })

  it('explains a shortfall instead of silently returning fewer', () => {
    const items = pool('a', 3, { priority: 5, difficulty: 1 })
    const plan = resolveStudySet(items, {
      collectionIds: ['a'],
      total: 50,
      filter: { priority: { min: 4 } }
    })

    expect(plan.items).toHaveLength(3)
    expect(plan.shortfall).toContain('3')
  })

  it('says so plainly when nothing matches', () => {
    const plan = resolveStudySet(pool('a', 10, { priority: 1 }), {
      collectionIds: ['a'],
      total: 10,
      filter: { priority: { min: 5 } }
    })

    expect(plan.items).toHaveLength(0)
    expect(plan.shortfall).toMatch(/No cards match/)
  })

  it('picks the most useful cards first when it cannot take them all', () => {
    const items = [
      item({ id: 'best', collectionId: 'a', priority: 5, difficulty: 1 }),
      item({ id: 'mid', collectionId: 'a', priority: 4, difficulty: 1 }),
      item({ id: 'least', collectionId: 'a', priority: 4, difficulty: 2 })
    ]
    const plan = resolveStudySet(items, { collectionIds: ['a'], total: 2 })

    expect(plan.items.map(i => i.id)).toEqual(['best', 'mid'])
  })

  // The case that motivated per-collection limits: one oversized collection
  // dominating a set the user wanted mostly untouched.
  describe('per-collection limits', () => {
    const library = [
      ...pool('grammar', 15, { priority: 4 }),
      ...pool('tenses', 17, { priority: 4 }),
      ...pool('phrasal', 124, { priority: 4 })
    ]

    it('caps one collection and leaves the others whole', () => {
      const plan = resolveStudySet(library, {
        collectionIds: ['grammar', 'tenses', 'phrasal'],
        limits: { phrasal: 10 }
      })

      const taken = Object.fromEntries(plan.allocations.map(a => [a.collectionId, a.taken]))
      expect(taken).toEqual({ grammar: 15, tenses: 17, phrasal: 10 })
      expect(plan.items).toHaveLength(42)
      expect(plan.shortfall).toBeUndefined()
    })

    it('reports the collection\'s real match count alongside the cap', () => {
      const plan = resolveStudySet(library, {
        collectionIds: ['phrasal'],
        limits: { phrasal: 10 }
      })
      const phrasal = plan.allocations[0]!

      expect(phrasal.taken).toBe(10)
      expect(phrasal.pool).toBe(124) // what matched, not what was allowed
      expect(phrasal.cap).toBe(10)
    })

    it('holds the cap regardless of balance mode', () => {
      for (const balance of ['balanced', 'proportional', 'equal'] as const) {
        const plan = resolveStudySet(library, {
          collectionIds: ['grammar', 'tenses', 'phrasal'],
          total: 100,
          balance,
          limits: { phrasal: 10 }
        })
        const phrasal = plan.allocations.find(a => a.collectionId === 'phrasal')!
        expect(phrasal.taken).toBeLessThanOrEqual(10)
      }
    })

    it('keeps the best cards in a capped collection', () => {
      const mixed = [
        item({ id: 'top', collectionId: 'c', priority: 5, difficulty: 1 }),
        item({ id: 'mid', collectionId: 'c', priority: 3, difficulty: 3 }),
        item({ id: 'low', collectionId: 'c', priority: 1, difficulty: 5 })
      ]
      const plan = resolveStudySet(mixed, { collectionIds: ['c'], limits: { c: 1 } })

      expect(plan.items.map(i => i.id)).toEqual(['top'])
      expect(plan.leftOutIds).toHaveLength(2)
    })

    it('blames the cap, not the filter, when the total cannot be met', () => {
      const plan = resolveStudySet(library, {
        collectionIds: ['grammar', 'phrasal'],
        total: 100,
        limits: { phrasal: 10 }
      })

      expect(plan.items).toHaveLength(25)
      expect(plan.shortfall).toMatch(/capped/)
      expect(plan.shortfall).not.toMatch(/match that filter/)
    })

    it('ignores a cap above what the collection holds', () => {
      const plan = resolveStudySet(library, { collectionIds: ['grammar'], limits: { grammar: 999 } })
      expect(plan.items).toHaveLength(15)
    })

    it('treats a zero cap as excluding the collection', () => {
      const plan = resolveStudySet(library, {
        collectionIds: ['grammar', 'phrasal'],
        limits: { phrasal: 0 }
      })

      expect(plan.items.every(i => i.collectionId === 'grammar')).toBe(true)
      expect(plan.items).toHaveLength(15)
    })
  })

  it('is deterministic', () => {
    const items = [...pool('a', 30, { priority: 4, difficulty: 2 }), ...pool('b', 17, { priority: 5, difficulty: 1 })]
    const spec = { collectionIds: ['a', 'b'], total: 25 }

    expect(resolveStudySet(items, spec).items.map(i => i.id))
      .toEqual(resolveStudySet(items, spec).items.map(i => i.id))
  })
})
