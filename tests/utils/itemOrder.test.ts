import { describe, it, expect } from 'vitest'
import { mergeOrder, planAppend, planInsertAfter, planMove, planOrder, sortByPosition, type PositionWrite } from '@/utils/itemOrder'
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

describe('planAppend', () => {
  // A batch added the way the assistant does: positions from the plan, in order.
  const append = (items: Item[], newTitles: string[]) => {
    const { writes, positions } = planAppend(sortByPosition(items), newTitles.length)
    const added = newTitles.map((title, k) => ({ id: `new-${k}`, title, position: positions[k] }))
    return titles(apply([...apply(items, writes), ...added], []))
  }

  it('keeps a new batch in its given order at the end of an unplaced list', () => {
    expect(append(unplaced, ['Zebra', 'Aardvark', 'Mango'])).toEqual([
      'Apple', 'Banana', 'Cherry', 'Date', 'Zebra', 'Aardvark', 'Mango',
    ])
  })

  it('numbers an unplaced list in its current (alphabetical) order first', () => {
    const { writes } = planAppend(sortByPosition(unplaced), 1)
    expect(writes).toEqual([
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
      { id: 'c', position: 3 },
      { id: 'd', position: 4 },
    ])
  })

  it('appends after the highest position of a placed list, with no extra writes', () => {
    const placed: Item[] = [
      { id: 'x', title: 'X', position: 2.5 },
      { id: 'y', title: 'Y', position: 7 },
    ]
    expect(planAppend(sortByPosition(placed), 2)).toEqual({ writes: [], positions: [8, 9] })
  })

  it('starts at 1 in an empty collection', () => {
    expect(planAppend([], 2)).toEqual({ writes: [], positions: [1, 2] })
  })
})

describe('planInsertAfter', () => {
  // Insert a batch the way the assistant does and return the new list order.
  const insert = (items: Item[], afterId: string, newTitles: string[]) => {
    const { writes, positions } = planInsertAfter(sortByPosition(items), afterId, newTitles.length)
    const added = newTitles.map((title, k) => ({ id: `new-${k}`, title, position: positions[k] }))
    return titles(apply([...apply(items, writes), ...added], []))
  }

  it('puts the batch right after the anchor, in its given order', () => {
    expect(insert(placed, 'b', ['Y', 'X'])).toEqual(['A', 'B', 'Y', 'X', 'C', 'D'])
  })

  it('moves no existing item when the gap has room', () => {
    const { writes, positions } = planInsertAfter(sortByPosition(placed), 'b', 3)
    expect(writes).toEqual([])
    expect(positions).toEqual([2.25, 2.5, 2.75])
  })

  it('goes after the last item when the anchor is last', () => {
    expect(insert(placed, 'd', ['Y', 'X'])).toEqual(['A', 'B', 'C', 'D', 'Y', 'X'])
  })

  it('numbers an unplaced list around the batch', () => {
    // Unplaced lists show alphabetically: Apple, Banana, Cherry, Date.
    expect(insert(unplaced, 'a', ['Zebra', 'Aardvark'])).toEqual([
      'Apple', 'Zebra', 'Aardvark', 'Banana', 'Cherry', 'Date',
    ])
  })

  it('renumbers when the gap is too thin to split', () => {
    const tight: Item[] = [
      { id: 'a', title: 'A', position: 1 },
      { id: 'b', title: 'B', position: 1 + 1e-12 },
    ]
    expect(insert(tight, 'a', ['N'])).toEqual(['A', 'N', 'B'])
  })

  it('appends when the anchor is not in the list', () => {
    expect(insert(placed, 'missing', ['N'])).toEqual(['A', 'B', 'C', 'D', 'N'])
  })
})
