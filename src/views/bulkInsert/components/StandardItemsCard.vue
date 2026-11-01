<template>
  <v-card class="mb-4 pa-4" variant="outlined">
    <div class="text-subtitle-2 mb-1">Learning Items</div>
    <div class="text-caption text-medium-emphasis mb-3">
      Enter items line by line. Each item needs a <code>question:</code>{{ answerWithAI ? '' : ' and an ' }}<code
        v-if="!answerWithAI">answer:</code>. Separate multiple items with a blank line.
      <template v-if="answerWithAI">
        The <code>answer:</code> is optional — Claude will generate one for each question.
      </template>
    </div>

    <AnswerWithAIToggle v-model="answerWithAI" />

    <v-textarea
      v-model="text"
      variant="outlined"
      :placeholder="answerWithAI ? QUESTIONS_ONLY_EXAMPLE : QUESTIONS_AND_ANSWERS_EXAMPLE"
      rows="14"
      auto-grow
      class="bulk-textarea"
    />

    <div v-if="items.length > 0" class="mt-3">
      <div class="text-subtitle-2 mb-2">Preview — {{ pluralize(items.length, 'item') }} detected</div>
      <v-list density="compact" class="preview-list rounded border">
        <ParsedItemRow v-for="(item, i) in items" :key="i" :item="item" />
      </v-list>
    </div>
    <div v-else-if="text.trim()" class="text-caption text-error mt-2">No valid items found. Check the format.</div>
  </v-card>
</template>

<script setup lang="ts">
import { pluralize, type ParsedItem } from '../parse'
import AnswerWithAIToggle from './AnswerWithAIToggle.vue'
import ParsedItemRow from './ParsedItemRow.vue'

const text = defineModel<string>('text', { required: true })
const answerWithAI = defineModel<boolean>('answerWithAI', { required: true })

defineProps<{ items: ParsedItem[] }>()

// In AI mode the answer is optional, so the example shows questions only.
const QUESTIONS_ONLY_EXAMPLE = `question: What is a closure in JavaScript?

question: What does async/await do?

question: What is the event loop?`

const QUESTIONS_AND_ANSWERS_EXAMPLE = `question: What is a closure in JavaScript?
answer: A closure is a function that retains access to its outer scope even after the outer function has returned.

question: What does async/await do?
answer: It allows writing asynchronous code in a synchronous style, pausing execution until a Promise resolves.

question: What is the event loop?
answer: A mechanism that processes the call stack and callback queue, enabling non-blocking I/O in JavaScript.`
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
