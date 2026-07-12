<template>
  <div class="flashcard-study">
    <!-- Header -->
    <div class="study-header">
      <div class="header-top">
        <div class="header-center">
          <div class="study-subtitle">
            <div class="counter-nav">
              <button class="counter-nav-btn" :disabled="currentIndex === 0" title="Previous card" @click="moveToPrev">&#8249;</button>
              <input
                v-model="jumpInput"
                type="number"
                class="counter-input"
                :min="1"
                :max="studyQueue.length"
                @keydown.enter="jumpToCard"
                @blur="jumpToCard"
              />
              <span class="counter-sep">/</span>
              <span class="counter-total">{{ studyQueue.length }}</span>
              <button class="counter-nav-btn" :disabled="studyQueue.length === 0" title="Next card" @click="skipToNext">&#8250;</button>
            </div>
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
            <v-btn class="header-edit-btn" icon="mdi-plus" variant="text" title="Add question" @click="openAddDialog" />
            <v-btn v-if="currentItem" class="header-edit-btn" :class="{ 'chat-toggle-active': chatOpen }" icon="mdi-chat-question-outline" variant="text" title="Ask AI about this card" @click="toggleChat" />
            <v-btn v-if="currentItem" class="header-edit-btn" icon="mdi-pencil-outline" variant="text" @click="editDialog = true" />
            <v-btn v-if="currentItem" class="header-edit-btn" icon="mdi-delete-outline" variant="text" color="error" @click="confirmDelete" />
            <v-btn v-if="currentItem" class="header-edit-btn" icon="mdi-eye-off-outline" variant="text" color="warning" @click="excludeDialog = true" />
          </template>
        </div>
      </div>
      <!-- Timer bar -->
      <div v-if="studyQueue.length > 0 && currentItem" class="timer-wrapper">
        <div class="timer-bar-bg">
          <div class="timer-bar-fill" :class="{ 'timer-low': timeLeft <= studyTimerSeconds / 6 }"
            :style="{ width: (timeLeft / studyTimerSeconds * 100) + '%' }"></div>
        </div>
        <div class="timer-label" :class="{ 'timer-label-low': timeLeft <= studyTimerSeconds / 6 }">
          {{ Math.floor(timeLeft / 60) }}:{{ String(timeLeft % 60).padStart(2, '0') }}
        </div>
      </div>
    </div>

    <!-- Add Question Dialog -->
    <v-dialog v-model="addDialog" max-width="400">
      <v-card>
        <v-card-title>New questions</v-card-title>
        <v-card-text>
          <div v-for="(_, i) in addTitleList" :key="i" class="add-question-row">
            <v-text-field
              :ref="el => setQuestionFieldRef(el, i)"
              v-model="addTitleList[i]"
              :label="addTitleList.length > 1 ? `Question ${i + 1}` : 'What do you want to learn?'"
              variant="outlined"
              density="compact"
              :autofocus="i === 0"
              hide-details
              @keydown.enter.prevent="addQuestionField(i)"
            />
            <v-btn
              v-if="addTitleList.length > 1"
              icon="mdi-close"
              variant="text"
              size="x-small"
              title="Remove question"
              @click="removeQuestionField(i)"
            />
          </div>
          <v-btn
            variant="text"
            color="primary"
            size="small"
            prepend-icon="mdi-plus"
            class="mb-2"
            @click="addQuestionField(addTitleList.length - 1)"
          >
            Add another question
          </v-btn>
          <v-select
            v-model="addCollectionId"
            :items="addCollections"
            item-title="title"
            item-value="id"
            label="Collection"
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="mb-3"
          />
          <v-checkbox
            v-model="addAutoAnswer"
            label="Auto-answer with Claude in the background"
            density="compact"
            hide-details
          />
          <div v-if="addError" class="add-error">{{ addError }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="tonal" :loading="addCreating" @click="submitAddDialog">
            {{ addTitles.length > 1 ? `Create ${addTitles.length}` : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Toast for background auto-answer results -->
    <v-snackbar v-model="toast.show" :color="toast.error ? 'error' : 'success'" timeout="4000">
      {{ toast.message }}
    </v-snackbar>

    <!-- Exclude Confirmation Dialog -->
    <v-dialog v-model="excludeDialog" max-width="340">
      <v-card>
        <v-card-title>Exclude item?</v-card-title>
        <v-card-text>
          "<strong>{{ currentItem?.title }}</strong>" will be excluded from future study sessions.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="excludeDialog = false">Cancel</v-btn>
          <v-btn color="warning" variant="tonal" @click="excludeCurrentItem">Exclude</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

    <!-- AI chat panel: ask Claude about the card on screen. The thread is
         per-card and resets whenever the card changes (mirrors content.js). -->
    <div v-if="chatOpen" class="study-chat-panel">
      <div class="study-chat-header">
        <span>Ask AI about this card</span>
        <v-btn icon="mdi-close" variant="text" size="x-small" title="Close chat" @click="chatOpen = false" />
      </div>
      <div ref="chatMessagesEl" class="study-chat-messages">
        <div v-if="chatMessages.length === 0" class="study-chat-empty">Ask anything about the current card</div>
        <template v-for="(msg, i) in chatMessages" :key="i">
          <div v-if="msg.role === 'user'" class="study-chat-bubble user">{{ msg.text }}</div>
          <div v-else-if="msg.error" class="study-chat-bubble assistant error">{{ msg.text }}</div>
          <div v-else-if="!msg.text" class="study-chat-bubble assistant thinking">Thinking…</div>
          <div v-else class="study-chat-bubble assistant">
            <TiptapDisplay :content="markdownToTiptap(msg.text)" />
          </div>
        </template>
      </div>
      <div class="study-chat-input-row">
        <textarea
          ref="chatInputEl"
          v-model="chatInput"
          class="study-chat-input"
          rows="1"
          placeholder="Ask a question…"
          @keydown.enter.exact.prevent="sendChat"
        />
        <v-btn icon="mdi-send" size="small" color="primary" variant="tonal" :disabled="chatBusy" title="Send" @click="sendChat" />
      </div>
    </div>

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

        <!-- Bottom Action Row -->
        <div v-if="isFlipped" class="action-row">
          <div class="rating-buttons">
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
          icon="mdi-plus"
          color="success"
          size="small"
          elevation="2"
          @click="fabOpen = false; openAddDialog()"
        />
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
  removeLearningItem,
  createLearningItem,
  editLearningItem,
  editCollection,
  syncLearningItems,
  syncCollections
} from '../database'
import { getApiKey, setApiKey, generateAnswerMarkdown, streamCardChat, type ChatMessage } from '../utils/claude'
import { markdownToTiptap } from '../utils/markdown'
import type { Collection, LearningItem, CardProgress } from '../database/types'
import { useExcludedItems } from '../composables/useExcludedItems'
import { useStudyViewCollection } from '../composables/useStudyViewCollection'
import { useStudyTimer } from '../composables/useStudyTimer'

interface StudyItem extends LearningItem {
  progress?: CardProgress
}

const route = useRoute()
const router = useRouter()
const { studyViewCollectionIds } = useStudyViewCollection()
// A route id (single or comma-separated) wins; otherwise fall back to the
// selection stored by Study Options. Computed because Vue Router reuses this
// component when only the :id param changes.
const collectionIds = computed<string[]>(() => {
  const routeId = route.params.id ? route.params.id.toString() : null
  return routeId ? routeId.split(',').filter(Boolean) : studyViewCollectionIds.value
})

const collections = ref<Collection[]>([])
const learningItems = ref<LearningItem[]>([])
const { excludedItemIds: _excludedItemIds, toggleExclusion } = useExcludedItems()
const cardProgressMap = ref<Map<string, CardProgress>>(new Map())
const studyQueue = ref<StudyItem[]>([])
const currentIndex = ref(0)
const isFlipped = ref(false)
const deleteDialog = ref(false)
const deleting = ref(false)
const excludeDialog = ref(false)
const editDialog = ref(false)
const fabOpen = ref(false)

// "New question" dialog — mirrors the content widget's add panel: create the
// item right away, let Claude fill in the answer in the background.
const addDialog = ref(false)
const addTitleList = ref<string[]>([''])
const addCollectionId = ref<string | null>(null)
const addAutoAnswer = ref(true)
const addError = ref('')
const addCreating = ref(false)
const addCollections = ref<Collection[]>([])
const toast = ref({ show: false, message: '', error: false })

// One question per non-empty box.
const addTitles = computed(() =>
  addTitleList.value.map(t => t.trim()).filter(Boolean)
)

// Track the field components so a newly added box can be focused.
const questionFieldRefs = ref<any[]>([])
const setQuestionFieldRef = (el: any, i: number) => {
  questionFieldRefs.value[i] = el
}

// Insert a new box after index `i` and focus it (Enter key / "Add another").
const addQuestionField = async (i: number) => {
  addTitleList.value.splice(i + 1, 0, '')
  await nextTick()
  questionFieldRefs.value[i + 1]?.focus?.()
}

const removeQuestionField = (i: number) => {
  addTitleList.value.splice(i, 1)
  questionFieldRefs.value.splice(i, 1)
}

// AI chat about the current card. Bubbles keep the raw markdown; the template
// converts it to TipTap on render. Errors are display-only and are excluded
// from the history sent to the API.
interface ChatBubble { role: 'user' | 'assistant'; text: string; error?: boolean }
const chatOpen = ref(false)
const chatMessages = ref<ChatBubble[]>([])
const chatInput = ref('')
const chatBusy = ref(false)
const chatMessagesEl = ref<HTMLElement | null>(null)
const chatInputEl = ref<HTMLTextAreaElement | null>(null)

const toggleChat = async () => {
  chatOpen.value = !chatOpen.value
  if (chatOpen.value) {
    await nextTick()
    chatInputEl.value?.focus()
  }
}

// Pin the just-sent question to the top of the thread, then leave the scroll
// alone while the answer streams in below it, so reading isn't yanked around.
const scrollToLatestQuestion = async () => {
  await nextTick()
  const el = chatMessagesEl.value
  if (!el) return
  const bubbles = el.querySelectorAll<HTMLElement>('.study-chat-bubble.user')
  const last = bubbles[bubbles.length - 1]
  if (last) {
    el.scrollTop += last.getBoundingClientRect().top - el.getBoundingClientRect().top - 12
  }
}

const sendChat = async () => {
  const text = chatInput.value.trim()
  if (!text || chatBusy.value || !currentItem.value) return

  // Same bring-your-own-key flow as auto-answer: prompt once if no key is set.
  if (!(await getApiKey())) {
    const key = prompt('Paste your Anthropic API key (stored only in this browser, used directly from it):')
    if (!key?.trim()) return
    await setApiKey(key)
  }

  // Bind the request to the card it was asked about; if the card changes while
  // Claude is answering, the stale reply is dropped instead of leaking into the
  // fresh thread.
  const itemId = currentItem.value.id
  const history: ChatMessage[] = chatMessages.value
    .filter(m => !m.error && m.text)
    .map(m => ({ role: m.role, content: m.text }))
  history.push({ role: 'user', content: text })

  chatInput.value = ''
  chatBusy.value = true
  chatMessages.value.push({ role: 'user', text })
  chatMessages.value.push({ role: 'assistant', text: '' })
  // Grab the proxy out of the array so mutations during streaming are reactive.
  const reply = chatMessages.value[chatMessages.value.length - 1]!
  scrollToLatestQuestion()

  try {
    await streamCardChat(currentItem.value.title, currentItem.value.content, history, chunk => {
      if (currentItem.value?.id !== itemId) return
      reply.text += chunk
    })
  } catch (error) {
    console.error('Card chat failed:', error)
    if (currentItem.value?.id === itemId) {
      reply.text = 'Something went wrong — check your API key and try again.'
      reply.error = true
    }
  } finally {
    if (currentItem.value?.id === itemId) {
      chatBusy.value = false
      chatInputEl.value?.focus()
    }
  }
}

// Freeze the study timer while adding a question, editing the current card, or
// chatting with the AI; resume where it left off. Otherwise the timer can
// advance to the next card mid-edit/mid-chat and the interaction lands on the
// wrong item.
watch([addDialog, editDialog, chatOpen], ([adding, editing, chatting], [wasAdding, wasEditing, wasChatting]) => {
  if (adding || editing || chatting) clearTimer()
  else if (wasAdding || wasEditing || wasChatting) resumeTimer()
})

const { studyTimerSeconds } = useStudyTimer()
const timeLeft = ref(studyTimerSeconds.value)
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

// Wipe the chat thread whenever a different card comes up.
watch(() => currentItem.value?.id, () => {
  chatMessages.value = []
  chatBusy.value = false
})

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
  timeLeft.value = studyTimerSeconds.value
  resumeTimer()
}

// Restart the countdown from wherever timeLeft currently is (used to resume
// after a pause without giving the card a fresh timer).
const resumeTimer = () => {
  clearTimer()
  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      clearTimer()
      skipToNext()
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

  const { excludedItemIds } = useExcludedItems()
  const perCollection = await Promise.all(collectionIds.value.map(id => getLearningItems(id)))
  // Merge across collections, deduping items that live in more than one.
  const seen = new Set<string>()
  learningItems.value = perCollection.flat().filter(i => {
    if (i.id && (excludedItemIds.value.has(i.id) || seen.has(i.id))) return false
    if (i.id) seen.add(i.id)
    return true
  })

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
  }).catch(() => {})

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
    updateCardProgress(updatedProgress).then(() => syncCardProgress()).catch(() => {})
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

