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

    <!-- Extra fields for the destination, e.g. a category. -->
    <slot />
  </v-card>
</template>

<script setup lang="ts">
import type { Collection } from '@/database/types'

/** Where bulk-inserted items go: an existing collection or a new one. */
const mode = defineModel<'existing' | 'new'>('mode', { required: true })
const selectedId = defineModel<string | null>('selectedId', { required: true })
const newTitle = defineModel<string>('newTitle', { required: true })

defineProps<{ collections: Collection[] }>()
</script>
