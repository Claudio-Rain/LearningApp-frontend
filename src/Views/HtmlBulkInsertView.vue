<template>
  <div class="html-bulk-insert pa-4">
    <h2 class="text-h6 mb-4">Bulk Insert from HTML</h2>

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

    <!-- Format selector -->
    <v-card class="mb-4 pa-4" variant="outlined">
      <div class="text-subtitle-2 mb-3">Input Format</div>
      <v-radio-group v-model="inputFormat" inline>
        <v-radio label="Tab-Separated (TSV)" value="tsv" />
        <v-radio label="Pure HTML" value="html" />
      </v-radio-group>
      <div class="text-caption text-medium-emphasis mt-2">
        <div v-if="inputFormat === 'tsv'">
          Format: First column = title, Second column = HTML content.
          <br />Each row becomes one learning item.
        </div>
        <div v-else>
          Paste HTML content. Tables will be preserved, formatting will be converted to Tiptap marks.
        </div>
      </div>
    </v-card>

    <!-- Bulk content input -->
    <v-card class="mb-4 pa-4" variant="outlined">
      <div class="text-subtitle-2 mb-1">Content</div>

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
              {{ item.title || '(missing title)' }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ item.preview || '(empty content)' }}
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
        Insert {{ parsedItems.filter(i => i.valid).length }} Items
      </v-btn>
      <v-btn variant="text" @click="reset">Clear</v-btn>
      <v-spacer />
      <span v-if="lastResult" class="text-caption text-success">
        <v-icon size="small" color="success">mdi-check</v-icon>
        {{ lastResult }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getCollections,
  createCollection,
  createLearningItem,
  editCollection,
} from '../database'
import { htmlToTiptap, stripHtml } from '../utils/htmlToTiptap'
import type { Collection } from '../database/types'
import type { JSONContent } from '@tiptap/vue-3'

// ── State ───────────────────────────────────────────────
const collections = ref<Collection[]>([])
const collectionMode = ref<'existing' | 'new'>('existing')
const selectedCollectionId = ref<string | null>(null)
const newCollectionTitle = ref('')
const rawInput = ref('')
const inputFormat = ref<'tsv' | 'html'>('tsv')
const inserting = ref(false)
const lastResult = ref('')

// ── Placeholder ─────────────────────────────────────────
const placeholder = computed(() => {
  if (inputFormat.value === 'tsv') {
    return `What is HTML?\t<p><b>HTML</b> is a markup language for creating web pages.</p>
What is CSS?\t<p><i>CSS</i> is used for <u>styling</u> web pages.</p>
What is JavaScript?\t<p>JavaScript is a <mark>programming language</mark> for the web.</p>`
  }
  return `<p>Paste your HTML content here...</p>\n<p>This can include <b>formatted text</b>, <code>code blocks</code>, tables, and more.</p>`
})

// ── Parsing ─────────────────────────────────────────────
interface ParsedItem {
  title: string
  content: JSONContent
  preview: string
  valid: boolean
}

const parsedItems = computed<ParsedItem[]>(() => {
  if (!rawInput.value.trim()) return []

  if (inputFormat.value === 'tsv') {
    return parseTsv()
  } else {
    return parseHtmlContent()
  }
})

function parseTsv(): ParsedItem[] {
  const lines = rawInput.value.split('\n').filter(l => l.trim())
  const items: ParsedItem[] = []

  for (const line of lines) {
    const [title, htmlContent] = line.split('\t')

    if (!title?.trim() || !htmlContent?.trim()) {
      continue
    }

    try {
      const content = htmlToTiptap(htmlContent)
      const preview = stripHtml(htmlContent).substring(0, 100)

      items.push({
        title: title.trim(),
        content,
        preview,
        valid: true
      })
    } catch (error) {
      items.push({
        title: title.trim(),
        content: { type: 'doc', content: [] },
        preview: 'Error parsing HTML',
        valid: false
      })
    }
  }

  return items
}

function parseHtmlContent(): ParsedItem[] {
  try {
    // For pure HTML input, treat entire content as one item
    // or split by headers if multiple headers exist
    const parser = new DOMParser()
    const doc = parser.parseFromString(rawInput.value, 'text/html')
    const sections = extractSections(doc.body)

    if (sections.length === 0) {
      return []
    }

    return sections
  } catch (error) {
    return []
  }
}

function extractSections(container: HTMLElement): ParsedItem[] {
  const sections: ParsedItem[] = []
  let currentTitle = `Item ${sections.length + 1}`
  let currentContent: HTMLElement[] = []

  for (const element of container.children) {
    const tagName = element.tagName?.toLowerCase()

    // Headings mark section breaks
    if (/^h[1-6]$/.test(tagName || '')) {
      if (currentContent.length > 0) {
        const div = document.createElement('div')
        currentContent.forEach(el => div.appendChild(el.cloneNode(true)))

        try {
          const content = htmlToTiptap(div.innerHTML)
          const preview = stripHtml(div.innerHTML).substring(0, 100)
          sections.push({
            title: currentTitle,
            content,
            preview,
            valid: true
          })
        } catch {
          sections.push({
            title: currentTitle,
            content: { type: 'doc', content: [] },
            preview: 'Error parsing',
            valid: false
          })
        }
      }

      currentTitle = element.textContent || `Item ${sections.length + 1}`
      currentContent = []
    } else {
      currentContent.push(element as HTMLElement)
    }
  }

  // Add remaining content
  if (currentContent.length > 0) {
    const div = document.createElement('div')
    currentContent.forEach(el => div.appendChild(el.cloneNode(true)))

    try {
      const content = htmlToTiptap(div.innerHTML)
      const preview = stripHtml(div.innerHTML).substring(0, 100)
      sections.push({
        title: currentTitle,
        content,
        preview,
        valid: true
      })
    } catch {
      sections.push({
        title: currentTitle,
        content: { type: 'doc', content: [] },
        preview: 'Error parsing',
        valid: false
      })
    }
  }

  return sections
}

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
  inserting.value = true
  lastResult.value = ''

  try {
    let collectionId: string

    if (collectionMode.value === 'new') {
      const now = new Date().toISOString()
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

    const now = new Date().toISOString()
    for (const item of validItems.value) {
      await createLearningItem({
        collectionId,
        title: item.title,
        content: item.content,
        dateCreated: now,
        lastModified: now
      })
    }

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
