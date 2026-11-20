// How well each collection is known: its items counted per strength tier
// (new, weak, fair, good, mastered), from the card progress study writes.

import { STRENGTH_TIERS, STRENGTH_TIER_META, strengthTier, type StrengthTier } from './strength'

export type TierCounts = Record<StrengthTier, number>

export const emptyTierCounts = (): TierCounts => ({ new: 0, weak: 0, fair: 0, good: 0, mastered: 0 })

/** Each collection's items per tier. An item never studied counts as new. */
export function tierCountsByCollection(
  items: readonly { id?: string; collectionId: string }[],
  strengthById: ReadonlyMap<string, number>,
): Map<string, TierCounts> {
  const result = new Map<string, TierCounts>()
  for (const item of items) {
    let counts = result.get(item.collectionId)
    if (!counts) result.set(item.collectionId, (counts = emptyTierCounts()))
    counts[strengthTier(item.id ? strengthById.get(item.id) : undefined)]++
  }
  return result
}

/** The counts of several collections added up (a collection and its sub-collections). */
export function sumTierCounts(all: readonly (TierCounts | undefined)[]): TierCounts {
  const total = emptyTierCounts()
  for (const counts of all) {
    if (!counts) continue
    for (const tier of STRENGTH_TIERS) total[tier] += counts[tier]
  }
  return total
}

export const totalOf = (counts: TierCounts) => STRENGTH_TIERS.reduce((n, tier) => n + counts[tier], 0)

/** Share of the items known well (good or mastered), 0..1; null when there are none. */
export function knownShare(counts: TierCounts): number | null {
  const total = totalOf(counts)
  return total ? (counts.good + counts.mastered) / total : null
}

/** "New 10 · Weak 2 · Good 4", skipping empty tiers, for a tooltip. */
export const tierSummary = (counts: TierCounts) =>
  STRENGTH_TIERS.filter(tier => counts[tier] > 0)
    .map(tier => `${STRENGTH_TIER_META[tier].label} ${counts[tier]}`)
    .join(' · ')
