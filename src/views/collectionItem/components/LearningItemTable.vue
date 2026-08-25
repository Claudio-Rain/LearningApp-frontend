<template>
  <v-data-table
    v-if="items.length > 0"
    :headers="headers"
    :items="items"
    :items-per-page="-1"
    hide-default-footer
    :sort-by="[{ key: 'title', order: 'asc' }]"
    density="comfortable"
    class="item-table"
    hover
    :row-props="rowProps"
    @click:row="onRowClick"
  >
    <template #item.rowNumber="{ index }">
      <span class="row-number">{{ index + 1 }}</span>
    </template>
    <template #item.title="{ item }">
      <v-tooltip :text="item.title" location="top" open-delay="300" max-width="600">
        <template #activator="{ props: tooltipProps }">
          <span v-bind="tooltipProps" class="item-title">{{ item.title }}</span>
        </template>
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
</template>

<script setup lang="ts">
import type { LearningItem } from '@/database/types'

const props = defineProps<{
  items: LearningItem[]
  selectedId?: string
}>()

const emit = defineEmits<{
  select: [item: LearningItem]
  delete: [item: LearningItem]
}>()

const headers = [
  { title: '#', key: 'rowNumber', sortable: false, align: 'center' as const, width: '50px' },
  { title: 'Title', key: 'title', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'center' as const, width: '48px' },
]

const rowProps = ({ item }: { item: LearningItem }) => ({
  class: props.selectedId && props.selectedId === item.id ? 'selected-row' : ''
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

.row-number {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.item-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  width: 100%;
  font-size: 1rem;
}

:deep(.item-table .v-table__wrapper) {
  flex: 1;
  overflow-y: auto;
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

:deep(.v-table td),
:deep(.v-table th) {
  border: none !important;
}

:deep(.v-table table) {
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
