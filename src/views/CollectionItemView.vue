<template>
  <div class="split-view">
    <!-- Left Panel -->
    <div class="split-left" :style="{ width: leftWidth + 'px', minWidth: leftWidth + 'px' }">
      <div class="panel-header">
        <div class="panel-title">{{ collection?.title }}</div>
        <div class="header-buttons">
          <v-btn
            size="small"
            variant="tonal"
            prepend-icon="mdi-sync"
            :loading="isPulling"
            title="Pull latest items from Firebase"
            class="action-btn"
            @click="handlePullItems"
          >
            Pull
          </v-btn>
          <v-btn
            color="primary"
            size="small"
            variant="flat"
            prepend-icon="mdi-plus"
            class="action-btn"
            @click="handleAddLearningItem"
          >
            Add
          </v-btn>
          <v-btn
            color="primary"
            size="small"
            variant="tonal"
            prepend-icon="mdi-play-circle-outline"
            class="action-btn"
            @click="router.push({ name: 'study', params: { id: collectionId } })"
          >
            Study
          </v-btn>
          <v-btn
            color="error"
            size="small"
            variant="tonal"
            :prepend-icon="isClearing ? 'mdi-loading mdi-spin' : 'mdi-history'"
            :disabled="isClearing || learningItems.length === 0"
            title="Clear your progress so you can study this collection fresh"
            class="action-btn"
            @click="handleClearStudyHistory"
          >
            {{ clearProgress || 'Start over' }}
          </v-btn>
        </div>
      </div>

      <v-data-table
        v-if="learningItems.length > 0"
        :headers="headers"
        :items="learningItems"
        :items-per-page="-1"
        hide-default-footer
        :sort-by="[{ key: 'title', order: 'asc' }]"
        density="comfortable"
        class="item-table"
        hover
        :row-props="({ item }: any) => ({ class: selectedItem?.id === item.id ? 'selected-row' : '' })"
        @click:row="(_: any, { item }: any) => { selectedItem = item; router.replace({ name: 'collectionItemView', params: { id: collectionId, itemId: item.id } }) }"
      >
        <template #item.rowNumber="{ index }">
          <span style="font-size: 0.75rem; color: rgba(0, 0, 0, 0.5);">{{ index + 1 }}</span>
        </template>
        <template #item.title="{ item }">
          <v-tooltip :text="item.title" location="top" open-delay="300" max-width="600">
            <template #activator="{ props }">
              <span
v-bind="props"
                :class="['item-title']">
                {{ item.title }}
              </span>
            </template>
          </v-tooltip>
        </template>
        <template #item.actions="{ item }">
          <v-btn
icon="mdi-delete" size="x-small" variant="text" color="grey"
            class="delete-btn" @click.stop="handleDeleteLearningItem(item)" />
        </template>
      </v-data-table>

      <div v-else class="empty-state">
        <v-icon size="40" color="grey-lighten-1">mdi-book-open-outline</v-icon>
        <p>No learning items yet</p>
      </div>
    </div>

    <div v-if="selectedItem" class="splitter" :class="{ dragging: isDragging }" @mousedown="startDrag" />

    <div v-if="selectedItem" class="split-right">
      <LearningItemPanel
:item="selectedItem" @update:content="handleContentUpdate"
        @update:title="handleTitleUpdate" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { formatISO } from 'date-fns'
import { useRoute, useRouter } from 'vue-router'
import LearningItemPanel from '../shared/components/LearningItemPanel.vue'
import type { JSONContent } from '@tiptap/vue-3'

import {
  getCollections,
  getLearningItems,
  createLearningItem,
  removeLearningItem,
  editCollection,
  syncLearningItems,
  syncCollections,
  pullLearningItems,
  clearStudyHistoryForItems
} from '../database'

import type { Collection, LearningItem } from '../database/types'

const route = useRoute()
const router = useRouter()
const collectionId = route.params.id!.toLocaleString()
const itemId = route.params.itemId as string | undefined

const collection = ref<Collection | null>(null)
const learningItems = ref<LearningItem[]>([])
const selectedItem = ref<LearningItem | null>(null)
const isPulling = ref(false)
const isClearing = ref(false)
const clearProgress = ref('')

const headers = [
  { title: '#', key: 'rowNumber', sortable: false, align: 'center' as const, width: '50px' },
  { title: 'Title', key: 'title', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'center' as const, width: '48px' },
]

// Draggable splitter between the table and the editor
const leftWidth = ref(520)
const isDragging = ref(false)

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  const min = 280
  const max = window.innerWidth - 320
  leftWidth.value = Math.min(max, Math.max(min, e.clientX))
}

