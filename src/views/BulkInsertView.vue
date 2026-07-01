<template>
  <div class="bulk-insert pa-4">
    <h2 class="text-h6 mb-4">Bulk Insert Learning Items</h2>

    <!-- Collection selector -->
    <v-card class="mb-4 pa-4" variant="outlined">
      <div class="text-subtitle-2 mb-3">Target Collection</div>

      <v-radio-group v-model="collectionMode" inline class="mb-3">
        <v-radio label="Existing collection" value="existing" />
        <v-radio label="Create new collection" value="new" />
      </v-radio-group>

      <v-select v-if="collectionMode === 'existing'" v-model="selectedCollectionId" :items="collections"
        item-title="title" item-value="id" label="Select collection" variant="outlined" density="compact"
        :rules="[v => !!v || 'Select a collection']" />

      <v-text-field v-else v-model="newCollectionTitle" label="New collection name" variant="outlined" density="compact"
        :rules="[v => !!v || 'Enter a name']" />
    </v-card>

    <!-- Bulk text input -->
    <v-card class="mb-4 pa-4" variant="outlined">
      <div class="text-subtitle-2 mb-1">Learning Items</div>
      <div class="text-caption text-medium-emphasis mb-3">
        Enter items line by line. Each item needs a <code>question:</code>{{ answerWithAI ? '' : ' and an ' }}<code
          v-if="!answerWithAI">answer:</code>. Separate multiple items with a blank line.
        <template v-if="answerWithAI">
          The <code>answer:</code> is optional — Claude will generate one for each question.
        </template>
      </div>

      <v-checkbox v-model="answerWithAI" density="compact" hide-details class="mb-2"
        label="Answer questions with AI (Claude)" prepend-icon="mdi-robot-happy-outline" />
      <div v-if="answerWithAI" class="text-caption text-medium-emphasis mb-3">
        After inserting, Claude answers each question one at a time and saves it to the item. This may take a while for
        many items.
      </div>

      <v-textarea v-model="rawInput" variant="outlined" :placeholder="placeholder" rows="14" auto-grow
        font-family="monospace" class="bulk-textarea" />

      <!-- Preview -->
      <div v-if="parsedItems.length > 0" class="mt-3">
        <div class="text-subtitle-2 mb-2">
          Preview — {{ parsedItems.length }} item{{ parsedItems.length !== 1 ? 's' : '' }} detected
        </div>
        <v-list density="compact" class="preview-list rounded border">
          <v-list-item v-for="(item, i) in parsedItems" :key="i" :class="{ 'invalid-item': !item.valid }">
            <template #prepend>
              <v-icon :color="item.valid ? 'success' : 'error'" size="small">
                {{ item.valid ? 'mdi-check-circle' : 'mdi-alert-circle' }}
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2 font-weight-medium">
              {{ item.question || '(missing question)' }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ item.answer || '(missing answer)' }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>

      <div v-else-if="rawInput.trim()" class="text-caption text-error mt-2">
        No valid items found. Check the format.
      </div>
    </v-card>

    <!-- Actions -->
    <div class="d-flex gap-3 align-center">
      <v-btn color="primary" :disabled="!canInsert" :loading="inserting" @click="handleBulkInsert"
        prepend-icon="mdi-database-import">
        Insert {{parsedItems.filter(i => i.valid).length}} Items
      </v-btn>
      <v-btn variant="text" @click="reset">Clear</v-btn>
      <v-spacer />
      <span v-if="aiProgress" class="text-caption text-medium-emphasis">
        <v-progress-circular indeterminate size="14" width="2" class="mr-1" />
        {{ aiProgress }}
      </span>
      <span v-if="lastResult" class="text-caption text-success">
        <v-icon size="small" color="success">mdi-check</v-icon>
        {{ lastResult }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatISO } from 'date-fns'
import {
  getCollections,
  createCollection,
  createLearningItem,
  editCollection,
} from '../database'
import type { Collection } from '../database/types'
import { generateAnswerMarkdown, getApiKey, setApiKey } from '../utils/claude'
import { markdownToTiptap } from '../utils/markdown'

// ── State ───────────────────────────────────────────────
const collections = ref<Collection[]>([])
const collectionMode = ref<'existing' | 'new'>('existing')
const selectedCollectionId = ref<string | null>(null)
const newCollectionTitle = ref('')
const rawInput = ref('')
const inserting = ref(false)
const lastResult = ref('')
const answerWithAI = ref(false)
const aiProgress = ref('')

