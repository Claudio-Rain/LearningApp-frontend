<template>
  <v-list-item :class="{ 'invalid-item': !valid }">
    <template #prepend>
      <v-icon :color="valid ? 'success' : 'error'" size="small">
        {{ valid ? 'mdi-check-circle' : 'mdi-alert-circle' }}
      </v-icon>
    </template>
    <v-list-item-title class="text-body-2 font-weight-medium">{{ title }}</v-list-item-title>
    <v-list-item-subtitle v-if="subtitle !== undefined" class="text-caption">{{ subtitle }}</v-list-item-subtitle>
  </v-list-item>
</template>

<script setup lang="ts">
/** One parsed item in a bulk-insert preview, marked valid or not. Omit `subtitle` to hide it. */
defineProps<{
  valid: boolean
  title: string
  subtitle?: string
}>()
</script>

<style scoped>
.invalid-item {
  background: rgba(var(--v-theme-error), 0.05);
}
</style>
