import { formatISO } from 'date-fns'
import {
  getCollections,
  createLearningItem,
  editLearningItem,
  editCollection,
  syncLearningItems,
  syncCollections
} from '@/database'
import { generateAnswerMarkdown } from '@/utils/claude'
import { markdownToTiptap } from '@/utils/markdown'
import type { CardEntry, StudyItem } from '../types'
import type { useStudySession } from './useStudySession'

type Session = Pick<ReturnType<typeof useStudySession>, 'appendItems' | 'patchItem'>

/**
 * Creating cards from the study screen (add dialog, chat save, split) and
 * filling their answers with Claude, keeping the session in step so new cards
 * come up this session and generated answers show when flipped.
 */
export function useCardFactory(studiedCollectionIds: () => string[], session: Session) {
  // Bumps the collection's item count and kicks the background sync. New
  // cards join the queue only when their collection is the one being studied.
  const createCards = async (collectionId: string, entries: CardEntry[]): Promise<StudyItem[]> => {
    const now = formatISO(new Date())
    const created: StudyItem[] = []
    for (const { title, titleContent, content } of entries) {
      const id = String(await createLearningItem({ collectionId, title, titleContent, content, dateCreated: now, lastModified: now }))
      created.push({ id, collectionId, title, ...(titleContent ? { titleContent } : {}), content, dateCreated: now, lastModified: now })
    }

    const collection = (await getCollections()).find(c => c.id === collectionId)
    if (collection) {
      await editCollection({ ...collection, numberOfItems: (collection.numberOfItems || 0) + created.length, lastModified: now })
      syncCollections().catch(() => {})
    }
    syncLearningItems().catch(() => {})

    if (studiedCollectionIds().includes(collectionId)) session.appendItems(created)
    return created
  }

  // Takes the created card rather than its id and title: writing back a rebuilt
  // object would silently drop whatever else the card carries — a rich title,
  // most of all, which the answer has no business touching.
  const autoAnswer = async (card: StudyItem) => {
    const { progress: _progress, ...item } = card
    const content = markdownToTiptap(await generateAnswerMarkdown(card.title))
    await editLearningItem({ ...item, content, lastModified: formatISO(new Date()) })
    syncLearningItems().catch(() => {})
    session.patchItem(card.id!, { content })
  }

  /**
   * Answer a batch one card at a time — one in-flight request instead of a
   * burst. Never throws; resolves with how many cards failed.
   */
  const autoAnswerAll = async (cards: StudyItem[]): Promise<number> => {
    let failed = 0
    for (const card of cards) {
      try {
        await autoAnswer(card)
      } catch (error) {
        failed++
        console.error(`Auto-answer failed for "${card.title}":`, error)
      }
    }
    return failed
  }

  return { createCards, autoAnswer, autoAnswerAll }
}

export type CardFactory = ReturnType<typeof useCardFactory>
