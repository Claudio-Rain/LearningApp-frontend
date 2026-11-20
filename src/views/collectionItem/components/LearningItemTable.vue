<template>
  <!-- Label/strength filters in plain sight, the search tucked behind a
       magnifier. They narrow the view only; the # column keeps each item's
       place in the full list. -->
  <div v-if="items.length > 0" class="item-filters">
    <div class="item-filters__row">
      <v-select
        v-for="f in selectFilters"
        :key="f.key"
        v-model="filters[f.key]"
        :items="f.options"
        :label="f.label"
        :prepend-inner-icon="f.icon"
        variant="outlined"
        density="compact"
        multiple
        hide-details
        class="item-filters__select"
      >
        <!-- One short line however many are picked: "Weak +2". -->
        <template #selection="{ item, index }">
          <span v-if="index === 0" class="item-filters__value">{{ item.title }}</span>
          <span v-else-if="index === 1" class="item-filters__more">+{{ filters[f.key].length - 1 }}</span>
        </template>
      </v-select>
      <v-btn
        :icon="searchOpen ? 'mdi-magnify-close' : 'mdi-magnify'"
        size="small"
        :variant="filters.query ? 'tonal' : 'text'"
        :color="filters.query ? 'primary' : undefined"
        :title="searchOpen ? 'Close search' : 'Search questions and answers'"
        @click="toggleSearch"
      />
    </div>
    <v-text-field
      v-if="searchOpen"
      ref="searchField"
      v-model="filters.query"
      placeholder="Search questions and answers"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="item-filters__search"
      @click:clear="filters.query = ''"
      @keydown.esc="toggleSearch"
    />
    <div v-if="filtering" class="item-filters__summary">
      Showing {{ shown.length }} of {{ items.length }} · reordering is off while filtering
      <button type="button" class="item-filters__clear" @click="clearFilters">Clear filters</button>
    </div>
  </div>

  <!-- Rows are in the user's own order (see utils/itemOrder.ts) and can be
       dragged into place. Sorting by the Title header or filtering is a
       temporary view; dragging is off then, since a drop would mean nothing. -->
  <v-data-table
    v-if="items.length > 0"
    v-model:sort-by="sortBy"
    :headers="headers"
    :items="shown"
    :items-per-page="-1"
    hide-default-footer
    density="comfortable"
    class="item-table"
    :class="{ 'item-table--dragging': dragId, 'item-table--reorderable': canDrag }"
    hover
    no-data-text="No items match these filters"
    :row-props="rowProps"
    @click:row="onRowClick"
  >
    <template #item.rowNumber="{ item }">
      <span class="row-number">{{ placeOf(item) }}</span>
      <span
        v-if="canDrag"
        class="drag-handle"
        title="Drag to reorder"
        @pointerdown="startDrag($event, item)"
        @click.stop
      >
        <v-icon size="18">mdi-drag</v-icon>
      </span>
    </template>
    <template #item.title="{ item }">
      <!-- Keyed by drop count: a moved row's tooltip never sees the mouse
           leave, so after each drop they're all remounted closed. -->
      <v-tooltip :key="`${item.id}-${drops}`" location="top" open-delay="300" max-width="600" :disabled="!!dragId">
        <template #activator="{ props: tooltipProps }">
          <MathText v-bind="tooltipProps" class="item-title" :text="item.title" />
        </template>
        <MathText :text="item.title" />
      </v-tooltip>
    </template>
    <template #item.actions="{ item }">
      <v-btn
        icon="mdi-delete"
        size="x-small"
        variant="text"
        color="grey"
        class="delete-btn"
        @click.stop="emit('delete', item)"
      />
    </template>
  </v-data-table>

  <div v-else class="empty-state">
    <v-icon size="40" color="grey-lighten-1">mdi-book-open-outline</v-icon>
    <p>No learning items yet</p>
  </div>

  <!-- The title riding along under the pointer while a row is dragged. -->
  <Teleport to="body">
    <div v-if="dragItem" class="drag-ghost" :style="{ left: `${ghost.x + 14}px`, top: `${ghost.y + 10}px` }">
      <MathText :text="dragItem.title" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { getAllCardProgress } from '@/database'
import type { LearningItem } from '@/database/types'
import MathText from '@/shared/components/MathText.vue'
import { sortByPosition } from '@/utils/itemOrder'
import { ITEM_LABEL_DEFS } from '@/utils/itemLabels'
import {
  activeFilterCount,
  emptyItemFilters,
  filterItems,
  labelFilterOptions,
  strengthFilterOptions,
} from '@/utils/itemFilters'

const props = defineProps<{
  items: LearningItem[]
  selectedId?: string
}>()

const emit = defineEmits<{
  select: [item: LearningItem]
  delete: [item: LearningItem]
  /** Move the item so it ends up at `toIndex` in the list. */
  reorder: [id: string, toIndex: number]
}>()

