import type { Category, Collection } from '@/database/types'
import { DEFAULT_CATEGORY_COLOR } from '@/utils/categoryColors'
import { collectionPath, parentsOf, topLevelOf, withSubCollections } from '@/utils/subCollections'

/** 'all', 'starred', 'none' (uncategorized), or a category id. */
export type CollectionFilter = string

const BUILT_IN_FILTERS = ['all', 'starred', 'none'] as const

export interface FilterOption {
  value: CollectionFilter
  label: string
  color: string
}

// Neutral accent colors for the built-in filter options.
const ALL_COLOR = '#1976D2'
const STARRED_COLOR = '#F9A825'
const UNCATEGORIZED_COLOR = '#78909C'

/** The chips above the table: the built-in filters, then one per category. */
export const filterOptions = (categories: Category[]): FilterOption[] => [
  { value: 'all', label: 'All', color: ALL_COLOR },
  { value: 'starred', label: 'Starred', color: STARRED_COLOR },
  { value: 'none', label: 'Uncategorized', color: UNCATEGORIZED_COLOR },
  ...categories.map(c => ({ value: c.id!, label: c.title, color: c.color || DEFAULT_CATEGORY_COLOR }))
]

/** A collection whose `starred` is always a boolean, so the table sorts on it. */
export type ListedCollection = Collection & { starred: boolean }

/**
 * Categories only apply to top-level collections: a sub-collection is filtered
 * by its top-level collection's category, so a category shows whole branches.
 */
export const filterCollections = (collections: Collection[], filter: CollectionFilter): ListedCollection[] => {
  const all = collections.map(c => ({ ...c, starred: c.starred === true }))
  if (filter === 'all') return all
  if (filter === 'starred') return all.filter(c => c.starred)
  const categoryOf = new Map(collections.map(c => [c.id, c.categoryId]))
  const category = (c: Collection) => categoryOf.get(topLevelOf(c.id!, collections))
  if (filter === 'none') return all.filter(c => !category(c))
  return all.filter(c => category(c) === filter)
}

/** A line of the collections table: a collection placed in the tree. */
export interface CollectionRow extends ListedCollection {
  /** 0 for a row at the top of the list. */
  depth: number
  /** Sub-collections shown right under this row, when expanded. */
  childCount: number
  /** Own items plus the items of every sub-collection. */
  totalItems: number
  /** Whether it lives inside another collection, even if that one is filtered out. */
  isSub: boolean
  /** The title, or the full path for a sub-collection shown without its parent. */
  label: string
}

const byStarThenTitle = (a: ListedCollection, b: ListedCollection) =>
  Number(b.starred) - Number(a.starred) || a.title.localeCompare(b.title)

/**
 * Lays the shown collections out as a tree: each one under its parent, sorted
 * starred first then by title within each level. A sub-collection whose parent
 * is filtered out sits at the top of the list with its full path, so it is
 * still clear which one it is. Collapsed collections hide what is inside them.
 */
export const collectionRows = (
  shown: ListedCollection[],
  all: Collection[],
  collapsed: ReadonlySet<string>
): CollectionRow[] => {
  const parents = parentsOf(all)
  const shownIds = new Set(shown.map(c => c.id))
  const children = new Map<string | undefined, ListedCollection[]>()
  for (const c of shown) {
    const parent = parents.get(c.id!)
    const key = parent && shownIds.has(parent) ? parent : undefined
    children.set(key, [...(children.get(key) ?? []), c])
  }

  const ownItems = new Map(all.map(c => [c.id, c.numberOfItems]))
  const totalItems = (id: string) =>
    [...withSubCollections([id], all)].reduce((n, sub) => n + (ownItems.get(sub) ?? 0), 0)

  const rows: CollectionRow[] = []
  const place = (c: ListedCollection, depth: number) => {
    const inside = (children.get(c.id) ?? []).sort(byStarThenTitle)
    const isSub = parents.has(c.id!)
    rows.push({
      ...c,
      depth,
      childCount: inside.length,
      totalItems: totalItems(c.id!),
      isSub,
      label: depth === 0 && isSub ? collectionPath(c.id!, all) : c.title
    })
    if (!collapsed.has(c.id!)) inside.forEach(sub => place(sub, depth + 1))
  }
  ;(children.get(undefined) ?? []).sort(byStarThenTitle).forEach(c => place(c, 0))
  return rows
}

/** False when the filter points at a category that no longer exists. */
export const isValidFilter = (filter: CollectionFilter, categories: Category[]): boolean =>
  (BUILT_IN_FILTERS as readonly string[]).includes(filter) || categories.some(c => c.id === filter)
