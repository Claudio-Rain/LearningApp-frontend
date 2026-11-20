<template>
  <div class="collections-table-wrap">
    <!-- Floats over the filter bar so showing it doesn't shift the rows mid-drag. -->
    <div
      v-if="showTopLevel"
      class="top-level-drop rounded-lg"
      @dragover="onDragover($event, TOP_LEVEL, 'inside')"
      @dragleave="onDragleave"
      @drop="onDrop($event, TOP_LEVEL, 'inside')"
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

      <!-- One calm bar: how much of it you know well. The per-tier breakdown
           is in the tooltip; empty collections show nothing at all. -->
      <template #item.progress="{ item }">
        <div v-if="progressOf(item)?.total" class="progress-cell" :title="progressOf(item)!.summary">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${progressOf(item)!.known}%` }" />
          </div>
          <span class="progress-pct">{{ progressOf(item)!.known }}%</span>
        </div>
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
          <!-- A wide target, so a near miss doesn't open the collection. -->
          <span
            v-if="item.childCount"
            class="expander"
            role="button"
            :title="collapsed.has(item.id!) ? 'Expand' : 'Collapse'"
            @click.stop="toggleCollapsed(item.id!)"
          >
            <v-icon :icon="collapsed.has(item.id!) ? 'mdi-chevron-right' : 'mdi-chevron-down'" size="24" />
          </span>
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

      <!-- One number: everything inside, sub-collections included. -->
      <template #item.numberOfItems="{ item }">
        <span :title="itemsTitle(item)" :class="{ 'items-empty': !item.totalItems }">{{ item.totalItems }}</span>
      </template>

      <template #item.actions="{ item }">
        <div class="action-cell" @click.stop>
          <v-btn icon="mdi-school" variant="text" size="small" title="Study" @click="emit('study', item.id!)" />
          <v-btn icon="mdi-pencil" variant="text" size="small" @click="emit('rename', stored(item))" />
          <v-btn icon="mdi-delete" variant="text" size="small" @click="emit('delete', item.id!)" />
        </div>
      </template>
    </v-data-table>

    <!-- Right-click a row: add a collection inside it or right after it (named
         in the menu itself), plus the row's usual actions. -->
    <v-menu v-model="menu.open" :target="[menu.x, menu.y]" location="bottom start" :close-on-content-click="false">
      <v-card v-if="menu.row" class="row-menu" min-width="260">
        <v-list v-if="!menu.adding" density="compact">
          <v-list-subheader class="row-menu__title">{{ menu.row.label }}</v-list-subheader>
          <v-list-item
            prepend-icon="mdi-folder-plus-outline"
            title="Add collection inside"
            @click="startAdd('inside')"
          />
          <v-list-item
            prepend-icon="mdi-plus"
            title="Add collection after"
            @click="startAdd('after')"
          />
          <v-divider class="my-1" />
          <v-list-item prepend-icon="mdi-school" title="Study" @click="runAndClose(() => emit('study', menu.row!.id!))" />
          <v-list-item
            prepend-icon="mdi-pencil"
            title="Rename"
            @click="runAndClose(() => emit('rename', stored(menu.row!)))"
          />
          <v-list-item
            prepend-icon="mdi-delete"
            title="Delete"
            base-color="error"
            @click="runAndClose(() => emit('delete', menu.row!.id!))"
          />
        </v-list>
        <div v-else class="row-menu__form">
          <div class="row-menu__hint">
            {{ menu.adding === 'inside' ? `New collection inside "${menu.row.label}"` : `New collection after "${menu.row.label}"` }}
          </div>
          <v-text-field
            ref="nameField"
            v-model="menu.title"
            placeholder="Collection name"
            variant="outlined"
            density="compact"
            hide-details
            :loading="menu.saving"
            :disabled="menu.saving"
            @keydown.enter.prevent="confirmAdd"
            @keydown.esc.prevent="closeMenu"
          />
          <div class="row-menu__actions">
            <v-btn size="small" variant="text" @click="closeMenu">Cancel</v-btn>
            <v-btn size="small" color="primary" variant="flat" :disabled="!menu.title.trim()" @click="confirmAdd">Add</v-btn>
          </div>
        </div>
      </v-card>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { Category, Collection } from '@/database/types'
import { parentsOf, withSubCollections } from '@/utils/subCollections'
import { knownShare, sumTierCounts, tierSummary, totalOf, type TierCounts } from '@/utils/collectionProgress'
import {
  collectionRows,
  type CollectionRow,
  type DropPosition,
  type ListedCollection
} from '../filters'
import { useResizableColumns } from '../composables/useResizableColumns'
import CollectionCategoryMenu from './CollectionCategoryMenu.vue'

const props = defineProps<{
  /** The collections the filter shows. */
  collections: ListedCollection[]
  /** Every collection, to place the shown ones in the tree and check moves. */
  allCollections: Collection[]
  categories: Category[]
  /** Items per strength tier, by collection id (its own items only). */
  progress: Map<string, TierCounts>
  /** Creates a collection inside or right after another; resolves once saved. */
  addCollectionAt: (title: string, targetId: string, position: 'inside' | 'after') => Promise<unknown>
}>()

const emit = defineEmits<{
  open: [id: string]
  study: [id: string]
  rename: [collection: Collection]
  delete: [id: string]
  /** Star, description and category edits, made in place in the row. */
  update: [collection: Collection, changes: Partial<Collection>]
  /** A collection dropped before/after/inside another one, or back to the top level (null). */
  move: [id: string, targetId: string | null, position: DropPosition]
}>()

const INDENT = 20
const RESIZABLE_COLUMNS = ['title', 'description', 'categoryId', 'numberOfItems', 'progress', 'actions']
const ACTIONS_WIDTH = 124
const STAR_WIDTH = 52

const { widths, startResize } = useResizableColumns({
  title: 180,
  description: 320,
  categoryId: 160,
  numberOfItems: 80,
  progress: 150,
  actions: 120
})

// Rows come in tree order (the dragged order within each level), so the table
// itself doesn't sort.
const headers = computed(() => [
  { title: '', key: 'starred', sortable: false, align: 'center' as const, width: STAR_WIDTH, minWidth: STAR_WIDTH },
  { title: 'Title', key: 'title', sortable: false, width: widths.value.title },
  { title: 'Description', key: 'description', sortable: false, width: widths.value.description },
  { title: 'Category', key: 'categoryId', sortable: false, width: widths.value.categoryId },
  { title: 'Items', key: 'numberOfItems', sortable: false, align: 'center' as const, width: widths.value.numberOfItems },
  { title: 'Progress', key: 'progress', sortable: false, width: widths.value.progress },
  { title: '', key: 'actions', sortable: false, align: 'center' as const, width: ACTIONS_WIDTH, minWidth: ACTIONS_WIDTH }
])

const categoryMap = computed(() => new Map(props.categories.map(c => [c.id, c])))

// The collection as stored, so edits never save the row's tree fields.
const stored = (row: CollectionRow): Collection => props.allCollections.find(c => c.id === row.id) ?? row

const itemsTitle = (row: CollectionRow) =>
  row.totalItems === row.numberOfItems
    ? undefined
    : `${row.numberOfItems} in this collection, ${row.totalItems} including sub-collections`

// --- Progress ----------------------------------------------------------------

// A row counts its sub-collections too, like the item total beside it.
// Worked out once per row, not on every cell render.
const rowProgress = (row: CollectionRow) => {
  const ids = withSubCollections([row.id!], props.allCollections)
  const counts = sumTierCounts([...ids].map(id => props.progress.get(id)))
  const known = Math.round((knownShare(counts) ?? 0) * 100)
  return {
    counts,
    total: totalOf(counts),
    known,
    summary: `${tierSummary(counts)} — ${known}% known well (good or mastered)`,
  }
}
const progressByRow = computed(() => new Map(rows.value.map(row => [row.id, rowProgress(row)])))
const progressOf = (row: CollectionRow) => progressByRow.value.get(row.id)

// --- Right-click menu --------------------------------------------------------

const menu = reactive({
  open: false,
  x: 0,
  y: 0,
  row: null as CollectionRow | null,
  /** Set once "Add collection…" is picked: the menu turns into a name field. */
  adding: null as 'inside' | 'after' | null,
  title: '',
  saving: false,
})
const nameField = ref<{ focus: () => void } | null>(null)

const openMenu = (event: MouseEvent, row: CollectionRow) => {
  event.preventDefault()
  Object.assign(menu, { open: true, x: event.clientX, y: event.clientY, row, adding: null, title: '', saving: false })
}

const closeMenu = () => {
  menu.open = false
}

const runAndClose = (action: () => void) => {
  closeMenu()
  action()
}

const startAdd = (position: 'inside' | 'after') => {
  menu.adding = position
  nextTick(() => nameField.value?.focus())
}

const confirmAdd = async () => {
  const title = menu.title.trim()
  const row = menu.row
  if (!title || !row?.id || !menu.adding || menu.saving) return
  const position = menu.adding
  menu.saving = true
  try {
    await props.addCollectionAt(title, row.id, position)
    // Show the new sub-collection rather than hiding it in a collapsed parent.
    if (position === 'inside') setCollapsed(row.id, false)
    closeMenu()
  } finally {
    menu.saving = false
  }
}

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
// Drop a collection on the top or bottom edge of a row to place it before or
// after that row (same level), on the middle of a row to put it inside, or on
// the "Move to top level" zone (shown while dragging a sub-collection) to
// take it back out.
//
// While dragging, nothing reactive changes: dragover fires many times a
// second, and re-rendering the table on each one made dragging slow. The drop
// indicators are classes set straight on the element under the pointer.
// The only reactive change (showing the top-level zone) waits until after
// dragstart, since Chrome cancels a drag when the DOM changes during it.

const TOP_LEVEL = 'top-level'

const parents = computed(() => parentsOf(props.allCollections))

interface Drag {
  id: string
  parentId: string | null
  /** The collection and everything inside it: it can't be dropped into any of them. */
  inside: Set<string>
}
let drag: Drag | null = null
const showTopLevel = ref(false)

const targetId = (target: string) => (target === TOP_LEVEL ? null : target)

/** Whether the dragged collection can be dropped there. */
const accepts = (target: string, position: DropPosition) => {
  if (!drag || drag.id === target) return false
  if (target === TOP_LEVEL) return drag.parentId !== null
  const parentId = position === 'inside' ? target : (parents.value.get(target) ?? null)
  if (position === 'inside' && parentId === drag.parentId) return false
  return parentId === null || !drag.inside.has(parentId)
}

let dropEl: HTMLElement | null = null
let dropPosition: DropPosition | null = null
const showDrop = (el: HTMLElement | null, position: DropPosition | null) => {
  if (el === dropEl && position === dropPosition) return
  dropEl?.classList.remove(`drop-${dropPosition}`)
  el?.classList.add(`drop-${position}`)
  dropEl = el
  dropPosition = position
}

// The edges of a row place before/after it; the middle puts inside. An
// expanded row's bottom edge also puts inside, since its sub-collections are
// what shows right below it.
const EDGE = 0.3
const positionIn = (event: DragEvent, row: CollectionRow): DropPosition => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const y = (event.clientY - rect.top) / rect.height
  if (y < EDGE) return 'before'
  const expanded = row.childCount > 0 && !collapsed.value.has(row.id!)
  if (y > 1 - EDGE && !expanded) return 'after'
  return 'inside'
}

// The wheel doesn't scroll during a native drag, so holding the pointer near
// the top or bottom edge scrolls the list, faster the closer it gets.
const SCROLL_EDGE = 80
const MAX_SCROLL_SPEED = 18
let scroller: HTMLElement | null = null
let pointerY: number | null = null
let scrollFrame = 0

const scrollerOf = (el: HTMLElement | null): HTMLElement => {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) return node
  }
  return document.scrollingElement as HTMLElement
}

const trackPointer = (event: DragEvent) => {
  pointerY = event.clientY
}

const autoScroll = () => {
  if (scroller && pointerY !== null) {
    const isPage = scroller === document.scrollingElement
    const { top, bottom } = isPage ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect()
    const intoTop = top + SCROLL_EDGE - pointerY
    const intoBottom = pointerY - (bottom - SCROLL_EDGE)
    const depth = intoTop > 0 ? -intoTop : intoBottom > 0 ? intoBottom : 0
    if (depth) scroller.scrollTop += (Math.max(-SCROLL_EDGE, Math.min(SCROLL_EDGE, depth)) / SCROLL_EDGE) * MAX_SCROLL_SPEED
  }
  scrollFrame = requestAnimationFrame(autoScroll)
}

const startAutoScroll = (el: HTMLElement) => {
  scroller = scrollerOf(el)
  document.addEventListener('dragover', trackPointer)
  scrollFrame = requestAnimationFrame(autoScroll)
}

const stopAutoScroll = () => {
  cancelAnimationFrame(scrollFrame)
  document.removeEventListener('dragover', trackPointer)
  scroller = null
  pointerY = null
}

onBeforeUnmount(stopAutoScroll)

let draggedEl: HTMLElement | null = null

const onDragstart = (event: DragEvent, id: string) => {
  drag = {
    id,
    parentId: parents.value.get(id) ?? null,
    inside: withSubCollections([id], props.allCollections)
  }
  draggedEl = event.currentTarget as HTMLElement
  startAutoScroll(draggedEl)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
  setTimeout(() => {
    if (!drag) return
    draggedEl?.classList.add('row--dragging')
    showTopLevel.value = drag.parentId !== null
  })
}

const onDragover = (event: DragEvent, target: string, position: DropPosition) => {
  if (!accepts(target, position)) {
    showDrop(null, null)
    return
  }
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  showDrop(event.currentTarget as HTMLElement, position)
}

// Moving over a cell inside the row also fires dragleave; only leaving the row counts.
const onDragleave = (event: DragEvent) => {
  const el = event.currentTarget as HTMLElement
  if (dropEl === el && !el.contains(event.relatedTarget as Node | null)) showDrop(null, null)
}

const onDragend = () => {
  stopAutoScroll()
  showDrop(null, null)
  draggedEl?.classList.remove('row--dragging')
  draggedEl = null
  drag = null
  showTopLevel.value = false
}

const onDrop = (event: DragEvent, target: string, position: DropPosition) => {
  event.preventDefault()
  const id = drag?.id
  // The collection dropped into keeps its expanded/collapsed state.
  if (id && accepts(target, position)) emit('move', id, targetId(target), position)
  onDragend()
}

const rowProps = ({ item }: { item: CollectionRow }) => ({
  draggable: true,
  onDragstart: (e: DragEvent) => onDragstart(e, item.id!),
  onDragover: (e: DragEvent) => onDragover(e, item.id!, positionIn(e, item)),
  onDragleave,
  onDrop: (e: DragEvent) => onDrop(e, item.id!, positionIn(e, item)),
  onDragend,
  onContextmenu: (e: MouseEvent) => openMenu(e, item)
})
</script>

<style scoped>
.collections-table-wrap {
  position: relative;
}

.collections-table {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

/* Vuetify tables default to 0.875rem; match the item list's 1rem titles. */
.collections-table :deep(td) {
  font-size: 1rem;
}

.collections-table :deep(th) {
  font-size: 0.9rem;
}

.collections-table :deep(tbody tr) {
  cursor: pointer;
}

.collections-table :deep(tr.row--dragging) {
  opacity: 0.45;
}

/* Drop indicators, set on the element under the pointer while dragging. */
.collections-table :deep(tr.drop-inside) {
  background: rgba(var(--v-theme-primary), 0.12);
  outline: 2px dashed rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

/* A line on the edge where the collection will land. */
.collections-table :deep(tr.drop-before > td) {
  box-shadow: inset 0 3px 0 rgb(var(--v-theme-primary));
}

.collections-table :deep(tr.drop-after > td) {
  box-shadow: inset 0 -3px 0 rgb(var(--v-theme-primary));
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.expander,
.expander-spacer {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.expander {
  border-radius: 8px;
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.expander:hover {
  background: rgba(var(--v-theme-on-surface), 0.1);
  color: rgb(var(--v-theme-on-surface));
}

.collection-title {
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.82);
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

.top-level-drop.drop-inside {
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

/* --- progress column --- */
.progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: help;
}

.progress-bar {
  flex: 1;
  min-width: 40px;
  height: 5px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  background: rgb(var(--v-theme-barGood));
}

.progress-pct {
  min-width: 3ch;
  text-align: right;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.items-empty {
  color: rgba(var(--v-theme-on-surface), 0.3);
}

/* --- right-click menu --- */
.row-menu__title {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-menu__form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  width: 300px;
}

.row-menu__hint {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-menu__actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.description-field :deep(input) {
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), 0.55) !important;
}

.description-field :deep(input::placeholder) {
  color: rgba(var(--v-theme-on-surface), 0.25) !important;
}
</style>
