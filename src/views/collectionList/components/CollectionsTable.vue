<template>
  <div class="collections-table-wrap">
    <!-- Floats over the filter bar so showing it doesn't shift the rows mid-drag. -->
    <div
      v-if="draggedIsSub"
      class="top-level-drop rounded-lg"
      :class="{ 'top-level-drop--over': overId === TOP_LEVEL }"
      @dragover="onDragover($event, TOP_LEVEL)"
      @dragleave="onDragleave($event, TOP_LEVEL)"
      @drop="onDrop($event, TOP_LEVEL)"
    >
      <v-icon icon="mdi-arrow-collapse-up" size="small" class="mr-2" />
      Move to top level
    </div>

    <v-data-table
      :headers="headers"
      :items="rows"
      :items-per-page="-1"
      :row-props="rowProps"
      class="rounded-lg resizable-table collections-table"
      hover
      @click:row="(_: Event, { item }: { item: CollectionRow }) => emit('open', item.id!)"
    >
      <template v-for="col in RESIZABLE_COLUMNS" #[`header.${col}`]="{ column }" :key="col">
        <span>{{ column.title }}</span>
        <span class="resize-handle" @mousedown.stop="startResize($event, col)" />
      </template>

      <template #item.starred="{ item }">
        <v-btn
          :icon="item.starred ? 'mdi-star' : 'mdi-star-outline'"
          :color="item.starred ? 'amber-darken-2' : undefined"
          variant="text"
          size="small"
          :title="item.starred ? 'Unstar' : 'Star'"
          @click.stop="emit('update', stored(item), { starred: !item.starred })"
        />
      </template>

      <template #item.title="{ item }">
        <div class="title-cell" :style="{ paddingLeft: `${item.depth * INDENT}px` }">
          <v-btn
            v-if="item.childCount"
            :icon="collapsed.has(item.id!) ? 'mdi-chevron-right' : 'mdi-chevron-down'"
            variant="text"
            size="x-small"
            density="comfortable"
            :title="collapsed.has(item.id!) ? 'Expand' : 'Collapse'"
            @click.stop="toggleCollapsed(item.id!)"
          />
          <span v-else class="expander-spacer" />
          <span class="collection-title">{{ item.label }}</span>
        </div>
      </template>

      <template #item.description="{ item }">
        <v-text-field
          :model-value="item.description ?? ''"
          density="compact"
          variant="plain"
          placeholder="Add description..."
          hide-details
          class="description-field"
          @click.stop
          @change="(e: Event) => emit('update', stored(item), { description: (e.target as HTMLInputElement).value })"
          @keydown.enter.prevent="(e: KeyboardEvent) => (e.target as HTMLInputElement).blur()"
        />
      </template>

      <!-- Categories only apply to top-level collections. -->
      <template #item.categoryId="{ item }">
        <CollectionCategoryMenu
          v-if="!item.isSub"
          :current="item.categoryId ? categoryMap.get(item.categoryId) : undefined"
          :categories="categories"
          @assign="categoryId => emit('update', stored(item), { categoryId })"
        />
      </template>

      <template #item.numberOfItems="{ item }">
        <span :title="itemsTitle(item)">
          {{ item.numberOfItems }}
          <span v-if="item.totalItems !== item.numberOfItems" class="total-items">/ {{ item.totalItems }}</span>
        </span>
      </template>

      <template #item.actions="{ item }">
        <div class="action-cell" @click.stop>
          <v-btn icon="mdi-school" variant="text" size="small" title="Study" @click="emit('study', item.id!)" />
          <v-btn icon="mdi-pencil" variant="text" size="small" @click="emit('rename', stored(item))" />
          <v-btn icon="mdi-delete" variant="text" size="small" @click="emit('delete', item.id!)" />
        </div>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Category, Collection } from '@/database/types'
import { canMoveInto, parentsOf } from '@/utils/subCollections'
import { collectionRows, type CollectionRow, type ListedCollection } from '../filters'
import { useResizableColumns } from '../composables/useResizableColumns'
import CollectionCategoryMenu from './CollectionCategoryMenu.vue'

const props = defineProps<{
  /** The collections the filter shows. */
  collections: ListedCollection[]
  /** Every collection, to place the shown ones in the tree and check moves. */
  allCollections: Collection[]
  categories: Category[]
}>()

const emit = defineEmits<{
  open: [id: string]
  study: [id: string]
  rename: [collection: Collection]
  delete: [id: string]
  /** Star, description and category edits, made in place in the row. */
  update: [collection: Collection, changes: Partial<Collection>]
  /** A collection dropped into another one, or back to the top level (null). */
  move: [id: string, parentId: string | null]
}>()

const INDENT = 20
const RESIZABLE_COLUMNS = ['title', 'description', 'categoryId', 'numberOfItems', 'actions']
const ACTIONS_WIDTH = 124
const STAR_WIDTH = 52

const { widths, startResize } = useResizableColumns({
  title: 180,
  description: 320,
  categoryId: 160,
  numberOfItems: 80,
  actions: 120
})

