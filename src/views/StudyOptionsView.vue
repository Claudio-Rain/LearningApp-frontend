<template>
  <div class="study-options pa-4">
    <h2 class="text-h6 mb-4">Study Options</h2>

    <div class="mb-4">
      <label class="text-caption font-weight-bold d-block mb-2">Study View Collection</label>
      <v-select
        v-model="studyViewSelection"
        :items="collections"
        item-title="title"
        item-value="id"
        label="Collection displayed in Study View"
        variant="outlined"
        density="comfortable"
        :loading="loadingCollections"
        no-data-text="No collections found"
      />
    </div>

    <div class="mb-4">
      <label class="text-caption font-weight-bold d-block mb-2">Content Widget Collections</label>
      <v-autocomplete
        :model-value="contentCollectionIds"
        :items="groupedContentItems"
        item-title="title"
        item-value="id"
        label="Collections for content widget"
        variant="outlined"
        density="comfortable"
        multiple
        chips
        closable-chips
        clearable
        autocomplete="off"
        :custom-filter="contentFilter"
        :loading="loadingContentWidget || loadingCollections"
        :disabled="loadingContentWidget"
        no-data-text="No collections found"
        @update:model-value="contentCollectionIds = $event.filter((id: string) => !id.startsWith(GROUP_HEADER_PREFIX))"
      >
        <template #prepend-item>
          <v-list-item title="Select all" @click="toggleAllContentCollections">
            <template #prepend>
              <v-checkbox-btn
                :model-value="contentCollectionIds.length === collections.length && collections.length > 0"
                :indeterminate="contentCollectionIds.length > 0 && contentCollectionIds.length < collections.length"
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
              class="content-group-header"
              @click="toggleContentCategory(item.raw.groupKey!)"
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
          <v-list-item v-else v-bind="itemProps" class="content-group-child" />
        </template>
        <template #chip="{ item, index, props: chipProps }">
          <v-chip v-if="index < 4" v-bind="chipProps" :text="item.title" />
          <span v-else-if="index === 4" class="text-caption text-medium-emphasis align-self-center">
            +{{ contentCollectionIds.length - 4 }} more
          </span>
        </template>
      </v-autocomplete>
      <v-alert
        v-if="missingContentCollectionIds.length"
        type="warning"
        density="compact"
        class="mt-2"
      >
        {{ missingContentCollectionIds.length }} previously selected collection(s) no longer exist and were ignored. Please re-select and save.
      </v-alert>
    </div>

    <div class="mb-4">
      <label class="text-caption font-weight-bold d-block mb-2">Notifications Collection</label>
      <v-select
        v-model="notificationCollectionId"
        :items="collections"
        item-title="title"
        item-value="id"
        label="Collection for notifications"
        variant="outlined"
        density="comfortable"
        :loading="loadingCollections"
        no-data-text="No collections found"
      />
    </div>

    <div class="d-flex gap-3 mb-3 time-row">
      <v-select
        v-model="startHour"
        :items="hourOptions"
        item-title="label"
        item-value="value"
        label="Start time"
        variant="outlined"
        density="comfortable"
      />
      <v-select
        v-model="endHour"
        :items="hourOptions"
        item-title="label"
        item-value="value"
        label="End time"
        variant="outlined"
        density="comfortable"
      />
    </div>

    <v-select
      v-model="intervalSeconds"
      :items="intervalOptions"
      item-title="label"
      item-value="value"
      label="Notification interval"
      variant="outlined"
      density="comfortable"
      class="mb-4"
    />

    <v-divider class="my-6" />

    <div class="exclusion-section">
      <div class="d-flex align-center mb-1">
        <span class="text-subtitle-2 font-weight-bold">Excluded Items</span>
        <v-chip
          v-if="excludedItemIds.size > 0"
          size="x-small"
          color="error"
          class="ml-2"
        >{{ excludedItemIds.size }}</v-chip>
      </div>
      <p class="text-caption text-medium-emphasis mb-3">
        Items checked here are hidden from Study View, content widget, and notifications.
        Click a row to toggle it; shift-click to toggle a range.
      </p>
      <v-select
        v-model="exclusionCollectionIds"
        :items="exclusionCollectionOptions"
        item-title="title"
        item-value="id"
        label="Filter by collections"
        variant="outlined"
        density="comfortable"
        multiple
        chips
        closable-chips
        :loading="loadingCollections"
        no-data-text="No collections found"
      >
        <template #prepend-item>
          <v-list-item
            title="Select all"
            @click="exclusionCollectionIds = exclusionCollectionOptions.map(c => c.id)"
          >
            <template #prepend>
              <v-checkbox-btn
                :model-value="exclusionCollectionIds.length === exclusionCollectionOptions.length"
                :indeterminate="exclusionCollectionIds.length > 0 && exclusionCollectionIds.length < exclusionCollectionOptions.length"
                color="primary"
                readonly
              />
            </template>
          </v-list-item>
          <v-divider />
        </template>
      </v-select>
      <v-text-field
        v-if="exclusionCollectionIds.length"
        v-model="titleSearch"
        label="Search by title (starts with)"
        variant="outlined"
        density="compact"
        clearable
        hide-details
        prepend-inner-icon="mdi-magnify"
        class="mb-2"
      />
      <div v-if="loadingExclusionItems" class="text-caption text-medium-emphasis py-2">
        Loading items…
      </div>
      <div v-else-if="exclusionCollectionIds.length && exclusionItems.length === 0" class="text-caption text-medium-emphasis py-2">
        No items in the selected collections.
      </div>
      <v-data-table
        v-else-if="exclusionCollectionIds.length"
        v-model:sort-by="sortBy"
        :headers="exclusionHeaders"
        :items="sortedItems"
        item-value="id"
        density="compact"
        class="exclusion-table"
        :items-per-page="-1"
        hide-default-footer
        multi-sort
      >
        <template #item="{ item, index }">
          <tr
            class="exclusion-row"
            :class="{ 'is-excluded': isExcluded(item.id!) }"
            @click="(e) => handleRowClick(item, e)"
          >
            <td class="exclusion-check-col">
              <v-checkbox
                :model-value="isExcluded(item.id!)"
                density="compact"
                hide-details
                color="error"
                readonly
                tabindex="-1"
              />
            </td>
            <td class="text-caption text-medium-emphasis">{{ index + 1 }}</td>
            <td>
              <router-link
                :to="{ name: 'collectionItemView', params: { id: item.collectionId, itemId: item.id } }"
                class="item-link"
                target="_blank"
                @click.stop
              >{{ item.title }}</router-link>
            </td>
            <td class="text-caption text-medium-emphasis">{{ item.collectionTitle }}</td>
            <td>
              <v-chip
                size="small"
                label
                :color="strengthInfo(item.strengthScore).color"
                variant="flat"
              >
                {{ strengthInfo(item.strengthScore).label }}
              </v-chip>
            </td>
          </tr>
        </template>
      </v-data-table>
      <div v-if="exclusionCollectionIds.length" class="text-caption text-medium-emphasis mt-2">
        {{ excludedInCurrentCollection }} excluded / {{ exclusionItems.length }} total
      </div>
    </div>

    <v-divider class="my-6" />

    <v-alert
      v-if="saved"
      type="success"
      density="compact"
      class="mb-3"
      closable
      @click:close="saved = false"
    >
      Settings saved. Background script will use them on next alarm.
    </v-alert>

    <v-btn color="primary" block @click="saveNotificationSettings" :loading="saving">
      Save Settings
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getCollections, getCategories, getLearningItems, getAllCardProgress, getLocalContentWidget, syncContentWidget, syncExcludedItems, saveContentWidget } from '../database'
import type { LearningItem, Category } from '../database'
import { useStudyViewCollection } from '../composables/useStudyViewCollection'
import { useExcludedItems } from '../composables/useExcludedItems'

