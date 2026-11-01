import { ref } from 'vue'
import { formatISO } from 'date-fns'
import {
  getCollections,
  createCollection,
  createLearningItem,
  editCollection,
  getCategories,
  createCategory
} from '@/database'
import type { Category, Collection } from '@/database/types'
import type { JSONContent } from '@tiptap/vue-3'
import { generateAnswerMarkdown } from '@/utils/claude'
import { markdownToTiptap } from '@/utils/markdown'
import { swatchFor } from '@/utils/categoryColors'
import type { ParsedCollection, ParsedItem } from '../parse'

const now = () => formatISO(new Date())
const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

const plainAnswer = (text: string): JSONContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
})

interface InsertOptions {
  /** Have Claude write each answer instead of using the parsed one. */
  answerWithAI: boolean
  /** Called before each AI answer with the running count across the whole insert. */
  onProgress?: (done: number, total: number) => void
}

/**
 * Writing parsed items to the store: finding or creating categories and
 * collections by title, creating the items, and keeping item counts in step.
 */
export function useBulkInsert() {
  const collections = ref<Collection[]>([])
  const categories = ref<Category[]>([])

  const load = async () => {
    collections.value = await getCollections()
    categories.value = await getCategories()
  }

  const reloadCollections = async () => {
    collections.value = await getCollections()
  }

  /** Find an existing category by title (case-insensitive) or create a new one. */
  const resolveCategory = async (title: string | null): Promise<string | null> => {
    const name = title?.trim()
    if (!name) return null

    const existing = categories.value.find(c => sameTitle(c.title, name))
    if (existing?.id) return existing.id

    const at = now()
    const id = (await createCategory({
      title: name,
      // By position, so new categories don't all come out the same color.
      color: swatchFor(categories.value.length),
      parentId: null,
      dateCreated: at,
      lastModified: at
    })) as string
    categories.value = await getCategories()
    return id
  }

  /**
   * File an existing collection under a category, if one is given and it isn't
   * there already. Reloads so the item-count write later doesn't put back the
   * old category.
   */
  const applyCategory = async (collection: Collection, categoryId: string | null) => {
    if (!categoryId || collection.categoryId === categoryId) return
    await editCollection({ ...collection, categoryId, lastModified: now() })
    await reloadCollections()
  }

  /**
   * Find an existing collection by title (case-insensitive) or create a new one.
   * The category is applied in both cases, so re-running a bulk insert can also
   * re-file existing collections.
   */
  const resolveCollectionByTitle = async (title: string, categoryId: string | null): Promise<string> => {
    const existing = collections.value.find(c => sameTitle(c.title, title))
    if (existing?.id) {
      await applyCategory(existing, categoryId)
      return existing.id
    }

    const at = now()
    const id = (await createCollection({
      title: title.trim(),
      categoryId,
      dateCreated: at,
      lastModified: at,
      numberOfItems: 0
    })) as string
    await reloadCollections()
    return id
  }

  /** An existing collection picked from the list, re-filed under the category if one is given. */
  const resolveCollectionById = async (id: string, categoryId: string | null): Promise<string> => {
    const existing = collections.value.find(c => c.id === id)
    if (existing) await applyCategory(existing, categoryId)
    return id
  }

  /** Create the valid items in a collection and bump its item count. */
  const insertItems = async (
    collectionId: string,
    items: ParsedItem[],
    options: InsertOptions,
    progress: { done: number; total: number }
  ) => {
    const valid = items.filter(i => i.valid)
    if (valid.length === 0) return

    const createdAt = now()
    for (const item of valid) {
      let content: JSONContent
      if (options.answerWithAI) {
        progress.done += 1
        options.onProgress?.(progress.done, progress.total)
        content = markdownToTiptap(await generateAnswerMarkdown(item.question))
      } else {
        content = plainAnswer(item.answer)
      }
      await createLearningItem({ collectionId, title: item.question, content, dateCreated: createdAt, lastModified: now() })
    }

    const col = collections.value.find(c => c.id === collectionId)
    if (col) {
      await editCollection({ ...col, numberOfItems: col.numberOfItems + valid.length, lastModified: now() })
    }
  }

  const countAll = (lists: ParsedItem[][]) => lists.reduce((n, items) => n + items.filter(i => i.valid).length, 0)

  /** Standard mode: every item into one collection, picked by id or created by title. */
  const insertIntoOne = async (
    target: { kind: 'existing'; id: string } | { kind: 'new'; title: string },
    categoryTitle: string | null,
    items: ParsedItem[],
    options: InsertOptions
  ) => {
    const categoryId = await resolveCategory(categoryTitle)
    const collectionId = target.kind === 'new'
      ? await resolveCollectionByTitle(target.title, categoryId)
      : await resolveCollectionById(target.id, categoryId)
    await insertItems(collectionId, items, options, { done: 0, total: countAll([items]) })
    await reloadCollections()
  }

  /** Full text mode: each parsed collection, with its "# Category", in turn. */
  const insertMany = async (parsed: ParsedCollection[], options: InsertOptions) => {
    const progress = { done: 0, total: countAll(parsed.map(c => c.items)) }
    for (const col of parsed) {
      if (col.items.every(i => !i.valid)) continue
      const categoryId = await resolveCategory(col.categoryTitle)
      const collectionId = await resolveCollectionByTitle(col.title, categoryId)
      await insertItems(collectionId, col.items, options, progress)
    }
    await reloadCollections()
  }

  return { collections, categories, load, insertIntoOne, insertMany }
}
