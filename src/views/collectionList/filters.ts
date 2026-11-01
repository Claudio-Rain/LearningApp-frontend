import type { Category, Collection } from '@/database/types'
import { DEFAULT_CATEGORY_COLOR } from '@/utils/categoryColors'

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

export const filterCollections = (collections: Collection[], filter: CollectionFilter): ListedCollection[] => {
  const all = collections.map(c => ({ ...c, starred: c.starred === true }))
  if (filter === 'all') return all
  if (filter === 'starred') return all.filter(c => c.starred)
  if (filter === 'none') return all.filter(c => !c.categoryId)
  return all.filter(c => c.categoryId === filter)
}

/** False when the filter points at a category that no longer exists. */
export const isValidFilter = (filter: CollectionFilter, categories: Category[]): boolean =>
  (BUILT_IN_FILTERS as readonly string[]).includes(filter) || categories.some(c => c.id === filter)
