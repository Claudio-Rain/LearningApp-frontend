<template>
  <div class="bulk-insert pa-4">
    <h2 class="text-h6 mb-4">Bulk Insert Learning Items</h2>

    <!-- Input mode toggle -->
    <v-btn-toggle v-model="inputMode" mandatory density="comfortable" variant="outlined" color="primary" class="mb-4">
      <v-btn value="standard" prepend-icon="mdi-format-list-bulleted">Standard</v-btn>
      <v-btn value="fulltext" prepend-icon="mdi-text-box-outline">Full text mode</v-btn>
    </v-btn-toggle>

    <!-- ─────────────────────────── STANDARD MODE ─────────────────────────── -->
    <template v-if="inputMode === 'standard'">
      <!-- Collection selector -->
      <v-card class="mb-4 pa-4" variant="outlined">
        <div class="text-subtitle-2 mb-3">Target Collection</div>

        <v-radio-group v-model="collectionMode" inline class="mb-3">
          <v-radio label="Existing collection" value="existing" />
          <v-radio label="Create new collection" value="new" />
        </v-radio-group>

        <v-select
v-if="collectionMode === 'existing'" v-model="selectedCollectionId" :items="collections"
          item-title="title" item-value="id" label="Select collection" variant="outlined" density="compact"
          :rules="[v => !!v || 'Select a collection']" />

        <v-text-field
v-else v-model="newCollectionTitle" label="New collection name" variant="outlined"
          density="compact" :rules="[v => !!v || 'Enter a name']" />
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

        <v-checkbox
v-model="answerWithAI" density="compact" hide-details class="mb-2"
          label="Answer questions with AI (Claude)" prepend-icon="mdi-robot-happy-outline" />
        <div v-if="answerWithAI" class="text-caption text-medium-emphasis mb-3">
          After inserting, Claude answers each question one at a time and saves it to the item. This may take a while for
          many items.
        </div>

        <v-textarea
v-model="rawInput" variant="outlined" :placeholder="placeholder" rows="14" auto-grow
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
    </template>

    <!-- ─────────────────────────── FULL TEXT MODE ────────────────────────── -->
    <template v-else>
      <v-card class="mb-4 pa-4" variant="outlined">
        <div class="text-subtitle-2 mb-1">Collections &amp; Items</div>
        <div class="text-caption text-medium-emphasis mb-3">
          Define everything as text. Start a collection with <code>- Collection name</code> on its own line, then list
          its <code>question:</code>{{ answerWithAI ? '' : ' / ' }}<code v-if="!answerWithAI">answer:</code> items below
          it. Existing collections with a matching name are reused; others are created.
        </div>

        <v-checkbox
v-model="answerWithAI" density="compact" hide-details class="mb-2"
          label="Answer questions with AI (Claude)" prepend-icon="mdi-robot-happy-outline" />
        <div v-if="answerWithAI" class="text-caption text-medium-emphasis mb-3">
          After inserting, Claude answers each question one at a time and saves it to the item. This may take a while for
          many items.
        </div>

        <v-textarea
