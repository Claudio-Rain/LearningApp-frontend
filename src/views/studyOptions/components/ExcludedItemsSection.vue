<template>
  <div class="exclusion-section">
    <div class="d-flex align-center mb-1">
      <span class="text-subtitle-2 font-weight-bold">Excluded Items</span>
      <v-chip
        v-if="excludedItemIds.size > 0"
        size="x-small"
        color="error"
        class="ml-2"
      >{{ excludedItemIds.size }}</v-chip>
    </div>
    <p class="text-caption text-medium-emphasis mb-3">
      Items checked here are hidden from Study View, content widget, and notifications.
      Click a row to toggle it; shift-click to toggle a range.
    </p>
    <v-select
      v-model="selectedCollectionIds"
      :items="collectionOptions"
      item-title="title"
      item-value="id"
      label="Filter by collections"
      variant="outlined"
      density="comfortable"
      multiple
      chips
      closable-chips
      :loading="loadingCollections"
      no-data-text="No collections found"
    >
      <template #prepend-item>
        <v-list-item title="Select all" @click="selectAllCollections">
          <template #prepend>
            <v-checkbox-btn
              :model-value="allCollectionsSelected"
              :indeterminate="someCollectionsSelected"
              color="primary"
              readonly
            />
          </template>
        </v-list-item>
        <v-divider />
      </template>
    </v-select>
    <v-text-field
      v-if="selectedCollectionIds.length"
      v-model="titleSearch"
      label="Search by title (starts with)"
      variant="outlined"
      density="compact"
      clearable
      hide-details
      prepend-inner-icon="mdi-magnify"
      class="mb-2"
    />
    <div v-if="loadingItems" class="text-caption text-medium-emphasis py-2">
      Loading items…
    </div>
    <div
      v-else-if="selectedCollectionIds.length && items.length === 0"
      class="text-caption text-medium-emphasis py-2"
    >
      No items in the selected collections.
    </div>
    <v-data-table
      v-else-if="selectedCollectionIds.length"
      v-model:sort-by="sortBy"
      :headers="headers"
      :items="sortedItems"
      item-value="id"
      density="compact"
      class="exclusion-table"
      :items-per-page="-1"
      hide-default-footer
      multi-sort
    >
      <template #item="{ item, index }">
        <tr
          class="exclusion-row"
          :class="{ 'is-excluded': isExcluded(item.id!) }"
          @click="(e) => handleRowClick(item, e)"
        >
          <td class="exclusion-check-col">
            <v-checkbox
              :model-value="isExcluded(item.id!)"
              density="compact"
              hide-details
              color="error"
              readonly
              tabindex="-1"
            />
          </td>
          <td class="text-caption text-medium-emphasis">{{ index + 1 }}</td>
          <td>
            <router-link
              :to="{ name: 'collectionItemView', params: { id: item.collectionId, itemId: item.id } }"
              class="item-link"
              target="_blank"
              @click.stop
            >{{ item.title }}</router-link>
          </td>
          <td class="text-caption text-medium-emphasis">{{ item.collectionTitle }}</td>
          <td>
            <v-chip
              size="small"
              label
              :color="strengthMeta(item.strengthScore).scale"
              variant="flat"
            >
              {{ strengthMeta(item.strengthScore).label }}
            </v-chip>
          </td>
        </tr>
      </template>
    </v-data-table>
    <div v-if="selectedCollectionIds.length" class="text-caption text-medium-emphasis mt-2">
      {{ excludedCount }} excluded / {{ items.length }} total
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { strengthMeta } from '@/utils/strength'
import { useCollectionCatalog } from '../composables/useCollectionCatalog'
import { useExclusionTable } from '../composables/useExclusionTable'
import { useStudyViewForm } from '../composables/useStudyViewForm'

const { loadingCollections, load: loadCatalog } = useCollectionCatalog()
const { studyViewCollectionIds } = useStudyViewForm()
const {
  selectedCollectionIds,
  collectionOptions,
  items,
  loadingItems,
  titleSearch,
  sortBy,
  sortedItems,
  excludedItemIds,
  excludedCount,
  isExcluded,
  handleRowClick,
} = useExclusionTable()

const headers = [
  { title: '', key: 'excluded', sortable: false, width: 56 },
  { title: '#', key: 'rowIndex', sortable: false, width: 48 },
  { title: 'Item', key: 'title' },
  { title: 'Collection', key: 'collectionTitle' },
  { title: 'Strength', key: 'strengthScore' },
] as const

const allCollectionsSelected = computed(
  () => selectedCollectionIds.value.length === collectionOptions.value.length
)
const someCollectionsSelected = computed(
  () => selectedCollectionIds.value.length > 0 && !allCollectionsSelected.value
)

function selectAllCollections() {
  selectedCollectionIds.value = collectionOptions.value.map(c => c.id)
}

onMounted(async () => {
  // Wait for the shared data load (deduped with the shell's) so items resolve
  // their strength scores, then start the filter off at whatever Study View is
  // currently set to.
  await loadCatalog()
  if (studyViewCollectionIds.value.length) {
    selectedCollectionIds.value = [...studyViewCollectionIds.value]
  }
})
</script>

<style scoped>
.exclusion-table {
  width: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
}

.exclusion-row {
  cursor: pointer;
  user-select: none;
}

.exclusion-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.exclusion-row.is-excluded {
  background: rgba(var(--v-theme-error), 0.06);
}

.exclusion-check-col {
  width: 56px;
}

.item-link {
  color: inherit;
  text-decoration: none;
  font-size: 1rem;
}

.item-link:hover {
  text-decoration: underline;
}
</style>
