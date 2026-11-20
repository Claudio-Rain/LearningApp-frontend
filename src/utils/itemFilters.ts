// Filters over learning items, shared by the collection's item list and the
// Study Options exclusion table: a text search plus the priority, difficulty
// and strength (how well you know it) ladders.

import type { JSONContent } from '@tiptap/vue-3'
import { extractText } from './claude/text'
import { ITEM_LABEL_DEFS, LABEL_LEVELS, toLabelLevel, type ItemLabelKind } from './itemLabels'
import { STRENGTH_TIERS, STRENGTH_TIER_META, strengthTier, type StrengthTier } from './strength'

/** Filter value standing in for "this item has never been labeled". */
export const UNLABELED = 0

/** Options for a label filter: every level, plus the unlabeled bucket. */
export function labelFilterOptions(kind: ItemLabelKind) {
  const def = ITEM_LABEL_DEFS[kind]
  return [
    ...LABEL_LEVELS.map(level => ({ value: level as number, title: `${level} · ${def.levels[level].label}` })),
    { value: UNLABELED, title: def.unsetLabel },
  ]
}

/**
 * Options for the strength filter — the whole ladder, 'new' included, since an
 * unstudied card is a thing you'd want to filter *to*, not an absent value.
 */
export function strengthFilterOptions() {
  return STRENGTH_TIERS.map(tier => ({ value: tier, title: STRENGTH_TIER_META[tier].label }))
}

/**
 * A label matches when its level is selected, or when it is unlabeled and the
 * unlabeled bucket is selected. Nothing selected means no filter.
 */
export const matchesLabel = (value: number | undefined, selected: readonly number[]) =>
  !selected.length || selected.includes(toLabelLevel(value) ?? UNLABELED)

/** Lower-cased, accents stripped: "Introducción" is found by "introduccion". */
export const foldText = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export interface ItemFilterState {
  /** Words to find in the title or the answer; every word must appear. */
  query: string
  priority: number[]
  difficulty: number[]
  strength: StrengthTier[]
}

export const emptyItemFilters = (): ItemFilterState => ({ query: '', priority: [], difficulty: [], strength: [] })

/** How many filters are switched on (the search counts as one). */
export const activeFilterCount = (f: ItemFilterState) =>
  Number(!!f.query.trim()) + Number(!!f.priority.length) + Number(!!f.difficulty.length) + Number(!!f.strength.length)

type FilterableItem = {
  id?: string
  title: string
  content?: JSONContent
  priority?: number
  difficulty?: number
}

/**
 * The items that pass every active filter, in their original order.
 * `strengthOf` gives an item's strength score (absent = never studied).
 */
export function filterItems<T extends FilterableItem>(
  items: readonly T[],
  filters: ItemFilterState,
  strengthOf: (id: string) => number | undefined = () => undefined,
): T[] {
  const words = foldText(filters.query).split(/\s+/).filter(Boolean)
  return items.filter(item => {
    if (!matchesLabel(item.priority, filters.priority)) return false
    if (!matchesLabel(item.difficulty, filters.difficulty)) return false
    if (filters.strength.length && !filters.strength.includes(strengthTier(item.id ? strengthOf(item.id) : undefined))) {
      return false
    }
    if (!words.length) return true
    const haystack = foldText(`${item.title}\n${extractText(item.content)}`)
    return words.every(w => haystack.includes(w))
  })
}
