import { ref } from 'vue'
import { useExcludedItems } from '@/shared/composables/useExcludedItems'
import { useStudyViewCollection } from '@/shared/composables/useStudyViewCollection'
import type { StudySetPlan } from '@/utils/studySet'

export interface AppliedSet {
  included: number
  excluded: number
  restored: number
}

const applying = ref(false)

/**
 * Making a resolved plan the set the user actually studies.
 *
 * There is no separate "study set" record: a set IS the combination of which
 * collections Study View draws from and which items are excluded — both of
 * which already exist, already sync, and are already read by Study View, the
 * widget and the background script. Expressing a set through them means it
 * takes effect everywhere immediately, with nothing new to keep in step.
 *
 * The consequence worth knowing: there is exactly ONE active set. Applying a
 * new one replaces the previous one's exclusions rather than sitting alongside
 * it. Named, switchable sets would need a stored object of their own.
 */
export function useStudySet() {
  const { excludedItemIds, excludeMany, includeMany } = useExcludedItems()
  const { setStudyViewCollectionIds } = useStudyViewCollection()

  /**
   * Point Study View at the plan's collections and exclude everything the plan
   * left out. Items the plan *includes* that were excluded by a previous set are
   * un-excluded, so switching sets doesn't accumulate stale exclusions.
   */
  async function applySet(plan: StudySetPlan): Promise<AppliedSet> {
    applying.value = true
    try {
      const collectionIds = plan.allocations.map(a => a.collectionId)
      setStudyViewCollectionIds(collectionIds)

      // Anything in this set that a previous set had excluded must come back,
      // or the new set would silently study fewer cards than it promises.
      const restore = plan.items.map(i => i.id).filter(id => excludedItemIds.value.has(id))
      const restored = await includeMany(restore)

      const excluded = await excludeMany(plan.leftOutIds)

      return { included: plan.items.length, excluded, restored }
    } finally {
      applying.value = false
    }
  }

  /**
   * Point Study View at whole collections, with no filtering.
   *
   * `clearExclusions` lifts exclusions on the chosen collections' cards. Without
   * it, a selection made after an earlier study set silently studies fewer cards
   * than the collections hold — the exclusions are still in force.
   */
  async function applyCollections(
    collectionIds: string[],
    itemIdsInCollections: string[],
    clearExclusions: boolean
  ): Promise<{ restored: number }> {
    applying.value = true
    try {
      setStudyViewCollectionIds(collectionIds)
      if (!clearExclusions) return { restored: 0 }

      const restore = itemIdsInCollections.filter(id => excludedItemIds.value.has(id))
      return { restored: await includeMany(restore) }
    } finally {
      applying.value = false
    }
  }

  return { applying, applySet, applyCollections }
}