const moveToPrev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    isFlipped.value = false
  }
}

const jumpInput = ref('1')

watch(currentIndex, index => {
  jumpInput.value = String(index + 1)
}, { immediate: true })

const jumpToCard = (e: Event) => {
  const target = Number(jumpInput.value)
  if (!Number.isInteger(target) || studyQueue.value.length === 0) {
    jumpInput.value = String(currentIndex.value + 1)
    return
  }
  const index = Math.min(Math.max(target, 1), studyQueue.value.length) - 1
  jumpInput.value = String(index + 1)
  if (index !== currentIndex.value) {
    currentIndex.value = index
    isFlipped.value = false
  }
  if (e.type === 'keydown') (e.target as HTMLInputElement).blur()
}

const skipToNext = async () => {
  await moveToNext()
}

const excludeCurrentItem = async () => {
  if (!currentItem.value?.id) return
  const id = currentItem.value.id
  excludeDialog.value = false
  await toggleExclusion(id, true)
  studyQueue.value.splice(currentIndex.value, 1)
  learningItems.value = learningItems.value.filter(i => i.id !== id)
  if (studyQueue.value.length === 0) {
    await loadData()
    currentIndex.value = 0
    isFlipped.value = false
    startTimer()
    return
  }
  if (currentIndex.value >= studyQueue.value.length) {
    currentIndex.value = Math.max(0, studyQueue.value.length - 1)
  }
  isFlipped.value = false
}