// Rows come in tree order (starred first, then title, within each level), so
// the table itself doesn't sort.
const headers = computed(() => [
  { title: '', key: 'starred', sortable: false, align: 'center' as const, width: STAR_WIDTH, minWidth: STAR_WIDTH },
  { title: 'Title', key: 'title', sortable: false, width: widths.value.title },
  { title: 'Description', key: 'description', sortable: false, width: widths.value.description },
  { title: 'Category', key: 'categoryId', sortable: false, width: widths.value.categoryId },
  { title: 'Items', key: 'numberOfItems', sortable: false, align: 'center' as const, width: widths.value.numberOfItems },
  { title: '', key: 'actions', sortable: false, align: 'center' as const, width: ACTIONS_WIDTH, minWidth: ACTIONS_WIDTH }
])

const categoryMap = computed(() => new Map(props.categories.map(c => [c.id, c])))

// The collection as stored, so edits never save the row's tree fields.
const stored = (row: CollectionRow): Collection => props.allCollections.find(c => c.id === row.id) ?? row

const itemsTitle = (row: CollectionRow) =>
  row.totalItems === row.numberOfItems
    ? undefined
    : `${row.numberOfItems} in this collection, ${row.totalItems} including sub-collections`

// --- Tree --------------------------------------------------------------------

// Persisted so collapsed collections stay collapsed on re-entry.
const COLLAPSED_KEY = 'collectionsCollapsed'
const readCollapsed = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}
const collapsed = ref(readCollapsed())
watch(collapsed, ids => localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...ids])))

const setCollapsed = (id: string, value: boolean) => {
  const next = new Set(collapsed.value)
  if (value) next.add(id)
  else next.delete(id)
  collapsed.value = next
}
const toggleCollapsed = (id: string) => setCollapsed(id, !collapsed.value.has(id))

const rows = computed(() => collectionRows(props.collections, props.allCollections, collapsed.value))

// --- Drag & drop -------------------------------------------------------------
// Drop a collection onto another to put it inside, or onto the "Move to top
// level" zone (shown while dragging a sub-collection) to take it back out.

const TOP_LEVEL = 'top-level'
const draggingId = ref<string | null>(null)
const overId = ref<string | null>(null)

const parents = computed(() => parentsOf(props.allCollections))
const draggedIsSub = computed(() => !!draggingId.value && parents.value.has(draggingId.value))

/** Whether the dragged collection can be dropped on `target`, and it would change something. */
const accepts = (target: string) => {
  const id = draggingId.value
  if (!id) return false
  if (target === TOP_LEVEL) return parents.value.has(id)
  return parents.value.get(id) !== target && canMoveInto(id, target, props.allCollections)
}

const onDragstart = (event: DragEvent, id: string) => {
  draggingId.value = id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
}

const onDragover = (event: DragEvent, target: string) => {
  if (!accepts(target)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  overId.value = target
}

// Moving over a cell inside the row also fires dragleave; only leaving the row counts.
const onDragleave = (event: DragEvent, target: string) => {
  const into = event.relatedTarget as Node | null
  if (overId.value === target && !(event.currentTarget as Node).contains(into)) overId.value = null
}

const onDragend = () => {
  draggingId.value = null
  overId.value = null
}

const onDrop = (event: DragEvent, target: string) => {
  event.preventDefault()
  const id = draggingId.value
  if (id && accepts(target)) {
    if (target !== TOP_LEVEL) setCollapsed(target, false)
    emit('move', id, target === TOP_LEVEL ? null : target)
  }
  onDragend()
}

const rowProps = ({ item }: { item: CollectionRow }) => ({
  draggable: true,
  class: {
    'row--dragging': draggingId.value === item.id,
    'row--drop-target': overId.value === item.id
  },
  onDragstart: (e: DragEvent) => onDragstart(e, item.id!),
  onDragover: (e: DragEvent) => onDragover(e, item.id!),
  onDragleave: (e: DragEvent) => onDragleave(e, item.id!),
  onDrop: (e: DragEvent) => onDrop(e, item.id!),
  onDragend
})
</script>

<style scoped>
.collections-table-wrap {
  position: relative;
}

.collections-table {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.collections-table :deep(tbody tr) {
  cursor: pointer;
}

.collections-table :deep(tr.row--dragging) {
  opacity: 0.45;
}

.collections-table :deep(tr.row--drop-target) {
  background: rgba(var(--v-theme-primary), 0.12);
  outline: 2px dashed rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.expander-spacer {
  display: inline-block;
  width: 28px;
  flex-shrink: 0;
}

.collection-title {
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.total-items {
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.top-level-drop {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border: 2px dashed rgba(var(--v-theme-on-surface), 0.25);
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.9rem;
}

.top-level-drop--over {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
}

.action-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  flex-wrap: nowrap;
  gap: 0;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  user-select: none;
}

.resize-handle:hover {
  background: rgba(var(--v-theme-on-surface), 0.12);
}

.resizable-table :deep(th) {
  position: relative;
  overflow: visible !important;
}

.description-field :deep(input) {
  color: rgba(var(--v-theme-on-surface), 0.55) !important;
}

.description-field :deep(input::placeholder) {
  color: rgba(var(--v-theme-on-surface), 0.25) !important;
}
</style>
