<template>
  <v-app>
    <v-main>
      <v-container :fluid="smAndDown" :class="containerClass">
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
html, body, #app {
  width: 100%;
  min-height: 100vh;
  margin: 0;
}

/* Pantalla mediana (md: 960px–1279px) */
@media (min-width: 960px) and (max-width: 1279px) {
  .v-container {
    max-width: 900px;
  }
}

/* Pantalla grande (lg+: 1280px en adelante) */
@media (min-width: 1280px) {
  .v-container {
    max-width: 1200px;
  }
}
</style>