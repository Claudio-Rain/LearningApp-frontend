<template>
  <div class="flashcard-study">
    <!-- Header -->
    <div class="study-header">
      <div class="header-top">
        <div class="header-center">
          <div class="study-title">{{ collection?.title }}</div>
          <div class="study-subtitle">
            {{ currentIndex + 1 }} / {{ studyQueue.length }}
            <span class="stat-badge new-badge" :class="{ glowing: isCurrentCardNew }">New: {{ newCards }}</span>
            <span class="stat-badge revised-badge" :class="{ glowing: !isCurrentCardNew }">Revised: {{ revisedCards }}</span>
            <span v-if="currentStrengthLabel !== 'New'" class="strength-badge" :class="currentStrengthClass">{{ currentStrengthLabel }}</span>
          </div>
        </div>
        <div class="header-actions">
          <template v-if="editDialog">
            <v-btn variant="tonal" color="primary" size="small" @click="editDialog = false">Done</v-btn>
          </template>
          <template v-else>
            <v-btn v-if="currentItem" class="header-edit-btn" icon="mdi-pencil-outline" variant="text" @click="editDialog = true" />
            <v-btn v-if="currentItem" class="header-edit-btn" icon="mdi-delete-outline" variant="text" color="error" @click="confirmDelete" />
          </template>
        </div>
      </div>
      <!-- Timer bar -->
      <div v-if="studyQueue.length > 0 && currentItem" class="timer-wrapper">
        <div class="timer-bar-bg">
          <div class="timer-bar-fill" :class="{ 'timer-low': timeLeft <= 30 }"
            :style="{ width: (timeLeft / 180 * 100) + '%' }"></div>
        </div>
        <div class="timer-label" :class="{ 'timer-label-low': timeLeft <= 30 }">
          {{ Math.floor(timeLeft / 60) }}:{{ String(timeLeft % 60).padStart(2, '0') }}
        </div>
        <div v-if="timerExpired" class="timer-expired-banner">
          ⏰ Move to the next question to avoid losing time!
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="340">
      <v-card>
        <v-card-title>Delete item?</v-card-title>
        <v-card-text>
          "<strong>{{ currentItem?.title }}</strong>" will be permanently deleted along with its progress and attempt
          history.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="tonal" :loading="deleting" @click="deleteCurrentItem">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Inline Edit Mode -->
    <div v-if="editDialog && editableItem" class="edit-mode">
      <LearningItemView :item="editableItem" @update:title="onEditTitle" @update:content="onEditContent" />
    </div>

    <!-- Main Content -->
    <div v-else class="study-container">
      <div v-if="studyQueue.length > 0 && currentItem" class="flashcard-wrapper">
        <!-- Card -->
        <div class="flashcard" :class="{ flipped: isFlipped }" @click="isFlipped = !isFlipped">
          <!-- Front (Question) -->
          <div class="card-side front">
            <div class="card-content">
              <h2 class="title-display">{{ currentItem.title }}</h2>
            </div>
          </div>

          <!-- Back (Answer) -->
          <div class="card-side back">
            <div v-if="isFlipped" class="card-content">
              <TiptapDisplay :content="currentItem.content || { type: 'doc', content: [] }" />
            </div>
          </div>
        </div>

        <!-- Rating Buttons (show when flipped) -->
        <div v-if="isFlipped" class="rating-buttons">
          <v-btn @click="recordAttempt(-0.15)" color="error" variant="tonal" size="large">
            <v-icon start>mdi-close</v-icon>
            Very Hard
          </v-btn>
          <v-btn @click="recordAttempt(-0.10)" color="warning" variant="tonal" size="large">
            <v-icon start>mdi-minus</v-icon>
            Hard
          </v-btn>
          <v-btn @click="recordAttempt(0.10)" color="info" variant="tonal" size="large">
            <v-icon start>mdi-check</v-icon>
            Good
          </v-btn>
          <v-btn @click="recordAttempt(0.15)" color="success" variant="tonal" size="large">
            <v-icon start>mdi-star</v-icon>
            Easy
          </v-btn>
        </div>

        <!-- Progress Bar -->
        <div class="progress-container">
          <v-progress-linear :value="((currentIndex + 1) / studyQueue.length) * 100" color="primary" />
        </div>
      </div>

      <div v-else class="empty-state">
        <v-icon size="40" color="grey-lighten-1">mdi-book-open-outline</v-icon>
        <p>No items to study</p>
      </div>
    </div>

    <!-- Mobile FAB -->
    <div v-if="currentItem && !editDialog" class="mobile-fab-container">
      <div v-if="fabOpen" class="fab-actions">
        <v-btn
          class="fab-action-btn"
          icon="mdi-pencil-outline"
          color="primary"
          size="small"
          elevation="2"
          @click="fabOpen = false; editDialog = true"
        />
        <v-btn
          class="fab-action-btn"
          icon="mdi-delete-outline"
          color="error"
          size="small"
          elevation="2"
          @click="fabOpen = false; confirmDelete()"
        />
      </div>
      <v-btn
        class="fab-main"
        color="surface"
        elevation="4"
        icon
        @click="fabOpen = !fabOpen"
      ><v-icon size="24">{{ fabOpen ? 'mdi-close' : 'mdi-cog' }}</v-icon></v-btn>
    </div>
    <div v-if="fabOpen" class="fab-overlay" @click="fabOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { formatISO, parseISO } from 'date-fns'