declare const chrome: any

const collections = ref<{ id: string; title: string; categoryId?: string | null }[]>([])
const categories = ref<Category[]>([])
// Starts true so the first render (before onMounted's async load) already shows
// the loading state instead of a selector with an unresolved value.
const loadingCollections = ref(true)
const collectionItemIds = ref<Map<string, Set<string>>>(new Map())

const exclusionCollectionOptions = computed(() => {
  const excluded = excludedItemIds.value // always track as dependency
  return collections.value.map(c => {
    const ids = collectionItemIds.value.get(c.id)
    if (!ids) return { id: c.id, title: c.title }
    const excludedCount = [...ids].filter(id => excluded.has(id)).length
    const label = excludedCount > 0 ? `${c.title} (${excludedCount} excluded)` : c.title
    return { id: c.id, title: label }
  })
})

const { studyViewCollectionId, setStudyViewCollectionId } = useStudyViewCollection()
// The stored id is available synchronously (localStorage), but `collections` is
// loaded async — so bind the selector to a proxy that withholds the value until
// the items exist, otherwise Vuetify briefly renders the raw id as the title.
const studyViewSelection = computed({
  get: () => (loadingCollections.value ? null : studyViewCollectionId.value),
  set: (id: string | null) => setStudyViewCollectionId(id),
})
const { excludedItemIds, isExcluded, toggleExclusion, load: loadExcludedItems } = useExcludedItems()
type ExclusionItem = LearningItem & { collectionTitle: string; strengthScore: number }
// learning_item_id -> strength_score (0..1). Absent = no progress yet ("New").
const strengthByItem = ref<Map<string, number>>(new Map())

