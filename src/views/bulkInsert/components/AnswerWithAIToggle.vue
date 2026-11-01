<template>
  <v-checkbox
    v-model="enabled"
    density="compact"
    hide-details
    class="mb-2"
    label="Answer questions with AI (Claude)"
    prepend-icon="mdi-robot-happy-outline"
  />
  <div v-if="enabled" class="text-caption text-medium-emphasis mb-3">
    After inserting, Claude answers each question one at a time and saves it to the item. This may take a while for
    many items.
  </div>
</template>

<script setup lang="ts">
const enabled = defineModel<boolean>({ required: true })
</script>