import type { JSONContent } from '@tiptap/vue-3'
import { useRoute, useRouter } from 'vue-router'
import TiptapDisplay from '../shared/components/TiptapDisplay.vue'
import LearningItemView from './LearningItemView.vue'
import {
  getCollections,
  getLearningItems,
  getAllCardProgress,
  createAttemptLog,
  createCardProgress,
  updateCardProgress,
  syncCardProgress,
  syncAttemptLogs,
  startSyncEngine,
  pullLearningItems,
  pullCardProgress,
  removeLearningItem
} from '../database'
import type { Collection, LearningItem, CardProgress } from '../database/types'
import { useExcludedItems } from '../composables/useExcludedItems'

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
const deleteDialog = ref(false)
const deleting = ref(false)
const editDialog = ref(false)
const fabOpen = ref(false)

const timeLeft = ref(180)
const timerExpired = ref(false)
let timerInterval: ReturnType<typeof setInterval> | null = null

const editableItem = computed<LearningItem | null>(() => {
  if (!currentItem.value) return null
  const { progress: _progress, ...item } = currentItem.value as StudyItem & { progress?: unknown }
  return item as LearningItem
})

const onEditTitle = (_id: string, title: string) => {
  if (currentItem.value) currentItem.value.title = title
}

const onEditContent = (_id: string, content: JSONContent) => {
  if (currentItem.value) currentItem.value.content = content
}

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

const currentStrengthLabel = computed(() => {
  const score = currentItem.value?.progress?.strength_score
  if (score === undefined || score === null) return 'New'
  if (score < 0.25) return 'Weak'
  if (score < 0.5) return 'Fair'
  if (score < 0.75) return 'Good'
  return 'Mastered'
})

const currentStrengthClass = computed(() => {
  const score = currentItem.value?.progress?.strength_score
  if (score === undefined || score === null) return 'strength-new'
  if (score < 0.25) return 'strength-weak'
  if (score < 0.5) return 'strength-fair'
  if (score < 0.75) return 'strength-good'
  return 'strength-mastered'
})

const isCurrentCardNew = computed(() => {
  if (!currentItem.value) return false
  const progress = currentItem.value.progress
  return !progress || progress.total_attempts === 0
})

const startTimer = () => {
  clearTimer()
  timeLeft.value = 180
  timerExpired.value = false
  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      timerExpired.value = true
      clearTimer()
    }
  }, 1000)
}

const clearTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