const headers = [
  { title: '#', key: 'rowNumber', sortable: false, align: 'center' as const, width: '50px' },
  { title: 'Title', key: 'title', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'center' as const, width: '48px' },
]

const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([])
const sorted = computed(() => sortByPosition(props.items))

// --- filters ----------------------------------------------------------------

const filters = reactive(emptyItemFilters())

const selectFilters = [
  { key: 'strength', label: 'How well you know it', icon: 'mdi-chart-line', options: strengthFilterOptions() },
  {
    key: 'priority',
    label: ITEM_LABEL_DEFS.priority.title,
    icon: ITEM_LABEL_DEFS.priority.icon,
    options: labelFilterOptions('priority'),
  },
  {
    key: 'difficulty',
    label: ITEM_LABEL_DEFS.difficulty.title,
    icon: ITEM_LABEL_DEFS.difficulty.icon,
    options: labelFilterOptions('difficulty'),
  },
] as const

// The search hides behind the magnifier; closing it also clears it, so a
// hidden search can never be quietly filtering the list.
const searchOpen = ref(false)
const searchField = ref<{ focus: () => void } | null>(null)
const toggleSearch = () => {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) nextTick(() => searchField.value?.focus())
  else filters.query = ''
}

// Study progress, for the "how well you know it" filter. Read once when the
// list opens; it only changes while studying, which happens elsewhere.
const strengthById = ref(new Map<string, number>())
onMounted(async () => {
  const progress = await getAllCardProgress()
  strengthById.value = new Map(progress.map(p => [p.learning_item_id, p.strength_score]))
})

const shown = computed(() => filterItems(sorted.value, filters, id => strengthById.value.get(id)))
const filtering = computed(() => activeFilterCount(filters) > 0)
const clearFilters = () => {
  Object.assign(filters, emptyItemFilters())
  searchOpen.value = false
}

// Each row's number is its place in the whole list, also while filtered.
const places = computed(() => new Map(sorted.value.map((item, i) => [item.id, i + 1])))
const placeOf = (item: LearningItem) => places.value.get(item.id) ?? ''

const canDrag = computed(() => sortBy.value.length === 0 && !filtering.value)

// --- drag and drop ----------------------------------------------------------
//
// Pointer events from the grip, not the browser's native drag and drop: a
// native drag swallows every mouse event while it runs, which left the title
// tooltips stuck open and let a slightly shaky click on a row start a drag.

const dragId = ref<string | null>(null)
const dragItem = computed(() => sorted.value.find(i => i.id === dragId.value) ?? null)
// Where the dragged row would land, as a gap index: 0 is above the first row,
// sorted.length below the last.
const dropAt = ref<number | null>(null)
const ghost = reactive({ x: 0, y: 0 })
const drops = ref(0)

let scroller: HTMLElement | null = null
let scrollFrame = 0

const fromIndex = () => sorted.value.findIndex(i => i.id === dragId.value)

// Which gap the pointer is over. Dropping a row right above or below itself
// changes nothing, so those gaps show no line.
const updateDropAt = () => {
  const el = document.elementFromPoint(ghost.x, ghost.y)
  const row = el?.closest<HTMLElement>('tr[data-index]')
  if (!row || !scroller?.contains(row)) return
  const index = Number(row.dataset.index)
  const { top, height } = row.getBoundingClientRect()
  const gap = ghost.y < top + height / 2 ? index : index + 1
  const from = fromIndex()
  dropAt.value = gap === from || gap === from + 1 ? null : gap
}

// Near the top or bottom edge of the list, scroll it so a row can be carried
// to the far end of a long list.
const EDGE = 48
const autoScroll = () => {
  scrollFrame = 0
  if (!dragId.value || !scroller) return
  const { top, bottom } = scroller.getBoundingClientRect()
  const speed =
    ghost.y < top + EDGE ? -Math.ceil((top + EDGE - ghost.y) / 4) :
    ghost.y > bottom - EDGE ? Math.ceil((ghost.y - (bottom - EDGE)) / 4) : 0
  if (speed === 0) return
  scroller.scrollTop += speed
  updateDropAt()
  scrollFrame = requestAnimationFrame(autoScroll)
}

const onPointerMove = (event: PointerEvent) => {
  ghost.x = event.clientX
  ghost.y = event.clientY
  updateDropAt()
  if (!scrollFrame) scrollFrame = requestAnimationFrame(autoScroll)
}

const stopDrag = () => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', stopDrag)
  window.removeEventListener('keydown', onKeydown, true)
  cancelAnimationFrame(scrollFrame)
  scrollFrame = 0
  scroller = null
  document.body.classList.remove('item-table-dragging')
  dragId.value = null
  dropAt.value = null
}

