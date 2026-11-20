import { ref } from 'vue'
import { getAllCardProgress, getAllLearningItems } from '@/database'
import { tierCountsByCollection, type TierCounts } from '@/utils/collectionProgress'

/**
 * Each collection's items per strength tier, for the progress column. Read
 * from the local store, so it's quick; reload after a pull to pick up study
 * done on another device.
 */
export function useCollectionProgress() {
  const tiersByCollection = ref(new Map<string, TierCounts>())

  const loadProgress = async () => {
    const [items, progress] = await Promise.all([getAllLearningItems(), getAllCardProgress()])
    const strength = new Map(progress.map(p => [p.learning_item_id, p.strength_score]))
    tiersByCollection.value = tierCountsByCollection(items, strength)
  }

  return { tiersByCollection, loadProgress }
}
