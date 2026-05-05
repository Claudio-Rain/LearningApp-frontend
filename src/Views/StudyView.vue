<template>
  <div class="flashcard-study">
    <!-- Header -->
    <div class="study-header">
      <div>
        <div class="study-title">{{ collection?.title }}</div>
        <div class="study-subtitle">{{ currentIndex + 1 }} / {{ studyQueue.length }}</div>
        <div class="study-stats">
          <span class="stat-badge new-badge" :class="{ glowing: isCurrentCardNew }">New: {{ newCards }}</span>
          <span class="stat-badge revised-badge" :class="{ glowing: !isCurrentCardNew }">Revised: {{ revisedCards }}</span>
          <span class="stat-badge total-badge">Total: {{ totalCards }}</span>
        </div>
      </div>
      <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
    </div>

    <!-- Main Content -->
    <div class="study-container">
      <div v-if="studyQueue.length > 0 && currentItem" class="flashcard-wrapper">
        <!-- Card -->
        <div class="flashcard" :class="{ flipped: isFlipped }">
          <!-- Front (Question) -->
          <div class="card-side front">
            <div class="side-label">Question</div>
            <div class="card-content">
              <h2 class="title-display">{{ currentItem.title }}</h2>
            </div>
          </div>

          <!-- Back (Answer) -->
          <div class="card-side back">
            <div class="side-label">Answer</div>
            <div v-if="isFlipped" class="card-content">
              <TiptapDisplay :content="currentItem.content || { type: 'doc', content: [] }" />
            </div>
          </div>
        </div>

        <!-- Flip Button -->
        <div class="flip-button-container">
          <v-btn
            @click="isFlipped = !isFlipped"
            color="primary"
            size="large"
            rounded
          >
            {{ isFlipped ? 'Hide Answer' : 'Show Answer' }}
          </v-btn>
        </div>

        <!-- Rating Buttons (show when flipped) -->
        <div v-if="isFlipped" class="rating-buttons">
          <v-btn
            @click="recordAttempt(0.0)"
            color="error"
            variant="tonal"
            size="large"
          >
            <v-icon start>mdi-close</v-icon>
            Very Hard
          </v-btn>
          <v-btn
            @click="recordAttempt(0.4)"
            color="warning"
            variant="tonal"
            size="large"
          >
            <v-icon start>mdi-minus</v-icon>
            Hard
          </v-btn>
          <v-btn
            @click="recordAttempt(0.75)"
            color="info"
            variant="tonal"
            size="large"
          >
            <v-icon start>mdi-check</v-icon>
            Good
          </v-btn>
          <v-btn
            @click="recordAttempt(1.0)"
            color="success"
            variant="tonal"
            size="large"
          >
            <v-icon start>mdi-star</v-icon>
            Easy
          </v-btn>
        </div>

        <!-- Progress Bar -->
        <div class="progress-container">
          <v-progress-linear
            :value="((currentIndex + 1) / studyQueue.length) * 100"
            color="primary"
          />
        </div>
      </div>

      <div v-else class="empty-state">
        <v-icon size="40" color="grey-lighten-1">mdi-book-open-outline</v-icon>
        <p>No items to study</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TiptapDisplay from '../shared/components/TiptapDisplay.vue'
import {
  getCollections,
  getLearningItems,
  getAllCardProgress,
  createAttemptLog,
  createCardProgress,
  updateCardProgress,
  syncCardProgress,
  syncAttemptLogs,
  startSyncEngine
} from '../database'
import type { Collection, LearningItem, CardProgress } from '../database/types'

interface StudyItem extends LearningItem {
  progress?: CardProgress
}

const route = useRoute()
const router = useRouter()
const collectionId = route.params.id!.toLocaleString()

const collection = ref<Collection | null>(null)
const learningItems = ref<LearningItem[]>([])
const cardProgressMap = ref<Map<string, CardProgress>>(new Map())
const studyQueue = ref<StudyItem[]>([])
const currentIndex = ref(0)
const isFlipped = ref(false)

const currentItem = computed(() => studyQueue.value[currentIndex.value])

const newCards = computed(() => {
  let count = 0
  learningItems.value.forEach(item => {
    const progress = cardProgressMap.value.get(item.id!)
    if (!progress || progress.total_attempts === 0) count++
  })
  return count
})

const revisedCards = computed(() => {
  let count = 0
  learningItems.value.forEach(item => {
    const progress = cardProgressMap.value.get(item.id!)
    if (progress && progress.total_attempts > 0) count++
  })
  return count
})

const totalCards = computed(() => studyQueue.value.length)

const isCurrentCardNew = computed(() => {
  if (!currentItem.value) return false
  const progress = currentItem.value.progress
  return !progress || progress.total_attempts === 0
})

