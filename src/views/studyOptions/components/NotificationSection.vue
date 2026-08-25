<template>
  <div>
    <div class="mb-4">
      <label class="text-caption font-weight-bold d-block mb-2">Notifications Collection</label>
      <v-select
        v-model="notificationCollectionId"
        :items="collections"
        item-title="title"
        item-value="id"
        label="Collection for notifications"
        variant="outlined"
        density="comfortable"
        :loading="loadingCollections"
        no-data-text="No collections found"
      />
    </div>

    <div class="d-flex mb-3 time-row">
      <v-select
        v-model="startHour"
        :items="hourOptions"
        item-title="label"
        item-value="value"
        label="Start time"
        variant="outlined"
        density="comfortable"
      />
      <v-select
        v-model="endHour"
        :items="hourOptions"
        item-title="label"
        item-value="value"
        label="End time"
        variant="outlined"
        density="comfortable"
      />
    </div>

    <v-select
      v-model="intervalSeconds"
      :items="intervalOptions"
      item-title="label"
      item-value="value"
      label="Notification interval"
      variant="outlined"
      density="comfortable"
      class="mb-4"
    />
  </div>
</template>

<script setup lang="ts">
import { useCollectionCatalog } from '../composables/useCollectionCatalog'
import {
  useNotificationForm,
  hourOptions,
  intervalOptions,
} from '../composables/useNotificationForm'

const { collections, loadingCollections } = useCollectionCatalog()
const { notificationCollectionId, startHour, endHour, intervalSeconds } = useNotificationForm()
</script>

<style scoped>
.time-row {
  gap: 12px;
}

@media (max-width: 400px) {
  .time-row {
    flex-direction: column !important;
    gap: 0 !important;
  }
}
</style>
