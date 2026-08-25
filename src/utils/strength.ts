// The mastery scale, defined once for the whole app.
//
// A card's `strength_score` is a 0–1 number; it falls into one of four scored
// tiers, plus a fifth "new" tier for cards with no progress yet. Every surface
// that names, colors, or buckets a strength reads it from here — previously the
// same ladder was re-implemented in StudyView, StudyProgressView and this file,
// with three different sets of labels for the same score bands.

export type StrengthTier = 'new' | 'weak' | 'fair' | 'good' | 'mastered'

// Tiers a *studied* card can land in, ordered low→high. Excludes 'new', which
// is not a score band but the absence of one.
export const SCORED_TIERS = ['weak', 'fair', 'good', 'mastered'] as const
export type ScoredTier = (typeof SCORED_TIERS)[number]

// Every tier, ordered new→mastered, for legends and distribution bars.
export const STRENGTH_TIERS: StrengthTier[] = ['new', ...SCORED_TIERS]

// Upper bound (exclusive) of each scored tier; the last one is open-ended.
export const STRENGTH_THRESHOLDS: Record<ScoredTier, number> = {
  weak: 0.25,
  fair: 0.5,
  good: 0.75,
  mastered: Infinity
}

// Lower bound (inclusive) of each scored tier as a 0–100 percentage — where a
// chart draws that tier's threshold line. Derived so it cannot drift from the
// thresholds above.
export const STRENGTH_TIER_FLOORS = SCORED_TIERS.reduce((floors, tier, i) => {
  const below = SCORED_TIERS[i - 1]
  floors[tier] = below ? STRENGTH_THRESHOLDS[below] * 100 : 0
  return floors
}, {} as Record<ScoredTier, number>)

export interface StrengthTierMeta {
  tier: StrengthTier
  label: string
  // Vuetify theme tokens. The scale is one concept rendered three ways — badge
  // text, muted bar fill, chart series — and each needs its own lightness ramp,
  // so the tokens are parallel families rather than one reused at opacities.
  scale: string // chart series / chips
  scaleText: string // plot-line label text, a notch darker than the line
  mastery: string // badge text, on a 15%-tint of itself
  bar: string // distribution-bar fill
}

export const STRENGTH_TIER_META: Record<StrengthTier, StrengthTierMeta> = {
  new: { tier: 'new', label: 'New', scale: 'scaleNew', scaleText: 'scaleNew', mastery: 'masteryNew', bar: 'barNew' },
  weak: { tier: 'weak', label: 'Weak', scale: 'scaleWeak', scaleText: 'scaleWeakText', mastery: 'masteryWeak', bar: 'barWeak' },
  fair: { tier: 'fair', label: 'Fair', scale: 'scaleFair', scaleText: 'scaleFairText', mastery: 'masteryFair', bar: 'barFair' },
  good: { tier: 'good', label: 'Good', scale: 'scaleGood', scaleText: 'scaleGoodText', mastery: 'masteryGood', bar: 'barGood' },
  mastered: { tier: 'mastered', label: 'Mastered', scale: 'scaleMastered', scaleText: 'scaleMasteredText', mastery: 'masteryMastered', bar: 'barMastered' }
}

/**
 * The tier a strength score falls into.
 *
 * Pass `null`/`undefined` for a card with no progress yet to get 'new'. What
 * counts as "no progress" is the caller's call and differs by surface — an
 * absent CardProgress row, zero attempts, or a negative sentinel score — so
 * this function only handles the score itself.
 */
export function strengthTier(score: number | null | undefined): StrengthTier {
  if (score === null || score === undefined || score < 0) return 'new'
  if (score < STRENGTH_THRESHOLDS.weak) return 'weak'
  if (score < STRENGTH_THRESHOLDS.fair) return 'fair'
  if (score < STRENGTH_THRESHOLDS.good) return 'good'
  return 'mastered'
}

// True when a score reaches `tier` or better. 'new' is below every scored tier,
// so a card with no progress never counts as reaching one.
export function isAtLeastTier(score: number | null | undefined, tier: ScoredTier): boolean {
  return SCORED_TIERS.indexOf(strengthTier(score) as ScoredTier) >= SCORED_TIERS.indexOf(tier)
}

// Label + color tokens for a score, in one lookup.
export function strengthMeta(score: number | null | undefined): StrengthTierMeta {
  return STRENGTH_TIER_META[strengthTier(score)]
}

// Strength accumulates by summing ease_score, held inside [0, 1].
export function clampStrength(score: number): number {
  return Math.min(1, Math.max(0, score))
}
