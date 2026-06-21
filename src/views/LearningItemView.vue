<!-- LearningItemView.vue -->
<template>
  <div class="content-panel">
    <v-textarea
      v-model="title"
      class="content-title-input"
      variant="plain"
      hide-details
      auto-grow
      rows="1"
      @update:model-value="handleTitleInput"
    />

    <LearningItemEditor
      class="editor-fill"
      :value="content"
      :answering="answering"
      @change="handleContentChange"
      @answer="handleAnswer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRaw } from 'vue'
import { formatISO } from 'date-fns'
import type { JSONContent } from '@tiptap/vue-3'
import { editLearningItem } from '../database'
import type { LearningItem } from '../database/types'
import LearningItemEditor from './LearningItemEditor.vue'
import { streamAnswer, getApiKey, setApiKey, extractText } from '../utils/claude'
import { markdownToTiptap } from '../utils/markdown'

const props = defineProps<{
  item: LearningItem
}>()

const emit = defineEmits<{
  (e: 'update:content', id: string, content: JSONContent, lastModified: string): void
  (e: 'update:title', id: string, title: string, lastModified: string): void
}>()

const answering = ref(false)

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Reveal the finished markdown into the editor word-by-word as rich text,
// trailing a bold caret so it reads like Claude is writing it live.
const typeOut = async (markdown: string) => {
  const tokens = markdown.match(/\s+|\S+/g) ?? []
  let shown = ''
  for (const token of tokens) {
    shown += token
    content.value = markdownToTiptap(shown + ' ▋')
    await sleep(45)
  }
  content.value = markdownToTiptap(markdown)
}

const handleAnswer = async () => {
  if (answering.value) return
  // Don't overwrite an item that already has an answer unless the user confirms.
  if (extractText(content.value).trim()) {
    if (!confirm('This item already has content. Replace it with a new answer?')) return
  }
  if (!(await getApiKey())) {
    const key = prompt('Paste your Anthropic API key (stored only in this browser, used directly from it):')
    if (!key?.trim()) return
    await setApiKey(key)
  }
  answering.value = true
  let accumulated = ''
  try {
    // Collect the whole answer silently — no raw text shown to the user.
    await streamAnswer(title.value, content.value, (chunk) => {
      accumulated += chunk
    })
    // Then write it out as rich text with the typing caret.
    await typeOut(accumulated)
    const lastModified = formatISO(new Date())
    await editLearningItem({ ...toRaw(props.item), content: content.value, lastModified })
    emit('update:content', props.item.id!, content.value, lastModified)
  } catch (err) {
    console.error('Claude answer failed:', err)
  } finally {
    answering.value = false
  }
}

const content = ref<JSONContent>(
  typeof props.item.content === 'string'
    ? { type: 'doc', content: [] }
    : props.item.content ?? { type: 'doc', content: [] }
)
const title = ref(props.item.title)

watch(() => props.item.id, () => {
  console.log('[LearningItemView] item ID changed', { newId: props.item.id, contentLength: props.item.content ? JSON.stringify(props.item.content).length : 0 })
  content.value = typeof props.item.content === 'string'
    ? { type: 'doc', content: [] }
    : props.item.content ?? { type: 'doc', content: [] }
  title.value = props.item.title
})

let contentTimer: ReturnType<typeof setTimeout> | null = null
let titleTimer: ReturnType<typeof setTimeout> | null = null

const handleContentChange = (val: JSONContent) => {
  console.log('[LearningItemView] handleContentChange', { itemId: props.item.id, contentLength: JSON.stringify(val).length, content: JSON.stringify(val) })
  content.value = val
  if (contentTimer) clearTimeout(contentTimer)
  contentTimer = setTimeout(async () => {
    console.log('[LearningItemView] saving to DB after 500ms', { itemId: props.item.id, contentLength: JSON.stringify(val).length, content: JSON.stringify(val) })
    const lastModified = formatISO(new Date())
    await editLearningItem({
      ...toRaw(props.item),
      content: val,
      lastModified
    })
    console.log('[LearningItemView] emitting update:content', { itemId: props.item.id, contentLength: JSON.stringify(val).length, content: JSON.stringify(val) })
    emit('update:content', props.item.id!, val, lastModified)
  }, 500)
}

const handleTitleInput = () => {
  if (!title.value.trim()) return
  if (titleTimer) clearTimeout(titleTimer)
  titleTimer = setTimeout(async () => {
    const trimmed = title.value.trim()
    const lastModified = formatISO(new Date())
    await editLearningItem({
      ...toRaw(props.item),
      title: trimmed,
      lastModified
    })
    emit('update:title', props.item.id!, trimmed, lastModified)
  }, 500)
}
</script>

<style scoped>
.content-panel {
  padding-left: .5rem;
  width: 100%;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.editor-fill {
  flex: 1;
  min-height: 0;
}

/* Keep the title at its natural height so it doesn't stretch the column
   and push the editor toolbar down. */
.content-title-input {
  flex: 0 0 auto;
}

.content-title-input :deep(textarea) {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
}
</style>