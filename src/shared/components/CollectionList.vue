<template>
  <div class="collections">
    <div class="header-bar">
      <v-btn color="primary" @click="handleAdd">
        Add Collection
      </v-btn>
      <v-btn variant="outlined" @click="goToProgress" prepend-icon="mdi-chart-line">
        Progress
      </v-btn>
    </div>

    <v-data-table
      :headers="headers"
      :items="collections"
      :items-per-page="10"
      class="elevation-1 rounded"
      hover
    >
      <template #item.title="{ item }">
        <span class="cursor-pointer text-primary" @click="goToCollection(item.id!)">
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
        <v-btn
          icon="mdi-school"
          variant="text"
          size="small"
          @click.stop="goToStudy(item.id!)"
          title="Study"
        />
        <v-btn
          icon="mdi-pencil"
          variant="text"
          size="small"
          @click.stop="handleEdit(item)"
        />
        <v-btn
          icon="mdi-delete"
          variant="text"
          size="small"
          @click.stop="handleDelete(item.id!)"
        />
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatISO, parseISO, format } from 'date-fns'
import { useRouter } from 'vue-router'
import {
  getCollections,
  createCollection,
  editCollection,
  removeCollection,
  startSyncEngine,
  syncCollections,
  syncAll,
} from '../../database'

import type {
  Collection
} from '../../database'

const router = useRouter()
const collections = ref<Collection[]>([])

const headers = [
  { title: 'Title', key: 'title', sortable: true },
  { title: 'Date Created', key: 'dateCreated', sortable: true },
  { title: 'Last Modified', key: 'lastModified', sortable: true },
  { title: 'Items', key: 'numberOfItems', sortable: true, align: 'center' as const },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const },
]

const formatDate = (iso: string) => {
  try {
    return format(parseISO(iso), 'MMM d, yyyy h:mm a')
  } catch {
    return iso
  }
}

// 📥 Load data
const loadCollections = async () => {
  collections.value = await getCollections()
}

// ➕ Add
const handleAdd = async () => {
  const title = prompt('Collection name?')
  if (!title) return

  const now = formatISO(new Date())

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
    lastModified: formatISO(new Date())
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
  await syncAll()
  startSyncEngine()
  await loadCollections()
})

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