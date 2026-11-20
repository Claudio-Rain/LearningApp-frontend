import { parseISO } from 'date-fns'
import type { AttemptLog, CardProgress, LearningItem } from '@/database/types'
import { knownShare, tierCountsByCollection, totalOf } from '@/utils/collectionProgress'
import {
  SCORED_TIERS,
  STRENGTH_THRESHOLDS,
  clampStrength,
  isAtLeastTier,
  strengthTier,
  type ScoredTier,
  type StrengthTier
} from '@/utils/strength'
import type { ProgressChartData } from './charts/chartRegistry'

// Charts read the scale low→high and put never-studied cards last, rather than
// leading with them as STRENGTH_TIERS does for the distribution bar.
export const CHART_TIER_ORDER: StrengthTier[] = [...SCORED_TIERS, 'new']

// Hour-of-day labels: '12am', '1am', … '12pm', … '11pm'
export const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
})

// Chronological comparator for anything carrying a created_at ISO timestamp.
export const byCreatedAt = (a: { created_at: string }, b: { created_at: string }) =>
  parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime()

// Group attempt logs by their card (learning item) id.
export function groupLogsByCard(logs: AttemptLog[]): Map<string, AttemptLog[]> {
  const map = new Map<string, AttemptLog[]>()
  for (const log of logs) {
    const list = map.get(log.learning_item_id)
    if (list) list.push(log)
    else map.set(log.learning_item_id, [log])
  }
  return map
}

// An empty count for every scored tier, ready to be incremented.
export const emptyTierCounts = (): Record<ScoredTier, number> =>
  Object.fromEntries(SCORED_TIERS.map(t => [t, 0])) as Record<ScoredTier, number>

export const tierCountsWithNew = (
  buckets: Record<ScoredTier, number>,
  newCards: number
): Record<StrengthTier, number> => ({ ...buckets, new: newCards })

export function strengthBuckets(progress: CardProgress[]): Record<ScoredTier, number> {
  const buckets = emptyTierCounts()
  // Every card here has a progress row, so no score lands in the 'new' tier.
  for (const p of progress) buckets[strengthTier(p.strength_score) as ScoredTier]++
  return buckets
}

// Cards never studied: no attempt log AND no card progress entry.
export function newCardCount({ logs, progress, items }: ProgressChartData): number {
  const studiedIds = new Set<string>()
  progress.forEach(p => studiedIds.add(p.learning_item_id))
  logs.forEach(l => studiedIds.add(l.learning_item_id))
  return items.filter(i => !studiedIds.has(i.id!)).length
}

export interface ProgressStats {
  totalAttempts: number
  cardsLearned: number
  avgRevisionsToMaster: number
  totalCards: number
  projectedAttemptsToFinish: number
}

export function computeProgressStats({ logs, progress, items }: ProgressChartData): ProgressStats {
  // Avg revisions to master: for each card, simulate cumulative strength from
  // logs sorted by date and count how many attempts until it first masters.
  const masteredCounts: number[] = []
  for (const cardLogs of groupLogsByCard(logs).values()) {
    const sorted = cardLogs.slice().sort(byCreatedAt)
    let strength = 0
    for (let i = 0; i < sorted.length; i++) {
      strength = clampStrength(strength + sorted[i]!.ease_score)
      if (isAtLeastTier(strength, 'mastered')) {
        masteredCounts.push(i + 1)
        break
      }
    }
  }
  const avgRevisionsToMaster = masteredCounts.length > 0
    ? Math.round((masteredCounts.reduce((s, v) => s + v, 0) / masteredCounts.length) * 10) / 10
    : 0

  return {
    totalAttempts: logs.length,
    // "Learned" = out of the weak tiers, i.e. 'good' or better.
    cardsLearned: progress.filter(p => isAtLeastTier(p.strength_score, 'good')).length,
    avgRevisionsToMaster,
    totalCards: items.length,
    projectedAttemptsToFinish: estimateRevisionsToMaster({ logs, progress, items })
  }
}

// --- Learning curve and revisions left ------------------------------------------
//
// The learning curve is the average strength cards have after their 1st, 2nd,
// 3rd… revision — the blue line in "Strength vs revisions". The estimate of
// revisions left reads that same curve backwards: a card's current strength
// says how far along the curve it is, and the curve says how many more
// revisions it takes from there to reach mastered. A new card needs the whole
// climb; a card at 60% only the rest of it.

/** Attempt numbers with fewer cards than this are a noisy tail; left out. */
export const MIN_CURVE_SAMPLES = 3
/** Revisions a single card is ever projected to need, at most. */
const MAX_REVISIONS_PER_CARD = 100
/** Slope the extrapolation never drops below, so a flat tail can't project forever. */
const MIN_SLOPE = 0.005

export type CurvePoint = [attempt: number, strength: number]

