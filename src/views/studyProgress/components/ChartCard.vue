<template>
  <div class="chart-wrapper" :class="{ 'full-width': fullWidth }">
    <!-- With actions the heading and the controls share a row; without, the
         heading keeps the simpler stacked layout. -->
    <div v-if="$slots.actions" class="chart-header-row">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="subtitle" class="chart-subtitle">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </div>
    <template v-else>
      <h3>{{ title }}</h3>
      <p v-if="subtitle" class="chart-subtitle">{{ subtitle }}</p>
    </template>
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    fullWidth?: boolean
  }>(),
  { subtitle: undefined, fullWidth: false }
)
</script>

<style scoped>
.chart-wrapper {
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.chart-wrapper.full-width {
  grid-column: 1 / -1;
}

h3 {
  margin: 0 0 4px;
  font-size: 1.1rem;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.chart-subtitle {
  margin: 0 0 16px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.chart-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
</style>
