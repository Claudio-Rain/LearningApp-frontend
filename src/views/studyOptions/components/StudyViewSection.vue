<template>
  <div class="mb-4">
    <label class="text-caption font-weight-bold d-block mb-2">Study View Collections</label>
    <CollectionMultiSelect
      v-model="selection"
      :collections="collections"
      :categories="categories"
      label="Collections displayed in Study View"
      :loading="loadingCollections"
    />
    <label class="text-caption font-weight-bold d-block mt-3 mb-2">Card timer</label>
    <DurationFields
      v-model:minutes="timerMinutes"
      v-model:seconds="timerSecondsPart"
    />
    <p class="text-caption text-medium-emphasis mt-1">
      Countdown per card in Study View; the card auto-advances when it runs out.
      Minimum {{ MIN_STUDY_TIMER_SECONDS }} seconds — saving as {{ totalTimerSeconds }}s.
    </p>
  </div>
</template>

<script setup lang="ts">
import CollectionMultiSelect from '@/shared/components/CollectionMultiSelect.vue'
import DurationFields from './DurationFields.vue'
import { useCollectionCatalog } from '../composables/useCollectionCatalog'
import { useStudyViewForm } from '../composables/useStudyViewForm'
import { MIN_STUDY_TIMER_SECONDS } from '@/shared/composables/useStudyTimer'

const { collections, categories, loadingCollections } = useCollectionCatalog()
const { selection, timerMinutes, timerSecondsPart, totalTimerSeconds } = useStudyViewForm()
</script>
