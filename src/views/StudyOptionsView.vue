<template>
  <div class="study-options pa-4">
    <h2 class="text-h6 mb-4">Study Options</h2>

    <StudyViewSection />
    <ContentWidgetSection />
    <NotificationSection />

    <v-divider class="my-6" />

    <ExcludedItemsSection />

    <v-divider class="my-6" />

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

    <v-btn color="primary" block :loading="saving" @click="saveSettings">
      Save Settings
    </v-btn>

    <StudySetAssistant />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import StudyViewSection from './studyOptions/components/StudyViewSection.vue'
import ContentWidgetSection from './studyOptions/components/ContentWidgetSection.vue'
import NotificationSection from './studyOptions/components/NotificationSection.vue'
import ExcludedItemsSection from './studyOptions/components/ExcludedItemsSection.vue'
import StudySetAssistant from './studyOptions/components/StudySetAssistant.vue'
import { useCollectionCatalog } from './studyOptions/composables/useCollectionCatalog'
import { useStudyViewForm } from './studyOptions/composables/useStudyViewForm'
import { useContentWidgetForm } from './studyOptions/composables/useContentWidgetForm'
import { useNotificationForm } from './studyOptions/composables/useNotificationForm'
import { useExcludedItems } from '@/shared/composables/useExcludedItems'

// Each section owns its own state via a composable; this shell only sequences
// the initial load and fans the single Save button out across them.
const { collections, load: loadCatalog } = useCollectionCatalog()
const studyView = useStudyViewForm()
const contentWidget = useContentWidgetForm()
const notifications = useNotificationForm()
const { sync: syncExcluded } = useExcludedItems()

const saving = ref(false)
const saved = ref(false)

onMounted(async () => {
  // The catalog comes from the local cache first (fast) so the selectors can
  // resolve their stored ids to titles immediately, instead of briefly showing
  // raw ids while the remote syncs below run.
  await loadCatalog()

  // Then pull fresh copies of the two objects that live in both Firestore and
  // the local DB. The content widget resolves against the catalog's collections,
  // so it has to come after them; its selector stays frozen until this finishes.
  await Promise.all([
    contentWidget.load(collections.value.map(c => c.id)),
    syncExcluded(),
    notifications.load(),
  ])
})

async function saveSettings() {
  saving.value = true
  try {
    studyView.save()
    await notifications.save()
    await contentWidget.save()
    saved.value = true
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.study-options {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  box-sizing: border-box;
}

@media (max-width: 600px) {
  .study-options {
    padding: 12px !important;
  }
}
</style>
