<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="groupedItems"
    item-title="title"
    item-value="id"
    :label="label"
    variant="outlined"
    density="comfortable"
    multiple
    chips
    closable-chips
    clearable
    autocomplete="off"
    :custom-filter="collectionFilter"
    :loading="loading"
    :disabled="disabled"
    no-data-text="No collections found"
    @update:model-value="emit('update:modelValue', $event.filter((id: string) => !id.startsWith(GROUP_HEADER_PREFIX)))"
  >
    <template #prepend-item>
      <v-list-item title="Select all" @click="toggleAll">
        <template #prepend>
          <v-checkbox-btn
            :model-value="modelValue.length === collections.length && collections.length > 0"
            :indeterminate="modelValue.length > 0 && modelValue.length < collections.length"
            color="primary"
            readonly
          />
        </template>
      </v-list-item>
      <v-divider />
    </template>
    <template #item="{ item, props: itemProps }">
      <template v-if="item.raw.header">
        <v-list-item
          class="collection-group-header"
          @click="toggleCategory(item.raw.groupKey!)"
        >
          <template #prepend>
            <v-checkbox-btn
              :model-value="categorySelectionState(item.raw.groupKey!) === 'all'"
              :indeterminate="categorySelectionState(item.raw.groupKey!) === 'some'"
              color="primary"
              readonly
            />
          </template>
          <v-list-item-title class="font-weight-bold text-body-2">
            <v-icon
              v-if="item.raw.color"
              icon="mdi-circle"
              size="10"
              :color="item.raw.color"
              class="mr-1"
            />
            {{ item.raw.title }}
            <span class="text-caption text-medium-emphasis">({{ item.raw.count }})</span>
          </v-list-item-title>
        </v-list-item>
      </template>
      <v-list-item v-else v-bind="itemProps" class="collection-group-child" />
    </template>
    <template #chip="{ item, index, props: chipProps }">
      <v-chip v-if="index < 4" v-bind="chipProps" :text="item.title" />
      <span v-else-if="index === 4" class="text-caption text-medium-emphasis align-self-center">
        +{{ modelValue.length - 4 }} more
      </span>
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Category } from '../../database'

const props = withDefaults(defineProps<{
  modelValue: string[]
  collections: { id: string; title: string; categoryId?: string | null }[]
  categories: Category[]
  label: string
  loading?: boolean
  disabled?: boolean
}>(), {
  loading: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

// Header rows are injected into the autocomplete's items with a sentinel id so
// Vuetify never confuses them with real values; the model-value handler strips
// them in case one gets selected via keyboard.
const GROUP_HEADER_PREFIX = '__group:'
const UNCATEGORIZED_KEY = '__uncategorized'

type CollectionGroup = { key: string; title: string; color?: string; items: { id: string; title: string }[] }

const groups = computed<CollectionGroup[]>(() => {
  const byKey = new Map<string, CollectionGroup>()
  for (const col of props.collections) {
    const key = col.categoryId ?? UNCATEGORIZED_KEY
    let group = byKey.get(key)
    if (!group) {
      const cat = key === UNCATEGORIZED_KEY ? undefined : props.categories.find(c => c.id === key)
      group = { key, title: cat?.title ?? 'Uncategorized', color: cat?.color, items: [] }
      byKey.set(key, group)
    }
    group.items.push({ id: col.id, title: col.title })
  }
  // Categories alphabetically, uncategorized last. Items keep the collections'
  // global alphabetical order.
  return [...byKey.values()].sort((a, b) => {
    if (a.key === UNCATEGORIZED_KEY) return 1
    if (b.key === UNCATEGORIZED_KEY) return -1
    return a.title.localeCompare(b.title)
  })
})

type GroupedItem = { id: string; title: string; header?: boolean; groupKey?: string; color?: string; count?: number }

const groupedItems = computed<GroupedItem[]>(() => {
  // With a single group (or no categories at all) headers are pure noise.
  if (groups.value.length <= 1) return groups.value[0]?.items ?? []
  return groups.value.flatMap(g => [
    { id: `${GROUP_HEADER_PREFIX}${g.key}`, title: g.title, header: true, groupKey: g.key, color: g.color, count: g.items.length },
    ...g.items,
  ])
})

// Keep a group header visible while any of its collections still matches the query.
function collectionFilter(value: string, query: string, item?: { raw?: GroupedItem }) {
  const q = query.toLowerCase()
  const raw = item?.raw
  if (raw?.header) {
    const group = groups.value.find(g => g.key === raw.groupKey)
    return raw.title.toLowerCase().includes(q) || !!group?.items.some(i => i.title.toLowerCase().includes(q))
  }
  return String(value).toLowerCase().includes(q)
}

function categorySelectionState(groupKey: string): 'all' | 'some' | 'none' {
  const group = groups.value.find(g => g.key === groupKey)
  if (!group || !group.items.length) return 'none'
  const selected = new Set(props.modelValue)
  const count = group.items.filter(i => selected.has(i.id)).length
  return count === group.items.length ? 'all' : count > 0 ? 'some' : 'none'
}

function toggleCategory(groupKey: string) {
  const group = groups.value.find(g => g.key === groupKey)
  if (!group) return
  const selected = new Set(props.modelValue)
  if (categorySelectionState(groupKey) === 'all') {
    group.items.forEach(i => selected.delete(i.id))
  } else {
    group.items.forEach(i => selected.add(i.id))
  }
  emit('update:modelValue', [...selected])
}

function toggleAll() {
  emit('update:modelValue', props.modelValue.length === props.collections.length
    ? []
    : props.collections.map(c => c.id))
}
</script>

<style scoped>
.collection-group-header {
  min-height: 36px;
}

.collection-group-child {
  padding-inline-start: 32px !important;
}
</style>
