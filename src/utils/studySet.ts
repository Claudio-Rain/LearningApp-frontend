// Building a study set: turning "the easy, essential cards from these three
// collections, balanced" into an exact list of learning items.
//
// This module is pure and deliberately contains no AI. The assistant's job is
// to turn a sentence into a StudySetSpec; *resolving* that spec is arithmetic,
// and arithmetic belongs in code where it is exact, testable, and free. A model
// asked to pick 90 items by id would spend ~20 tokens per id and still risk
// miscounting, duplicating, or inventing one.

import type { LabelLevel } from './itemLabels'

/** One item as the builder sees it — three numeric axes, never card content. */
export interface StudySetItem {
  id: string
  collectionId: string
  title: string
  priority?: number
  difficulty?: number
  /** 0..1, absent when never studied. */
  strength?: number
}

/** An inclusive numeric window. Omit a bound to leave that side open. */
export interface Range {
  min?: number
  max?: number
}

/**
 * Which cards qualify. Every field is optional and they combine with AND.
 *
 * `includeUnlabeled` decides what happens to cards the user (or the assistant)
 * never labeled: excluded by default, because a difficulty filter that silently
 * admits unrated cards isn't the filter the user asked for. It only applies
 * when the corresponding label is actually being filtered on.
 */
export interface StudySetFilter {
  priority?: Range
  difficulty?: Range
  /** Cards at or below this strength — "what I haven't learned yet". */
  maxStrength?: number
  /** Cards never studied. `true` = only new cards, `false` = only seen ones. */
  onlyNew?: boolean
  includeUnlabeled?: boolean
}

/**
 * How to divide a total across collections.
 *
 * `proportional` alone starves a small collection: three pools of 120/40/8
 * split 90 ways gives the last one 4 cards. `balanced` is the same split with
 * a floor and a cap — nothing is starved, nothing dominates, and a collection
 * that can't fill its share hands the remainder back rather than short-changing
 * the total. It is the default because it is what people mean by "divided
 * between these" when they haven't thought about the edge cases.
 */
export type BalanceMode = 'balanced' | 'proportional' | 'equal'

export interface StudySetSpec {
  collectionIds: string[]
  /** How many cards the finished set should hold. Omit to take everything that qualifies. */
  total?: number
  filter?: StudySetFilter
  balance?: BalanceMode
  /**
   * Per-collection ceilings, keyed by collection id. A capped collection
   * contributes at most this many cards; uncapped ones are untouched.
   *
   * This is what expresses "at most 10 from this one, leave the rest alone":
   * set a limit and omit `total`. Caps apply before the split, so they hold
   * regardless of balance mode — a cap is a hard ceiling, not a weight.
   */
  limits?: Record<string, number>
  /**
   * Fraction of the fair share every collection is guaranteed, 0..1, for
   * `balanced` only. 0.5 means no collection gets less than half of what an
   * even split would give it — as long as it has the cards.
   */
  floorRatio?: number
}

export interface CollectionAllocation {
  collectionId: string
  /** How many cards in this collection passed the filter, before any cap. */
  pool: number
  /** How many the set actually takes. */
  taken: number
  /** The ceiling that was set for this collection, if any. */
  cap?: number
}

export interface StudySetPlan {
  /** The chosen items, in study order. */
  items: StudySetItem[]
  /** Per collection, what was available and what was taken. */
  allocations: CollectionAllocation[]
  /**
   * Items in the chosen collections that the set leaves out — what a caller
   * excludes to make this set the active one.
   */
  leftOutIds: string[]
  /** Set when the filter could not be satisfied in full, in the user's words. */
  shortfall?: string
}

const DEFAULT_FLOOR_RATIO = 0.5

/** A cap is only meaningful as a non-negative whole number; anything else is no cap. */
const normalizeCap = (cap: number | undefined): number | undefined =>
  cap === undefined || !Number.isFinite(cap) || cap < 0 ? undefined : Math.floor(cap)

