<template>
  <div class="split-view">
    <!-- Left panel — item list, resizable (width set inline) -->
    <div class="split-left" :style="{ width: leftWidth + 'px', minWidth: leftWidth + 'px' }">
      <CollectionItemHeader
        :title="collection?.title"
        :is-pulling="isPulling"
        :is-clearing="isClearing"
        :clear-progress="clearProgress"
        :can-clear="learningItems.length > 0"
        @pull="pull"
        @add="handleAddLearningItem"
        @study="router.push({ name: 'study', params: { id: collectionId } })"
        @clear-history="clearStudyHistory"
      />

      <LearningItemTable
        :items="learningItems"
        :selected-id="selectedItem?.id"
        @select="selectItem"
        @delete="handleDeleteLearningItem"
      />
    </div>

    <div v-if="selectedItem" class="splitter" :class="{ dragging: isDragging }" @mousedown="startDrag" />

    <div v-if="selectedItem" class="split-right">
      <LearningItemPanel
        :item="selectedItem"
        @update:content="(id, content, lastModified) => applyLocalEdit(id, { content }, lastModified)"
        @update:title="(id, title, lastModified) => applyLocalEdit(id, { title }, lastModified)"
        @update:labels="(id, patch, lastModified) => applyLocalEdit(id, patch, lastModified)"
      />
    </div>

    <CollectionAssistant
      v-if="collection"
      :collection="collection"
      :items="learningItems"
      :apply-create="applyCreate"
      :apply-delete="applyDelete"
      :apply-update="applyUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LearningItemPanel from '@/shared/components/LearningItemPanel.vue'
import CollectionAssistant from '@/shared/components/CollectionAssistant.vue'
import CollectionItemHeader from './collectionItem/components/CollectionItemHeader.vue'
import LearningItemTable from './collectionItem/components/LearningItemTable.vue'
import { useCollectionItems } from './collectionItem/composables/useCollectionItems'
import { useAssistantActions } from './collectionItem/composables/useAssistantActions'
import { useStudyHistoryReset } from './collectionItem/composables/useStudyHistoryReset'
import { useSplitPane } from './collectionItem/composables/useSplitPane'
import type { LearningItem } from '@/database/types'

// This shell wires the pieces together: useCollectionItems owns collection +
// item data and every write, the assistant handlers reuse it, and the
// splitter/reset concerns live in their own composables.
const route = useRoute()
const router = useRouter()
const collectionId = route.params.id!.toLocaleString()
const itemId = route.params.itemId as string | undefined

const collectionItems = useCollectionItems(collectionId, {
  onMissing: () => router.push({ name: 'collections' })
})
const { collection, learningItems, selectedItem, isPulling, pull, applyLocalEdit } = collectionItems
const { applyCreate, applyDelete, applyUpdate } = useAssistantActions(collectionItems)
const { isClearing, progress: clearProgress, clear: clearStudyHistory } =
  useStudyHistoryReset(collection, learningItems)
const { leftWidth, isDragging, startDrag } = useSplitPane()

const selectItem = (item: LearningItem) => {
  selectedItem.value = item
  router.replace({ name: 'collectionItemView', params: { id: collectionId, itemId: item.id } })
}

const handleAddLearningItem = async () => {
  const title = prompt('Learning item title?')
  if (!title) return
  await collectionItems.addItem(title)
}

const handleDeleteLearningItem = async (item: LearningItem) => {
  if (!confirm('Delete this learning item?')) return
  await collectionItems.deleteItems([item.id!])
}

onMounted(() => collectionItems.load(itemId))
</script>

<style scoped>
.split-view {
  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;
}

.split-left {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Draggable divider between the table and the editor */
.splitter {
  width: 4px;
  flex-shrink: 0;
  cursor: col-resize;
  background: rgb(var(--v-theme-surface));
}

.splitter:hover,
.splitter.dragging {
  background: rgba(var(--v-theme-primary), 0.5);
}

/* Right panel — fills remaining space */
.split-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
</style>
