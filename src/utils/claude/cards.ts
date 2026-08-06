// Card-authoring helpers: splitting one card into several, and rewriting a
// mid-chat question into a self-contained flashcard title.

import type { JSONContent } from '@tiptap/vue-3'
import { extractText } from './text'
import { createText } from './client'
import type { SplitProposal } from './types'

/**
 * Split one flashcard into `splits` smaller, self-contained cards. Claude reads
 * the original front/back and returns question/answer pairs (answers in
 * markdown) that together cover the same material. Throws if no key is set, the
 * request fails, or the reply isn't the JSON array we asked for.
 */
export const proposeCardSplit = async (
  title: string,
  content: JSONContent | undefined,
  splits: number
): Promise<SplitProposal[]> => {
  const body = extractText(content).trim()
  const system =
    `You split one flashcard into several smaller, self-contained flashcards.\n\n` +
    `Original card:\nFront: ${title}` +
    (body ? `\n\nBack:\n${body}` : '') +
    `\n\nDivide this material into exactly ${splits} flashcard${splits === 1 ? '' : 's'}. ` +
    `Each card must stand alone: a short, specific question for the front and a concise ` +
    `markdown answer for the back, drawn from the original material (fill small gaps with ` +
    `well-known facts, but do not invent new topics). Together the cards should cover the ` +
    `original card without overlapping each other.\n\n` +
    `Reply with ONLY a JSON array of exactly ${splits} objects shaped like ` +
    `{"question": "...", "answer": "..."} — no prose, no code fences.`

  const text = await createText({
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: `Split the card into ${splits} part${splits === 1 ? '' : 's'} now.` }],
  })

  // Tolerate stray prose around the array: parse from the first '[' to the last ']'.
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end <= start) throw new Error('Claude did not return a JSON array')
  const parsed = JSON.parse(text.slice(start, end + 1))
  if (!Array.isArray(parsed)) throw new Error('Claude did not return a JSON array')

  const proposals = parsed
    .map((p: any): SplitProposal => ({
      question: String(p?.question ?? '').trim(),
      answer: String(p?.answer ?? '').trim(),
    }))
    .filter((p) => p.question)
  if (proposals.length === 0) throw new Error('Claude returned no usable cards')
  return proposals
}

/**
 * Rewrite a chat question into a self-contained flashcard title. Questions
 * asked mid-chat ("why do we need this?") lean on the card for context, so
 * saved verbatim they make meaningless titles; Claude resolves the pronouns
 * against the card first ("Why do we need named routes?"). Throws if no key is
 * set or the request fails.
 */
export const rewriteAsStandaloneQuestion = async (
  cardTitle: string,
  cardContent: JSONContent | undefined,
  question: string
): Promise<string> => {
  const body = extractText(cardContent).trim()
  const system =
    `The user is studying this flashcard:\n\n` +
    `Front: ${cardTitle}` +
    (body ? `\n\nBack:\n${body}` : '') +
    `\n\nThey asked a follow-up question in chat and want to save it as a new standalone flashcard. ` +
    `Rewrite their question so it makes sense on its own, away from this card: replace words like ` +
    `"this", "it", "that" with the concrete concept they refer to. Preserve the user's intent and ` +
    `phrasing as much as possible, keep it to one short sentence, and reply with ONLY the rewritten ` +
    `question — no quotes, no explanation.`

  const text = await createText({
    max_tokens: 200,
    system,
    messages: [{ role: 'user', content: question }],
  })
  return text.trim()
}