const loadData = async () => {
  const allCollections = await getCollections()
  collection.value = allCollections.find(c => c.id === collectionId) ?? null

  if (!collection.value) {
    alert('Collection not found')
    router.push({ name: 'collections' })
    return
  }

  learningItems.value = await getLearningItems(collectionId)

  const allProgress = await getAllCardProgress()
  const progressMap = new Map<string, CardProgress>()
  allProgress.forEach(progress => {
    progressMap.set(progress.learning_item_id, progress)
  })
  cardProgressMap.value = progressMap

  // Create study queue sorted by strength (weakest/least confident first)
  studyQueue.value = learningItems.value
    .map((item) => ({
      ...item,
      progress: progressMap.get(item.id!)
    }))
    .sort((a, b) => {
      const aStrength = a.progress?.strength_score ?? 0
      const bStrength = b.progress?.strength_score ?? 0

      // Primary: sort by strength ascending (weakest items first)
      if (aStrength !== bStrength) {
        return aStrength - bStrength
      }

      // Secondary: if strength is equal, sort by last_reviewed_at (least recently reviewed first)
      const aReviewed = a.progress?.last_reviewed_at ? new Date(a.progress.last_reviewed_at).getTime() : Number.MAX_VALUE
      const bReviewed = b.progress?.last_reviewed_at ? new Date(b.progress.last_reviewed_at).getTime() : Number.MAX_VALUE
      if (aReviewed !== bReviewed) {
        return aReviewed - bReviewed
      }

      // Tertiary: sort by title alphabetically for consistent ordering
      return a.title.localeCompare(b.title)
    })

  console.log('Study queue:', studyQueue.value.map(item => ({ title: item.title, strength: item.progress?.strength_score ?? 0 })))
}

const recordAttempt = async (easeScore: number) => {
  try {
    if (!currentItem.value?.id) return

    const now = new Date().toISOString()

    const attemptLogResult = await createAttemptLog({
      learning_item_id: currentItem.value.id,
      ease_score: easeScore,
      is_correct: easeScore > 0.3,
      created_at: now
    })
    console.log('Attempt log created:', attemptLogResult)
    await syncAttemptLogs()

    const progress = cardProgressMap.value.get(currentItem.value.id)
    if (progress) {
      const totalAttempts = progress.total_attempts + 1
      const weightedSum = progress.weighted_attempts + easeScore
      const newStrength = weightedSum / totalAttempts
      const updatedProgress = {
        ...progress,
        strength_score: Math.max(0, Math.min(1, newStrength)),
        last_reviewed_at: now,
        total_attempts: totalAttempts,
        weighted_attempts: weightedSum
      }

      console.log('Updating existing progress:', updatedProgress)
      await updateCardProgress(updatedProgress)
      cardProgressMap.value.set(currentItem.value.id, updatedProgress)
    } else {
      const newProgress = {
        learning_item_id: currentItem.value.id,
        strength_score: easeScore,
        last_reviewed_at: now,
        total_attempts: 1,
        weighted_attempts: easeScore
      }

      console.log('Creating new progress:', newProgress)
      const result = await createCardProgress(newProgress)
      console.log('CardProgress created with ID:', result)
      cardProgressMap.value.set(currentItem.value.id, { ...newProgress, id: result as string, syncStatus: 'pending' })
    }

    await syncCardProgress()
    moveToNext()
  } catch (error) {
    console.error('Error recording attempt:', error)
  }
}

const moveToNext = () => {
  if (currentIndex.value < studyQueue.value.length - 1) {
    currentIndex.value++
    isFlipped.value = false
  } else {
    alert('Study session complete!')
    goBack()
  }
}

const goBack = () => {
  router.push({ name: 'collections' })
}

onMounted(async () => {
  startSyncEngine()
  await loadData()
})
</script>

<style scoped>
.flashcard-study {
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
}

.study-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 20px;
  background-color: rgba(255, 255, 255, 0.95);
  flex-shrink: 0;
}

.study-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.study-subtitle {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
  margin-top: 4px;
}

.study-stats {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.stat-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.new-badge {
  background-color: rgba(33, 150, 243, 0.15);
  color: #1976D2;
}

.revised-badge {
  background-color: rgba(76, 175, 80, 0.15);
  color: #388E3C;
}

.total-badge {
  background-color: rgba(156, 39, 176, 0.15);
  color: #7B1FA2;
}

.stat-badge.glowing {
  box-shadow: inset 0 0 0 2px currentColor;
  font-weight: 700;
}

.study-container {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 12px 20px;
  overflow: hidden;
}

.flashcard-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 700px;
  gap: 8px;
}

.flashcard {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: white;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: transform 0.3s ease;
  max-height: 350px;
}

.card-side {
  position: absolute;
  width: 100%;
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-radius: 12px;
}

.front {
  background: white;
  z-index: 2;
  transition: opacity 0.3s ease;
}

.back {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  opacity: 0;
  z-index: 1;
  transition: opacity 0.3s ease;
}

.flashcard.flipped .front {
  opacity: 0;
  z-index: 1;
}

.flashcard.flipped .back {
  opacity: 1;
  z-index: 2;
}

.side-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
  margin-bottom: 6px;
}

.card-content {
  flex: 1;
  display: flex;
  align-items: center;
  overflow-y: auto;
  font-size: 1.3rem;
  line-height: 1.4;
}

.flip-button-container {
  display: flex;
  justify-content: center;
  margin: 12px 0;
}

.rating-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  width: 100%;
}

.progress-container {
  display: none;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(0, 0, 0, 0.35);
  font-size: 0.85rem;
}

.title-display {
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.3;
  color: rgba(0, 0, 0, 0.87);
  text-align: center;
}</style>
