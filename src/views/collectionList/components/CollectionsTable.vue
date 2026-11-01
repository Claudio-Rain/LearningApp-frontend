<template>
  <v-data-table
    :headers="headers"
    :items="collections"
    :items-per-page="-1"
    :sort-by="SORT_BY"
    class="rounded-lg resizable-table collections-table"
    hover
    @click:row="(_: Event, { item }: { item: ListedCollection }) => emit('open', item.id!)"
  >
    <template v-for="col in RESIZABLE_COLUMNS" #[`header.${col}`]="{ column }" :key="col">
      <span>{{ column.title }}</span>
      <span class="resize-handle" @mousedown.stop="startResize($event, col)" />
    </template>

    <template #item.starred="{ item }">
      <v-btn
        :icon="item.starred ? 'mdi-star' : 'mdi-star-outline'"
        :color="item.starred ? 'amber-darken-2' : undefined"
        variant="text"
        size="small"
        :title="item.starred ? 'Unstar' : 'Star'"
        @click.stop="emit('update', item, { starred: !item.starred })"
      />
    </template>

    <template #item.title="{ item }">
      <span class="collection-title">{{ item.title }}</span>
    </template>

    <template #item.description="{ item }">
      <v-text-field
        :model-value="item.description ?? ''"
        density="compact"
        variant="plain"
        placeholder="Add description..."
        hide-details
        class="description-field"
        @click.stop
        @change="(e: Event) => emit('update', item, { description: (e.target as HTMLInputElement).value })"
        @keydown.enter.prevent="(e: KeyboardEvent) => (e.target as HTMLInputElement).blur()"
      />
    </template>

    <template #item.categoryId="{ item }">
      <CollectionCategoryMenu
        :current="item.categoryId ? categoryMap.get(item.categoryId) : undefined"
        :categories="categories"
        @assign="categoryId => emit('update', item, { categoryId })"
      />
    </template>

    <template #item.actions="{ item }">
      <div class="action-cell" @click.stop>
        <v-btn icon="mdi-school" variant="text" size="small" title="Study" @click="emit('study', item.id!)" />
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="emit('rename', item)" />
        <v-btn icon="mdi-delete" variant="text" size="small" @click="emit('delete', item.id!)" />
      </div>
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Category, Collection } from '@/database/types'
import type { ListedCollection } from '../filters'
import { useResizableColumns } from '../composables/useResizableColumns'
import CollectionCategoryMenu from './CollectionCategoryMenu.vue'

const props = defineProps<{
  collections: ListedCollection[]
  categories: Category[]
}>()

const emit = defineEmits<{
  open: [id: string]
  study: [id: string]
  rename: [collection: Collection]
  delete: [id: string]
  /** Star, description and category edits, made in place in the row. */
  update: [collection: Collection, changes: Partial<Collection>]
}>()

const SORT_BY = [{ key: 'starred', order: 'desc' as const }, { key: 'title', order: 'asc' as const }]
const RESIZABLE_COLUMNS = ['title', 'description', 'categoryId', 'numberOfItems', 'actions']
const ACTIONS_WIDTH = 124
const STAR_WIDTH = 52

const { widths, startResize } = useResizableColumns({
  title: 180,
  description: 320,
  categoryId: 160,
  numberOfItems: 80,
  actions: 120
})

const headers = computed(() => [
  { title: '', key: 'starred', sortable: true, align: 'center' as const, width: STAR_WIDTH, minWidth: STAR_WIDTH },
  { title: 'Title', key: 'title', sortable: true, width: widths.value.title },
  { title: 'Description', key: 'description', sortable: false, width: widths.value.description },
  { title: 'Category', key: 'categoryId', sortable: false, width: widths.value.categoryId },
  { title: 'Items', key: 'numberOfItems', sortable: true, align: 'center' as const, width: widths.value.numberOfItems },
  { title: '', key: 'actions', sortable: false, align: 'center' as const, width: ACTIONS_WIDTH, minWidth: ACTIONS_WIDTH }
])

const categoryMap = computed(() => new Map(props.categories.map(c => [c.id, c])))
</script>

<style scoped>
.collections-table {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.collections-table :deep(tbody tr) {
  cursor: pointer;
}

.collection-title {
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.action-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  flex-wrap: nowrap;
  gap: 0;
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
  background: rgba(var(--v-theme-on-surface), 0.12);
}

.resizable-table :deep(th) {
  position: relative;
  overflow: visible !important;
}

.description-field :deep(input) {
  color: rgba(var(--v-theme-on-surface), 0.55) !important;
}

.description-field :deep(input::placeholder) {
  color: rgba(var(--v-theme-on-surface), 0.25) !important;
}
</style>
