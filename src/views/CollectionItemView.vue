<template>
  <!-- Side by side on a wide screen. On a narrow one there's room for one pane
       at a time: the list, or the open item (when the URL names one). -->
  <div class="split-view" :class="{ 'split-view--narrow': narrow }">
    <!-- Left panel — item list, resizable (width set inline) -->
    <div
      v-show="!narrow || !showDetail"
      class="split-left"
      :style="narrow ? undefined : { width: leftWidth + 'px', minWidth: leftWidth + 'px' }"
    >
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
        @reorder="collectionItems.reorderItem"
      />
    </div>

    <div v-if="selectedItem && !narrow" class="splitter" :class="{ dragging: isDragging }" @mousedown="startDrag" />

    <div v-if="selectedItem && (!narrow || showDetail)" class="split-right">
      <div v-if="narrow" class="detail-back">
        <v-btn variant="text" size="large" prepend-icon="mdi-arrow-left" class="detail-back-btn" @click="closeDetail">
          {{ collection?.title ?? 'Back' }}
        </v-btn>
      </div>
      <LearningItemPanel
        :item="selectedItem"
        @update:content="(id, content, lastModified) => applyLocalEdit(id, { content }, lastModified)"
        @update:title="(id, title, lastModified, titleContent) => applyLocalEdit(id, { title, titleContent }, lastModified)"
        @update:labels="(id, patch, lastModified) => applyLocalEdit(id, patch, lastModified)"
      />
    </div>

    <CollectionAssistant
      v-if="collection"
      :collection="collection"
      :items="learningItems"
      :open-item="selectedItem"
      :apply-create="applyCreate"
      :apply-delete="applyDelete"
      :apply-update="applyUpdate"
      :apply-labels="applyLabels"
      :apply-move="applyMove"
      :apply-reorder="applyReorder"
      :collections="allCollections"    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
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
const { collection, allCollections, learningItems, selectedItem, isPulling, pull, applyLocalEdit } = collectionItems
const { applyCreate, applyDelete, applyUpdate, applyLabels, applyMove, applyReorder } = useAssistantActions(collectionItems)
const { isClearing, progress: clearProgress, clear: clearStudyHistory } =
  useStudyHistoryReset(collection, learningItems)
const { leftWidth, isDragging, startDrag } = useSplitPane()

// Below this the list and the editor don't both fit (the list alone is 520px).
const { smAndDown: narrow } = useDisplay()
// The URL names the open item only once one is picked (loading selects the
// first item without putting it there), so on a narrow screen it decides
// whether the list or the item shows.
const showDetail = computed(() => !!route.params.itemId && !!selectedItem.value)

const selectItem = (item: LearningItem) => {
  selectedItem.value = item
  router.replace({ name: 'collectionItemView', params: { id: collectionId, itemId: item.id } })
}

const closeDetail = () => {
  router.replace({ name: 'collectionView', params: { id: collectionId } })
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
  /* The dynamic unit follows mobile browser bars coming and going. */
  height: calc(100dvh - 60px);
  overflow: hidden;
}

.split-left {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* One pane at a time, each taking the full width. */
.split-view--narrow .split-left {
  flex: 1;
  min-width: 0;
}

.detail-back {
  flex-shrink: 0;
  padding: 8px 4px 0;
}

/* A full-size touch target: it's the only way back to the list. */
.detail-back-btn {
  max-width: 100%;
  min-height: 44px;
  padding-inline: 12px;
  font-size: 1rem;
  font-weight: 500;
  text-transform: none;
  letter-spacing: normal;
}

.detail-back-btn :deep(.v-btn__prepend .v-icon) {
  font-size: 24px;
}

.detail-back-btn :deep(.v-btn__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
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
  /* Wide content scrolls inside its own block (code, tables, formulas); the
     panel itself never slides sideways under a finger. */
  overflow-x: hidden;
  /* Same as the item list: a scrollbar showing up mustn't reflow the card. */
  scrollbar-gutter: stable;
  /* Room below the card, so the assistant button never covers its end. */
  padding-bottom: 80px;
}
</style>