const inRange = (value: number | undefined, range: Range | undefined, includeUnlabeled: boolean): boolean => {
  if (!range || (range.min === undefined && range.max === undefined)) return true
  if (value === undefined) return includeUnlabeled
  if (range.min !== undefined && value < range.min) return false
  if (range.max !== undefined && value > range.max) return false
  return true
}

/** Does one item qualify? Exported so a UI can show a live count as filters change. */
export function matchesFilter(item: StudySetItem, filter: StudySetFilter = {}): boolean {
  const includeUnlabeled = filter.includeUnlabeled ?? false

  if (!inRange(item.priority, filter.priority, includeUnlabeled)) return false
  if (!inRange(item.difficulty, filter.difficulty, includeUnlabeled)) return false

  if (filter.onlyNew !== undefined) {
    const isNew = item.strength === undefined
    if (filter.onlyNew !== isNew) return false
  }
  if (filter.maxStrength !== undefined && (item.strength ?? 0) > filter.maxStrength) return false

  return true
}

/**
 * Rank within a collection: most important first, then easiest, then weakest —
 * so a set that can't take everything takes the cards worth studying first.
 * Unlabeled sorts last within its group rather than counting as zero.
 */
function byStudyOrder(a: StudySetItem, b: StudySetItem): number {
  const priority = (b.priority ?? 0) - (a.priority ?? 0)
  if (priority !== 0) return priority
  const difficulty = (a.difficulty ?? 6) - (b.difficulty ?? 6)
  if (difficulty !== 0) return difficulty
  return (a.strength ?? 0) - (b.strength ?? 0)
}

/**
 * Divide `total` across pools without starving the small ones.
 *
 * Each collection is guaranteed `floorRatio` of an even share (capped by what
 * it actually has), the rest is handed out in proportion to the pools, and
 * anything left over by rounding or by a pool running dry is redistributed to
 * collections that still have cards. Largest-remainder, so the parts always sum
 * to exactly `total` (or to everything available, if that is less).
 */
export function allocate(
  pools: number[],
  total: number,
  mode: BalanceMode = 'balanced',
  floorRatio = DEFAULT_FLOOR_RATIO
): number[] {
  const available = pools.reduce((sum, n) => sum + n, 0)
  const target = Math.min(total, available)
  if (target <= 0 || pools.length === 0) return pools.map(() => 0)

  const taken = pools.map(() => 0)
  let remaining = target

  if (mode === 'balanced') {
    // Floor pass: nobody drops below their guaranteed share.
    const floor = Math.floor((target / pools.length) * floorRatio)
    for (const [i, pool] of pools.entries()) {
      const give = Math.min(floor, pool, remaining)
      taken[i] = give
      remaining -= give
    }
  }

  // Main pass: hand out what's left by weight, capped at what each pool holds.
  // Repeats because a pool hitting its cap frees up remainder for the others.
  while (remaining > 0) {
    const handedOut = distributeRound(pools, taken, remaining, mode)
    // No progress possible (every pool is full, or each rounded to zero and
    // none could take the remainder) — stop rather than spin.
    if (handedOut === 0) break
    remaining -= handedOut
  }

  return taken
}

/**
 * One weighted pass: add to `taken` in place and return how much was handed out.
 * Largest-remainder, so the integers sum back to `remaining` rather than
 * drifting from rounding. 'equal' weights every collection the same; the other
 * modes weight by pool size.
 */
