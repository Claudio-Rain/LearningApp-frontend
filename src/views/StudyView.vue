<template>
  <div class="flashcard-study">
    <div class="study-header">
      <StudyHeader
        :current-index="currentIndex"
        :total="studyQueue.length"
        :new-count="summary.newCount"
        :revised-count="summary.revisedCount"
        :is-current-new="isCurrentNew"
        :strength="strengthTier(currentStrengthScore)"
        :editing="editing"
        :has-item="!!currentItem"
        :chat-open="chatOpen"
        :code-open="codeOpen"
        @prev="prev"
        @next="next"
        @jump="goTo"
        @add="addDialog = true"
        @toggle-chat="toggleChat"
        @toggle-code="toggleCode"
        @edit="editing = true"
        @done="editing = false"
        @delete="deleteDialog = true"
        @exclude="excludeDialog = true"
      />
      <StudyMetrics
        v-if="currentItem"
        :time-left="timer.timeLeft.value"
        :total-seconds="studyTimerSeconds"
        :attempts-today="attemptsToday"
        :current-attempts="currentAttempts"
        :total-revisions="summary.totalRevisions"
        :card-count="learningItems.length"
        :tier-counts="summary.tierCounts"
      />
    </div>

    <AddQuestionsDialog
      v-model="addDialog"
      :cards="cards"
      :preferred-collection-id="currentItem?.collectionId ?? collectionIds[0] ?? null"
      @notify="notify"
    />

    <ConfirmItemDialog v-model="excludeDialog" title="Exclude item?" confirm-label="Exclude" color="warning" @confirm="excludeCurrentItem">
      "<strong>{{ currentItem?.title }}</strong>" will be excluded from future study sessions.
    </ConfirmItemDialog>

    <ConfirmItemDialog v-model="deleteDialog" title="Delete item?" confirm-label="Delete" color="error" :loading="deleting" @confirm="deleteCurrentItem">
      "<strong>{{ currentItem?.title }}</strong>" will be permanently deleted along with its progress and attempt history.
    </ConfirmItemDialog>

    <v-snackbar v-model="toast.show" :color="toast.error ? 'error' : 'success'" timeout="4000">
      {{ toast.message }}
    </v-snackbar>

    <CardChatPanel
      v-show="chatOpen"
      ref="chatPanel"
      :item="currentItem"
      :cards="cards"
      @close="chatOpen = false"
      @notify="notify"
      @delete-item="deleteItem"
    />

    <div v-if="editing && editableItem" class="edit-mode">
      <LearningItemPanel :item="editableItem" @update:title="onEditTitle" @update:content="onEditContent" />
    </div>

    <div v-else class="study-container" :class="{ 'with-code': codeOpen }">
      <StudyFlashcard
        v-if="currentItem"
        :item="currentItem"
        :flipped="isFlipped"
        @flip="isFlipped = !isFlipped"
        @rate="rate"
      />
      <div v-else class="empty-state">
        <v-icon size="40" color="grey-lighten-1">mdi-book-open-outline</v-icon>
        <p>No items to study</p>
      </div>

      <StudyCodeAside v-if="codeOpen" ref="codeAside" @close="codeOpen = false" />
    </div>

    <StudyMobileFab
      v-if="currentItem && !editing"
      @add="addDialog = true"
      @edit="editing = true"
      @delete="deleteDialog = true"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import type { JSONContent } from '@tiptap/vue-3'
import LearningItemPanel from '@/shared/components/LearningItemPanel.vue'
import { startSyncEngine, getCollections, pullLearningItems, pullCardProgress, removeLearningItem } from '@/database'
import type { LearningItem } from '@/database/types'
import { withSubCollections } from '@/utils/subCollections'
import { strengthTier } from '@/utils/strength'
import { useExcludedItems } from '@/shared/composables/useExcludedItems'
import { useStudyViewCollection } from '@/shared/composables/useStudyViewCollection'
import { useStudyTimer } from '@/shared/composables/useStudyTimer'
import StudyHeader from './study/components/StudyHeader.vue'
import StudyMetrics from './study/components/StudyMetrics.vue'
import StudyFlashcard from './study/components/StudyFlashcard.vue'
import AddQuestionsDialog from './study/components/AddQuestionsDialog.vue'
import ConfirmItemDialog from './study/components/ConfirmItemDialog.vue'
import CardChatPanel from './study/components/CardChatPanel.vue'
import StudyCodeAside from './study/components/StudyCodeAside.vue'
import StudyMobileFab from './study/components/StudyMobileFab.vue'
import { useStudySession } from './study/composables/useStudySession'
import { useCountdown } from './study/composables/useCountdown'
import { useCardFactory } from './study/composables/useCardFactory'
import { useStudyShortcuts } from './study/composables/useStudyShortcuts'

const route = useRoute()
const { studyViewCollectionIds } = useStudyViewCollection()
// A route id (single or comma-separated) wins; otherwise fall back to the
// selection stored by Study Options. Computed because Vue Router reuses this
// component when only the :id param changes.
const collectionIds = computed<string[]>(() => {
  const routeId = route.params.id ? route.params.id.toString() : null
  return routeId ? routeId.split(',').filter(Boolean) : studyViewCollectionIds.value
})

const session = useStudySession(collectionIds)
const {
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
  goTo,
  prev
} = session

const { toggleExclusion } = useExcludedItems()
const { studyTimerSeconds } = useStudyTimer()

// --- Panels and dialogs ----------------------------------------------------

const addDialog = ref(false)
const deleteDialog = ref(false)
const excludeDialog = ref(false)
const deleting = ref(false)
const editing = ref(false)
const chatOpen = ref(false)
const codeOpen = ref(false)
const chatPanel = ref<InstanceType<typeof CardChatPanel> | null>(null)
const codeAside = ref<InstanceType<typeof StudyCodeAside> | null>(null)

