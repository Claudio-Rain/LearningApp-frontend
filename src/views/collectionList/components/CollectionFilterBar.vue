<template>
  <div class="filter-bar">
    <v-chip-group v-model="selected" mandatory column>
      <v-chip
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
        size="small"
        variant="flat"
        class="filter-chip"
        :style="chipStyle(opt.color, selected === opt.value)"
      >
        {{ opt.label }}
      </v-chip>
    </v-chip-group>
  </div>
</template>

<script setup lang="ts">
import { hexToRgba } from '@/utils/categoryColors'
import type { CollectionFilter, FilterOption } from '../filters'

const selected = defineModel<CollectionFilter>({ required: true })

defineProps<{ options: FilterOption[] }>()

// Light tint of the category color when inactive, solid fill when selected.
// Text stays a uniform neutral color regardless of the category color.
const chipStyle = (color: string, active: boolean) =>
  active
    ? { backgroundColor: color, color: '#fff' }
    : { backgroundColor: hexToRgba(color, 0.14), color: 'rgba(var(--v-theme-on-surface), 0.72)' }
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-chip {
  letter-spacing: 0.01em;
  transition: filter 0.15s ease, transform 0.15s ease;
}

.filter-chip:hover {
  filter: brightness(0.95);
  transform: translateY(-1px);
}
</style>
