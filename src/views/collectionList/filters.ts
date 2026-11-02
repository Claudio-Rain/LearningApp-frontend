import type { Category, Collection } from '@/database/types'
import { DEFAULT_CATEGORY_COLOR } from '@/utils/categoryColors'
import { canMoveInto, collectionPath, parentsOf } from '@/utils/subCollections'

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
  const parents = parentsOf(collections)
  const categoryOf = new Map(collections.map(c => [c.id, c.categoryId]))
  const topLevel = (id: string) => {
    while (parents.has(id)) id = parents.get(id)!
    return id
  }
  const category = (c: Collection) => categoryOf.get(topLevel(c.id!))
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

// The order within a level: the dragged-in order first, then collections never
// placed (starred first, then by title). Infinity - Infinity is NaN, which falls through.
const byOrder = (a: Collection, b: Collection) =>
  (a.order ?? Infinity) - (b.order ?? Infinity) ||
  Number(!!b.starred) - Number(!!a.starred) ||
  a.title.localeCompare(b.title)

/**
 * Lays the shown collections out as a tree: each one under its parent, in the
 * order of its level (see `byOrder`). A sub-collection whose parent
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

  // Totals are summed bottom-up once, each collection counted from its children's totals.
  const allChildren = new Map<string, string[]>()
  for (const [id, parent] of parents) allChildren.set(parent, [...(allChildren.get(parent) ?? []), id])
  const ownItems = new Map(all.map(c => [c.id, c.numberOfItems]))
  const totals = new Map<string, number>()
  const totalItems = (id: string): number => {
    if (!totals.has(id)) {
      const inside = (allChildren.get(id) ?? []).reduce((n, sub) => n + totalItems(sub), 0)
      totals.set(id, (ownItems.get(id) ?? 0) + inside)
    }
    return totals.get(id)!
  }

  const rows: CollectionRow[] = []
  const place = (c: ListedCollection, depth: number) => {
    const inside = (children.get(c.id) ?? []).sort(byOrder)
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
  ;(children.get(undefined) ?? []).sort(byOrder).forEach(c => place(c, 0))
  return rows
}

/** Dropped before or after a collection (same level), or inside it (at the end). */
export type DropPosition = 'before' | 'after' | 'inside'

/** The level a drop lands in: the target itself for 'inside', else the target's parent. */
export const dropParent = (
  all: Collection[],
  targetId: string | null,
  position: DropPosition
): string | null => {
  if (position === 'inside' || targetId === null) return targetId
  return parentsOf(all).get(targetId) ?? null
}

/**
 * Drops collection `id` relative to `targetId` (null = the top level, at the
 * end). Its level is renumbered 0, 1, 2… so the order is explicit from then on.
 * Returns only the collections that change; none when the drop isn't allowed.
 * Categories only apply at the top level, so one moved inside loses its own.
 */
export const dropCollection = (
  all: Collection[],
  id: string,
  targetId: string | null,
  position: DropPosition
): Collection[] => {
  const moved = all.find(c => c.id === id)
  const parentId = dropParent(all, targetId, position)
  if (!moved || targetId === id || !canMoveInto(id, parentId, all)) return []

  const parents = parentsOf(all)
  const level = all.filter(c => c.id !== id && (parents.get(c.id!) ?? null) === parentId).sort(byOrder)
  const at =
    position === 'inside' || targetId === null
      ? level.length
      : level.findIndex(c => c.id === targetId) + (position === 'after' ? 1 : 0)
  level.splice(at, 0, moved)

  return level.flatMap((c, order) => {
    if (c.id === id) {
      const categoryId = parentId ? null : (c.categoryId ?? null)
      return [{ ...c, parentId, categoryId, order }]
    }
    return c.order === order ? [] : [{ ...c, order }]
  })
}

/** False when the filter points at a category that no longer exists. */
export const isValidFilter = (filter: CollectionFilter, categories: Category[]): boolean =>
  (BUILT_IN_FILTERS as readonly string[]).includes(filter) || categories.some(c => c.id === filter)
