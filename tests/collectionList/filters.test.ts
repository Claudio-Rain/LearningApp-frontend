import { describe, expect, it } from 'vitest'
import type { Category, Collection } from '@/database/types'
import { collectionRows, filterCollections, filterOptions, isValidFilter } from '@/views/collectionList/filters'

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

describe('filterCollections with sub-collections', () => {
  const nested = [
    collection('top', { categoryId: 'c1' }),
    collection('sub', { parentId: 'top', categoryId: 'c2', starred: true }),
    collection('loose')
  ]

  it('filters a sub-collection by its top-level collection’s category', () => {
    expect(filterCollections(nested, 'c1').map(c => c.id)).toEqual(['top', 'sub'])
    expect(filterCollections(nested, 'c2').map(c => c.id)).toEqual([])
    expect(filterCollections(nested, 'none').map(c => c.id)).toEqual(['loose'])
  })

  it('filters starred by the collection’s own star', () => {
    expect(filterCollections(nested, 'starred').map(c => c.id)).toEqual(['sub'])
  })
})

describe('collectionRows', () => {
  // Junior (3 items)
  // ├─ C# (5)
  // └─ DB (2)
  // Alpha (1, starred)
  // Zeta (0)
  const all = [
    collection('junior', { title: 'Junior', numberOfItems: 3 }),
    collection('db', { title: 'DB', parentId: 'junior', numberOfItems: 2 }),
    collection('csharp', { title: 'C#', parentId: 'junior', numberOfItems: 5 }),
    collection('zeta', { title: 'Zeta' }),
    collection('alpha', { title: 'Alpha', starred: true, numberOfItems: 1 })
  ]
  const rows = (collections = all, filter = 'all', collapsed: string[] = []) =>
    collectionRows(filterCollections(collections, filter), collections, new Set(collapsed))

  it('places sub-collections under their parent, sorted within each level', () => {
    expect(rows().map(r => [r.id, r.depth])).toEqual([
      ['alpha', 0],
      ['junior', 0],
      ['csharp', 1],
      ['db', 1],
      ['zeta', 0]
    ])
  })

  it('counts own items and the total including sub-collections', () => {
    const junior = rows().find(r => r.id === 'junior')!
    expect([junior.numberOfItems, junior.totalItems, junior.childCount]).toEqual([3, 10, 2])
  })

  it('hides what is inside a collapsed collection', () => {
    expect(rows(all, 'all', ['junior']).map(r => r.id)).toEqual(['alpha', 'junior', 'zeta'])
  })

  it('shows a sub-collection whose parent is filtered out at the top, with its path', () => {
    const starredDb = all.map(c => (c.id === 'db' ? { ...c, starred: true } : c))
    expect(rows(starredDb, 'starred').map(r => [r.id, r.depth, r.label, r.isSub])).toEqual([
      ['alpha', 0, 'Alpha', false],
      ['db', 0, 'Junior › DB', true]
    ])
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
