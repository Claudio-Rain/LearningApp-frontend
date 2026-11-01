<template>
  <v-menu @click.stop>
    <template #activator="{ props: activator }">
      <v-chip
        v-if="current"
        :color="current.color"
        variant="tonal"
        size="small"
        class="category-chip"
        v-bind="activator"
        @click.stop
      >
        <v-icon icon="mdi-circle" size="8" :color="current.color" class="mr-1" />
        {{ current.title }}
        <v-icon icon="mdi-menu-down" size="small" end />
      </v-chip>
      <v-chip
        v-else
        variant="text"
        size="small"
        class="category-chip add-category-chip"
        prepend-icon="mdi-plus"
        v-bind="activator"
        @click.stop
      >
        Category
      </v-chip>
    </template>
    <v-list density="compact" min-width="180">
      <v-list-subheader>Assign category</v-list-subheader>
      <v-list-item
        v-for="cat in categories"
        :key="cat.id"
        :active="current?.id === cat.id"
        @click="emit('assign', cat.id ?? null)"
      >
        <template #prepend>
          <v-icon :color="cat.color" icon="mdi-circle" size="x-small" />
        </template>
        <v-list-item-title>{{ cat.title }}</v-list-item-title>
      </v-list-item>
      <v-divider class="my-1" />
      <v-list-item @click="emit('assign', null)">
        <template #prepend>
          <v-icon icon="mdi-close-circle-outline" size="x-small" />
        </template>
        <v-list-item-title>None</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import type { Category } from '@/database/types'

/** The category cell of a collection row: shows its category and reassigns it. */
defineProps<{
  current: Category | undefined
  categories: Category[]
}>()

const emit = defineEmits<{ assign: [categoryId: string | null] }>()
</script>

<style scoped>
.category-chip {
  cursor: pointer;
}

.add-category-chip {
  color: rgba(var(--v-theme-on-surface), 0.4) !important;
}

.add-category-chip:hover {
  color: rgba(var(--v-theme-on-surface), 0.7) !important;
}
</style>
