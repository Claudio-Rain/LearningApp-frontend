import { parseISO } from 'date-fns'
import type { AttemptLog, CardProgress } from '@/database/types'
import {
  SCORED_TIERS,
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

  // Projection: how much work remains to master every card.
  const totalCards = items.length
  const masteredCards = progress.filter(p => isAtLeastTier(p.strength_score, 'mastered')).length
  const remainingCards = Math.max(0, totalCards - masteredCards)

  return {
    totalAttempts: logs.length,
    // "Learned" = out of the weak tiers, i.e. 'good' or better.
    cardsLearned: progress.filter(p => isAtLeastTier(p.strength_score, 'good')).length,
    avgRevisionsToMaster,
    totalCards,
    projectedAttemptsToFinish: Math.round(remainingCards * avgRevisionsToMaster)
  }
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