v-model="fullText" variant="outlined" :placeholder="fullTextPlaceholder" rows="20" auto-grow
          font-family="monospace" class="bulk-textarea" />

        <!-- Preview -->
        <div v-if="parsedCollections.length > 0" class="mt-3">
          <div class="text-subtitle-2 mb-2">
            Preview — {{ parsedCollections.length }} collection{{ parsedCollections.length !== 1 ? 's' : '' }},
            {{ fullTextValidCount }} valid item{{ fullTextValidCount !== 1 ? 's' : '' }}
          </div>
          <v-expansion-panels multiple class="preview-list rounded border" variant="accordion">
            <v-expansion-panel v-for="(col, ci) in parsedCollections" :key="ci">
              <v-expansion-panel-title>
                <span class="font-weight-medium">{{ col.title }}</span>
                <v-chip size="x-small" class="ml-2" :color="col.isNew ? 'primary' : 'default'" label>
                  {{ col.isNew ? 'new' : 'existing' }}
                </v-chip>
                <span class="text-caption text-medium-emphasis ml-2">
                  {{ col.items.filter(i => i.valid).length }} / {{ col.items.length }}
                </span>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item v-for="(item, i) in col.items" :key="i" :class="{ 'invalid-item': !item.valid }">
                    <template #prepend>
                      <v-icon :color="item.valid ? 'success' : 'error'" size="small">
                        {{ item.valid ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                      </v-icon>
                    </template>
                    <v-list-item-title class="text-body-2 font-weight-medium">
                      {{ item.question || '(missing question)' }}
                    </v-list-item-title>
                    <v-list-item-subtitle v-if="!answerWithAI" class="text-caption">
                      {{ item.answer || '(missing answer)' }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>

        <div v-else-if="fullText.trim()" class="text-caption text-error mt-2">
          No collections found. Start each collection with a line like <code>- My collection</code>.
        </div>
      </v-card>
    </template>

    <!-- Actions -->
    <div class="d-flex gap-3 align-center">
      <v-btn
color="primary" :disabled="!canInsert" :loading="inserting" prepend-icon="mdi-database-import"
        @click="handleBulkInsert">
        Insert {{ totalValidCount }} Item{{ totalValidCount !== 1 ? 's' : '' }}
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
const inputMode = ref<'standard' | 'fulltext'>('standard')
const collectionMode = ref<'existing' | 'new'>('existing')
const selectedCollectionId = ref<string | null>(null)
const newCollectionTitle = ref('')
const rawInput = ref('')
const fullText = ref('')
const inserting = ref(false)
const lastResult = ref('')
const answerWithAI = ref(false)
const aiProgress = ref('')

// ── Placeholders ────────────────────────────────────────
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

const fullTextPlaceholder = `- L0 Framework - styling

question: How do you use scoped styles in vuejs?
question: What are inline styles in vuejs?

- L1 Framework - routing

question: How do you define routes in vuejs?
question: What is an SPA (single page application)?`

// ── Parsing (standard mode) ─────────────────────────────
interface ParsedItem {
  question: string
  answer: string
  valid: boolean
}

/** Parse a single "question:/answer:" block into an item. */
const parseBlock = (block: string): ParsedItem => {
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
}

const parsedItems = computed<ParsedItem[]>(() => {
  if (!rawInput.value.trim()) return []

  return rawInput.value
    .split(/\n\s*\n/) // split on blank lines (one or more newlines with optional whitespace between)
    .map(b => b.trim())
    .filter(Boolean)
    .map(parseBlock)
})

const validItems = computed(() => parsedItems.value.filter(i => i.valid))

// ── Parsing (full text mode) ────────────────────────────
interface ParsedCollection {
  title: string
  isNew: boolean
  items: ParsedItem[]
}

/**
 * Parse the full-text input into a list of collections, each with its items.
 * A line starting with a single "- " begins a new collection. Lines made up
 * only of dashes (e.g. "---- JUNIOR ----") are treated as separators and
 * ignored. "question:"/"answer:" lines are attached to the current collection.
 */
const parsedCollections = computed<ParsedCollection[]>(() => {
  if (!fullText.value.trim()) return []

  const result: ParsedCollection[] = []
  let current: ParsedCollection | null = null
  let capturingAnswer = false

  const existingTitles = new Set(
    collections.value.map(c => c.title.trim().toLowerCase())
  )

  for (const rawLine of fullText.value.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      capturingAnswer = false
      continue
    }

    // Divider like "----", "---- JUNIOR ----": starts with two or more dashes.
    if (/^-{2,}/.test(line)) {
      capturingAnswer = false
      continue
    }

    // Collection header: a single leading dash followed by a title.
    const colMatch = line.match(/^-\s+(.+)/)
    if (colMatch?.[1] !== undefined) {
      const title = colMatch[1].trim()
      current = {
        title,
        isNew: !existingTitles.has(title.toLowerCase()),
        items: []
      }
      result.push(current)
      capturingAnswer = false
      continue
    }

    const qMatch = line.match(/^question:\s*(.*)/i)
    if (qMatch?.[1] !== undefined) {
      current?.items.push({ question: qMatch[1].trim(), answer: '', valid: false })
      capturingAnswer = false
      continue
    }

    const aMatch = line.match(/^answer:\s*(.*)/i)
    const lastItem = current?.items[current.items.length - 1]
    if (aMatch?.[1] !== undefined) {
      if (lastItem) lastItem.answer = aMatch[1].trim()
      capturingAnswer = true
      continue
    }

    // Continuation of a multi-line answer.
    if (capturingAnswer && lastItem) {
      lastItem.answer += ' ' + line
    }
  }

  // Compute validity now that answers are fully assembled.
  for (const col of result) {
    for (const item of col.items) {
      item.valid = item.question.length > 0 && (answerWithAI.value || item.answer.length > 0)
    }
  }

  return result
})

const fullTextValidCount = computed(() =>
  parsedCollections.value.reduce((n, c) => n + c.items.filter(i => i.valid).length, 0)
)

// ── Shared insert helpers ───────────────────────────────
const totalValidCount = computed(() =>
  inputMode.value === 'standard' ? validItems.value.length : fullTextValidCount.value
)

const canInsert = computed(() => {
  if (totalValidCount.value === 0) return false
  if (inputMode.value === 'fulltext') return true
  if (collectionMode.value === 'existing') return !!selectedCollectionId.value
  return newCollectionTitle.value.trim().length > 0
})

// ── Load collections ─────────────────────────────────────
onMounted(async () => {
  collections.value = await getCollections()
})

/** Build the Tiptap content for an item, optionally answering with Claude. */
const buildContent = async (item: ParsedItem) => {
  if (answerWithAI.value) {
    const markdown = await generateAnswerMarkdown(item.question)
    return markdownToTiptap(markdown)
  }
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: item.answer }]
      }
    ]
  }
}

