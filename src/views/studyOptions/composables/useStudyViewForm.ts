import { computed } from 'vue'
import { useStudyViewCollection } from '@/shared/composables/useStudyViewCollection'
import { useStudyTimer, MIN_STUDY_TIMER_SECONDS } from '@/shared/composables/useStudyTimer'
import { useDurationFields } from './useDurationFields'
import { useCollectionCatalog } from './useCollectionCatalog'

const { studyViewCollectionIds, setStudyViewCollectionIds } = useStudyViewCollection()
const { studyTimerSeconds, setStudyTimerSeconds } = useStudyTimer()
const { loadingCollections } = useCollectionCatalog()

const timer = useDurationFields(studyTimerSeconds.value, MIN_STUDY_TIMER_SECONDS)

// The stored ids are available synchronously (localStorage), but the catalog's
// collections load async — so bind the selector to a proxy that withholds the
// value until the items exist, otherwise Vuetify briefly renders the raw ids
// as titles.
const selection = computed({
  get: () => (loadingCollections.value ? [] : studyViewCollectionIds.value),
  set: (ids: string[]) => setStudyViewCollectionIds(ids),
})

/**
 * The editable form for the Study View section: which collections it draws from
 * and how long each card is shown.
 *
 * The values are persisted by `useStudyViewCollection` and `useStudyTimer` (both
 * localStorage-backed and read by Study View itself); this composable is only
 * the page's editing surface over them, committed by save().
 */
export function useStudyViewForm() {
  function save() {
    setStudyViewCollectionIds(studyViewCollectionIds.value)
    setStudyTimerSeconds(timer.totalSeconds.value)
  }

  return {
    studyViewCollectionIds,
    selection,
    timerMinutes: timer.minutes,
    timerSecondsPart: timer.seconds,
    totalTimerSeconds: timer.totalSeconds,
    save,
  }
}
