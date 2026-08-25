import { ref } from 'vue'

const STORAGE_KEY = 'studyViewCollectionIds'
const LEGACY_STORAGE_KEY = 'studyViewCollectionId'

// Reads the multi-id key, falling back to (and migrating from) the legacy
// single-id key so existing users keep their stored selection.
function readStoredIds(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === 'string')
    } catch {
      // fall through to legacy key
    }
  }
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
  return legacy ? [legacy] : []
}

const studyViewCollectionIds = ref<string[]>(readStoredIds())

export function useStudyViewCollection() {
  function setStudyViewCollectionIds(ids: string[]) {
    studyViewCollectionIds.value = ids
    if (ids.length && ids[0]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
      // Keep the legacy key pointing at the first selection for anything that
      // still reads it (e.g. older extension surfaces).
      localStorage.setItem(LEGACY_STORAGE_KEY, ids[0])
    } else {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
  }

  return { studyViewCollectionIds, setStudyViewCollectionIds }
}
