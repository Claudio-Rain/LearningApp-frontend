<!-- LearningItemPanel.vue -->
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

    <div class="label-row">
      <ItemLabelPicker
        v-for="kind in ITEM_LABEL_KINDS"
        :key="kind"
        :kind="kind"
        :model-value="labelValues[kind]"
        @update:model-value="value => setLabel(kind, value)"
      />
    </div>

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
import { ref, watch, toRaw, reactive, computed } from 'vue'
import { formatISO } from 'date-fns'
import type { JSONContent } from '@tiptap/vue-3'
import { editLearningItem } from '../../database'
import type { ItemLabelPatch, LearningItem } from '../../database/types'
import LearningItemEditor from './LearningItemEditor.vue'
import ItemLabelPicker from './ItemLabelPicker.vue'
import { streamAnswer, getApiKey, setApiKey, extractText } from '../../utils/claude'
import { markdownToTiptap } from '../../utils/markdown'
import { ITEM_LABEL_KINDS, type ItemLabelKind } from '../../utils/itemLabels'
import { useItemLabels } from '../composables/useItemLabels'

const props = defineProps<{
  item: LearningItem
}>()

const emit = defineEmits<{
  (e: 'update:content', id: string, content: JSONContent, lastModified: string): void
  (e: 'update:title', id: string, title: string, lastModified: string): void
  (e: 'update:labels', id: string, patch: ItemLabelPatch, lastModified: string): void
}>()

// Labels save themselves on click (no debounce — one click is the whole edit);
// the emit only lets the list view mirror the change without a reload.
const labels = useItemLabels(
  computed(() => props.item),
  (id, patch, lastModified) => emit('update:labels', id, patch, lastModified)
)
const labelValues = computed(() => ({
  priority: labels.priority.value,
  difficulty: labels.difficulty.value
}))
const setLabel = (kind: ItemLabelKind, value: number | null) => labels.set(kind, value)

// Track which item ids are currently being answered, so each item's Answer
// button locks independently. Switching to another item leaves its button
// usable even while a previous item is still generating.
const answeringIds = reactive(new Set<string>())
const answering = computed(() => answeringIds.has(props.item.id!))

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Reveal the finished markdown into the editor word-by-word as rich text,
// trailing a bold caret so it reads like Claude is writing it live.
// Only animate into the live editor while the user is still viewing the item
// the answer was generated for. If they've switched away, skip the typing so we
// don't write item A's answer into item B's editor.
const typeOut = async (markdown: string, itemId: string) => {
  const tokens = markdown.match(/\s+|\S+/g) ?? []
  let shown = ''
  for (const token of tokens) {
    shown += token
    if (props.item.id === itemId) {
      content.value = markdownToTiptap(shown + ' ▋')
    }
    await sleep(45)
  }
  if (props.item.id === itemId) {
    content.value = markdownToTiptap(markdown)
  }
}

const handleAnswer = async () => {
  // Bind this whole operation to the item it started on, so switching items
  // mid-answer doesn't move the lock or the result onto a different item.
  const item = toRaw(props.item)
  const itemId = item.id!
  if (answeringIds.has(itemId)) return
  // Don't overwrite an item that already has an answer unless the user confirms.
  if (extractText(content.value).trim()) {
    if (!confirm('This item already has content. Replace it with a new answer?')) return
  }
  if (!(await getApiKey())) {
    const key = prompt('Paste your Anthropic API key (stored only in this browser, used directly from it):')
    if (!key?.trim()) return
    await setApiKey(key)
  }
  // Capture the prompt inputs for this item now; the live refs may change if the
  // user switches items while the answer is still generating.
  const promptTitle = title.value
  const promptContent = content.value
  answeringIds.add(itemId)
  let accumulated = ''
  try {
    // Collect the whole answer silently — no raw text shown to the user.
    await streamAnswer(promptTitle, promptContent, (chunk) => {
      accumulated += chunk
    })
    // Then write it out as rich text with the typing caret.
    await typeOut(accumulated, itemId)
    const answerContent = markdownToTiptap(accumulated)
    const lastModified = formatISO(new Date())
    // Always save to the item this answer was generated for.
    await editLearningItem({ ...item, content: answerContent, lastModified })
    emit('update:content', itemId, answerContent, lastModified)
  } catch (err) {
    console.error('Claude answer failed:', err)
  } finally {
    answeringIds.delete(itemId)
  }
}

const content = ref<JSONContent>(
  typeof props.item.content === 'string'
    ? { type: 'doc', content: [] }
    : props.item.content ?? { type: 'doc', content: [] }
)
const title = ref(props.item.title)

watch(() => props.item.id, () => {
  console.log('[LearningItemPanel] item ID changed', { newId: props.item.id, contentLength: props.item.content ? JSON.stringify(props.item.content).length : 0 })
  content.value = typeof props.item.content === 'string'
    ? { type: 'doc', content: [] }
    : props.item.content ?? { type: 'doc', content: [] }
  title.value = props.item.title
})

let contentTimer: ReturnType<typeof setTimeout> | null = null
let titleTimer: ReturnType<typeof setTimeout> | null = null

const handleContentChange = (val: JSONContent) => {
  console.log('[LearningItemPanel] handleContentChange', { itemId: props.item.id, contentLength: JSON.stringify(val).length, content: JSON.stringify(val) })
  content.value = val
  if (contentTimer) clearTimeout(contentTimer)
  contentTimer = setTimeout(async () => {
    console.log('[LearningItemPanel] saving to DB after 500ms', { itemId: props.item.id, contentLength: JSON.stringify(val).length, content: JSON.stringify(val) })
    const lastModified = formatISO(new Date())
    await editLearningItem({
      ...toRaw(props.item),
      content: val,
      lastModified
    })
    console.log('[LearningItemPanel] emitting update:content', { itemId: props.item.id, contentLength: JSON.stringify(val).length, content: JSON.stringify(val) })
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

/* Sits between the title and the editor toolbar: close enough to the title to
   read as metadata about the item, not as part of the editing surface. */
.label-row {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 0 8px 16px;
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