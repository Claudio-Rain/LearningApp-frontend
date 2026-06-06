<template>
  <div class="collections">
    <div class="header-bar">
      <v-btn color="primary" @click="handleAdd">
        Add Collection
      </v-btn>
      <v-btn variant="outlined" @click="goToProgress" prepend-icon="mdi-chart-line">
        Progress
      </v-btn>
      <v-btn variant="outlined" @click="handleRefresh" prepend-icon="mdi-refresh" :loading="isSyncing">
        Pull
      </v-btn>
    </div>

    <v-data-table
      :headers="headers"
      :items="collections"
      :items-per-page="-1"
      :sort-by="[{ key: 'title', order: 'asc' }]"
      class="elevation-1 rounded resizable-table"
      hover
    >
      <template v-for="col in resizableColumns" #[`header.${col}`]="{ column }" :key="col">
        <span>{{ column.title }}</span>
        <span class="resize-handle" @mousedown.stop="startResize($event, col)" />
      </template>

      <template #item.title="{ item }">
        <span class="cursor-pointer text-primary" @click="goToCollection(item.id!)">
          {{ item.title }}
        </span>
      </template>

      <template #item.description="{ item }">
        <v-text-field
          :model-value="item.description ?? ''"
          density="compact"
          variant="plain"
          placeholder="Add description..."
          hide-details
          class="description-field"
          @change="(e: Event) => handleDescriptionChange(item, (e.target as HTMLInputElement).value)"
          @keydown.enter.prevent="(e: KeyboardEvent) => (e.target as HTMLInputElement).blur()"
        />
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { formatISO } from 'date-fns'
import { useRouter } from 'vue-router'
import {
  getCollections,
  createCollection,
  editCollection,
  removeCollection,
  syncCollections,
  syncAll,
} from '../../database'

import type {
  Collection
} from '../../database'

const router = useRouter()
const collections = ref<Collection[]>([])
const isSyncing = ref(false)

const resizableColumns = ['title', 'description', 'numberOfItems', 'actions']

const columnWidths = ref<Record<string, number>>({
  title: 180,
  description: 380,
  numberOfItems: 80,
  actions: 120,
})

const headers = computed(() => [
  { title: 'Title', key: 'title', sortable: true, width: columnWidths.value.title },
  { title: 'Description', key: 'description', sortable: false, width: columnWidths.value.description },
  { title: 'Items', key: 'numberOfItems', sortable: true, align: 'center' as const, width: columnWidths.value.numberOfItems },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const, width: columnWidths.value.actions },
])

const resizing = ref<{ key: string; startX: number; startWidth: number } | null>(null)

function startResize(e: MouseEvent, key: string) {
  resizing.value = { key, startX: e.clientX, startWidth: columnWidths.value[key] ?? 120 }
  window.addEventListener('mousemove', onResize)
  window.addEventListener('mouseup', stopResize)
}

function onResize(e: MouseEvent) {
  if (!resizing.value) return
  const delta = e.clientX - resizing.value.startX
  columnWidths.value[resizing.value.key] = Math.max(60, resizing.value.startWidth + delta)
}

function stopResize() {
  resizing.value = null
  window.removeEventListener('mousemove', onResize)
  window.removeEventListener('mouseup', stopResize)
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onResize)
  window.removeEventListener('mouseup', stopResize)
})

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

const handleDescriptionChange = async (collection: Collection, description: string) => {
  await editCollection({
    ...collection,
    description,
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
  localStorage.setItem('studyViewCollectionId', id)
  router.push({ name: 'study', params: { id } })
}

const goToProgress = () => {
  router.push({ name: 'progress' })
}

const handleRefresh = async () => {
  isSyncing.value = true
  try {
    await syncAll()
    await loadCollections()
  } finally {
    isSyncing.value = false
  }
}

onMounted(async () => {
  await loadCollections()
  syncAll()
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

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  user-select: none;
}

.resize-handle:hover {
  background: rgba(0, 0, 0, 0.12);
}

.resizable-table :deep(th) {
  position: relative;
  overflow: visible !important;
}

.description-field :deep(input) {
  color: rgba(0, 0, 0, 0.55) !important;
}

.description-field :deep(input::placeholder) {
  color: rgba(0, 0, 0, 0.25) !important;
}
</style>