import { ref, type Ref } from 'vue'
import { clearStudyHistoryForItems } from '@/database'
import type { Collection, LearningItem } from '@/database/types'

/** "Start over": wipes progress for every item in the collection, cards intact. */
export function useStudyHistoryReset(
  collection: Ref<Collection | null>,
  learningItems: Ref<LearningItem[]>
) {
  const isClearing = ref(false)
  const progress = ref('')

  const clear = async () => {
    if (!collection.value || learningItems.value.length === 0) return
    const confirmed = confirm(
      `Start over with "${collection.value.title}"?\n\n` +
      'This clears how you did last time so you can study it fresh. ' +
      'Your cards stay exactly as they are.'
    )
    if (!confirmed) return

    isClearing.value = true
    progress.value = ''
    try {
      const itemIds = learningItems.value.map(i => i.id).filter((id): id is string => !!id)
      await clearStudyHistoryForItems(itemIds, (done, total) => {
        progress.value = total > 0 ? `Clearing ${done} of ${total}…` : ''
      })
      alert('All set! You can study this collection fresh.')
    } catch (error) {
      console.error('Failed to clear study history:', error)
      alert("Something went wrong and your progress wasn't cleared. Please try again.")
    } finally {
      isClearing.value = false
      progress.value = ''
    }
  }

  return { isClearing, progress, clear }
}