function distributeRound(
  pools: number[],
  taken: number[],
  remaining: number,
  mode: BalanceMode
): number {
  const eligible = pools
    .map((pool, i) => ({ i, headroom: pool - taken[i]! }))
    .filter(e => e.headroom > 0)
  if (eligible.length === 0) return 0

  const weights = eligible.map(e => (mode === 'equal' ? 1 : pools[e.i]!))
  const weightTotal = weights.reduce((sum, w) => sum + w, 0)

  const ideal = eligible.map((e, k) => Math.min(e.headroom, (remaining * weights[k]!) / weightTotal))
  const whole = ideal.map(Math.floor)
  let handedOut = whole.reduce((sum, n) => sum + n, 0)

  const byRemainder = ideal
    .map((value, k) => ({ k, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder)

  for (const { k } of byRemainder) {
    if (handedOut >= remaining) break
    if (whole[k]! < eligible[k]!.headroom) {
      whole[k]! += 1
      handedOut += 1
    }
  }

  for (const [k, e] of eligible.entries()) {
    taken[e.i]! += whole[k]!
  }
  return handedOut
}

/**
 * Resolve a spec into an exact set of items.
 *
 * `items` is every item in the library; only those in `spec.collectionIds` are
 * considered. The result is deterministic: same items and spec in, same set out.
 */
export function resolveStudySet(items: StudySetItem[], spec: StudySetSpec): StudySetPlan {
  const collectionIds = spec.collectionIds.filter(Boolean)
  const inScope = items.filter(i => collectionIds.includes(i.collectionId))

  const qualifying = new Map<string, StudySetItem[]>(collectionIds.map(id => [id, []]))
  for (const item of inScope) {
    if (matchesFilter(item, spec.filter)) qualifying.get(item.collectionId)!.push(item)
  }
  for (const list of qualifying.values()) list.sort(byStudyOrder)

  // What each collection *could* contribute, and what it is allowed to. A cap
  // is applied before the split, so it holds no matter how the split works out
  // — and because the list is already in study order, a capped collection keeps
  // its best cards rather than an arbitrary slice.
  const matched = collectionIds.map(id => qualifying.get(id)!.length)
  const caps = collectionIds.map(id => normalizeCap(spec.limits?.[id]))
  const pools = matched.map((n, i) => (caps[i] === undefined ? n : Math.min(n, caps[i]!)))

  const available = pools.reduce((sum, n) => sum + n, 0)
  const total = spec.total ?? available

  const taken = allocate(pools, total, spec.balance ?? 'balanced', spec.floorRatio)

  const chosen: StudySetItem[] = []
  const allocations: CollectionAllocation[] = collectionIds.map((collectionId, i) => {
    chosen.push(...qualifying.get(collectionId)!.slice(0, taken[i]!))
    return { collectionId, pool: matched[i]!, taken: taken[i]!, cap: caps[i] }
  })

  const chosenIds = new Set(chosen.map(i => i.id))
  return {
    items: chosen,
    allocations,
    leftOutIds: inScope.filter(i => !chosenIds.has(i.id)).map(i => i.id),
    shortfall: describeShortfall(chosen.length, total, available, allocations)
  }
}

/** Plain-language note when the set couldn't be filled as asked — or null. */
function describeShortfall(
  chosenCount: number,
  requested: number,
  available: number,
  allocations: CollectionAllocation[]
): string | undefined {
  if (chosenCount >= requested) return undefined

  const empty = allocations.filter(a => a.pool === 0).length
  if (available === 0) {
    return 'No cards match that filter in the selected collections.'
  }

  // A cap is a deliberate ceiling, not a shortage — saying "only N cards match"
  // would blame the filter for a limit the user asked for.
  const capped = allocations.filter(a => a.cap !== undefined && a.cap < a.pool)
  if (capped.length > 0) {
    return `The set has ${chosenCount} instead of ${requested}: ${capped.length} collection${capped.length === 1 ? ' is' : 's are'} capped, and the rest don't have enough matching cards to make up the difference.`
  }

  const base = `Only ${available} card${available === 1 ? '' : 's'} match that filter, so the set has ${chosenCount} instead of ${requested}.`
  return empty > 0
    ? `${base} ${empty} of the collections have no matching cards at all.`
    : base
}

/** The levels a range covers, for describing a filter back to the user. */
export function rangeLevels(range: Range | undefined): LabelLevel[] {
  const min = range?.min ?? 1
  const max = range?.max ?? 5
  return [1, 2, 3, 4, 5].filter((l): l is LabelLevel => l >= min && l <= max)
}
