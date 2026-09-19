import type { JSONContent } from '@tiptap/vue-3'

interface Syncable {
  syncStatus?: 'pending' | 'synced' | 'error'
  remoteId?: string
}

export interface Category extends Syncable {
  id?: string
  title: string
  // Hex color for the category chip, e.g. '#1976D2'.
  color?: string
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
  starred?: boolean
  lastModified: string
  dateCreated: string
  numberOfItems: number
}

export interface LearningItem extends Syncable {
  id?: string
  collectionId: string
  // Plain text, always. Everything that isn't the rendered card reads this:
  // sorting, search, autocompletes, Claude prompts, OS notifications, dialogs.
  // For an item with a rich title it is the flattened text of `titleContent`,
  // kept in step on every write.
  title: string
  // The rich title, when the item has one. Absent means the title is just
  // `title` — most items, and every item written before rich titles existed.
  titleContent?: JSONContent
  content?: JSONContent
  // Labels on a 1-5 scale, absent until the item has been labeled. Both are
  // independent of CardProgress.strength_score, which measures how well *you*
  // know the item — these describe the card itself.
  //
  // `priority` is relative to the user's current goal ("my focus is work").
  priority?: number
  difficulty?: number
  dateCreated: string
  lastModified: string
}

/** The label fields alone, for partial writes that must not touch `content`. */
export type ItemLabels = Pick<LearningItem, 'priority' | 'difficulty'>

/**
 * A label write. Omit a key to leave that label as it is; pass `null` to clear
 * it back to unlabeled. `undefined` is not a value here — it means "not in this
 * patch" — which is why clearing needs its own marker.
 */
export type ItemLabelPatch = { [K in keyof ItemLabels]?: ItemLabels[K] | null }

/**
 * An in-memory edit patch for one item. `titleContent` follows the same
 * convention as the labels above: omit the key to leave it alone, pass `null`
 * to clear a rich title back to plain text. It matters that clearing has its
 * own marker — an explicit `undefined` would reach Firestore, which rejects it.
 */
export type ItemEditPatch =
  Omit<Partial<LearningItem>, keyof ItemLabelPatch | 'titleContent'> &
  ItemLabelPatch & { titleContent?: JSONContent | null }

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
  // Seconds the widget shows an item before auto-advancing. Optional for
  // backward-compat with settings saved before this field existed.
  autoAdvanceSeconds?: number
  lastModified: string   // ISO — drives lastModified-wins reconciliation
}