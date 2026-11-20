<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="groupedItems"
    item-title="title"
    item-value="id"
    :label="label"
    variant="outlined"
    :density="density"
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
      <!-- Indented under its parent. Inside a chosen collection it shows as
           included (it's studied/counted with it) without being chosen itself. -->
      <v-list-item
        v-else
        v-bind="itemProps"
        :title="undefined"
        class="collection-group-child"
        :style="{ paddingInlineStart: `${16 + item.raw.depth! * 20 + (grouped ? 16 : 0)}px` }"
      >
        <template #prepend>
          <v-checkbox-btn
            :model-value="selectedSet.has(item.raw.id) || includedViaParent(item.raw.id)"
            :class="{ 'included-via-parent': !selectedSet.has(item.raw.id) && includedViaParent(item.raw.id) }"
            color="primary"
            readonly
          />
        </template>
        <v-list-item-title :class="{ 'font-weight-medium': item.raw.depth === 0 }">{{ item.raw.title }}</v-list-item-title>
      </v-list-item>
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
import { parentsOf } from '@/utils/subCollections'

type PickableCollection = {
  id: string
  title: string
  categoryId?: string | null
  parentId?: string | null
  order?: number
}

const props = withDefaults(defineProps<{
  modelValue: string[]
  collections: PickableCollection[]
  categories: Category[]
  label: string
  loading?: boolean
  disabled?: boolean
  density?: 'default' | 'comfortable' | 'compact'
}>(), {
  loading: false,
  disabled: false,
  density: 'comfortable',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

// Header rows are injected into the autocomplete's items with a sentinel id so
// Vuetify never confuses them with real values; the model-value handler strips
// them in case one gets selected via keyboard.
const GROUP_HEADER_PREFIX = '__group:'
const UNCATEGORIZED_KEY = '__uncategorized'

type TreeItem = { id: string; title: string; depth: number }
// `top` is the group's top-level collections: what its header checkbox picks
// (choosing a collection already includes everything inside it).
type CollectionGroup = { key: string; title: string; color?: string; items: TreeItem[]; top: string[] }

const parents = computed(() => parentsOf(props.collections))

// Same order as the collections list: the dragged order, then by title.
const byOrder = (a: PickableCollection, b: PickableCollection) =>
  (a.order ?? Infinity) - (b.order ?? Infinity) || a.title.localeCompare(b.title)

/**
 * Collections as a tree, grouped by category. A sub-collection has no
 * category of its own — it belongs to its top-level collection's — so it is
 * listed under that collection, indented, instead of falling into
 * "Uncategorized".
 */
const groups = computed<CollectionGroup[]>(() => {
  const children = new Map<string | undefined, PickableCollection[]>()
  for (const col of props.collections) {
    const parent = parents.value.get(col.id)
    children.set(parent, [...(children.get(parent) ?? []), col])
  }

  const byKey = new Map<string, CollectionGroup>()
  for (const top of (children.get(undefined) ?? []).sort(byOrder)) {
    const key = top.categoryId ?? UNCATEGORIZED_KEY
    let group = byKey.get(key)
    if (!group) {
      const cat = key === UNCATEGORIZED_KEY ? undefined : props.categories.find(c => c.id === key)
      group = { key, title: cat?.title ?? 'Uncategorized', color: cat?.color, items: [], top: [] }
      byKey.set(key, group)
    }
    group.top.push(top.id)
    const place = (col: PickableCollection, depth: number) => {
      group!.items.push({ id: col.id, title: col.title, depth })
      ;(children.get(col.id) ?? []).sort(byOrder).forEach(sub => place(sub, depth + 1))
    }
    place(top, 0)
  }

  // Categories alphabetically, uncategorized last.
  return [...byKey.values()].sort((a, b) => {
    if (a.key === UNCATEGORIZED_KEY) return 1
    if (b.key === UNCATEGORIZED_KEY) return -1
    return a.title.localeCompare(b.title)
  })
})

type GroupedItem = {
  id: string
  title: string
  depth?: number
  header?: boolean
  groupKey?: string
  color?: string
  count?: number
}

// With a single group (or no categories at all) headers are pure noise.
const grouped = computed(() => groups.value.length > 1)

const groupedItems = computed<GroupedItem[]>(() => {
  if (!grouped.value) return groups.value[0]?.items ?? []
  return groups.value.flatMap(g => [
    { id: `${GROUP_HEADER_PREFIX}${g.key}`, title: g.title, header: true, groupKey: g.key, color: g.color, count: g.top.length },
    ...g.items,
  ])
})

const selectedSet = computed(() => new Set(props.modelValue))

/** Inside a chosen collection (at any depth), so already included with it. */
function includedViaParent(id: string): boolean {
  const seen = new Set([id])
  for (let p = parents.value.get(id); p && !seen.has(p); p = parents.value.get(p)) {
    if (selectedSet.value.has(p)) return true
    seen.add(p)
  }
  return false
}

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

// A category is fully chosen when all its top-level collections are (which
// brings everything inside them along); partly when anything in it is.
function categorySelectionState(groupKey: string): 'all' | 'some' | 'none' {
  const group = groups.value.find(g => g.key === groupKey)
  if (!group || !group.top.length) return 'none'
  if (group.top.every(id => selectedSet.value.has(id))) return 'all'
  return group.items.some(i => selectedSet.value.has(i.id)) ? 'some' : 'none'
}

// Picks or drops the whole category. Picking chooses its top-level collections
// and drops any sub-collections chosen on their own, since those are now
// included anyway.
function toggleCategory(groupKey: string) {
  const group = groups.value.find(g => g.key === groupKey)
  if (!group) return
  const selected = new Set(props.modelValue)
  group.items.forEach(i => selected.delete(i.id))
  if (categorySelectionState(groupKey) !== 'all') group.top.forEach(id => selected.add(id))
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

.collection-group-child :deep(.v-list-item__prepend > .v-list-item__spacer) {
  width: 8px;
}

/* Ticked because a parent is chosen, not chosen itself: shown fainter. */
.included-via-parent {
  opacity: 0.45;
}
</style>
