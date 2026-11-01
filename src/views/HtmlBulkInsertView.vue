<template>
  <div class="html-bulk-insert pa-4">
    <h2 class="text-h6 mb-4">Bulk Insert from HTML</h2>

    <TargetCollectionCard
      v-model:mode="collectionMode"
      v-model:selected-id="selectedCollectionId"
      v-model:new-title="newCollectionTitle"
      :collections="collections"
    />

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

    <v-card class="mb-4 pa-4" variant="outlined">
      <div class="text-subtitle-2 mb-1">Content</div>

      <v-textarea
        v-model="rawInput"
        variant="outlined"
        :placeholder="EXAMPLES[inputFormat]"
        rows="14"
        auto-grow
        class="bulk-textarea"
      />

      <div v-if="parsedItems.length > 0" class="mt-3">
        <div class="text-subtitle-2 mb-2">Preview — {{ pluralize(parsedItems.length, 'item') }} detected</div>
        <v-list density="compact" class="preview-list rounded border">
          <PreviewItemRow
            v-for="(item, i) in parsedItems"
            :key="i"
            :valid="item.valid"
            :title="item.title || '(missing title)'"
            :subtitle="item.preview || '(empty content)'"
          />
        </v-list>
      </div>
      <div v-else-if="rawInput.trim()" class="text-caption text-error mt-2">No valid items found. Check the format.</div>
    </v-card>

    <div class="d-flex gap-3 align-center">
      <v-btn
        color="primary"
        :disabled="!canInsert"
        :loading="inserting"
        prepend-icon="mdi-database-import"
        @click="handleBulkInsert"
      >
        Insert {{ validItems.length }} Items
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
import TargetCollectionCard from './bulkInsert/components/TargetCollectionCard.vue'
import PreviewItemRow from './bulkInsert/components/PreviewItemRow.vue'
import { useBulkInsert } from './bulkInsert/composables/useBulkInsert'
import { parseHtmlSections, parseTsv } from './bulkInsert/htmlParse'
import { pluralize } from './bulkInsert/parse'

const { collections, load, insertPrepared } = useBulkInsert()

const collectionMode = ref<'existing' | 'new'>('existing')
const selectedCollectionId = ref<string | null>(null)
const newCollectionTitle = ref('')
const inputFormat = ref<'tsv' | 'html'>('tsv')
const rawInput = ref('')
const inserting = ref(false)
const lastResult = ref('')

const EXAMPLES = {
  tsv: `What is HTML?\t<p><b>HTML</b> is a markup language for creating web pages.</p>
What is CSS?\t<p><i>CSS</i> is used for <u>styling</u> web pages.</p>
What is JavaScript?\t<p>JavaScript is a <mark>programming language</mark> for the web.</p>`,
  html: `<p>Paste your HTML content here...</p>\n<p>This can include <b>formatted text</b>, <code>code blocks</code>, tables, and more.</p>`
}

const parsedItems = computed(() => {
  if (!rawInput.value.trim()) return []
  return inputFormat.value === 'tsv' ? parseTsv(rawInput.value) : parseHtmlSections(rawInput.value)
})

const validItems = computed(() => parsedItems.value.filter(i => i.valid))

const canInsert = computed(() => {
  if (validItems.value.length === 0) return false
  if (collectionMode.value === 'existing') return !!selectedCollectionId.value
  return newCollectionTitle.value.trim().length > 0
})

const handleBulkInsert = async () => {
  if (!canInsert.value) return
  inserting.value = true
  lastResult.value = ''
  try {
    const target = collectionMode.value === 'new'
      ? { kind: 'new' as const, title: newCollectionTitle.value }
      : { kind: 'existing' as const, id: selectedCollectionId.value! }
    await insertPrepared(target, validItems.value)
    lastResult.value = `${pluralize(validItems.value.length, 'item')} inserted successfully`
    reset()
  } finally {
    inserting.value = false
  }
}

const reset = () => {
  rawInput.value = ''
  newCollectionTitle.value = ''
}

onMounted(load)
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
</style>
