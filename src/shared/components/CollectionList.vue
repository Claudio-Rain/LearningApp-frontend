<template>
  <div class="collections">
    <div class="page-header">
      <div class="page-heading">
        <h1 class="page-title">Collections</h1>
        <span class="page-count">{{ filteredCollections.length }} of {{ collections.length }}</span>
      </div>
      <div class="header-actions">
        <v-btn
          color="primary"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-plus"
          class="add-collection-btn mr-2"
          @click="handleAdd"
        >
          Add Collection
        </v-btn>
        <v-btn variant="text" prepend-icon="mdi-chart-line" @click="goToProgress">
          Progress
        </v-btn>
        <v-btn variant="text" prepend-icon="mdi-tag-multiple" @click="categoriesDialog = true">
          Categories
        </v-btn>
        <v-btn variant="text" prepend-icon="mdi-refresh" :loading="isSyncing" @click="handleRefresh">
          Pull
        </v-btn>
      </div>
    </div>

    <div class="filter-bar">
<v-chip-group v-model="selectedCategoryId" mandatory column>
        <v-chip
          v-for="opt in filterOptions"
          :key="opt.value"
          :value="opt.value"
          size="small"
          variant="flat"
          class="filter-chip"
          :style="chipStyle(opt.color, selectedCategoryId === opt.value)"
        >
          {{ opt.label }}
        </v-chip>
      </v-chip-group>
    </div>

    <v-data-table
      :headers="headers"
      :items="filteredCollections"
      :items-per-page="-1"
      :sort-by="[{ key: 'title', order: 'asc' }]"
      class="rounded-lg resizable-table collections-table"
      hover
      @click:row="(_: Event, { item }: { item: Collection }) => goToCollection(item.id!)"
    >
      <template v-for="col in resizableColumns" #[`header.${col}`]="{ column }" :key="col">
        <span>{{ column.title }}</span>
        <span class="resize-handle" @mousedown.stop="startResize($event, col)" />
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
          @change="(e: Event) => handleDescriptionChange(item, (e.target as HTMLInputElement).value)"
          @keydown.enter.prevent="(e: KeyboardEvent) => (e.target as HTMLInputElement).blur()"
        />
      </template>

      <template #item.categoryId="{ item }">
        <v-menu @click.stop>
          <template #activator="{ props }">
            <v-chip
              v-if="categoryOf(item)"
              :color="categoryOf(item)!.color"
              variant="tonal"
              size="small"
              class="category-chip"
              v-bind="props"
              @click.stop
            >
              <v-icon icon="mdi-circle" size="8" :color="categoryOf(item)!.color" class="mr-1" />
              {{ categoryOf(item)!.title }}
              <v-icon icon="mdi-menu-down" size="small" end />
            </v-chip>
            <v-chip
              v-else
              variant="text"
              size="small"
              class="category-chip add-category-chip"
              prepend-icon="mdi-plus"
              v-bind="props"
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
              :active="categoryOf(item)?.id === cat.id"
              @click="assignCategory(item, cat.id ?? null)"
            >
              <template #prepend>
                <v-icon :color="cat.color" icon="mdi-circle" size="x-small" />
              </template>
              <v-list-item-title>{{ cat.title }}</v-list-item-title>
            </v-list-item>
            <v-divider class="my-1" />
            <v-list-item @click="assignCategory(item, null)">
              <template #prepend>
                <v-icon icon="mdi-close-circle-outline" size="x-small" />
              </template>
              <v-list-item-title>None</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>

      <template #item.actions="{ item }">
        <div class="action-cell" @click.stop>
          <v-btn
            icon="mdi-school"
            variant="text"
            size="small"
            title="Study"
            @click="goToStudy(item.id!)"
          />
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="small"
            @click="handleEdit(item)"
          />
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            @click="handleDelete(item.id!)"
          />
        </div>
      </template>
    </v-data-table>

    <v-dialog v-model="categoriesDialog" max-width="460">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center py-4">
          <v-icon icon="mdi-tag-multiple" class="mr-2" />
          Categories
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="categoriesDialog = false" />
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
              <v-btn icon="mdi-pencil" variant="text" size="x-small" @click="handleEditCategory(cat)" />
              <v-btn icon="mdi-delete" variant="text" size="x-small" @click="handleDeleteCategory(cat.id!)" />
            </div>
          </div>
          <div v-else class="empty-state">
            <v-icon icon="mdi-tag-off-outline" size="32" class="mb-2" />
            <div>No categories yet</div>
          </div>

          <v-divider class="my-4" />

          <div class="text-caption text-medium-emphasis mb-2">New category</div>
          <v-text-field
            v-model="newCategoryTitle"
            placeholder="Category name"
            density="comfortable"
            variant="outlined"
            hide-details
            class="mb-3"
            @keydown.enter="handleAddCategory"
          />
          <div class="swatches">
            <button
              v-for="swatch in colorSwatches"
              :key="swatch"
              type="button"
              class="swatch"
              :class="{ 'swatch--selected': newCategoryColor === swatch }"
              :style="{ backgroundColor: swatch }"
              @click="newCategoryColor = swatch"
            >
              <v-icon v-if="newCategoryColor === swatch" icon="mdi-check" size="14" color="white" />
            </button>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="px-4 py-3">
          <v-spacer />
          <v-btn variant="text" @click="categoriesDialog = false">Close</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!newCategoryTitle.trim()" @click="handleAddCategory">
            Add category
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { formatISO } from 'date-fns'
import { useRouter } from 'vue-router'
import { useStudyViewCollection } from '../../composables/useStudyViewCollection'
import {
  getCollections,
  createCollection,
  editCollection,
  removeCollection,
  syncCollections,
  getCategories,
  createCategory,
  editCategory,
  removeCategory,
  syncCategories,
  syncAll,
} from '../../database'

