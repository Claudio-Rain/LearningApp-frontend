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
    <!-- With nothing to show, the chart stays mounted (Highcharts needs a
         sized element) but fades behind a short explanation. -->
    <div class="chart-body" :class="{ 'chart-body--empty': emptyText }">
      <slot />
      <div v-if="emptyText" class="chart-empty">
        <v-icon size="28">mdi-chart-box-outline</v-icon>
        <span>{{ emptyText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    fullWidth?: boolean
    /** When set, the chart has no data: this message is shown over it. */
    emptyText?: string
  }>(),
  { subtitle: undefined, fullWidth: false, emptyText: undefined }
)
</script>

<style scoped>
.chart-wrapper {
  background: rgb(var(--v-theme-surface));
  border-radius: 14px;
  padding: 20px 22px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  min-width: 0;
}

.chart-wrapper.full-width {
  grid-column: 1 / -1;
}

h3 {
  margin: 0 0 2px;
  font-size: 18px;
  font-weight: 650;
  color: rgba(var(--v-theme-on-surface), 0.9);
}

.chart-subtitle {
  margin: 0 0 16px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.chart-body {
  position: relative;
}

.chart-body--empty > :not(.chart-empty) {
  opacity: 0.15;
  pointer-events: none;
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  text-align: center;
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
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
