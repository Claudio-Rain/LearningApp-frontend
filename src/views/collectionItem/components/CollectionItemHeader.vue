<template>
  <div class="panel-header">
    <div class="panel-title">{{ title }}</div>
    <div class="header-buttons">
      <v-btn
        size="small"
        variant="tonal"
        prepend-icon="mdi-sync"
        :loading="isPulling"
        title="Pull latest items from Firebase"
        class="action-btn"
        @click="emit('pull')"
      >
        Pull
      </v-btn>
      <v-btn
        color="primary"
        size="small"
        variant="flat"
        prepend-icon="mdi-plus"
        class="action-btn"
        @click="emit('add')"
      >
        Add
      </v-btn>
      <v-btn
        color="primary"
        size="small"
        variant="tonal"
        prepend-icon="mdi-play-circle-outline"
        class="action-btn"
        @click="emit('study')"
      >
        Study
      </v-btn>
      <v-btn
        color="error"
        size="small"
        variant="tonal"
        :prepend-icon="isClearing ? 'mdi-loading mdi-spin' : 'mdi-history'"
        :disabled="isClearing || !canClear"
        title="Clear your progress so you can study this collection fresh"
        class="action-btn"
        @click="emit('clear-history')"
      >
        {{ clearProgress || 'Start over' }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  isPulling: boolean
  isClearing: boolean
  clearProgress: string
  canClear: boolean
}>()

const emit = defineEmits<{
  pull: []
  add: []
  study: []
  'clear-history': []
}>()
</script>

<style scoped>
.panel-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  flex-shrink: 0;
}

.header-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
}

.action-btn {
  border-radius: 8px !important;
  font-weight: 500 !important;
  letter-spacing: 0.01em !important;
  text-transform: none !important;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}
</style>
