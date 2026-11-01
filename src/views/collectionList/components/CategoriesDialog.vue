<template>
  <v-dialog v-model="open" max-width="460">
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center py-4">
        <v-icon icon="mdi-tag-multiple" class="mr-2" />
        Categories
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="open = false" />
      </v-card-title>
      <v-divider />

      <v-card-text class="py-4">
        <div v-if="categories.length" class="category-rows">
          <div v-for="cat in categories" :key="cat.id" class="category-row">
            <v-chip :color="cat.color" variant="tonal" size="small" label>
              <v-icon icon="mdi-circle" size="8" :color="cat.color" class="mr-1" />
              {{ cat.title }}
            </v-chip>
            <v-spacer />
            <v-btn icon="mdi-pencil" variant="text" size="x-small" @click="rename(cat)" />
            <v-btn icon="mdi-delete" variant="text" size="x-small" @click="remove(cat.id!)" />
          </div>
        </div>
        <div v-else class="empty-state">
          <v-icon icon="mdi-tag-off-outline" size="32" class="mb-2" />
          <div>No categories yet</div>
        </div>

        <v-divider class="my-4" />

        <div class="text-caption text-medium-emphasis mb-2">New category</div>
        <v-text-field
          v-model="newTitle"
          placeholder="Category name"
          density="comfortable"
          variant="outlined"
          hide-details
          class="mb-3"
          @keydown.enter="add"
        />
        <div class="swatches">
          <button
            v-for="swatch in CATEGORY_SWATCHES"
            :key="swatch"
            type="button"
            class="swatch"
            :class="{ 'swatch--selected': newColor === swatch }"
            :style="{ backgroundColor: swatch }"
            @click="newColor = swatch"
          >
            <v-icon v-if="newColor === swatch" icon="mdi-check" size="14" color="white" />
          </button>
        </div>
      </v-card-text>

      <v-divider />
      <v-card-actions class="px-4 py-3">
        <v-spacer />
        <v-btn variant="text" @click="open = false">Close</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!newTitle.trim()" @click="add">Add category</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Category } from '@/database/types'
import { CATEGORY_SWATCHES, DEFAULT_CATEGORY_COLOR } from '@/utils/categoryColors'

const open = defineModel<boolean>({ required: true })

const props = defineProps<{
  categories: Category[]
  addCategory: (title: string, color: string) => Promise<void>
  renameCategory: (category: Category, title: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
}>()

const newTitle = ref('')
const newColor = ref(DEFAULT_CATEGORY_COLOR)

const add = async () => {
  const title = newTitle.value.trim()
  if (!title) return
  await props.addCategory(title, newColor.value)
  newTitle.value = ''
  newColor.value = DEFAULT_CATEGORY_COLOR
}

const rename = async (category: Category) => {
  const title = prompt('Edit category name:', category.title)
  if (title) await props.renameCategory(category, title)
}

const remove = async (id: string) => {
  if (confirm('Delete this category? Collections in it become uncategorized.')) await props.deleteCategory(id)
}
</script>

<style scoped>
.category-rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.empty-state {
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.4);
  padding: 24px 0;
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  padding: 0;
}

.swatch:hover {
  transform: scale(1.1);
}

.swatch--selected {
  box-shadow: 0 0 0 2px rgb(var(--v-theme-surface)), 0 0 0 4px currentColor;
}
</style>
