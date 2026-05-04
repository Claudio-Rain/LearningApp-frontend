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

        <v-list-item :to="{ name: 'bulkInsert' }" rounded="lg" class="my-1">
          <template #prepend>
            <v-icon>mdi-import</v-icon>
          </template>
          <v-list-item-title>Bulk Insert</v-list-item-title>
        </v-list-item>

        <v-list-item :to="{ name: 'htmlBulkInsert' }" rounded="lg" class="my-1">
          <template #prepend>
            <v-icon>mdi-code-html5</v-icon>
          </template>
          <v-list-item-title>HTML Bulk Insert</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()

// En popup siempre será "mobile", así que forzamos permanent
const permanent = computed(() => !mobile.value)
const drawer = ref(true)
</script>