/**
 * Insert valid items into a collection, updating its item count. `progress`
 * reports overall progress across all collections when answering with AI.
 */
const insertItems = async (
  collectionId: string,
  items: ParsedItem[],
  progress: { done: number; total: number }
) => {
  const valid = items.filter(i => i.valid)
  if (valid.length === 0) return

  const createdAt = formatISO(new Date())
  for (const item of valid) {
    if (answerWithAI.value) {
      progress.done += 1
      aiProgress.value = `Answering ${progress.done} of ${progress.total}…`
    }
    const content = await buildContent(item)
    await createLearningItem({
      collectionId,
      title: item.question,
      content,
      dateCreated: createdAt,
      lastModified: formatISO(new Date())
    })
  }

  const col = collections.value.find(c => c.id === collectionId)
  if (col) {
    await editCollection({
      ...col,
      numberOfItems: col.numberOfItems + valid.length,
      lastModified: formatISO(new Date())
    })
  }
}

/** Find an existing collection by title (case-insensitive) or create a new one. */
const resolveCollection = async (title: string): Promise<string> => {
  const existing = collections.value.find(
    c => c.title.trim().toLowerCase() === title.trim().toLowerCase()
  )
  if (existing?.id) return existing.id

  const now = formatISO(new Date())
  const id = (await createCollection({
    title: title.trim(),
    dateCreated: now,
    lastModified: now,
    numberOfItems: 0
  })) as string
  collections.value = await getCollections()
  return id
}

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
    const progress = { done: 0, total: totalValidCount.value }

    if (inputMode.value === 'standard') {
      let collectionId: string
      if (collectionMode.value === 'new') {
        collectionId = await resolveCollection(newCollectionTitle.value)
      } else {
        collectionId = selectedCollectionId.value!
      }
      await insertItems(collectionId, validItems.value, progress)
    } else {
      for (const col of parsedCollections.value) {
        if (col.items.every(i => !i.valid)) continue
        const collectionId = await resolveCollection(col.title)
        await insertItems(collectionId, col.items, progress)
      }
    }

    collections.value = await getCollections()
    aiProgress.value = ''

    const count = totalValidCount.value
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
  fullText.value = ''
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
  max-height: 320px;
  overflow-y: auto;
}

.invalid-item {
  background: rgba(var(--v-theme-error), 0.05);
}
</style>
