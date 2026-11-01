import { describe, expect, it } from 'vitest'
import type { Category, Collection } from '@/database/types'
import { filterCollections, filterOptions, isValidFilter } from '@/views/collectionList/filters'

const collection = (id: string, extra: Partial<Collection> = {}): Collection => ({
  id,
  title: id,
  numberOfItems: 0,
  dateCreated: '2026-01-01T00:00:00Z',
  lastModified: '2026-01-01T00:00:00Z',
  ...extra
})

const category = (id: string, color?: string): Category => ({
  id,
  title: `Cat ${id}`,
  color,
  dateCreated: '2026-01-01T00:00:00Z',
  lastModified: '2026-01-01T00:00:00Z'
})

const collections = [
  collection('a', { starred: true, categoryId: 'c1' }),
  collection('b', { categoryId: 'c2' }),
  collection('c')
]

describe('filterCollections', () => {
  it('normalizes starred to a boolean', () => {
    expect(filterCollections(collections, 'all').map(c => c.starred)).toEqual([true, false, false])
  })

  it.each([
    ['all', ['a', 'b', 'c']],
    ['starred', ['a']],
    ['none', ['c']],
    ['c2', ['b']]
  ])('filter %s', (filter, ids) => {
    expect(filterCollections(collections, filter).map(c => c.id)).toEqual(ids)
  })
})

describe('filterOptions', () => {
  it('lists the built-in filters, then categories with a fallback color', () => {
    const options = filterOptions([category('c1', '#D32F2F'), category('c2')])
    expect(options.map(o => o.value)).toEqual(['all', 'starred', 'none', 'c1', 'c2'])
    expect(options[3]!.color).toBe('#D32F2F')
    expect(options[4]!.color).toBe('#1976D2')
  })
})

describe('isValidFilter', () => {
  it('accepts built-in filters and existing categories only', () => {
    const cats = [category('c1')]
    expect(isValidFilter('all', cats)).toBe(true)
    expect(isValidFilter('starred', cats)).toBe(true)
    expect(isValidFilter('none', cats)).toBe(true)
    expect(isValidFilter('c1', cats)).toBe(true)
    expect(isValidFilter('gone', cats)).toBe(false)
  })
})