const onPointerUp = () => {
  const id = dragId.value
  const gap = dropAt.value
  const from = fromIndex()
  stopDrag()
  drops.value++
  if (!id || gap === null || from < 0) return
  // The gap counts the dragged row itself; the target index doesn't.
  emit('reorder', id, gap > from ? gap - 1 : gap)
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  stopDrag()
}

const startDrag = (event: PointerEvent, item: LearningItem) => {
  if (event.button !== 0 || !item.id || dragId.value) return
  // No text selection, no row click, no splitter or other drag starting.
  event.preventDefault()
  event.stopPropagation()
  scroller = (event.currentTarget as HTMLElement).closest<HTMLElement>('.v-table__wrapper')
  dragId.value = item.id
  ghost.x = event.clientX
  ghost.y = event.clientY
  document.body.classList.add('item-table-dragging')
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', stopDrag)
  window.addEventListener('keydown', onKeydown, true)
}

onBeforeUnmount(stopDrag)

const rowProps = ({ item, index }: { item: LearningItem; index: number }) => ({
  'data-index': index,
  class: [
    props.selectedId && props.selectedId === item.id ? 'selected-row' : '',
    item.id === dragId.value ? 'dragged-row' : '',
    dropAt.value === index ? 'drop-before' : '',
    dropAt.value === sorted.value.length && index === sorted.value.length - 1 ? 'drop-after' : '',
  ],
})

const onRowClick = (_event: unknown, { item }: { item: LearningItem }) => emit('select', item)
</script>

<style scoped>
.item-table {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.item-filters {
  flex-shrink: 0;
  padding: 0 16px 8px;
}

.item-filters__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-filters__row {
  flex-wrap: wrap;
}

/* Three across when there's room, wrapping on a narrow list. */
.item-filters__select {
  flex: 1 1 150px;
  min-width: 0;
}

.item-filters__value {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-filters__more {
  margin-left: 4px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.item-filters__search {
  margin-top: 8px;
}

.item-filters__summary {
  margin-top: 6px;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.item-filters__clear {
  margin-left: 6px;
  border: 0;
  padding: 0;
  background: none;
  color: rgb(var(--v-theme-primary));
  font: inherit;
  cursor: pointer;
}

.item-filters__clear:hover {
  text-decoration: underline;
}

.row-number {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

/* On hover the row number gives way to a grip, so the row reads as movable. */
.drag-handle {
  display: none;
  cursor: grab;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.item-table--reorderable :deep(tr:hover) .row-number {
  display: none;
}

.item-table--reorderable :deep(tr:hover) .drag-handle {
  display: inline-flex;
  touch-action: none;
}

/* Mid-drag, every row shows its number again; only the line moves. */
.item-table--dragging :deep(tr) .drag-handle {
  display: none !important;
}

.item-table--dragging :deep(tr) .row-number {
  display: inline !important;
}

:deep(tr.dragged-row) {
  opacity: 0.4;
}

/* The landing spot: a primary-coloured line above (or below) a row. Doubled
   class so it beats the selected row's own inset bar. */
:deep(tr.drop-before.drop-before) {
  box-shadow: inset 0 3px 0 0 rgb(var(--v-theme-primary));
}

:deep(tr.drop-after.drop-after) {
  box-shadow: inset 0 -3px 0 0 rgb(var(--v-theme-primary));
}

.drag-ghost {
  position: fixed;
  z-index: 3000;
  max-width: 420px;
  padding: 4px 10px;
  border-radius: 6px;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.85rem;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface-variant));
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
}

.item-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  width: 100%;
  font-size: 1rem;
}

/* .item-table is this component's root, so it goes outside :deep() — inside
   it the selector would look for .item-table *below* the root and never match. */
.item-table :deep(.v-table__wrapper) {
  flex: 1;
  overflow-y: auto;
  /* Titles already end in an ellipsis; a few stray pixels of width must not
     add a horizontal scrollbar that slides the whole list sideways. */
  overflow-x: hidden;
  /* Room for the scrollbar is kept even when it isn't showing, so the rows
     don't jump narrower/wider as it comes and goes. */
  scrollbar-gutter: stable;
  border: none;
}

:deep(tr.selected-row) {
  background: rgba(var(--v-theme-on-surface), 0.06) !important;
  box-shadow: inset 2px 0 0 0 rgba(var(--v-theme-on-surface), 0.87);
}

:deep(.delete-btn) {
  opacity: 0;
  transition: opacity 0.15s ease;
}

:deep(tr:hover .delete-btn) {
  opacity: 1;
}

.item-table :deep(td),
.item-table :deep(th) {
  border: none !important;
}

.item-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(var(--v-theme-on-surface), 0.35);
  font-size: 0.85rem;
  padding: 32px;
  text-align: center;
}
</style>

<style>
/* While a row is carried: grabbing cursor everywhere, and no text gets
   selected as the pointer sweeps across the page. */
body.item-table-dragging,
body.item-table-dragging * {
  cursor: grabbing !important;
  user-select: none !important;
}
</style>