const moveToNext = async () => {
  if (currentIndex.value < studyQueue.value.length - 1) {
    currentIndex.value++
    isFlipped.value = false
  } else {
    await loadData()
    currentIndex.value = 0
    isFlipped.value = false
    startTimer()
  }
}


const confirmDelete = () => {
  deleteDialog.value = true
}

const showToast = (message: string, error = false) => {
  toast.value = { show: true, message, error }
}

const openAddDialog = async () => {
  addTitleList.value = ['']
  questionFieldRefs.value = []
  addError.value = ''
  addAutoAnswer.value = true
  addDialog.value = true
  addCollections.value = (await getCollections()).filter(c => c.id)
  // Prefill the collection of the card being studied, when known.
  const preferred = currentItem.value?.collectionId ?? collectionIds.value[0] ?? null
  addCollectionId.value = addCollections.value.some(c => c.id === preferred)
    ? preferred
    : addCollections.value[0]?.id ?? null
}

const submitAddDialog = async () => {
  const titles = addTitles.value
  const collectionId = addCollectionId.value
  if (!titles.length) { addError.value = 'Please enter at least one question.'; return }
  if (!collectionId) { addError.value = 'Please pick a collection.'; return }
  addError.value = ''

  // Auto-answer needs an Anthropic API key; prompt for it here if it isn't set
  // yet. Declining just skips the answers, the items are still created.
  let useAutoAnswer = addAutoAnswer.value
  if (useAutoAnswer && !(await getApiKey())) {
    const key = prompt('Paste your Anthropic API key (stored only in this browser, used directly from it):')
    if (key?.trim()) await setApiKey(key)
    else useAutoAnswer = false
  }

  addCreating.value = true
  try {
    const now = formatISO(new Date())
    const created: StudyItem[] = []
    for (const title of titles) {
      const id = String(await createLearningItem({ collectionId, title, dateCreated: now, lastModified: now }))
      created.push({ id, collectionId, title, dateCreated: now, lastModified: now })
    }

    // Keep the collection's item count in step with the SPA's "Add" behavior.
    const collection = addCollections.value.find(c => c.id === collectionId)
    if (collection) {
      await editCollection({ ...collection, numberOfItems: (collection.numberOfItems || 0) + created.length, lastModified: now })
      syncCollections().catch(() => {})
    }
    syncLearningItems().catch(() => {})

    // If the new cards belong to a collection being studied, put them at the
    // end of the current queue so they come up this session.
    if (collectionIds.value.includes(collectionId)) {
      learningItems.value.push(...created)
      studyQueue.value.push(...created)
    }

    addDialog.value = false

    // The cards already exist; let Claude fill the answers in the background so
    // the UI doesn't block, then report back with one toast for the batch.
    // Sequential on purpose: one in-flight request instead of a burst.
    if (useAutoAnswer) {
      ;(async () => {
        let failed = 0
        for (const item of created) {
          try {
            await generateAutoAnswer(item.id!, collectionId, item.title, now)
          } catch (error) {
            failed++
            console.error(`Auto-answer failed for "${item.title}":`, error)
          }
        }
        if (failed === 0) {
          showToast(created.length === 1
            ? `Claude answered "${created[0]!.title}"`
            : `Claude answered ${created.length} questions`)
        } else {
          showToast(`Auto-answer failed for ${failed} of ${created.length} question${created.length > 1 ? 's' : ''}`, true)
        }
      })()
    }
  } catch (error) {
    console.error('Error creating items:', error)
    addError.value = 'Failed to create items.'
  } finally {
    addCreating.value = false
  }
}

