<template>
  <div class="collections">
    <div class="page-header">
      <div class="page-heading">
        <h1 class="page-title">Collections</h1>
        <span class="page-count">{{ filtered.length }} of {{ collections.length }}</span>
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
          {{ xs ? 'Add' : 'Add Collection' }}
        </v-btn>
        <!-- On a phone the secondary actions shrink to icons, so the header
             stays one line. -->
        <template v-if="xs">
          <v-btn variant="text" icon="mdi-chart-line" title="Progress" @click="router.push({ name: 'progress' })" />
          <v-btn variant="text" icon="mdi-tag-multiple" title="Categories" @click="categoriesDialog = true" />
          <v-btn variant="text" icon="mdi-refresh" title="Pull" :loading="isSyncing" @click="handlePull" />
        </template>
        <template v-else>
          <v-btn variant="text" prepend-icon="mdi-chart-line" @click="router.push({ name: 'progress' })">
            Progress
          </v-btn>
          <v-btn variant="text" prepend-icon="mdi-tag-multiple" @click="categoriesDialog = true">
            Categories
          </v-btn>
          <v-btn variant="text" prepend-icon="mdi-refresh" :loading="isSyncing" @click="handlePull">
            Pull
          </v-btn>
        </template>
      </div>
    </div>

    <CollectionFilterBar v-model="selectedFilter" :options="filterOptions" :counts="filterCounts" />

    <CollectionsTable
      :collections="filtered"
      :all-collections="collections"
      :categories="categories"
      :progress="tiersByCollection"
      :add-collection-at="addCollectionAt"
      @open="goToCollection"
      @study="goToStudy"
      @rename="handleRename"
      @delete="handleDelete"
      @update="updateCollection"
      @move="moveCollection"
    />

    <CategoriesDialog
      v-model="categoriesDialog"
      :categories="categories"
      :add-category="addCategory"
      :rename-category="renameCategory"
      :delete-category="handleDeleteCategory"
    />

    <CollectionListAssistant
      :collections="assistantCollections"
      :scope="scopeLabel"
      :apply-renames="renameCollections"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useStudyViewCollection } from '@/shared/composables/useStudyViewCollection'
import CollectionListAssistant from '@/shared/components/CollectionListAssistant.vue'
import type { CollectionSummary } from '@/utils/collectionListAssistant'
import type { Collection } from '@/database/types'
import { syncAll } from '@/database'
import { subCollectionsOf } from '@/utils/subCollections'
import CollectionFilterBar from './collectionList/components/CollectionFilterBar.vue'
import CollectionsTable from './collectionList/components/CollectionsTable.vue'
import CategoriesDialog from './collectionList/components/CategoriesDialog.vue'
import { useCollectionList } from './collectionList/composables/useCollectionList'
import { useCollectionFilter } from './collectionList/composables/useCollectionFilter'
import { useCollectionProgress } from './collectionList/composables/useCollectionProgress'

const router = useRouter()
const { xs } = useDisplay()
const { setStudyViewCollectionIds } = useStudyViewCollection()

const {
  collections,
  categories,
  isSyncing,
  loadCollections,
  loadCategories,
  addCollection,
  addCollectionAt,
  updateCollection,
  renameCollections,
  moveCollection,
  deleteCollection,
  addCategory,
  renameCategory,
  deleteCategory,
  pull
} = useCollectionList()

const {
  selected: selectedFilter,
  options: filterOptions,
  counts: filterCounts,
  filtered,
  scopeLabel,
  validate: validateFilter
} = useCollectionFilter(collections, categories)

const { tiersByCollection, loadProgress } = useCollectionProgress()

const categoriesDialog = ref(false)

// The assistant sees the collections the filter shows.
const assistantCollections = computed<CollectionSummary[]>(() => {
  const titles = new Map(categories.value.map(c => [c.id, c.title]))
  return filtered.value.map(c => ({
    id: c.id!,
    title: c.title,
    starred: c.starred,
    categoryTitle: c.categoryId ? titles.get(c.categoryId) : undefined,
    itemCount: c.numberOfItems
  }))
})

// With a category's chip selected, the new collection goes in that category,
// so it shows up in the list being looked at.
const handleAdd = async () => {
  const title = prompt('Collection name?')
  if (!title) return
  const inCategory = categories.value.some(c => c.id === selectedFilter.value)
  await addCollection(title, inCategory ? selectedFilter.value : null)
}

const handlePull = async () => {
  await pull(validateFilter)
  await loadProgress()
}

const handleRename = async (collection: Collection) => {
  const title = prompt('Edit collection name:', collection.title)
  if (title) await updateCollection(collection, { title })
}

// Deleting takes the sub-collections and all their items too, so say how much.
const handleDelete = async (id: string) => {
  const subIds = subCollectionsOf(id, collections.value)
  if (!subIds.length) {
    if (confirm('Are you sure you want to delete this collection?')) await deleteCollection(id)
    return
  }
  const deleted = collections.value.filter(c => c.id === id || subIds.includes(c.id!))
  const itemCount = deleted.reduce((n, c) => n + c.numberOfItems, 0)
  const title = deleted.find(c => c.id === id)?.title
  const subs = `${subIds.length} sub-collection${subIds.length === 1 ? '' : 's'}`
  if (confirm(`Delete "${title}"? This also deletes ${subs} and ${itemCount} learning items.`)) {
    await deleteCollection(id)
  }
}

const handleDeleteCategory = async (id: string) => {
  if (selectedFilter.value === id) selectedFilter.value = 'all'
  await deleteCategory(id)
}

const goToCollection = (id: string) => {
  router.push({ name: 'collectionView', params: { id } })
}

const goToStudy = (id: string) => {
  setStudyViewCollectionIds([id])
  router.push({ name: 'study', params: { id } })
}

onMounted(async () => {
  await loadCategories()
  validateFilter()
  await loadCollections()
  await loadProgress()
  // Study done on another device shows up once the background sync lands.
  syncAll().then(loadProgress)
})
</script>

<style scoped>
.collections {
  padding: 24px;
  /* Room below the table, so the assistant button never covers the last row. */
  padding-bottom: 96px;
  max-width: 1200px;
  margin: 0 auto;
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
  color: rgba(var(--v-theme-on-surface), 0.5);
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

@media (max-width: 599.98px) {
  .collections {
    padding: 12px 8px 88px;
  }

  .page-header {
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .page-title {
    font-size: 1.35rem;
  }

  .add-collection-btn {
    padding-inline: 14px;
  }
}
</style>