// Same tiers as the progress/study pages.
function strengthInfo(score: number) {
  if (score < 0) return { label: 'New', color: '#BDBDBD' }
  if (score < 0.25) return { label: 'Critical', color: '#F44336' }
  if (score < 0.5) return { label: 'Struggling', color: '#FF9800' }
  if (score < 0.75) return { label: 'Good', color: '#8BC34A' }
  return { label: 'Mastered', color: '#4CAF50' }
}
const exclusionCollectionIds = ref<string[]>([])
const exclusionItems = ref<ExclusionItem[]>([])
const loadingExclusionItems = ref(false)
const anchorIndex = ref<number | null>(null)

const exclusionHeaders = [
  { title: '', key: 'excluded', sortable: false, width: 56 },
  { title: '#', key: 'rowIndex', sortable: false, width: 48 },
  { title: 'Item', key: 'title' },
  { title: 'Collection', key: 'collectionTitle' },
  { title: 'Strength', key: 'strengthScore' },
] as const

const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([{ key: 'title', order: 'asc' }])
const titleSearch = ref('')

// Prefix match on title (case-insensitive): typing "L1" shows titles starting with "L1".
const filteredItems = computed(() => {
  const q = titleSearch.value.trim().toLowerCase()
  if (!q) return exclusionItems.value
  return exclusionItems.value.filter(i => i.title.toLowerCase().startsWith(q))
})

// Mirror the data-table's display order so shift-click ranges follow what the
// user actually sees after filtering and sorting.
const sortedItems = computed(() => {
  const sorts = sortBy.value
  const arr = [...filteredItems.value]
  if (!sorts.length) return arr
  return arr.sort((a, b) => {
    for (const sort of sorts) {
      const av = (a as Record<string, unknown>)[sort.key]
      const bv = (b as Record<string, unknown>)[sort.key]
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''))
      if (cmp !== 0) return cmp * (sort.order === 'desc' ? -1 : 1)
    }
    return 0
  })
})

const excludedInCurrentCollection = computed(
  () => exclusionItems.value.filter(i => i.id && excludedItemIds.value.has(i.id)).length
)

watch(exclusionCollectionIds, async (ids) => {
  anchorIndex.value = null
  if (!ids.length) {
    exclusionItems.value = []
    return
  }
  loadingExclusionItems.value = true
  try {
    // Merge items across the selected collections, deduping by id. An item that
    // lives in several selected collections lists them all in collectionTitle.
    const merged = new Map<string, ExclusionItem>()
    for (const id of ids) {
      const title = collections.value.find(c => c.id === id)?.title ?? ''
      const items = await getLearningItems(id)
      for (const item of items) {
        if (!item.id) continue
        const existing = merged.get(item.id)
        if (existing) {
          existing.collectionTitle += `, ${title}`
        } else {
          merged.set(item.id, {
            ...item,
            collectionTitle: title,
            strengthScore: strengthByItem.value.get(item.id) ?? -1,
          })
        }
      }
    }
    exclusionItems.value = [...merged.values()].sort((a, b) => a.title.localeCompare(b.title))
  } finally {
    loadingExclusionItems.value = false
  }
})

