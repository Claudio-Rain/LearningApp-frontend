import type { JSONContent } from '@tiptap/vue-3'

interface Syncable {
  syncStatus?: 'pending' | 'synced' | 'error'
  remoteId?: string
}

export interface Collection extends Syncable {
  id?: string
  title: string
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