const loadData = async () => {
  const allCollections = await getCollections()
  collection.value = allCollections.find(c => c.id === collectionId) ?? null

  if (!collection.value) {
    alert('Collection not found')
    router.push({ name: 'collections' })
    return
  }

  const { excludedItemIds } = useExcludedItems()
  const all = await getLearningItems(collectionId)
  learningItems.value = all.filter(i => !i.id || !excludedItemIds.value.has(i.id))

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
      const aIsNew = !a.progress || a.progress.total_attempts === 0
      const bIsNew = !b.progress || b.progress.total_attempts === 0

      // Primary: new (never revised) items first
      if (aIsNew !== bIsNew) return aIsNew ? -1 : 1

      const aStrength = a.progress?.strength_score ?? 0
      const bStrength = b.progress?.strength_score ?? 0

      // Secondary: weakest items first
      if (aStrength !== bStrength) return aStrength - bStrength

      // Tertiary: least recently reviewed first
      const aReviewed = a.progress?.last_reviewed_at ? parseISO(a.progress.last_reviewed_at).getTime() : Number.MAX_VALUE
      const bReviewed = b.progress?.last_reviewed_at ? parseISO(b.progress.last_reviewed_at).getTime() : Number.MAX_VALUE
      if (aReviewed !== bReviewed) return aReviewed - bReviewed

      return a.title.localeCompare(b.title)
    })

  console.log('Study queue:', studyQueue.value.map(item => ({ title: item.title, strength: item.progress?.strength_score ?? 0 })))
}

const recordAttempt = async (easeScore: number) => {
  if (!currentItem.value?.id) return

  const now = formatISO(new Date())
  const itemId = currentItem.value.id

  // Write to local DB and update UI immediately
  createAttemptLog({
    learning_item_id: itemId,
    ease_score: easeScore,
    is_correct: easeScore > 0,
    created_at: now
  }).then(() => {
    syncAttemptLogs()
    new BroadcastChannel('study-progress').postMessage('attempt')
  }).catch(console.error)

  const progress = cardProgressMap.value.get(itemId)
  if (progress) {
    const newStrength = Math.max(0, Math.min(1, progress.strength_score + easeScore))
    const updatedProgress = {
      ...progress,
      strength_score: newStrength,
      last_reviewed_at: now,
      total_attempts: progress.total_attempts + 1,
      weighted_attempts: progress.weighted_attempts + easeScore
    }
    cardProgressMap.value.set(itemId, updatedProgress)
    updateCardProgress(updatedProgress).then(() => syncCardProgress()).catch(console.error)
  } else {
    const newProgress = {
      learning_item_id: itemId,
      strength_score: Math.max(0, easeScore),
      last_reviewed_at: now,
      total_attempts: 1,
      weighted_attempts: easeScore
    }
    createCardProgress(newProgress).then(result => {
      cardProgressMap.value.set(itemId, { ...newProgress, id: result as string, syncStatus: 'pending' })
      return syncCardProgress()
    }).catch(console.error)
  }

  moveToNext()
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

const confirmDelete = () => {
  deleteDialog.value = true
}

const deleteCurrentItem = async () => {
  if (!currentItem.value?.id) return
  deleting.value = true
  try {
    const id = currentItem.value.id
    studyQueue.value.splice(currentIndex.value, 1)
    learningItems.value = learningItems.value.filter(i => i.id !== id)
    if (currentIndex.value >= studyQueue.value.length) {
      currentIndex.value = Math.max(0, studyQueue.value.length - 1)
    }
    isFlipped.value = false
    deleteDialog.value = false
    await removeLearningItem(id)
    if (studyQueue.value.length === 0) {
      alert('No more items to study!')
      goBack()
    }
  } catch (error) {
    console.error('Error deleting item:', error)
  } finally {
    deleting.value = false
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (editDialog.value || deleteDialog.value) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    isFlipped.value = !isFlipped.value
  } else if (isFlipped.value) {
    if (e.key === '1') recordAttempt(-0.15)
    else if (e.key === '2') recordAttempt(-0.10)
    else if (e.key === '3') recordAttempt(0.10)
    else if (e.key === '4') recordAttempt(0.15)
  }
}

watch(currentIndex, () => {
  startTimer()
})

onMounted(async () => {
  startSyncEngine()
  window.addEventListener('keydown', handleKeydown)
  if (navigator.onLine) {
    await pullLearningItems(collectionId)
    await pullCardProgress()
  }
  await loadData()
  startTimer()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  clearTimer()
})
</script>

<style scoped>
.flashcard-study {
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
  height: calc(100svh - var(--v-layout-top, 0px));
}

.study-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 16px;
  background-color: rgba(255, 255, 255, 0.95);
  flex-shrink: 0;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.header-center {
  min-width: 0;
  flex: 1;
}

.study-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.edit-mode {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
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

.stat-badge.glowing {
  box-shadow: inset 0 0 0 2px currentColor;
  font-weight: 700;
}

.study-container {
  flex: 1;
  display: flex;
  justify-content: center;
  overflow: hidden;
}

.flashcard-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 800px;
  gap: 8px;
  flex: 1;
  min-height: 0;
  padding: 4px 16px;
}

.flashcard {
  width: 100%;
  flex: 1;
  background: white;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  min-height: 120px;
}

.card-side {
  position: absolute;
  width: 100%;
  height: 100%;
  padding: 0px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-radius: 12px;
}

.front {
  background: white;
  z-index: 2;
}

.back {
  background: white;
  color: inherit;
  opacity: 0;
  z-index: 1;
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
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  font-size: 1.2rem;
  line-height: 1.4;
}


.rating-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  width: 100%;
}

