<template>
  <div class="collections">
    <!-- Add button -->
    <div class="mb-4">
      <v-btn color="primary" @click="handleAdd">
        Add Collection
      </v-btn>
    </div>

    <v-list lines="one">
      <v-list-item
        v-for="collection in collections"
        :key="collection.id"
        :title="collection.title"
        :subtitle="formatSubtitle(collection)"
        @click="goToCollection(collection.id!)"
        class="cursor-pointer"
      >
        <!-- 👉 Actions -->
        <template #append>
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
  addCollection,
  updateCollection,
  deleteCollection,
  type Collection
} from '../../database/idb'

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

  await addCollection({
    title,
    dateCreated: now,
    lastModified: now,
    numberOfItems: 0
  })

  await loadCollections()
}

// ✏️ Edit
const handleEdit = async (collection: Collection) => {
  const newTitle = prompt('Edit collection name:', collection.title)
  if (!newTitle) return

  await updateCollection({
    ...collection,
    title: newTitle,
    lastModified: new Date().toISOString()
  })

  await loadCollections()
}

// 🗑️ Delete
const handleDelete = async (id: number) => {
  const confirmed = confirm('Are you sure you want to delete this collection?')
  if (!confirmed) return

  await deleteCollection(id)
  await loadCollections()
}

// 🔗 Navigate
const goToCollection = (id: number) => {
  router.push({ name: 'collectionView', params: { id } })
}

// 🚀 Init
onMounted(async () => {
  await loadCollections()

  // Seed initial data if DB is empty
  if (collections.value.length === 0) {
    const now = new Date().toISOString()

    await addCollection({
      title: 'Middle - Language - Asynchrony',
      lastModified: now,
      dateCreated: now,
      numberOfItems: 24
    })

    await addCollection({
      title: 'Middle - Language - Concurrency',
      lastModified: now,
      dateCreated: now,
      numberOfItems: 12
    })

    await addCollection({
      title: 'Miggle - Language - Delegates and Generic Delegates',
      lastModified: '2026-01-30',
      dateCreated: '2025-11-05',
      numberOfItems: 8
    })

    await loadCollections()
  }
})

// 📝 Subtitle formatter
const formatSubtitle = (collection: Collection) => {
  return ``
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>