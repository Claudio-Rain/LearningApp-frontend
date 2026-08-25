import { ref } from 'vue'
import { getLocalContentWidget, syncContentWidget, saveContentWidget } from '@/database'
import { useDurationFields } from './useDurationFields'

// Chrome clamps alarm periods below ~30s, so that's the effective floor.
export const MIN_AUTO_ADVANCE_SECONDS = 30
const DEFAULT_AUTO_ADVANCE_SECONDS = 180

const contentCollectionIds = ref<string[]>([])
// Stored ids that no longer resolve to a collection; surfaced so the user can
// re-select rather than silently losing part of their selection on save.
const missingContentCollectionIds = ref<string[]>([])
// Freezes the selector (spinner + disabled) until the remote value has been
// pulled and resolved against the loaded collections.
const loading = ref(true)

const autoAdvance = useDurationFields(DEFAULT_AUTO_ADVANCE_SECONDS, MIN_AUTO_ADVANCE_SECONDS)

/**
 * The editable form for the content widget section: which collections the
 * widget cycles through and how long it shows each item.
 *
 * Unlike the Study View form, these values live in Firestore as well as the
 * local DB, so load() pulls before reading and save() writes through both.
 */
export function useContentWidgetForm() {
  // `knownCollectionIds` are the collections that currently exist; stored ids
  // outside that set are split off into missingContentCollectionIds.
  async function load(knownCollectionIds: Iterable<string>) {
    loading.value = true
    try {
      await syncContentWidget()
      const { contentCollectionIds: storedIds, autoAdvanceSeconds } = await getLocalContentWidget()
      if (storedIds?.length) {
        const existing = new Set(knownCollectionIds)
        contentCollectionIds.value = storedIds.filter((id: string) => existing.has(id))
        missingContentCollectionIds.value = storedIds.filter((id: string) => !existing.has(id))
      }
      if (autoAdvanceSeconds != null) autoAdvance.setFromSeconds(autoAdvanceSeconds)
    } finally {
      loading.value = false
    }
  }

  // Writes cache + remote, handling its own lastModified/pending bookkeeping.
  function save() {
    return saveContentWidget([...contentCollectionIds.value], autoAdvance.totalSeconds.value)
  }

  return {
    contentCollectionIds,
    missingContentCollectionIds,
    loading,
    autoAdvanceMinutes: autoAdvance.minutes,
    autoAdvanceSecondsPart: autoAdvance.seconds,
    totalAutoAdvanceSeconds: autoAdvance.totalSeconds,
    load,
    save,
  }
}