@media (min-width: 700px) {
  .rating-buttons {
    grid-template-columns: repeat(4, 1fr);
  }
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

.strength-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 6px;
  vertical-align: middle;
}

.strength-new {
  background: rgba(33, 150, 243, 0.15);
  color: #1976D2;
}

.strength-weak {
  background: rgba(244, 67, 54, 0.15);
  color: #D32F2F;
}

.strength-fair {
  background: rgba(255, 152, 0, 0.15);
  color: #E65100;
}

.strength-good {
  background: rgba(76, 175, 80, 0.15);
  color: #2E7D32;
}

.strength-mastered {
  background: rgba(156, 39, 176, 0.15);
  color: #6A1B9A;
}

.title-display {
  margin: auto;
  font-size: clamp(1.1rem, 3vw, 2rem);
  font-weight: 600;
  line-height: 1.3;
  color: rgba(0, 0, 0, 0.87);
  text-align: center;
  word-break: break-word;
}

.timer-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  flex-shrink: 0;
}

.timer-bar-bg {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.timer-bar-fill {
  height: 100%;
  background: #4caf50;
  border-radius: 3px;
  transition: width 1s linear, background 0.5s;
}

.timer-bar-fill.timer-low {
  background: #f44336;
}

.timer-label {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.6);
  font-variant-numeric: tabular-nums;
  transition: color 0.5s;
  font-weight: 500;
}

.timer-label-low {
  color: #f44336;
  font-weight: bold;
}

.timer-expired-banner {
  margin-top: 8px;
  padding: 8px 16px;
  background: #f44336;
  color: white;
  border-radius: 8px;
  font-weight: bold;
  font-size: 0.95rem;
  animation: pump 0.8s ease-in-out infinite;
  width: 100%;
  text-align: center;
}

@keyframes pump {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.06);
  }
}

@media (max-width: 600px) {
  .study-header {
    gap: 8px;
    padding: 4px 12px;
  }

  .study-title {
    font-size: 1rem;
  }

  .study-subtitle {
    font-size: 0.7rem;
  }



  .stat-badge {
    font-size: 0.6rem;
    padding: 2px 6px;
  }

  .flashcard-wrapper {
    padding: 8px 12px;
  }

  .flashcard {
    flex: 1;
  }

  .card-content {
    font-size: 1.2rem;
  }

  .title-display {
    font-size: 1.3rem;
  }

  .rating-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .rating-buttons .v-btn {
    font-size: 0.75rem;
  }

  .timer-wrapper {
    width: 90%;
  }

  .timer-label {
    font-size: 0.75rem;
  }

  .timer-expired-banner {
    font-size: 0.85rem;
    padding: 6px 12px;
  }
}

.mobile-fab-container {
  display: none;
}

@media (max-width: 600px) {
  .header-edit-btn {
    display: none;
  }

  .mobile-fab-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    position: fixed;
    bottom: 24px;
    right: 16px;
    z-index: 100;
  }

  .fab-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .fab-overlay {
    position: fixed;
    inset: 0;
    z-index: 99;
  }
}
</style>