/** Average strength (0..1) after each revision number, from replaying every card. */
export function learningCurve(logs: AttemptLog[]): CurvePoint[] {
  const byAttempt = new Map<number, { sum: number; count: number }>()
  replayCardStrength(logs, (_, attempt, strength) => {
    const agg = byAttempt.get(attempt) ?? { sum: 0, count: 0 }
    agg.sum += strength
    agg.count++
    byAttempt.set(attempt, agg)
  })
  return [...byAttempt.entries()]
    .filter(([, agg]) => agg.count >= MIN_CURVE_SAMPLES)
    .sort((a, b) => a[0] - b[0])
    .map(([attempt, agg]) => [attempt, agg.sum / agg.count])
}

/**
 * Where on the curve a strength sits, as a (fractional) revision number: the
 * point it's interpolated between, or past the end, extended along the
 * curve's final slope. The curve starts at (0, 0), before any revision, and is
 * made non-decreasing so each strength has one place on it.
 */
function attemptAt(strength: number, curve: CurvePoint[]): number {
  const points: CurvePoint[] = [[0, 0]]
  for (const [attempt, s] of curve) points.push([attempt, Math.max(s, points[points.length - 1]![1])])
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]!
    const [x1, y1] = points[i]!
    if (strength <= y1) return y1 === y0 ? x0 : x0 + ((strength - y0) / (y1 - y0)) * (x1 - x0)
  }
  // Past the end of the curve: carry on at its last few points' average slope.
  const tail = points.slice(-4)
  const [xa, ya] = tail[0]!
  const [xb, yb] = tail[tail.length - 1]!
  const slope = Math.max(MIN_SLOPE, xb > xa ? (yb - ya) / (xb - xa) : MIN_SLOPE)
  return xb + (strength - yb) / slope
}

/** Revisions left for one card at `strength` to reach mastered, following the curve. */
export function revisionsToMaster(strength: number, curve: CurvePoint[]): number {
  const mastered = STRENGTH_THRESHOLDS.good
  if (strength >= mastered) return 0
  const left = attemptAt(mastered, curve) - attemptAt(Math.max(0, strength), curve)
  return Math.min(MAX_REVISIONS_PER_CARD, Math.max(0, left))
}

/**
 * Revisions left until every card is mastered, following your learning curve
 * from each card's current strength (never-studied cards start at 0). 0 when
 * there isn't enough history for a curve yet.
 */
export function estimateRevisionsToMaster({ logs, progress, items }: ProgressChartData): number {
  const curve = learningCurve(logs)
  if (!curve.length) return 0
  const strength = new Map(progress.map(p => [p.learning_item_id, p.strength_score]))
  const total = items.reduce((sum, item) => sum + revisionsToMaster(strength.get(item.id!) ?? 0, curve), 0)
  return Math.round(total)
}

/** Per-card cumulative strength, replayed over that card's attempts in order. */
export function replayCardStrength(
  logs: AttemptLog[],
  onStep: (itemId: string, attemptNumber: number, strength: number) => void
): void {
  for (const [itemId, cardLogs] of groupLogsByCard(logs)) {
    const sorted = cardLogs.slice().sort(byCreatedAt)
    let strength = 0
    sorted.forEach((log, i) => {
      strength = clampStrength(strength + log.ease_score)
      onStep(itemId, i + 1, strength)
    })
  }
}

/** Attempt logs at or after `cutoff`. */
export function recentLogs(logs: AttemptLog[], cutoff: Date): AttemptLog[] {
  return logs.filter(log => parseISO(log.created_at) >= cutoff)
}

// --- What to study next -------------------------------------------------------

export interface WeakCollection {
  id: string
  title: string
  items: number
  /** 0..1 share of items known well (good or mastered). */
  known: number
}

/**
 * The collections with the lowest share of items known well, weakest first.
 * Only collections holding items count (a parent's items live in its
 * sub-collections), and fully known ones are left out — nothing to do there.
 */
export function weakestCollections(
  collections: readonly { id?: string; title: string }[],
  items: readonly LearningItem[],
  progress: readonly CardProgress[],
  limit = 5
): WeakCollection[] {
  const strength = new Map(progress.map(p => [p.learning_item_id, p.strength_score]))
  const counts = tierCountsByCollection(items, strength)
  return collections
    .flatMap(c => {
      const tiers = c.id ? counts.get(c.id) : undefined
      const known = tiers ? knownShare(tiers) : null
      if (!tiers || known === null || known >= 1) return []
      return [{ id: c.id!, title: c.title, items: totalOf(tiers), known }]
    })
    .sort((a, b) => a.known - b.known || b.items - a.items)
    .slice(0, limit)
}

export interface HardCard {
  id: string
  collectionId: string
  title: string
  /** 0..1 */
  strength: number
}

/** Studied cards not yet learned (below 'good'), weakest first. */
export function hardestCards(progress: readonly CardProgress[], items: readonly LearningItem[], limit = 8): HardCard[] {
  const byId = new Map(items.map(i => [i.id, i]))
  return progress
    .filter(p => !isAtLeastTier(p.strength_score, 'good') && byId.has(p.learning_item_id))
    .sort((a, b) => a.strength_score - b.strength_score)
    .slice(0, limit)
    .map(p => {
      const item = byId.get(p.learning_item_id)!
      return { id: item.id!, collectionId: item.collectionId, title: item.title, strength: p.strength_score }
    })
}
