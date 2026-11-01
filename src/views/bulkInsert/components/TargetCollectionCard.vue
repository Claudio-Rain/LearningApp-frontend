<template>
  <v-card class="mb-4 pa-4" variant="outlined">
    <div class="text-subtitle-2 mb-3">Target Collection</div>

    <v-radio-group v-model="mode" inline class="mb-3">
      <v-radio label="Existing collection" value="existing" />
      <v-radio label="Create new collection" value="new" />
    </v-radio-group>

    <v-select
      v-if="mode === 'existing'"
      v-model="selectedId"
      :items="collections"
      item-title="title"
      item-value="id"
      label="Select collection"
      variant="outlined"
      density="compact"
      :rules="[v => !!v || 'Select a collection']"
    />
    <v-text-field
      v-else
      v-model="newTitle"
      label="New collection name"
      variant="outlined"
      density="compact"
      :rules="[v => !!v || 'Enter a name']"
    />

    <v-combobox
      v-model="category"
      :items="categories.map(c => c.title)"
      label="Category (optional)"
      variant="outlined"
      density="compact"
      clearable
      hide-details
    />
    <div class="text-caption text-medium-emphasis mt-1">
      Pick an existing category or type a new name — it will be created and assigned to the collection.
    </div>
  </v-card>
</template>

<script setup lang="ts">
import type { Category, Collection } from '@/database/types'

/** Standard mode's destination: an existing collection or a new one, plus an optional category. */
const mode = defineModel<'existing' | 'new'>('mode', { required: true })
const selectedId = defineModel<string | null>('selectedId', { required: true })
const newTitle = defineModel<string>('newTitle', { required: true })
// Free text: an existing category title, a new one to create, or empty for none.
const category = defineModel<string | null>('category', { required: true })

defineProps<{
  collections: Collection[]
  categories: Category[]
}>()
</script>
