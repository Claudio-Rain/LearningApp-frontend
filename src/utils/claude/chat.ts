// Multi-turn Q&A grounded in one specific flashcard.

import type { JSONContent } from '@tiptap/vue-3'
import { extractText } from './text'
import { streamText, createText } from './client'
import type { ChatMessage } from './types'

// The card's front/back ride along as the system prompt so every turn stays
// grounded in the card being studied.
const cardSystem = (title: string, body: string): string =>
  `You are a study assistant. The user is reviewing this flashcard:\n\n` +
  `Front: ${title}` +
  (body.trim() ? `\n\nBack:\n${body.trim()}` : '') +
  `\n\nAnswer the user's questions about this card clearly and concisely. ` +
  `Stay focused on helping them understand this material.`

/**
 * Stream a multi-turn chat about a specific flashcard, from TipTap content.
 * Throws if no key is set or the request fails.
 */
export const streamCardChat = async (
  title: string,
  content: JSONContent | undefined,
  messages: ChatMessage[],
  onToken: (chunk: string) => void
): Promise<void> => {
  await streamText(
    { max_tokens: 1024, system: cardSystem(title, extractText(content)), messages },
    onToken
  )
}

/**
 * Non-streaming variant used by the background worker on behalf of the content
 * widget: takes the card body as plain markdown, returns the reply as one
 * piece. Throws if no key is set or the request fails.
 */
export const cardChatMarkdown = async (
  title: string,
  body: string,
  messages: ChatMessage[]
): Promise<string> =>
  createText({ max_tokens: 1024, system: cardSystem(title, body), messages })
