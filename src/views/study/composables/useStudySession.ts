import { ref, computed, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatISO, parseISO, isToday } from 'date-fns'
import {
  getCollections,
  getAllLearningItems,
  getAllCardProgress,
  getAllAttemptLogs,
  createAttemptLog,
  createCardProgress,
  updateCardProgress,
  syncCardProgress,
  syncAttemptLogs
} from '@/database'
import type { Collection, LearningItem, CardProgress } from '@/database/types'
import { useExcludedItems } from '@/shared/composables/useExcludedItems'
import { withSubCollections } from '@/utils/subCollections'
import { buildStudyQueue, isNewProgress, mergeCollectionItems, summarizeProgress } from '../queue'
import type { StudyItem } from '../types'

/**
 * The study queue and everything that moves through it: loading the selected
 * collections, the current card, navigation, ratings, and removing cards.
 *
 * Timer restarts are left to the caller — the session only reports when the
 * queue ran out (advance() returns false) or emptied (removeItem() returns true).
 */
export function useStudySession(collectionIds: Ref<string[]>) {
  const router = useRouter()
  const { excludedItemIds } = useExcludedItems()

  const collections = ref<Collection[]>([])
  // The chosen collections plus their sub-collections — what the queue draws from.
  const studiedIds = ref<Set<string>>(new Set())
  const learningItems = ref<LearningItem[]>([])
  const cardProgressMap = ref<Map<string, CardProgress>>(new Map())
  const studyQueue = ref<StudyItem[]>([])
  const currentIndex = ref(0)
  const isFlipped = ref(false)
  // Attempts recorded today across every card (loaded from the logs, then
  // bumped locally on each rating so it stays live without re-reading the store).
  const attemptsToday = ref(0)

  const currentItem = computed<StudyItem | undefined>(() => studyQueue.value[currentIndex.value])

  // Badges read the queue snapshot (progress as of when the session loaded);
  // the counters below read the live map so they move the moment a rating lands.
  const isCurrentNew = computed(() => !!currentItem.value && isNewProgress(currentItem.value.progress))
  const currentStrengthScore = computed(() => currentItem.value?.progress?.strength_score)
  const currentAttempts = computed(() => {
    const id = currentItem.value?.id
    return id ? cardProgressMap.value.get(id)?.total_attempts ?? 0 : 0
  })
  const summary = computed(() => summarizeProgress(learningItems.value, cardProgressMap.value))

  const loadData = async () => {
    if (!collectionIds.value.length) {
      router.push({ name: 'collections' })
      return
    }

    const allCollections = await getCollections()
    collections.value = allCollections.filter(c => c.id && collectionIds.value.includes(c.id))
    if (!collections.value.length) {
      alert('Collection not found')
      router.push({ name: 'collections' })
      return
    }

    studiedIds.value = withSubCollections(collectionIds.value, allCollections)
    const items = (await getAllLearningItems()).filter(i => studiedIds.value.has(i.collectionId))
    learningItems.value = mergeCollectionItems([items], excludedItemIds.value)

    const progressMap = new Map<string, CardProgress>()
    for (const progress of await getAllCardProgress()) {
      progressMap.set(progress.learning_item_id, progress)
    }
    cardProgressMap.value = progressMap

    const allLogs = await getAllAttemptLogs()
    attemptsToday.value = allLogs.filter(log => isToday(parseISO(log.created_at))).length

    studyQueue.value = buildStudyQueue(learningItems.value, progressMap)
  }

  /** Reload from the store and start over at the first card. */
  const restart = async () => {
    await loadData()
    currentIndex.value = 0
    isFlipped.value = false
  }

  const goTo = (index: number) => {
    if (index === currentIndex.value) return
    currentIndex.value = index
    isFlipped.value = false
  }

  const prev = () => {
    if (currentIndex.value > 0) goTo(currentIndex.value - 1)
  }

  /** Step to the next card. Returns false at the end of the queue. */
  const advance = (): boolean => {
    if (currentIndex.value >= studyQueue.value.length - 1) return false
    goTo(currentIndex.value + 1)
    return true
  }

  /** Persist a rating of the current card; the local DB write syncs in the background. */
  const recordAttempt = (easeScore: number) => {
    const itemId = currentItem.value?.id
    if (!itemId) return

    const now = formatISO(new Date())
    attemptsToday.value++

    createAttemptLog({
      learning_item_id: itemId,
      ease_score: easeScore,
      is_correct: easeScore > 0,
      created_at: now
    }).then(() => syncAttemptLogs()).catch(() => {})

    const progress = cardProgressMap.value.get(itemId)
    if (progress) {
      const updated = {
        ...progress,
        strength_score: Math.max(0, Math.min(1, progress.strength_score + easeScore)),
        last_reviewed_at: now,
        total_attempts: progress.total_attempts + 1,
        weighted_attempts: progress.weighted_attempts + easeScore
      }
      cardProgressMap.value.set(itemId, updated)
      updateCardProgress(updated).then(() => syncCardProgress()).catch(() => {})
    } else {
      const created = {
        learning_item_id: itemId,
        strength_score: Math.max(0, easeScore),
        last_reviewed_at: now,
        total_attempts: 1,
        weighted_attempts: easeScore
      }
      createCardProgress(created).then(result => {
        cardProgressMap.value.set(itemId, { ...created, id: result as string, syncStatus: 'pending' })
        return syncCardProgress()
      }).catch(console.error)
    }
  }

  /**
   * Drop a card from this session (not from the store). The card that slides
   * into its place comes up face down. Returns true when the queue is now empty.
   */
  const removeItem = (id: string): boolean => {
    const index = studyQueue.value.findIndex(i => i.id === id)
    if (index !== -1) {
      studyQueue.value.splice(index, 1)
      // Removing a card before the current one shifts the current one down.
      if (index < currentIndex.value) currentIndex.value--
    }
    learningItems.value = learningItems.value.filter(i => i.id !== id)
    if (currentIndex.value >= studyQueue.value.length) {
      currentIndex.value = Math.max(0, studyQueue.value.length - 1)
    }
    isFlipped.value = false
    return studyQueue.value.length === 0
  }

  /** Add freshly created cards to this session, at the end of the queue. */
  const appendItems = (items: StudyItem[]) => {
    learningItems.value.push(...items)
    studyQueue.value.push(...items)
  }

  /** Apply a change to a card wherever this session holds a copy of it. */
  const patchItem = (id: string, patch: Partial<LearningItem>) => {
    const queued = studyQueue.value.find(i => i.id === id)
    if (queued) Object.assign(queued, patch)
    const loaded = learningItems.value.find(i => i.id === id)
    if (loaded) Object.assign(loaded, patch)
  }

  return {
    collections,
    studiedIds,
    learningItems,
    studyQueue,
    currentIndex,
    currentItem,
    isFlipped,
    attemptsToday,
    isCurrentNew,
    currentStrengthScore,
    currentAttempts,
    summary,
    loadData,
    restart,
    goTo,
    prev,
    advance,
    recordAttempt,
    removeItem,
    appendItems,
    patchItem
  }
}