const generateAutoAnswer = async (id: string, collectionId: string, title: string, dateCreated: string) => {
  const markdown = await generateAnswerMarkdown(title)
  const content = markdownToTiptap(markdown)
  await editLearningItem({ id, collectionId, title, content, dateCreated, lastModified: formatISO(new Date()) })
  syncLearningItems().catch(() => {})
  // Fill the answer into the in-memory queue so flipping the card shows it.
  const queued = studyQueue.value.find(i => i.id === id)
  if (queued) queued.content = content
  const item = learningItems.value.find(i => i.id === id)
  if (item) item.content = content
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
      await loadData()
      currentIndex.value = 0
      isFlipped.value = false
      startTimer()
    }
  } catch (error) {
    console.error('Error deleting item:', error)
  } finally {
    deleting.value = false
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  // Escape closes the chat from anywhere — before the input/textarea guard so
  // it works even while typing in the chat box.
  if (e.key === 'Escape' && chatOpen.value) {
    e.preventDefault()
    chatOpen.value = false
    return
  }
  if (editDialog.value || deleteDialog.value || addDialog.value) return
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if ((e.key === 'c' || e.key === 'C') && currentItem.value) {
    e.preventDefault()
    toggleChat()
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    isFlipped.value = !isFlipped.value
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    moveToPrev()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    skipToNext()
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

// Vue Router reuses this component when navigating between /study/:id and
// /study, so rebuild the queue whenever the effective id set changes.
watch(collectionIds, async (ids, oldIds) => {
  if (route.name !== 'study') return
  if (ids.length === oldIds.length && ids.every(id => oldIds.includes(id))) return
  currentIndex.value = 0
  isFlipped.value = false
  await loadData()
  startTimer()
})

onMounted(async () => {
  startSyncEngine()
  window.addEventListener('keydown', handleKeydown)
  if (navigator.onLine && collectionIds.value.length) {
    await Promise.all(collectionIds.value.map(id => pullLearningItems(id)))
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

.chat-toggle-active {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
}

.study-chat-panel {
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: min(560px, calc(100vw - 32px));
  height: min(760px, calc(100vh - 120px));
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  z-index: 2000;
  overflow: hidden;
}

.study-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  flex-shrink: 0;
}

.study-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
}

.study-chat-empty {
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-size: 0.85rem;
  text-align: center;
  margin: auto;
}

.study-chat-bubble {
  max-width: 88%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.875rem;
  line-height: 1.45;
  overflow-wrap: break-word;
}

.study-chat-bubble.user {
  align-self: flex-end;
  background: rgb(var(--v-theme-primary));
  color: white;
  white-space: pre-wrap;
}

.study-chat-bubble.assistant {
  align-self: flex-start;
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.study-chat-bubble.assistant.error {
  background: rgba(var(--v-theme-error), 0.1);
  color: rgb(var(--v-theme-error));
}

.study-chat-bubble.thinking {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-style: italic;
}

.study-chat-input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  flex-shrink: 0;
}

.study-chat-input {
  flex: 1;
  resize: none;
  background: transparent;
  color: inherit;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.25);
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.4;
  max-height: 96px;
  outline: none;
}

.study-chat-input:focus {
  border-color: rgb(var(--v-theme-primary));
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

.add-question-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.add-question-row .v-text-field {
  flex: 1;
}

.add-error {
  margin-top: 8px;
  font-size: 0.8rem;
  color: #d32f2f;
  min-height: 1em;
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
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.counter-nav {
  display: flex;
  align-items: center;
  gap: 3px;
}

.counter-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 26px;
  font-weight: 300;
  line-height: 1;
  transition: background 0.2s, color 0.2s;
  font-family: inherit;
}

.counter-nav-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
  color: #374151;
}

.counter-nav-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.counter-input {
  width: 36px;
  border: 1px solid transparent;
  border-radius: 4px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
  background: transparent;
  padding: 1px 2px;
  font-family: inherit;
  appearance: textfield;
  -moz-appearance: textfield;
}

.counter-input::-webkit-outer-spin-button,
.counter-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.counter-input:hover,
.counter-input:focus {
  border-color: #d1d5db;
  outline: none;
  background: white;
}

.counter-sep,
.counter-total {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
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


.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}


.rating-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  flex: 1;
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