import type {
  Collection,
  Category
} from '../../database'

const router = useRouter()
const { setStudyViewCollectionIds } = useStudyViewCollection()
const collections = ref<Collection[]>([])
const categories = ref<Category[]>([])
const isSyncing = ref(false)

// Category filter: 'all' | 'none' (uncategorized) | a category id
const selectedCategoryId = ref<string>('all')

const categoriesDialog = ref(false)
const newCategoryTitle = ref('')
const colorSwatches = ['#1976D2', '#388E3C', '#D32F2F', '#F57C00', '#7B1FA2', '#0097A7', '#C2185B', '#5D4037']
const newCategoryColor = ref(colorSwatches[0])

const categoryMap = computed(() => new Map(categories.value.map(c => [c.id, c])))

// Neutral accent colors for the two built-in filter options.
const ALL_COLOR = '#1976D2'
const UNCATEGORIZED_COLOR = '#78909C'

const filterOptions = computed(() => [
  { value: 'all', label: 'All', color: ALL_COLOR },
  { value: 'none', label: 'Uncategorized', color: UNCATEGORIZED_COLOR },
  ...categories.value.map(c => ({ value: c.id!, label: c.title, color: c.color || ALL_COLOR })),
])

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Light tint of the category color when inactive, solid fill when selected.
// Text stays a uniform neutral color regardless of the category color.
function chipStyle(color: string, active: boolean) {
  return active
    ? { backgroundColor: color, color: '#fff' }
    : { backgroundColor: hexToRgba(color, 0.14), color: 'rgba(0, 0, 0, 0.72)' }
}

const filteredCollections = computed(() => {
  if (selectedCategoryId.value === 'all') return collections.value
  if (selectedCategoryId.value === 'none') return collections.value.filter(c => !c.categoryId)
  return collections.value.filter(c => c.categoryId === selectedCategoryId.value)
})

const categoryOf = (collection: Collection) =>
  collection.categoryId ? categoryMap.value.get(collection.categoryId) : undefined

