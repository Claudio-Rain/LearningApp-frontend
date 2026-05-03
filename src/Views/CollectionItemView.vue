<template>
  <div class="split-view">
    <!-- Left Panel -->
    <div class="split-left">
      <div class="panel-header">
        <div>
          <div class="panel-title">{{ collection?.title }}</div>
        </div>
        <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="handleAddLearningItem">
          Add
        </v-btn>
      </div>

      <v-list v-if="learningItems.length > 0" lines="two" class="item-list">
        <v-list-item v-for="item in learningItems" :key="item.id" :active="selectedItem?.id === item.id" color="primary"
          rounded="lg" class="item-entry" @click="selectedItem = item">
          <v-list-item-title>{{ item.title }}</v-list-item-title>
          <template #append>
            <v-btn icon="mdi-delete" size="x-small" variant="text" color="error"
              @click.stop="handleDeleteLearningItem(item)" />
          </template>
        </v-list-item>
      </v-list>

      <div v-else class="empty-state">
        <v-icon size="40" color="grey-lighten-1">mdi-book-open-outline</v-icon>
        <p>No learning items yet</p>
      </div>
    </div>

    <LearningItemView v-if="selectedItem" :item="selectedItem" @update:content="handleContentUpdate"
      @update:title="handleTitleUpdate" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
  startSyncEngine
} from '../database'

import type { Collection, LearningItem } from '../database/types'

const route = useRoute()
const router = useRouter()
const collectionId = route.params.id!.toLocaleString()

const collection = ref<Collection | null>(null)
const learningItems = ref<LearningItem[]>([])
const selectedItem = ref<LearningItem | null>(null)

const loadData = async () => {
  const allCollections = await getCollections()
  collection.value = allCollections.find(c => c.id === collectionId) ?? null
  if (!collection.value) {
    alert('Collection not found')
    router.push({ name: 'collections' })
    return
  }

  learningItems.value = await getLearningItems(collectionId)

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

  const now = new Date().toISOString()
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
      lastModified: new Date().toISOString()
    })
  }
  await syncLearningItems()
  await syncCollections()
  await loadData()
}

const handleContentUpdate = (id: string, content: JSONContent) => {
  const item = learningItems.value.find(i => i.id === id)
  if (item) item.content = content
}

const handleTitleUpdate = (id: string, title: string) => {
  const item = learningItems.value.find(i => i.id === id)
  if (item) item.title = title
}

onMounted(async () => {
  startSyncEngine()
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
  width: 320px;
  min-width: 320px;
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

.item-entry {
  margin-bottom: 2px;
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