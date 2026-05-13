<template>
  <v-app>
    <v-main>
      <v-container fluid :class="containerClass">
        <AppBar />
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import AppBar from './layout/AppBar.vue';

const { smAndDown, mdAndUp } = useDisplay();

const containerClass = computed(() => ({
  'px-4': smAndDown.value,
  'px-8': mdAndUp.value,
}));
</script>

<style>
/* Chrome extension popups size to the document. Without explicit
   dimensions the popup collapses to a cramped default. Chrome caps
   popups at 800x600 — pick a comfortable size within that. */
html,
body,
#app {
  margin: 0;
  min-width: 420px;
  min-height: 600px;
}

/* When opened as a Chrome extension popup, Chrome sizes the window to
   the body. Force a comfortable popup footprint only in that case by
   detecting the small initial viewport. In a real browser tab the
   viewport is large, so we let the layout fill the available space. */
@media (max-width: 800px) {
  html,
  body,
  #app {
    width: 420px;
    overflow-x: hidden;
  }
}

.v-application,
.v-application__wrap {
  min-height: 600px;
}
</style>