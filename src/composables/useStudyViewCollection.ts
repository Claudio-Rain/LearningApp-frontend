import { ref } from 'vue'

const studyViewCollectionId = ref<string | null>(localStorage.getItem('studyViewCollectionId'))

export function useStudyViewCollection() {
  function setStudyViewCollectionId(id: string | null) {
    studyViewCollectionId.value = id
    if (id) localStorage.setItem('studyViewCollectionId', id)
    else localStorage.removeItem('studyViewCollectionId')
  }

  return { studyViewCollectionId, setStudyViewCollectionId }
}
