import type { JSONContent } from '@tiptap/vue-3'

interface Syncable {
  syncStatus?: 'pending' | 'synced' | 'error'
  remoteId?: string
}

export interface Category extends Syncable {
  id?: string
  title: string
  // null = root category. Unused for now (every category is a root); kept on the
  // schema so nested categories become pure UI/query work with no data migration.
  parentId?: string | null
  lastModified: string
  dateCreated: string
}

export interface Collection extends Syncable {
  id?: string
  title: string
  description?: string
  // null/undefined = uncategorized. A collection belongs to 0 or 1 category.
  categoryId?: string | null
  lastModified: string
  dateCreated: string
  numberOfItems: number
}

export interface LearningItem extends Syncable {
  id?: string
  collectionId: string
  title: string
  content?: JSONContent
  dateCreated: string
  lastModified: string
}

export interface CardProgress extends Syncable {
  id?: string
  learning_item_id: string
  strength_score: number
  last_reviewed_at: string
  weighted_attempts: number
  total_attempts: number
}

export interface AttemptLog extends Syncable {
  id?: string
  learning_item_id: string
  is_correct: boolean
  ease_score: number
  created_at: string
}

export interface ExcludedItem extends Syncable {
  id?: string
  learningItemId: string
  dateCreated: string
  lastModified: string
}

export interface ContentWidgetSettings {
  contentCollectionIds: string[]
  lastModified: string   // ISO — drives lastModified-wins reconciliation
}