<template>
  <div class="collections">
    <!-- Header with buttons -->
    <div class="header-bar">
      <v-btn color="primary" @click="handleAdd">
        Add Collection
      </v-btn>
      <v-btn variant="outlined" @click="goToProgress" prepend-icon="mdi-chart-line">
        Progress
      </v-btn>
    </div>

    <v-list lines="one">
      <v-list-item
        v-for="collection in collections"
        :key="collection.id"
        :title="collection.title"
        :subtitle="formatSubtitle()"
        @click="goToCollection(collection.id!)"
        class="cursor-pointer"
      >
        <!-- 👉 Actions -->
        <template #append>
          <v-btn
            icon="mdi-school"
            variant="text"
            @click.stop="goToStudy(collection.id!)"
            title="Study"
          />
          <v-btn
            icon="mdi-pencil"
            variant="text"
            @click.stop="handleEdit(collection)"
          />
          <v-btn
            icon="mdi-delete"
            variant="text"
            @click.stop="handleDelete(collection.id!)"
          />
        </template>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getCollections,
  createCollection,
  editCollection,
  removeCollection,
  startSyncEngine,
  syncCollections,
} from '../../database'

import type {
  Collection
} from '../../database'

const router = useRouter()
const collections = ref<Collection[]>([])

// 📥 Load data
const loadCollections = async () => {
  collections.value = await getCollections()
}

// ➕ Add
const handleAdd = async () => {
  const title = prompt('Collection name?')
  if (!title) return

  const now = new Date().toISOString()

  await createCollection({
    title,
    dateCreated: now,
    lastModified: now,
    numberOfItems: 0
  })
  await syncCollections() 
  await loadCollections()
}

// ✏️ Edit
const handleEdit = async (collection: Collection) => {
  const newTitle = prompt('Edit collection name:', collection.title)
  if (!newTitle) return

  await editCollection({
    ...collection,
    title: newTitle,
    lastModified: new Date().toISOString()
  })
  await syncCollections() 
  await loadCollections()
}

const handleDelete = async (id: string) => {
  const confirmed = confirm('Are you sure you want to delete this collection?')
  if (!confirmed) return

  await removeCollection(id)
  await syncCollections() 
  await loadCollections()
}

const goToCollection = (id: string) => {
  router.push({ name: 'collectionView', params: { id } })
}

const goToStudy = (id: string) => {
  router.push({ name: 'study', params: { id } })
}

const goToProgress = () => {
  router.push({ name: 'progress' })
}

onMounted(async () => {
  startSyncEngine()
  await loadCollections()
})

// 📝 Subtitle formatter
const formatSubtitle = () => {
  return ``
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.header-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
</style>