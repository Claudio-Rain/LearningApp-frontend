import { describe, it, expect } from 'vitest'
import { mergeOrder, planMove, planOrder, sortByPosition, type PositionWrite } from '@/utils/itemOrder'
import { runToolCall } from '@/utils/collectionAssistant/toolHandlers'
import type { AssistantHandlers, Proposal } from '@/utils/collectionAssistant/types'

type Item = { id: string; title: string; position?: number }

const titles = (items: Item[]) => items.map(i => i.title)

// Apply a plan the way the app does and return the new list order.
const apply = (items: Item[], writes: PositionWrite[]) => {
  const next = items.map(i => ({ ...i }))
  for (const w of writes) next.find(i => i.id === w.id)!.position = w.position
  return sortByPosition(next)
}

const unplaced: Item[] = [
  { id: 'c', title: 'Cherry' },
  { id: 'a', title: 'Apple' },
  { id: 'b', title: 'Banana' },
  { id: 'd', title: 'Date' },
]

const placed: Item[] = [
  { id: 'a', title: 'A', position: 1 },
  { id: 'b', title: 'B', position: 2 },
  { id: 'c', title: 'C', position: 3 },
  { id: 'd', title: 'D', position: 4 },
]

describe('sortByPosition', () => {
  it('keeps the old alphabetical list when nothing has been placed', () => {
    expect(titles(sortByPosition(unplaced))).toEqual(['Apple', 'Banana', 'Cherry', 'Date'])
  })

  it('puts placed items first, then the rest by title', () => {
    const items = [{ id: 'z', title: 'Zebra', position: 1 }, ...unplaced]
    expect(titles(sortByPosition(items))).toEqual(['Zebra', 'Apple', 'Banana', 'Cherry', 'Date'])
  })

  it('sorts titles with numbers naturally', () => {
    const items = [{ id: '1', title: 'Item 10' }, { id: '2', title: 'Item 2' }]
    expect(titles(sortByPosition(items))).toEqual(['Item 2', 'Item 10'])
  })
})

describe('planMove', () => {
  it('numbers the whole list on the first move, freezing the alphabetical order', () => {
    const sorted = sortByPosition(unplaced)
    const writes = planMove(sorted, 'd', 0)
    expect(writes).toHaveLength(4)
    expect(titles(apply(sorted, writes))).toEqual(['Date', 'Apple', 'Banana', 'Cherry'])
  })

  it('writes only the moved item once everything is placed', () => {
    expect(planMove(placed, 'd', 0)).toEqual([{ id: 'd', position: 0 }])
    expect(planMove(placed, 'a', 3)).toEqual([{ id: 'a', position: 5 }])
    expect(planMove(placed, 'd', 1)).toEqual([{ id: 'd', position: 1.5 }])
  })

  it('lands the item at the requested index', () => {
    for (let to = 0; to < placed.length; to++) {
      const result = apply(placed, planMove(placed, 'b', to))
      expect(result.findIndex(i => i.id === 'b')).toBe(to)
    }
  })

  it('does nothing when the item stays put', () => {
    expect(planMove(placed, 'b', 1)).toEqual([])
    expect(planMove(placed, 'missing', 0)).toEqual([])
  })

  it('renumbers when the gap between neighbours has worn out', () => {
    const tight: Item[] = [
      { id: 'a', title: 'A', position: 1 },
      { id: 'b', title: 'B', position: 1 + 1e-12 },
      { id: 'c', title: 'C', position: 2 },
    ]
    // Renumbered 1, 2, 3 in the new order; A and C already hold theirs.
    const writes = planMove(tight, 'c', 1)
    expect(writes).toEqual([{ id: 'b', position: 3 }])
    expect(titles(apply(tight, writes))).toEqual(['A', 'C', 'B'])
  })
})

describe('mergeOrder', () => {
  const ids = ['a', 'b', 'c', 'd']

  it('puts the listed items first and keeps the rest in order', () => {
    expect(mergeOrder(ids, ['d'])).toEqual(['d', 'a', 'b', 'c'])
    expect(mergeOrder(ids, ['c', 'a'])).toEqual(['c', 'a', 'b', 'd'])
  })

  it('can put them at the end instead', () => {
    expect(mergeOrder(ids, ['a'], 'end')).toEqual(['b', 'c', 'd', 'a'])
  })

  it('ignores unknown and repeated ids', () => {
    expect(mergeOrder(ids, ['x', 'b', 'b'])).toEqual(['b', 'a', 'c', 'd'])
  })
})

describe('planOrder', () => {
  it('numbers the list in the given order, skipping items already in place', () => {
    expect(planOrder(placed, ['a', 'c', 'b', 'd'])).toEqual([
      { id: 'c', position: 2 },
      { id: 'b', position: 3 },
    ])
  })
})

describe('the assistant reorder tool', () => {
  const run = (input: unknown) => {
    const proposals: Proposal[] = []
    const handlers: AssistantHandlers = {
      onText: () => {},
      onActivity: () => {},
      onProposal: p => proposals.push(p),
      getItems: () => placed.map(({ id, title }) => ({ id, title })),
      getOtherCollections: () => [],
    }
    return { outcome: runToolCall('propose_reorder_items', input, handlers), proposals }
  }

  it('shows only the items that change place, with old and new positions', () => {
    const { outcome, proposals } = run({ ids: ['a', 'd'], reason: 'basics first' })
    expect(outcome.ok).toBe(true)
    expect(proposals[0]).toEqual({
      kind: 'reorder',
      place: 'start',
      ids: ['a', 'd'],
      items: [{ id: 'd', title: 'D', from: 4, to: 2 }],
      reason: 'basics first',
    })
  })

  it('fails when nothing would change', () => {
    const { outcome, proposals } = run({ ids: ['a', 'b'] })
    expect(outcome.ok).toBe(false)
    expect(proposals).toHaveLength(0)
  })
})
