import { parseISO } from 'date-fns'
import { strengthTier, STRENGTH_TIERS, type StrengthTier } from '@/utils/strength'
import type { CardProgress, LearningItem } from '@/database/types'
import type { StudyItem } from './types'

/** A card counts as new until its first rating, whether or not a progress row exists. */
export const isNewProgress = (progress?: CardProgress | null): boolean =>
  !progress || progress.total_attempts === 0

const reviewedAt = (item: StudyItem): number =>
  item.progress?.last_reviewed_at ? parseISO(item.progress.last_reviewed_at).getTime() : Number.MAX_VALUE

/**
 * Order cards for a session: never-rated cards first, then weakest first, then
 * least recently reviewed, then alphabetically so the order is stable.
 */
export const compareStudyItems = (a: StudyItem, b: StudyItem): number => {
  const aIsNew = isNewProgress(a.progress)
  const bIsNew = isNewProgress(b.progress)
  if (aIsNew !== bIsNew) return aIsNew ? -1 : 1

  const aStrength = a.progress?.strength_score ?? 0
  const bStrength = b.progress?.strength_score ?? 0
  if (aStrength !== bStrength) return aStrength - bStrength

  const aReviewed = reviewedAt(a)
  const bReviewed = reviewedAt(b)
  if (aReviewed !== bReviewed) return aReviewed - bReviewed

  return a.title.localeCompare(b.title)
}

/** Attach each item's progress and sort the result into study order. */
export const buildStudyQueue = (
  items: LearningItem[],
  progressMap: Map<string, CardProgress>
): StudyItem[] =>
  items
    .map(item => ({ ...item, progress: progressMap.get(item.id!) }))
    .sort(compareStudyItems)

/**
 * Merge per-collection item lists into one, dropping excluded items and items
 * that live in more than one of the selected collections.
 */
export const mergeCollectionItems = (
  perCollection: LearningItem[][],
  excludedIds: Set<string>
): LearningItem[] => {
  const seen = new Set<string>()
  return perCollection.flat().filter(item => {
    if (item.id && (excludedIds.has(item.id) || seen.has(item.id))) return false
    if (item.id) seen.add(item.id)
    return true
  })
}

export interface ProgressSummary {
  newCount: number
  revisedCount: number
  totalRevisions: number
  /** Cards per strength tier, with never-rated cards counted as 'new'. */
  tierCounts: Record<StrengthTier, number>
}

/** Session-wide counters for the header badges, metrics and distribution bar. */
export const summarizeProgress = (
  items: LearningItem[],
  progressMap: Map<string, CardProgress>
): ProgressSummary => {
  const tierCounts = Object.fromEntries(STRENGTH_TIERS.map(t => [t, 0])) as Record<StrengthTier, number>
  let newCount = 0
  let totalRevisions = 0
  for (const item of items) {
    const progress = progressMap.get(item.id!)
    const isNew = isNewProgress(progress)
    if (isNew) newCount++
    totalRevisions += progress?.total_attempts ?? 0
    tierCounts[strengthTier(isNew ? null : progress!.strength_score)]++
  }
  return { newCount, revisedCount: items.length - newCount, totalRevisions, tierCounts }
}
