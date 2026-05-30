<template>
  <div class="split-view">
    <!-- Left Panel -->
    <div class="split-left">
      <div class="panel-header">
        <div>
          <div class="panel-title">{{ collection?.title }}</div>
        </div>
        <div class="header-buttons">
          <v-btn
            size="small"
            prepend-icon="mdi-sync"
            @click="handlePullItems"
            :loading="isPulling"
            title="Pull latest items from Firebase"
          >
            Pull
          </v-btn>
          <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="handleAddLearningItem">
            Add
          </v-btn>
        </div>
      </div>

      <v-data-table
        v-if="learningItems.length > 0"
        :headers="headers"
        :items="learningItems"
        :items-per-page="-1"
        :sort-by="[{ key: 'title', order: 'asc' }]"
        density="compact"
        class="item-table"
        hover
        @click:row="(_: any, { item }: any) => selectedItem = item"
      >
        <template #item.rowNumber="{ index }">
          <span style="font-size: 0.75rem; color: rgba(0, 0, 0, 0.5);">{{ index + 1 }}</span>
        </template>
        <template #item.title="{ item }">
          <span :class="['item-title', { 'text-primary font-weight-medium': selectedItem?.id === item.id }]">
            {{ item.title }}
          </span>
        </template>
        <template #item.dateCreated="{ item }">
          {{ formatDate(item.dateCreated) }}
        </template>
        <template #item.lastModified="{ item }">
          {{ formatDate(item.lastModified) }}
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-delete" size="x-small" variant="text" color="error"
            @click.stop="handleDeleteLearningItem(item)" />
        </template>
      </v-data-table>

      <div v-else class="empty-state">
        <v-icon size="40" color="grey-lighten-1">mdi-book-open-outline</v-icon>
        <p>No learning items yet</p>
      </div>
    </div>

    <div v-if="selectedItem" class="split-right">
      <LearningItemView :item="selectedItem" @update:content="handleContentUpdate"
        @update:title="handleTitleUpdate" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatISO, parseISO, format } from 'date-fns'
import { useRoute, useRouter } from 'vue-router'
import LearningItemView from './LearningItemView.vue'
import type { JSONContent } from '@tiptap/vue-3'

import {
  getCollections,
  getLearningItems,
  createLearningItem,
  removeLearningItem,
  editCollection,
  syncLearningItems,
  syncCollections,
  pullLearningItems
} from '../database'

import type { Collection, LearningItem } from '../database/types'

const route = useRoute()
const router = useRouter()
const collectionId = route.params.id!.toLocaleString()

const collection = ref<Collection | null>(null)
const learningItems = ref<LearningItem[]>([])
const selectedItem = ref<LearningItem | null>(null)
const isPulling = ref(false)

const dateSort = (a: string, b: string) =>
  parseISO(a).getTime() - parseISO(b).getTime()
const headers = [
  { title: '#', key: 'rowNumber', sortable: false, align: 'center' as const, width: '50px' },
  { title: 'Title', key: 'title', sortable: true },
  { title: 'Created', key: 'dateCreated', sortable: true, sort: dateSort },
  { title: 'Modified', key: 'lastModified', sortable: true, sort: dateSort },
  { title: '', key: 'actions', sortable: false, align: 'center' as const },
]
const formatDate = (iso: string) => {
  try {
    return format(parseISO(iso), 'MMM d, yyyy h:mm a')
  } catch {
    return iso
  }
}

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
    selectedItem.value = stillExists ?? (learningItems.value[0] as LearningItem)
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
  height: 100vh;
  overflow: hidden;
}

/* Left panel — fixed width, scrollable */
.split-left {
  width: 520px;
  min-width: 520px;
  display: flex;
  flex-direction: column;
  /* border-right: 1px solid rgba(0, 0, 0, 0.12); */
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  /* border-bottom: 1px solid rgba(0, 0, 0, 0.08); */
  flex-shrink: 0;
}

.header-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
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
  overflow-y: auto;
  cursor: pointer;
}

:deep(.v-table__wrapper) {
  border: none;
}

:deep(.v-table td),
:deep(.v-table th) {
  border: none !important;
}

.item-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
  display: inline-block;
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

.content-panel {
  padding: 32px;
  max-width: 720px;
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