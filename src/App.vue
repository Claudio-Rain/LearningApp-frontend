<template>
  <v-app>
    <v-main>
      <v-container fluid class="pa-0">
        <AppBar />
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import AppBar from './layout/AppBar.vue';
</script>

<style>
/* Chrome extension popups size to the document. Without explicit
   dimensions the popup collapses to a cramped default. Chrome caps
   popups at 800x600 — pick a comfortable size within that.
   Only in the popup itself (main.ts sets the class): anywhere else —
   a phone, an extension tab — they made the page wider than the screen. */
html,
body,
#app {
  margin: 0;
}

html.extension-popup,
html.extension-popup body,
html.extension-popup #app {
  min-width: 420px;
  min-height: 600px;
}

/* When opened as a Chrome extension popup, Chrome sizes the window to
   the body. Force a comfortable popup footprint only in that case by
   detecting the small initial viewport. In a real browser tab the
   viewport is large, so we let the layout fill the available space. */
@media (max-width: 400px) {
  html.extension-popup,
  html.extension-popup body,
  html.extension-popup #app {
    width: 420px;
    overflow-x: hidden;
  }
}

html.extension-popup .v-application,
html.extension-popup .v-application__wrap {
  min-height: 600px;
}
</style>