<template>
  <div class="study-options pa-4">
    <h2 class="text-h6 mb-4">Study Options</h2>

    <div class="mb-4">
      <label class="text-caption font-weight-bold d-block mb-2">Study View Collection</label>
      <v-select
        v-model="studyViewCollectionId"
        :items="collections"
        item-title="title"
        item-value="id"
        label="Collection displayed in Study View"
        variant="outlined"
        density="comfortable"
        :loading="loadingCollections"
        no-data-text="No collections found"
      />
    </div>

    <div class="mb-4">
      <label class="text-caption font-weight-bold d-block mb-2">Content Widget Collection</label>
      <v-select
        v-model="contentCollectionId"
        :items="collections"
        item-title="title"
        item-value="id"
        label="Collection for content widget"
        variant="outlined"
        density="comfortable"
        :loading="loadingCollections"
        no-data-text="No collections found"
      />
    </div>

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

    <div class="d-flex gap-3 mb-3 time-row">
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

    <v-alert
      v-if="saved"
      type="success"
      density="compact"
      class="mb-3"
      closable
      @click:close="saved = false"
    >
      Settings saved. Background script will use them on next alarm.
    </v-alert>

    <v-btn color="primary" block @click="saveNotificationSettings" :loading="saving">
      Save Settings
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCollections } from '../database'
import { useStudyViewCollection } from '../composables/useStudyViewCollection'

declare const chrome: any

const collections = ref<{ id: string; title: string }[]>([])
const loadingCollections = ref(false)

const { studyViewCollectionId, setStudyViewCollectionId } = useStudyViewCollection()
const contentCollectionId = ref<string | null>(null)
const notificationCollectionId = ref<string | null>(null)
const startHour = ref(9)
const endHour = ref(10)
const intervalSeconds = ref(30)
const saving = ref(false)
const saved = ref(false)

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`
}))

const intervalOptions = [
  { value: 30, label: 'Every 30 seconds' },
  { value: 60, label: 'Every minute' },
  { value: 120, label: 'Every 2 minutes' },
  { value: 300, label: 'Every 5 minutes' },
  { value: 600, label: 'Every 10 minutes' },
]

onMounted(async () => {
  loadingCollections.value = true
  try {
    const raw = await getCollections()
    collections.value = raw.filter((c): c is typeof c & { id: string } => !!c.id)
  } finally {
    loadingCollections.value = false
  }

  if (typeof chrome !== 'undefined' && chrome.storage) {
    const stored = await chrome.storage.local.get([
      'studyViewCollectionId',
      'contentCollectionId',
      'notificationCollectionId',
      'sessionStartHour',
      'sessionEndHour',
      'notificationIntervalSeconds',
    ])
    if (stored.contentCollectionId) contentCollectionId.value = stored.contentCollectionId
    if (stored.notificationCollectionId) notificationCollectionId.value = stored.notificationCollectionId
    if (stored.sessionStartHour != null) startHour.value = stored.sessionStartHour
    if (stored.sessionEndHour != null) endHour.value = stored.sessionEndHour
    if (stored.notificationIntervalSeconds) intervalSeconds.value = stored.notificationIntervalSeconds
  }
})

async function saveNotificationSettings() {
  saving.value = true
  try {
    setStudyViewCollectionId(studyViewCollectionId.value)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({
        contentCollectionId: contentCollectionId.value,
        notificationCollectionId: notificationCollectionId.value,
        sessionStartHour: startHour.value,
        sessionEndHour: endHour.value,
        notificationIntervalSeconds: intervalSeconds.value,
      })
    }
    saved.value = true
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.study-options {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  box-sizing: border-box;
}

@media (max-width: 600px) {
  .study-options {
    padding: 12px !important;
  }
}

.gap-3 {
  gap: 12px;
}

@media (max-width: 400px) {
  .time-row {
    flex-direction: column !important;
    gap: 0 !important;
  }
}
</style>
