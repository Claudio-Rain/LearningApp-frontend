import type { JSONContent } from '@tiptap/vue-3'
import type { LearningItem, CardProgress } from '@/database/types'

/** A card in the study queue, carrying the progress it had when the queue was built. */
export interface StudyItem extends LearningItem {
  progress?: CardProgress
}

/** What it takes to create a card: a title (optionally rich) and an optional answer. */
export interface CardEntry {
  title: string
  titleContent?: JSONContent
  content?: JSONContent
}

/** Surface-level message for the view's snackbar. */
export type Notify = (message: string, error?: boolean) => void
