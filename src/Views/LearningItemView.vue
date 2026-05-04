<!-- LearningItemView.vue -->
<template>
  <div class="content-panel">
    <div class="content-header">
      <v-text-field
        v-model="title"
        class="content-title-input"
        variant="plain"
        hide-details
        @update:model-value="handleTitleInput"
      />
    </div>

    <LearningItemEditor
      :value="content"
      @change="handleContentChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { JSONContent } from '@tiptap/vue-3'
import { editLearningItem } from '../database'
import type { LearningItem } from '../database/types'
import LearningItemEditor from './LearningItemEditor.vue'

const props = defineProps<{
  item: LearningItem
}>()

const emit = defineEmits<{
  (e: 'update:content', id: string, content: JSONContent): void
  (e: 'update:title', id: string, title: string): void
}>()

const content = ref<JSONContent>(
  typeof props.item.content === 'string'
    ? { type: 'doc', content: [] }
    : props.item.content ?? { type: 'doc', content: [] }
)
const title = ref(props.item.title)

console.log(content)

watch(() => props.item.id, () => {
  content.value = typeof props.item.content === 'string'
    ? { type: 'doc', content: [] }
    : props.item.content ?? { type: 'doc', content: [] }
  title.value = props.item.title
})

let contentTimer: ReturnType<typeof setTimeout> | null = null
let titleTimer: ReturnType<typeof setTimeout> | null = null

const handleContentChange = (val: JSONContent) => {
  content.value = val
  if (contentTimer) clearTimeout(contentTimer)
  contentTimer = setTimeout(async () => {
    await editLearningItem({
      ...props.item,
      content: val,
      lastModified: new Date().toISOString()
    })
    emit('update:content', props.item.id!, val)
  }, 500)
}

const handleTitleInput = () => {
  if (!title.value.trim()) return
  if (titleTimer) clearTimeout(titleTimer)
  titleTimer = setTimeout(async () => {
    const trimmed = title.value.trim()
    await editLearningItem({
      ...props.item,
      title: trimmed,
      lastModified: new Date().toISOString()
    })
    emit('update:title', props.item.id!, trimmed)
  }, 500)
}
</script>

<style scoped>
.content-panel {
  padding-left: .5rem;
  width: 100%;
  height: 100%;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
}
.content-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
}
.content-title-input :deep(input) {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
}
</style>