const resizableColumns = ['title', 'description', 'categoryId', 'numberOfItems', 'actions']

const columnWidths = ref<Record<string, number>>({
  title: 180,
  description: 320,
  categoryId: 160,
  numberOfItems: 80,
  actions: 120,
})

const ACTIONS_WIDTH = 124

const headers = computed(() => [
  { title: 'Title', key: 'title', sortable: true, width: columnWidths.value.title },
  { title: 'Description', key: 'description', sortable: false, width: columnWidths.value.description },
  { title: 'Category', key: 'categoryId', sortable: false, width: columnWidths.value.categoryId },
  { title: 'Items', key: 'numberOfItems', sortable: true, align: 'center' as const, width: columnWidths.value.numberOfItems },
  { title: '', key: 'actions', sortable: false, align: 'center' as const, width: ACTIONS_WIDTH, minWidth: ACTIONS_WIDTH },
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

const loadCategories = async () => {
  categories.value = await getCategories()
}

// 🏷️ Assign a collection to a category (or null to clear)
const assignCategory = async (collection: Collection, categoryId: string | null) => {
  await editCollection({
    ...collection,
    categoryId,
    lastModified: formatISO(new Date())
  })
  await syncCollections()
  await loadCollections()
}

// 🏷️ Category management
const handleAddCategory = async () => {
  const title = newCategoryTitle.value.trim()
  if (!title) return

  const now = formatISO(new Date())
  await createCategory({
    title,
    color: newCategoryColor.value,
    parentId: null,
    dateCreated: now,
    lastModified: now
  })
  await syncCategories()
  await loadCategories()

  newCategoryTitle.value = ''
  newCategoryColor.value = colorSwatches[0]
}

const handleEditCategory = async (category: Category) => {
  const newTitle = prompt('Edit category name:', category.title)
  if (!newTitle) return

  await editCategory({
    ...category,
    title: newTitle,
    lastModified: formatISO(new Date())
  })
  await syncCategories()
  await loadCategories()
}

const handleDeleteCategory = async (id: string) => {
  if (!confirm('Delete this category? Collections in it become uncategorized.')) return

  await removeCategory(id)
  if (selectedCategoryId.value === id) selectedCategoryId.value = 'all'
  await syncCategories()
  await loadCategories()
  await loadCollections()
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
  setStudyViewCollectionIds([id])
  router.push({ name: 'study', params: { id } })
}

const goToProgress = () => {
  router.push({ name: 'progress' })
}

const handleRefresh = async () => {
  isSyncing.value = true
  try {
    await syncAll()
    await loadCategories()
    await loadCollections()
  } finally {
    isSyncing.value = false
  }
}

onMounted(async () => {
  await loadCategories()
  await loadCollections()
  syncAll()
})

</script>

<style scoped>
.collections {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.collection-title {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.82);
}

.collections-table :deep(tbody tr) {
  cursor: pointer;
}

.action-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  flex-wrap: nowrap;
  gap: 0;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.page-heading {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
}

.page-count {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.5);
}

.header-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}

.add-collection-btn {
  font-weight: 600;
  letter-spacing: 0.01em;
  text-transform: none;
  padding-inline: 20px;
  transition: transform 0.18s ease;
}

.add-collection-btn:hover {
  transform: translateY(-1px);
}

.add-collection-btn:active {
  transform: translateY(0);
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-chip {
  letter-spacing: 0.01em;
  transition: filter 0.15s ease, transform 0.15s ease;
}

.filter-chip:hover {
  filter: brightness(0.95);
  transform: translateY(-1px);
}

.collections-table {
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.category-chip {
  cursor: pointer;
}

.add-category-chip {
  color: rgba(0, 0, 0, 0.4) !important;
}

.add-category-chip:hover {
  color: rgba(0, 0, 0, 0.7) !important;
}

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
  color: rgba(0, 0, 0, 0.4);
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
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px currentColor;
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