<template>
  <div>
    <!-- Botón hamburguesa -->
    <v-app-bar flat>
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-app-bar-title>Learning App</v-app-bar-title>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer v-model="drawer" :permanent="permanent" width="180" class="pa-4">
      <v-list nav>
        <v-list-item :to="{ name: 'collections' }" rounded="lg" class="my-1">
          <template #prepend>
            <v-icon>mdi-book-open-variant</v-icon>
          </template>
          <v-list-item-title>Collections</v-list-item-title>
        </v-list-item>

        <v-list-item
          v-if="lastCollectionId"
          :to="{ name: 'study', params: { id: lastCollectionId } }"
          rounded="lg"
          class="my-1 study-btn"
          color="primary"
          active-color="primary"
          base-color="primary"
        >
          <template #prepend>
            <v-icon>mdi-play-circle-outline</v-icon>
          </template>
          <v-list-item-title class="font-weight-bold">Study</v-list-item-title>
        </v-list-item>

        <v-list-item :to="{ name: 'studyOptions' }" rounded="lg" class="my-1">
          <template #prepend>
            <v-icon>mdi-cog-outline</v-icon>
          </template>
          <v-list-item-title>Study Options</v-list-item-title>
        </v-list-item>

        <v-list-item :to="{ name: 'bulkInsert' }" rounded="lg" class="my-1">
          <template #prepend>
            <v-icon>mdi-import</v-icon>
          </template>
          <v-list-item-title>Bulk Insert</v-list-item-title>
        </v-list-item>

        <v-list-item :to="{ name: 'htmlBulkInsert' }" rounded="lg" class="my-1">
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

const { mobile } = useDisplay()
const router = useRouter()
const route = useRoute()

const permanent = computed(() => !mobile.value)
const drawer = ref(true)
const lastCollectionId = ref<string | null>(null)

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
        lastCollectionId.value = col.id!
        return
      }
    }
  }

  const random = collections[Math.floor(Math.random() * collections.length)]
  if (random) lastCollectionId.value = random.id!
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.study-btn {
  background: rgba(var(--v-theme-primary), 0.12);
}
</style>