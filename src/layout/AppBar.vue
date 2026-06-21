<template>
  <div>
    <!-- Botón hamburguesa -->
    <v-app-bar flat class="app-bar-gradient" height="60">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-app-bar-title>
        <span class="toolbar-title" style="cursor: pointer;" @click="router.push({ name: 'collections' })">Learning App</span>
      </v-app-bar-title>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer v-model="drawer" :permanent="permanent" width="220" class="nav-drawer">
      <v-list nav class="px-2">
        <v-list-item :to="{ name: 'collections' }" rounded="lg" class="nav-item my-1">
          <template #prepend>
            <v-icon>mdi-book-open-variant</v-icon>
          </template>
          <v-list-item-title>Collections</v-list-item-title>
        </v-list-item>

        <v-list-item
          v-if="lastCollectionId"
          :to="{ name: 'study', params: { id: lastCollectionId } }"
          rounded="lg"
          class="nav-item my-1 study-btn"
          color="primary"
          active-color="primary"
          base-color="primary"
        >
          <template #prepend>
            <v-icon>mdi-play-circle-outline</v-icon>
          </template>
          <v-list-item-title class="font-weight-bold">Study</v-list-item-title>
          <template #append>
            <v-chip size="x-small" color="primary" variant="flat" class="kbd-chip">⏎</v-chip>
          </template>
        </v-list-item>

        <v-list-subheader class="nav-subheader">MANAGE</v-list-subheader>

        <v-list-item :to="{ name: 'studyOptions' }" rounded="lg" class="nav-item my-1">
          <template #prepend>
            <v-icon>mdi-cog-outline</v-icon>
          </template>
          <v-list-item-title>Study Options</v-list-item-title>
        </v-list-item>

        <v-list-item :to="{ name: 'bulkInsert' }" rounded="lg" class="nav-item my-1">
          <template #prepend>
            <v-icon>mdi-import</v-icon>
          </template>
          <v-list-item-title>Bulk Insert</v-list-item-title>
        </v-list-item>

        <v-list-item :to="{ name: 'htmlBulkInsert' }" rounded="lg" class="nav-item my-1">
          <template #prepend>
            <v-icon>mdi-language-html5</v-icon>
          </template>
          <v-list-item-title>HTML Bulk Insert</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter, useRoute } from 'vue-router'
import { getAllAttemptLogs, getCollections, getLearningItems } from '../database'
import { useStudyViewCollection } from '../composables/useStudyViewCollection'

const { mobile } = useDisplay()
const router = useRouter()
const route = useRoute()

const permanent = computed(() => !mobile.value)
const drawer = ref(true)
const { studyViewCollectionId } = useStudyViewCollection()
const lastCollectionId = computed(() => studyViewCollectionId.value ?? fallbackCollectionId.value)
const fallbackCollectionId = ref<string | null>(null)

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Enter') return
  if (!lastCollectionId.value) return
  if (route.name === 'study') return
  const tag = (e.target as HTMLElement).tagName
  const isEditable = (e.target as HTMLElement).isContentEditable
  if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) return
  router.push({ name: 'study', params: { id: lastCollectionId.value } })
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)

  const [logs, collections] = await Promise.all([getAllAttemptLogs(), getCollections()])
  if (collections.length === 0) return

  if (logs.length > 0) {
    const latestLog = logs.reduce((a, b) => (a.created_at > b.created_at ? a : b))
    for (const col of collections) {
      const items = await getLearningItems(col.id!)
      if (items.some(i => i.id === latestLog.learning_item_id)) {
        fallbackCollectionId.value = col.id!
        return
      }
    }
  }

  const random = collections[Math.floor(Math.random() * collections.length)]
  if (random) fallbackCollectionId.value = random.id!
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* App bar */
/* .app-bar-gradient {
  background-color: #0e76a8 !important;
} */

.toolbar-title {
  letter-spacing: 2px;
  font-size: 1rem;
  /* margin-left: 1rem; */
  text-transform: uppercase;
}

/* Drawer */
.nav-drawer {
  border-right: 0px solid rgba(var(--v-border-color), 0.08);
}

.nav-subheader {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 1px;
  opacity: 0.5;
  margin-top: 8px;
}

/* Nav items */
.nav-item {
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.nav-item:hover {
  transform: translateX(3px);
  background: rgba(var(--v-theme-primary), 0.06);
}

.study-btn {
  background: rgba(var(--v-theme-primary), 0.12);
}

.kbd-chip {
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0.85;
}
</style>