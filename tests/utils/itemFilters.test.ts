import { describe, it, expect } from 'vitest'
import { markdownToTiptap } from '@/utils/markdown'
import { activeFilterCount, emptyItemFilters, filterItems, UNLABELED, type ItemFilterState } from '@/utils/itemFilters'

const items = [
  { id: 'a', title: 'What is a Pipeline Agent?', content: markdownToTiptap('Runs your **jobs** on a machine.'), priority: 5, difficulty: 2 },
  { id: 'b', title: 'Introducción a los triggers', content: markdownToTiptap('CI y PR triggers.'), difficulty: 4 },
  { id: 'c', title: 'Service connections', priority: 3 },
]

const run = (patch: Partial<ItemFilterState>, strength: Record<string, number> = {}) =>
  filterItems(items, { ...emptyItemFilters(), ...patch }, id => strength[id]).map(i => i.id)

describe('filterItems', () => {
  it('shows everything with no filters, in the given order', () => {
    expect(run({})).toEqual(['a', 'b', 'c'])
  })

  it('searches the title and the answer, ignoring case and accents', () => {
    expect(run({ query: 'JOBS' })).toEqual(['a'])
    expect(run({ query: 'introduccion' })).toEqual(['b'])
    expect(run({ query: 'triggers ci' })).toEqual(['b'])
    expect(run({ query: 'agent triggers' })).toEqual([])
  })

  it('filters by label level, with a bucket for unlabeled', () => {
    expect(run({ priority: [5] })).toEqual(['a'])
    expect(run({ priority: [UNLABELED] })).toEqual(['b'])
    expect(run({ difficulty: [2, 4] })).toEqual(['a', 'b'])
  })

  it('filters by strength, never-studied items being "new"', () => {
    expect(run({ strength: ['new'] }, { a: 0.1 })).toEqual(['b', 'c'])
    expect(run({ strength: ['weak'] }, { a: 0.1 })).toEqual(['a'])
  })

  it('combines filters with AND', () => {
    expect(run({ query: 'pipeline', difficulty: [4] })).toEqual([])
  })

  it('counts the active filters', () => {
    expect(activeFilterCount(emptyItemFilters())).toBe(0)
    expect(activeFilterCount({ ...emptyItemFilters(), query: ' x ', strength: ['new'] })).toBe(2)
  })
})
