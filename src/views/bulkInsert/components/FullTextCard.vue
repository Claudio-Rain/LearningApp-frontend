<template>
  <v-card class="mb-4 pa-4" variant="outlined">
    <div class="text-subtitle-2 mb-1">Collections &amp; Items</div>
    <div class="text-caption text-medium-emphasis mb-3">
      Define everything as text. Start a collection with <code>- Collection name</code> on its own line, then list
      its <code>question:</code>{{ answerWithAI ? '' : ' / ' }}<code v-if="!answerWithAI">answer:</code> items below
      it. Existing collections with a matching name are reused; others are created.
      Optionally group collections under a category with <code># Category name</code> — every collection below it
      gets that category, until the next <code>#</code> line.
    </div>

    <AnswerWithAIToggle v-model="answerWithAI" />

    <v-textarea v-model="text" variant="outlined" :placeholder="EXAMPLE" rows="20" auto-grow class="bulk-textarea" />

    <div v-if="collections.length > 0" class="mt-3">
      <div class="text-subtitle-2 mb-2">
        Preview — {{ pluralize(collections.length, 'collection') }}, {{ pluralize(validCount, 'valid item') }}
      </div>
      <v-expansion-panels multiple class="preview-list rounded border" variant="accordion">
        <v-expansion-panel v-for="(col, ci) in collections" :key="ci">
          <v-expansion-panel-title>
            <span class="font-weight-medium">{{ col.title }}</span>
            <v-chip size="x-small" class="ml-2" :color="col.isNew ? 'primary' : 'default'" label>
              {{ col.isNew ? 'new' : 'existing' }}
            </v-chip>
            <v-chip
              v-if="col.categoryTitle"
              size="x-small"
              class="ml-2"
              variant="tonal"
              label
              prepend-icon="mdi-tag-outline"
            >
              {{ col.categoryTitle }}
            </v-chip>
            <span class="text-caption text-medium-emphasis ml-2">
              {{ countValid(col.items) }} / {{ col.items.length }}
            </span>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact">
              <!-- In AI mode Claude writes the answers, so there is none to preview. -->
              <PreviewItemRow
                v-for="(item, i) in col.items"
                :key="i"
                :valid="item.valid"
                :title="item.question || '(missing question)'"
                :subtitle="answerWithAI ? undefined : item.answer || '(missing answer)'"
              />
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <div v-else-if="text.trim()" class="text-caption text-error mt-2">
      No collections found. Start each collection with a line like <code>- My collection</code>.
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { countValid, pluralize, type ParsedCollection } from '../parse'
import AnswerWithAIToggle from './AnswerWithAIToggle.vue'
import PreviewItemRow from './PreviewItemRow.vue'

const text = defineModel<string>('text', { required: true })
const answerWithAI = defineModel<boolean>('answerWithAI', { required: true })

defineProps<{
  collections: ParsedCollection[]
  validCount: number
}>()

const EXAMPLE = `# Frontend

- L0 Framework - styling

question: How do you use scoped styles in vuejs?
question: What are inline styles in vuejs?

- L1 Framework - routing

question: How do you define routes in vuejs?
question: What is an SPA (single page application)?`
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
</style>
