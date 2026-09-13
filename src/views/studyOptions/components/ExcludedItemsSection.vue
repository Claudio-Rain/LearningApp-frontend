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
    <CollectionMultiSelect
      v-model="selectedCollectionIds"
      :collections="collectionOptions"
      :categories="categories"
      label="Filter by collections"
      :loading="loadingCollections"
    />
    <template v-if="selectedCollectionIds.length">
      <v-text-field
        v-model="titleSearch"
        label="Search by title (starts with)"
        variant="outlined"
        density="compact"
        clearable
        hide-details
        prepend-inner-icon="mdi-magnify"
        class="mb-2"
      />
      <!-- Three filters side by side get tight; let them wrap on narrow layouts. -->
      <div class="d-flex flex-wrap ga-2 mb-2">
        <v-select
          v-model="strengthFilter"
          :items="strengthOptions"
          label="Filter by strength"
          prepend-inner-icon="mdi-chart-line"
          variant="outlined"
          density="compact"
          multiple
          chips
          closable-chips
          clearable
          hide-details
        />
        <v-select
          v-model="priorityFilter"
          :items="priorityOptions"
          :label="`Filter by ${ITEM_LABEL_DEFS.priority.title.toLowerCase()}`"
          :prepend-inner-icon="ITEM_LABEL_DEFS.priority.icon"
          variant="outlined"
          density="compact"
          multiple
          chips
          closable-chips
          clearable
          hide-details
        />
        <v-select
          v-model="difficultyFilter"
          :items="difficultyOptions"
          :label="`Filter by ${ITEM_LABEL_DEFS.difficulty.title.toLowerCase()}`"
          :prepend-inner-icon="ITEM_LABEL_DEFS.difficulty.icon"
          variant="outlined"
          density="compact"
          multiple
          chips
          closable-chips
          clearable
          hide-details
        />
      </div>
    </template>
    <div v-if="loadingItems" class="text-caption text-medium-emphasis py-2">
      Loading items…
    </div>
    <div
      v-else-if="selectedCollectionIds.length && items.length === 0"
      class="text-caption text-medium-emphasis py-2"
    >
      No items in the selected collections.
    </div>
    <!--
      The server table, deliberately: it renders `items` in the order given
      instead of sorting them again, so the composable's sort is the only one.
      Header clicks still drive it through `sort-by`.
    -->
    <v-data-table-server
      v-else-if="selectedCollectionIds.length"
      v-model:sort-by="sortBy"
      :headers="headers"
      :items="sortedItems"
      :items-length="sortedItems.length"
      item-value="id"
      density="compact"
      class="exclusion-table"
      :items-per-page="-1"
      hide-default-footer
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
          <td v-for="kind in ITEM_LABEL_KINDS" :key="kind">
            <v-chip
              v-if="labelMeta(kind, item[kind])"
              size="small"
              label
              :color="labelMeta(kind, item[kind])!.color"
              variant="flat"
            >
              {{ labelMeta(kind, item[kind])!.label }}
            </v-chip>
            <span v-else class="text-caption text-disabled">—</span>
          </td>
        </tr>
      </template>
    </v-data-table-server>
    <div v-if="selectedCollectionIds.length" class="text-caption text-medium-emphasis mt-2">
      {{ excludedCount }} excluded / {{ items.length }} total
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import CollectionMultiSelect from '@/shared/components/CollectionMultiSelect.vue'
import { ITEM_LABEL_DEFS, ITEM_LABEL_KINDS, labelMeta } from '@/utils/itemLabels'
import { strengthMeta } from '@/utils/strength'
import { useCollectionCatalog } from '../composables/useCollectionCatalog'
import {
  labelFilterOptions,
  strengthFilterOptions,
  useExclusionTable,
} from '../composables/useExclusionTable'
import { useStudyViewForm } from '../composables/useStudyViewForm'

const { categories, loadingCollections, load: loadCatalog } = useCollectionCatalog()
const { studyViewCollectionIds } = useStudyViewForm()
const {
  selectedCollectionIds,
  collectionOptions,
  items,
  loadingItems,
  titleSearch,
  priorityFilter,
  difficultyFilter,
  strengthFilter,
  sortBy,
  sortedItems,
  excludedItemIds,
  excludedCount,
  isExcluded,
  handleRowClick,
} = useExclusionTable()

const priorityOptions = labelFilterOptions('priority')
const difficultyOptions = labelFilterOptions('difficulty')
const strengthOptions = strengthFilterOptions()

const headers = [
  { title: '', key: 'excluded', sortable: false, width: 56 },
  { title: '#', key: 'rowIndex', sortable: false, width: 48 },
  { title: 'Item', key: 'title' },
  { title: 'Collection', key: 'collectionTitle' },
  { title: 'Strength', key: 'strengthScore' },
  ...ITEM_LABEL_KINDS.map(kind => ({ title: ITEM_LABEL_DEFS[kind].title, key: kind })),
]

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