const toast = ref({ show: false, message: '', error: false })
const notify = (message: string, error = false) => {
  toast.value = { show: true, message, error }
}

const toggleChat = async () => {
  chatOpen.value = !chatOpen.value
  if (chatOpen.value) {
    await nextTick()
    chatPanel.value?.focus()
  }
}

const toggleCode = async () => {
  codeOpen.value = !codeOpen.value
  if (codeOpen.value) {
    await nextTick()
    codeAside.value?.focus()
  }
}

const closeTopPanel = () => {
  if (chatOpen.value) chatOpen.value = false
  else if (codeOpen.value) codeOpen.value = false
  else return false
  return true
}

// --- Timer and navigation --------------------------------------------------

/** Reload the queue from the store and start again from the first card. */
const restartSession = async () => {
  await session.restart()
  // currentIndex may already be 0, so its watcher won't restart the timer.
  timer.start()
}

const next = async () => {
  if (!session.advance()) await restartSession()
}

// When a card's time runs out, move on to the next one.
const timer = useCountdown(studyTimerSeconds, next)

const rate = (ease: number) => {
  session.recordAttempt(ease)
  next()
}

watch(currentIndex, () => timer.start())

// Freeze the timer while adding a question, editing the card, chatting, or
// coding, and resume where it left off. Otherwise it could advance to the next
// card mid-interaction and the interaction would land on the wrong item.
watch([addDialog, editing, chatOpen, codeOpen], (now, before) => {
  if (now.some(Boolean)) timer.pause()
  else if (before.some(Boolean)) timer.resume()
})

// --- Removing cards --------------------------------------------------------

// After a removal, the card that slid into place gets a fresh timer here:
// currentIndex is often unchanged, so its watcher won't do it.

// Takes an id rather than reading the current card, so the split flow deletes
// the card it split even if the session moved on while cards were created.
const deleteItem = async (id: string) => {
  deleting.value = true
  try {
    session.removeItem(id)
    deleteDialog.value = false
    timer.start()
    // Reload only after the store delete, or the card would come right back.
    await removeLearningItem(id)
    if (studyQueue.value.length === 0) await restartSession()
  } catch (error) {
    console.error('Error deleting item:', error)
  } finally {
    deleting.value = false
  }
}

const deleteCurrentItem = () => {
  const id = currentItem.value?.id
  if (id) deleteItem(id)
}

const excludeCurrentItem = async () => {
  const id = currentItem.value?.id
  if (!id) return
  excludeDialog.value = false
  await toggleExclusion(id, true)
  if (session.removeItem(id)) await restartSession()
  else timer.start()
}

// --- Creating and editing cards --------------------------------------------

const cards = useCardFactory(() => [...session.studiedIds.value], session)

const editableItem = computed<LearningItem | null>(() => {
  if (!currentItem.value) return null
  const { progress: _progress, ...item } = currentItem.value
  return item
})

const onEditTitle = (_id: string, title: string, _lastModified: string, titleContent: JSONContent | null) => {
  if (!currentItem.value) return
  currentItem.value.title = title
  // Drop the key rather than setting it undefined: this object is spread
  // straight into a Firestore write on the next content edit.
  if (titleContent) currentItem.value.titleContent = titleContent
  else delete currentItem.value.titleContent
}

const onEditContent = (_id: string, content: JSONContent) => {
  if (currentItem.value) currentItem.value.content = content
}

// --- Keyboard and lifecycle ------------------------------------------------

useStudyShortcuts({
  closeTopPanel,
  isBlocked: () => editing.value || deleteDialog.value || addDialog.value,
  hasItem: () => !!currentItem.value,
  isFlipped: () => isFlipped.value,
  toggleChat,
  toggleCode,
  flip: () => { isFlipped.value = !isFlipped.value },
  prev,
  next,
  rate
})

// Vue Router reuses this component when navigating between /study/:id and
// /study, so rebuild the queue whenever the effective id set changes.
watch(collectionIds, async (ids, oldIds) => {
  if (route.name !== 'study') return
  if (ids.length === oldIds.length && ids.every(id => oldIds.includes(id))) return
  currentIndex.value = 0
  isFlipped.value = false
  await session.loadData()
  timer.start()
})

onMounted(async () => {
  startSyncEngine()
  if (navigator.onLine && collectionIds.value.length) {
    const ids = withSubCollections(collectionIds.value, await getCollections())
    await Promise.all([...ids].map(id => pullLearningItems(id)))
    await pullCardProgress()
  }
  await session.loadData()
  timer.start()
})
</script>

<style scoped>
.flashcard-study {
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
  height: calc(100svh - var(--v-layout-top, 0px));
}

.study-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 16px;
  background-color: rgb(var(--v-theme-surface));
  flex-shrink: 0;
}

.edit-mode {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}

.study-container {
  flex: 1;
  display: flex;
  justify-content: center;
  overflow: hidden;
}

/* With the scratchpad docked, the auto margins keep the card centred in what
   is left rather than letting the panel drag it off-centre. */
.study-container.with-code {
  justify-content: flex-start;
}

.study-container.with-code .flashcard-wrapper {
  margin: 0 auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(var(--v-theme-on-surface), 0.35);
  font-size: 0.85rem;
}

/* Too narrow to sit beside the card, so the scratchpad stacks under it. */
@media (max-width: 900px) {
  .study-container.with-code {
    flex-direction: column;
  }
}

@media (max-width: 600px) {
  .study-header {
    gap: 8px;
    padding: 4px 12px;
  }
}
</style>
