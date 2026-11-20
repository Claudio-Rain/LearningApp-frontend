<template>
  <div class="filter-bar">
    <!-- Wrapping on a wide screen; on a phone one line that scrolls sideways,
         so a long category list doesn't push the collections off screen. -->
    <v-chip-group v-model="selected" mandatory :column="!xs">
      <template v-for="opt in options" :key="opt.value">
        <span v-if="opt.value === firstCategory" class="filter-divider" aria-hidden="true" />
        <v-chip
          :value="opt.value"
          size="small"
          variant="flat"
          class="filter-chip"
          :class="{ 'filter-chip--active': selected === opt.value }"
        >
          <v-icon v-if="opt.value === 'starred'" icon="mdi-star" size="14" class="filter-icon" :color="opt.color" />
          <span v-else-if="isCategory(opt.value)" class="filter-dot" :style="{ backgroundColor: opt.color }" />
          {{ opt.label }}
          <span v-if="counts[opt.value] != null" class="filter-count">{{ counts[opt.value] }}</span>
        </v-chip>
      </template>
    </v-chip-group>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import type { CollectionFilter, FilterOption } from '../filters'

const { xs } = useDisplay()

const selected = defineModel<CollectionFilter>({ required: true })

const props = defineProps<{
  options: FilterOption[]
  counts: Record<string, number>
}>()

// All / Starred / Uncategorized come first; a divider sets the categories apart.
const BUILT_IN = new Set(['all', 'starred', 'none'])
const isCategory = (value: CollectionFilter) => !BUILT_IN.has(value)
const firstCategory = computed(() => props.options.find(o => isCategory(o.value))?.value)
</script>

<style scoped>
.filter-bar {
  margin-bottom: 16px;
}

.filter-divider {
  align-self: center;
  width: 1px;
  height: 18px;
  margin: 0 6px;
  background: rgba(var(--v-theme-on-surface), 0.16);
}

/* Every chip the same quiet neutral; the category color lives only in the dot. */
.filter-chip {
  background-color: rgba(var(--v-theme-on-surface), 0.06) !important;
  color: rgba(var(--v-theme-on-surface), 0.72) !important;
  border: 1px solid transparent;
  letter-spacing: 0.01em;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.filter-chip:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.1) !important;
}

.filter-chip--active {
  background-color: rgba(var(--v-theme-on-surface), 0.14) !important;
  border-color: rgba(var(--v-theme-on-surface), 0.32);
  color: rgb(var(--v-theme-on-surface)) !important;
}

.filter-dot {
  width: 8px;
  height: 8px;
  margin-right: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.filter-icon {
  margin-right: 5px;
}

.filter-count {
  margin-left: 7px;
  font-size: 0.75em;
  font-variant-numeric: tabular-nums;
  opacity: 0.55;
}
</style>
