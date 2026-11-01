<template>
  <v-list-item :class="{ 'invalid-item': !item.valid }">
    <template #prepend>
      <v-icon :color="item.valid ? 'success' : 'error'" size="small">
        {{ item.valid ? 'mdi-check-circle' : 'mdi-alert-circle' }}
      </v-icon>
    </template>
    <v-list-item-title class="text-body-2 font-weight-medium">
      {{ item.question || '(missing question)' }}
    </v-list-item-title>
    <v-list-item-subtitle v-if="showAnswer" class="text-caption">
      {{ item.answer || '(missing answer)' }}
    </v-list-item-subtitle>
  </v-list-item>
</template>

<script setup lang="ts">
import type { ParsedItem } from '../parse'

/** One parsed item in a preview list, marked valid or not. */
withDefaults(defineProps<{ item: ParsedItem; showAnswer?: boolean }>(), { showAnswer: true })
</script>

<style scoped>
.invalid-item {
  background: rgba(var(--v-theme-error), 0.05);
}
</style>
