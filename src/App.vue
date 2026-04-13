<template>
  <v-app>
    <v-main>
      <v-container>
        <AppBar />
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import AppBar from './layout/AppBar.vue';
// import LearningItemList from './shared/components/LearningItemsList.vue';
// import LearningItemEditor from './Views/LearningItemEditor.vue';
</script>

<style></style>