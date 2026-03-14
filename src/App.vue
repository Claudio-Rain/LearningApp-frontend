<template>
  <v-app>
    <v-main>
      <v-container>
        <AppBar></AppBar>
        <CollectionList/>
        <!-- <LearningItemEditor /> -->
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import AppBar from './layout/AppBar.vue';
import CollectionList from './shared/components/CollectionList.vue';
// import LearningItemList from './shared/components/LearningItemsList.vue';
// import LearningItemEditor from './Views/LearningItemEditor.vue';
</script>

<style></style>
