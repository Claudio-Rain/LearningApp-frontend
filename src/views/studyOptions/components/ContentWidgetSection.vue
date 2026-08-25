<template>
  <div class="mb-4">
    <label class="text-caption font-weight-bold d-block mb-2">Content Widget Collections</label>
    <CollectionMultiSelect
      v-model="contentCollectionIds"
      :collections="collections"
      :categories="categories"
      label="Collections for content widget"
      :loading="loading || loadingCollections"
      :disabled="loading"
    />
    <v-alert
      v-if="missingContentCollectionIds.length"
      type="warning"
      density="compact"
      class="mt-2"
    >
      {{ missingContentCollectionIds.length }} previously selected collection(s) no longer exist and were ignored. Please re-select and save.
    </v-alert>
    <label class="text-caption font-weight-bold d-block mt-3 mb-2">Auto-advance interval</label>
    <DurationFields
      v-model:minutes="autoAdvanceMinutes"
      v-model:seconds="autoAdvanceSecondsPart"
      :loading="loading"
      :disabled="loading"
    />
    <p class="text-caption text-medium-emphasis mt-1">
      The widget shows each item for this long before auto-advancing.
      Minimum {{ MIN_AUTO_ADVANCE_SECONDS }} seconds — saving as {{ totalAutoAdvanceSeconds }}s.
    </p>
  </div>
</template>

<script setup lang="ts">
import CollectionMultiSelect from '@/shared/components/CollectionMultiSelect.vue'
import DurationFields from './DurationFields.vue'
import { useCollectionCatalog } from '../composables/useCollectionCatalog'
import {
  useContentWidgetForm,
  MIN_AUTO_ADVANCE_SECONDS,
} from '../composables/useContentWidgetForm'

const { collections, categories, loadingCollections } = useCollectionCatalog()
const {
  contentCollectionIds,
  missingContentCollectionIds,
  loading,
  autoAdvanceMinutes,
  autoAdvanceSecondsPart,
  totalAutoAdvanceSeconds,
} = useContentWidgetForm()
</script>
