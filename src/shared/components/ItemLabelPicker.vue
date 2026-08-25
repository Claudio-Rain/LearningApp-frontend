<!-- ItemLabelPicker.vue — one 1-5 item label (priority or difficulty) as a
     compact chip that opens a named-level menu. Generic over the kind: it
     reads its wording, icon and colors from `@/utils/itemLabels`, so a new
     label kind needs no change here. -->
<template>
  <v-menu location="bottom start">
    <template #activator="{ props: menuProps }">
      <button
        v-bind="menuProps"
        type="button"
        class="label-chip"
        :class="{ 'is-unset': !meta }"
        :style="meta ? { color: `rgb(var(--v-theme-${meta.color}))` } : undefined"
        :disabled="disabled"
        :title="def.description"
      >
        <v-icon :icon="def.icon" size="14" />
        <span class="label-text">{{ meta ? `${def.title}: ${meta.label}` : def.unsetLabel }}</span>
        <v-icon icon="mdi-menu-down" size="14" class="label-caret" />
      </button>
    </template>

    <v-list density="compact" min-width="180">
      <v-list-subheader>{{ def.title }}</v-list-subheader>
      <v-list-item
        v-for="level in LABEL_LEVELS"
        :key="level"
        :active="modelValue === level"
        @click="emit('update:modelValue', level)"
      >
        <template #prepend>
          <v-icon
            icon="mdi-circle"
            size="10"
            :style="{ color: `rgb(var(--v-theme-${def.levels[level].color}))` }"
            class="mr-3"
          />
        </template>
        <v-list-item-title>{{ def.levels[level].label }}</v-list-item-title>
        <template #append>
          <span class="level-number">{{ level }}</span>
        </template>
      </v-list-item>

      <v-divider class="my-1" />
      <v-list-item :disabled="modelValue === null" @click="emit('update:modelValue', null)">
        <v-list-item-title class="text-medium-emphasis">Clear</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ITEM_LABEL_DEFS,
  LABEL_LEVELS,
  labelMeta,
  type ItemLabelKind
} from '@/utils/itemLabels'

const props = defineProps<{
  kind: ItemLabelKind
  modelValue: number | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const def = computed(() => ITEM_LABEL_DEFS[props.kind])
const meta = computed(() => labelMeta(props.kind, props.modelValue))
</script>

<style scoped>
/* Quiet until it carries a value: an unlabeled item shouldn't shout at the
   user from under the title, but a labeled one should be scannable. */
.label-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid currentColor;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.6;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: opacity 0.15s ease, background 0.15s ease;
}

.label-chip.is-unset {
  color: rgba(var(--v-theme-on-surface), 0.38);
  border-style: dashed;
}

.label-chip:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.label-chip:disabled {
  opacity: 0.5;
  cursor: default;
}

.label-caret {
  opacity: 0.7;
}

.level-number {
  font-size: 0.7rem;
  color: rgba(var(--v-theme-on-surface), 0.4);
}
</style>