function handleRowClick(item: ExclusionItem, event: MouseEvent) {
  const itemId = item.id!
  // Index within the currently sorted/displayed order, so ranges match the view.
  const index = sortedItems.value.findIndex(i => i.id === itemId)
  if (event.shiftKey && anchorIndex.value !== null) {
    const start = Math.min(anchorIndex.value, index)
    const end = Math.max(anchorIndex.value, index)
    const targetState = !isExcluded(itemId)
    for (let i = start; i <= end; i++) {
      const id = sortedItems.value[i]?.id
      if (id) toggleExclusion(id, targetState)
    }
  } else {
    toggleExclusion(itemId, !isExcluded(itemId))
    anchorIndex.value = index
  }
}
const contentCollectionIds = ref<string[]>([])
const missingContentCollectionIds = ref<string[]>([])

// --- Content widget selector: collections grouped by category ---
// Header rows are injected into the autocomplete's items with a sentinel id so
// Vuetify never confuses them with real values; the model-value handler strips
// them in case one gets selected via keyboard.
const GROUP_HEADER_PREFIX = '__group:'
const UNCATEGORIZED_KEY = '__uncategorized'

type ContentGroup = { key: string; title: string; color?: string; items: { id: string; title: string }[] }

const contentGroups = computed<ContentGroup[]>(() => {
  const byKey = new Map<string, ContentGroup>()
  for (const col of collections.value) {
    const key = col.categoryId ?? UNCATEGORIZED_KEY
    let group = byKey.get(key)
    if (!group) {
      const cat = key === UNCATEGORIZED_KEY ? undefined : categories.value.find(c => c.id === key)
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

type ContentItem = { id: string; title: string; header?: boolean; groupKey?: string; color?: string; count?: number }

const groupedContentItems = computed<ContentItem[]>(() => {
  // With a single group (or no categories at all) headers are pure noise.
  if (contentGroups.value.length <= 1) return contentGroups.value[0]?.items ?? []
  return contentGroups.value.flatMap(g => [
    { id: `${GROUP_HEADER_PREFIX}${g.key}`, title: g.title, header: true, groupKey: g.key, color: g.color, count: g.items.length },
    ...g.items,
  ])
})

// Keep a group header visible while any of its collections still matches the query.
function contentFilter(value: string, query: string, item?: { raw?: ContentItem }) {
  const q = query.toLowerCase()
  const raw = item?.raw
  if (raw?.header) {
    const group = contentGroups.value.find(g => g.key === raw.groupKey)
    return raw.title.toLowerCase().includes(q) || !!group?.items.some(i => i.title.toLowerCase().includes(q))
  }
  return String(value).toLowerCase().includes(q)
}

function categorySelectionState(groupKey: string): 'all' | 'some' | 'none' {
  const group = contentGroups.value.find(g => g.key === groupKey)
  if (!group || !group.items.length) return 'none'
  const selected = new Set(contentCollectionIds.value)
  const count = group.items.filter(i => selected.has(i.id)).length
  return count === group.items.length ? 'all' : count > 0 ? 'some' : 'none'
}

function toggleContentCategory(groupKey: string) {
  const group = contentGroups.value.find(g => g.key === groupKey)
  if (!group) return
  const selected = new Set(contentCollectionIds.value)
  if (categorySelectionState(groupKey) === 'all') {
    group.items.forEach(i => selected.delete(i.id))
  } else {
    group.items.forEach(i => selected.add(i.id))
  }
  contentCollectionIds.value = [...selected]
}

function toggleAllContentCollections() {
  contentCollectionIds.value = contentCollectionIds.value.length === collections.value.length
    ? []
    : collections.value.map(c => c.id)
}
// Freezes the content-widget selector (spinner + disabled) until its remote
// value has been pulled and resolved against the loaded collections on mount.
const loadingContentWidget = ref(true)
const notificationCollectionId = ref<string | null>(null)
const startHour = ref(9)
const endHour = ref(10)
const intervalSeconds = ref(30)
const saving = ref(false)
const saved = ref(false)

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`
}))

const intervalOptions = [
  { value: 30, label: 'Every 30 seconds' },
  { value: 60, label: 'Every minute' },
  { value: 120, label: 'Every 2 minutes' },
  { value: 300, label: 'Every 5 minutes' },
  { value: 600, label: 'Every 10 minutes' },
]

onMounted(async () => {
  // Load collections from the local cache first (fast) so the Study View selector
  // can resolve its stored id to a title immediately, instead of briefly showing
  // the raw id while the remote sync below runs. The heavier per-collection data
  // (items, progress) is also local; the global sync engine keeps it fresh.
  loadingCollections.value = true
  try {
    const [raw, cats] = await Promise.all([getCollections(), getCategories()])
    collections.value = raw
      .filter((c): c is typeof c & { id: string } => !!c.id)
      .sort((a, b) => a.title.localeCompare(b.title))
    categories.value = cats

    const entries = await Promise.all(
      collections.value.map(async c => {
        const items = await getLearningItems(c.id)
        return [c.id, new Set(items.map(i => i.id).filter(Boolean) as string[])] as const
      })
    )
    collectionItemIds.value = new Map(entries)

    const progress = await getAllCardProgress()
    strengthByItem.value = new Map(progress.map(p => [p.learning_item_id, p.strength_score]))
  } finally {
    loadingCollections.value = false
  }

  // Now pull a fresh set of the two study-options objects that live in both
  // Firestore and the local DB (content widget + excluded items), then resolve
  // the content widget against the collections loaded above. loadExcludedItems()
  // re-hydrates the reactive set the composable populated at setup. The content
  // widget selector stays frozen (spinner + disabled) until this finishes.
  try {
    await Promise.all([syncContentWidget(), syncExcludedItems()])
    await loadExcludedItems()

    const { contentCollectionIds: storedContentIds } = await getLocalContentWidget()
    if (storedContentIds?.length) {
      const existingIds = new Set(collections.value.map(c => c.id))
      contentCollectionIds.value = storedContentIds.filter((id: string) => existingIds.has(id))
      missingContentCollectionIds.value = storedContentIds.filter((id: string) => !existingIds.has(id))
    }
  } finally {
    loadingContentWidget.value = false
  }

  // Notification settings are still chrome.storage-only (extension context).
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const stored = await chrome.storage.local.get([
      'notificationCollectionId',
      'sessionStartHour',
      'sessionEndHour',
      'notificationIntervalSeconds',
    ])
    if (stored.notificationCollectionId) notificationCollectionId.value = stored.notificationCollectionId
    if (stored.sessionStartHour != null) startHour.value = stored.sessionStartHour
    if (stored.sessionEndHour != null) endHour.value = stored.sessionEndHour
    if (stored.notificationIntervalSeconds) intervalSeconds.value = stored.notificationIntervalSeconds
  }

  if (studyViewCollectionId.value) {
    exclusionCollectionIds.value = [studyViewCollectionId.value]
  }
})

async function saveNotificationSettings() {
  saving.value = true
  try {
    setStudyViewCollectionId(studyViewCollectionId.value)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({
        notificationCollectionId: notificationCollectionId.value,
        sessionStartHour: startHour.value,
        sessionEndHour: endHour.value,
        notificationIntervalSeconds: intervalSeconds.value,
      })
    }
    // Content widget only → cache + remote (writes contentCollectionIds itself with
    // lastModified/pending bookkeeping, so it's dropped from the bulk set() above).
    await saveContentWidget([...contentCollectionIds.value])
    saved.value = true
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.study-options {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  box-sizing: border-box;
}

@media (max-width: 600px) {
  .study-options {
    padding: 12px !important;
  }
}

.gap-3 {
  gap: 12px;
}

.content-group-header {
  min-height: 36px;
}

.content-group-child {
  padding-inline-start: 32px !important;
}

.exclusion-table {
  width: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
}

.exclusion-row {
  cursor: pointer;
  user-select: none;
}

.exclusion-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.exclusion-row.is-excluded {
  background: rgba(var(--v-theme-error), 0.06);
}

.exclusion-check-col {
  width: 56px;
}

.item-link {
  color: inherit;
  text-decoration: none;
  font-size: 1rem;
}

.item-link:hover {
  text-decoration: underline;
}

@media (max-width: 400px) {
  .time-row {
    flex-direction: column !important;
    gap: 0 !important;
  }
}
</style>