const stopDrag = () => {
  isDragging.value = false
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const startDrag = () => {
  isDragging.value = true
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

onUnmounted(stopDrag)

const loadData = async () => {
  const allCollections = await getCollections()
  collection.value = allCollections.find(c => c.id === collectionId) ?? null
  if (!collection.value) {
    alert('Collection not found')
    router.push({ name: 'collections' })
    return
  }

  const items = await getLearningItems(collectionId)
  learningItems.value = items
  if (learningItems.value.length > 0) {
    const stillExists = learningItems.value.find(i => i.id === selectedItem.value?.id) ?? null
    const fromUrl = itemId ? (learningItems.value.find(i => i.id === itemId) ?? null) : null
    selectedItem.value = fromUrl ?? stillExists ?? (learningItems.value[0] as LearningItem)
  } else {
    selectedItem.value = null
  }
}

const handleAddLearningItem = async () => {
  const title = prompt('Learning item title?')
  if (!title || !collection.value) return

  const now = formatISO(new Date())
  await createLearningItem({
    collectionId: collection.value.id!,
    title,
    dateCreated: now,
    lastModified: now
  })
  await editCollection({
    ...collection.value,
    numberOfItems: collection.value.numberOfItems + 1,
    lastModified: now
  })
  await syncLearningItems()
  await syncCollections() 

  await loadData()
}

const handleDeleteLearningItem = async (item: LearningItem) => {
  if (!confirm('Delete this learning item?')) return
  await removeLearningItem(item.id!)
  if (collection.value) {
    await editCollection({
      ...collection.value,
      numberOfItems: collection.value.numberOfItems - 1,
      lastModified: formatISO(new Date())
    })
  }
  await syncLearningItems()
  await syncCollections()
  await loadData()
}

const handleContentUpdate = async (id: string, content: JSONContent, lastModified: string) => {
  console.log('[CollectionItemView] handleContentUpdate', { id, contentLength: JSON.stringify(content).length, content: JSON.stringify(content) })
  const item = learningItems.value.find(i => i.id === id)
  if (item) {
    console.log('[CollectionItemView] updating item.content', { id, contentLength: JSON.stringify(content).length, content: JSON.stringify(content) })
    item.content = content
    item.lastModified = lastModified
  }
  if (collection.value) {
    collection.value.lastModified = lastModified
    await editCollection(collection.value)
    await syncCollections()
  }
}

const handleTitleUpdate = async (id: string, title: string, lastModified: string) => {
  const item = learningItems.value.find(i => i.id === id)
  if (item) {
    item.title = title
    item.lastModified = lastModified
  }
  if (collection.value) {
    collection.value.lastModified = lastModified
    await editCollection(collection.value)
    await syncCollections()
  }
}

const handleClearStudyHistory = async () => {
  if (!collection.value || learningItems.value.length === 0) return
  const confirmed = confirm(
    `Start over with "${collection.value.title}"?\n\n` +
    'This clears how you did last time so you can study it fresh. ' +
    'Your cards stay exactly as they are.'
  )
  if (!confirmed) return

  isClearing.value = true
  clearProgress.value = ''
  try {
    const itemIds = learningItems.value.map(i => i.id).filter((id): id is string => !!id)
    await clearStudyHistoryForItems(itemIds, (done, total) => {
      clearProgress.value = total > 0 ? `Clearing ${done} of ${total}…` : ''
    })
    alert('All set! You can study this collection fresh.')
  } catch (error) {
    console.error('Failed to clear study history:', error)
    alert("Something went wrong and your progress wasn't cleared. Please try again.")
  } finally {
    isClearing.value = false
    clearProgress.value = ''
  }
}

const handlePullItems = async () => {
  isPulling.value = true
  try {
    if (navigator.onLine) {
      await pullLearningItems(collectionId)
      await loadData()
    }
  } catch (error) {
    console.error('Failed to pull items:', error)
    alert('Failed to pull items from Firebase')
  } finally {
    isPulling.value = false
  }
}

onMounted(async () => {
  await loadData()
})

</script>
<style scoped>
.split-view {
  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;
}

/* Left panel — resizable, scrollable (width set inline) */
.split-left {
  display: flex;
  flex-direction: column;
  /* border-right: 1px solid rgba(0, 0, 0, 0.12); */
  overflow: hidden;
}

/* Draggable divider between the table and the editor */
.splitter {
  width: 4px;
  flex-shrink: 0;
  cursor: col-resize;
  background: white;
  /* transition: background 0.15s ease; */
}

.splitter:hover,
.splitter.dragging {
  background: rgba(var(--v-theme-primary), 0.5);
}

.panel-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  flex-shrink: 0;
}

.header-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
}

.action-btn {
  border-radius: 8px !important;
  font-weight: 500 !important;
  letter-spacing: 0.01em !important;
  text-transform: none !important;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}

.panel-meta {
  font-size: 0.72rem;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
}

.item-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.item-table {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

:deep(.item-table .v-table__wrapper) {
  flex: 1;
  overflow-y: auto;
}

:deep(tr.selected-row) {
  background: rgba(0, 0, 0, 0.06) !important;
  box-shadow: inset 2px 0 0 0 #000;
}

:deep(.delete-btn) {
  opacity: 0;
  transition: opacity 0.15s ease;
}

:deep(tr:hover .delete-btn) {
  opacity: 1;
}

:deep(.v-table__wrapper) {
  border: none;
}

:deep(.v-table td),
:deep(.v-table th) {
  border: none !important;
}

:deep(.v-table table) {
  table-layout: fixed;
  width: 100%;
}


.item-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  width: 100%;
  font-size: 1rem;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(0, 0, 0, 0.35);
  font-size: 0.85rem;
  padding: 32px;
  text-align: center;
}

/* Right panel — fills remaining space */
.split-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.content-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.content-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.content-meta {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.45);
}

.content-body {
  font-size: 0.95rem;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.75);
  white-space: pre-wrap;
}
</style>