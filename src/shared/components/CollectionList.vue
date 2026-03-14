<template>
  <div class="collections">
    <v-list lines="one">
      <v-list-item
        v-for="collection in collections"
        :key="collection.id"
        :title="collection.title"
        :subtitle="formatSubtitle(collection)"
      />
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Collection {
  id: number
  title: string
  lastModified: string
  dateCreated: string
  numberOfItems: number
}

const collections = ref<Collection[]>([
  {
    id: 1,
    title: 'Middle - Language - Asynchrony',
    lastModified: '03-01-2026',
    dateCreated: '03-01-2026',
    numberOfItems: 24
  },
  {
    id: 2,
    title: 'Middle - Language - Concurrency',
    lastModified: '03-01-2026',
    dateCreated: '03-01-2026',
    numberOfItems: 12
  },
  {
    id: 3,
    title: 'Miggle - Language - Delegates and Generic Delegates',
    lastModified: '2026-01-30',
    dateCreated: '2025-11-05',
    numberOfItems: 8
  }
])

const formatSubtitle = (collection: Collection) => {
  return `Created: ${collection.dateCreated} • Last Modified: ${collection.lastModified} • Items: ${collection.numberOfItems}`
}
</script>

<style scoped>
</style>