// ── Placeholder ─────────────────────────────────────────
// In AI mode the answer is optional, so show a question-only example; otherwise
// show the full question/answer format.
const placeholder = computed(() =>
  answerWithAI.value
    ? `question: What is a closure in JavaScript?

question: What does async/await do?

question: What is the event loop?`
    : `question: What is a closure in JavaScript?
answer: A closure is a function that retains access to its outer scope even after the outer function has returned.

question: What does async/await do?
answer: It allows writing asynchronous code in a synchronous style, pausing execution until a Promise resolves.

question: What is the event loop?
answer: A mechanism that processes the call stack and callback queue, enabling non-blocking I/O in JavaScript.`
)

// ── Parsing ─────────────────────────────────────────────
interface ParsedItem {
  question: string
  answer: string
  valid: boolean
}

const parsedItems = computed<ParsedItem[]>(() => {
  if (!rawInput.value.trim()) return []

  const blocks = rawInput.value
    .split(/\n\s*\n/) // split on blank lines (one or more newlines with optional whitespace between)
    .map(b => b.trim())
    .filter(Boolean)

  return blocks.map(block => {
    const lines = block.split('\n')
    let question = ''
    let answer = ''
    let capturingAnswer = false

    for (const line of lines) {
      const qMatch = line.match(/^question:\s*(.*)/i) // "question:" at line start, capture rest, case-insensitive
      const aMatch = line.match(/^answer:\s*(.*)/i)   // "answer:" at line start, capture rest, case-insensitive

      if (qMatch?.[1] !== undefined) {
        question = qMatch[1].trim()
        capturingAnswer = false
      } else if (aMatch?.[1] !== undefined) {
        answer = aMatch[1].trim()
        capturingAnswer = true
      } else if (capturingAnswer && line.trim()) {
        answer += ' ' + line.trim()
      }
    }

    return {
      question,
      answer,
      // In AI mode the answer is optional — Claude fills it in — so only the
      // question is required.
      valid: question.length > 0 && (answerWithAI.value || answer.length > 0)
    }
  })
})

const validItems = computed(() => parsedItems.value.filter(i => i.valid))

const canInsert = computed(() => {
  if (validItems.value.length === 0) return false
  if (collectionMode.value === 'existing') return !!selectedCollectionId.value
  return newCollectionTitle.value.trim().length > 0
})

// ── Load collections ─────────────────────────────────────
onMounted(async () => {
  collections.value = await getCollections()
})

// ── Bulk Insert ──────────────────────────────────────────
const handleBulkInsert = async () => {
  if (!canInsert.value) return

  // If answering with AI, make sure we have an API key before inserting anything.
  if (answerWithAI.value && !(await getApiKey())) {
    const key = prompt('Paste your Anthropic API key (stored only in this browser, used directly from it):')
    if (!key?.trim()) return
    await setApiKey(key)
  }

  inserting.value = true
  lastResult.value = ''
  aiProgress.value = ''

  try {
    let collectionId: string

    if (collectionMode.value === 'new') {
      const now = formatISO(new Date())
      collectionId = (await createCollection({
        title: newCollectionTitle.value.trim(),
        dateCreated: now,
        lastModified: now,
        numberOfItems: 0
      })) as string
      collections.value = await getCollections()
    } else {
      collectionId = selectedCollectionId.value!
    }

    const now = formatISO(new Date())
    const items = validItems.value
    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // Build the item content. When AI answering is on and no answer was
      // provided (or even when one was), ask Claude to answer the question and
      // store the generated markdown as rich text. Items are answered one at a
      // time so each is saved as it completes.
      let content
      if (answerWithAI.value) {
        aiProgress.value = `Answering ${i + 1} of ${items.length}…`
        const markdown = await generateAnswerMarkdown(item.question)
        content = markdownToTiptap(markdown)
      } else {
        content = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: item.answer }]
            }
          ]
        }
      }

      await createLearningItem({
        collectionId,
        title: item.question,
        content,
        dateCreated: now,
        lastModified: formatISO(new Date())
      })
    }
    aiProgress.value = ''

    // Update collection item count
    const col = collections.value.find(c => c.id === collectionId)
    if (col) {
      await editCollection({
        ...col,
        numberOfItems: col.numberOfItems + validItems.value.length,
        lastModified: now
      })
      collections.value = await getCollections()
    }

    const count = validItems.value.length
    lastResult.value = `${count} item${count !== 1 ? 's' : ''} inserted successfully`
    reset()
  } finally {
    inserting.value = false
    aiProgress.value = ''
  }
}

// ── Reset ────────────────────────────────────────────────
const reset = () => {
  rawInput.value = ''
  newCollectionTitle.value = ''
}
</script>

<style scoped>
.bulk-textarea :deep(textarea) {
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
}

.preview-list {
  max-height: 280px;
  overflow-y: auto;
}

.invalid-item {
  background: rgba(var(--v-theme-error), 0.05);
}
</style>