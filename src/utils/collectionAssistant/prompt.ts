// System-prompt construction: how the collection is described to the model,
// and (for small collections) how every item's full content is embedded.

import { extractText } from '../claude'
import type { AssistantItem } from './types'

// When a collection's full text fits under this budget we embed every item
// (id + title + full content) straight into the system prompt instead of making
// the model fetch previews through tools. That grounds it from the first token —
// the same way the single-card assistants work — so summaries and "hardest
// question" style reasoning see real content, not 200-char snippets. Roughly a
// character proxy for tokens (~4 chars/token → ~12k tokens), well within budget.
export const MAX_EMBED_CHARS = 48_000

// Rough output cost of proposing one edit: a 36-char UUID tokenizes to about
// 20, title and body land near a token per 4 characters, and the JSON wrapper
// adds a few. The body the model writes tracks the one it replaces, so the
// current card is the estimate — padded, since a rewrite usually comes back
// longer than the original.
const REWRITE_GROWTH = 1.5

const editTokens = (item: AssistantItem): number =>
  30 + Math.ceil(((item.title.length + extractText(item.content).length) / 4) * REWRITE_GROWTH)

/**
 * The largest number of edits that is safe to ask for in one message, given
 * `outputBudget` tokens of room. There is no fixed cap: a batch is limited only
 * by what fits, so short collections go in a single message and long ones split
 * only as far as they must. Every extra message re-sends the whole prompt, so
 * splitting further than necessary costs real money.
 *
 * Counts the largest items first, so the answer holds whichever items the model
 * actually picks — not just an average-sized batch.
 */
export const maxProposalsPerMessage = (
  items: AssistantItem[],
  outputBudget: number,
): number => {
  // Leave the model room to write its reply alongside the proposal.
  const budget = outputBudget * 0.85
  const costs = items.map(editTokens).sort((a, b) => b - a)

  let used = 0
  let fits = 0
  for (const cost of costs) {
    if (used + cost > budget) break
    used += cost
    fits++
  }
  // One oversized card must still be proposable on its own; it either fits the
  // response or gets cut short, and refusing to try helps nobody.
  return Math.max(1, fits)
}

// Render every item's id, title, and full content as a block for the system
// prompt. Used only when the whole collection fits under MAX_EMBED_CHARS.
export const renderItemsBlock = (items: AssistantItem[]): string =>
  items
    .map((it, i) => {
      const body = extractText(it.content).trim()
      return (
        `### Item ${i + 1}\n` +
        `id: ${it.id}\n` +
        `Title: ${it.title}\n` +
        `Content:\n${body || '(empty)'}`
      )
    })
    .join('\n\n')

export const buildSystem = (
  collection: { title: string; description?: string },
  itemCount: number,
  // When present, the collection was small enough to embed in full: the model
  // reads items straight from here and has no read tools. When null, the model
  // must fetch items through list_items / read_item.
  itemsBlock: string | null,
  // Derived from the collection's own card sizes — see maxProposalsPerMessage.
  maxProposals: number,
): string =>
  `You are a study assistant embedded in a flashcard app, helping the user work with one collection of learning items (flashcards).\n\n` +
  `Collection: "${collection.title}"` +
  (collection.description ? `\nDescription: ${collection.description}` : '') +
  `\nIt currently has ${itemCount} learning item${itemCount === 1 ? '' : 's'}.\n\n` +
  `Each learning item is a flashcard with a title (the question/front) and content (the answer/back).\n\n` +
  `You can:\n` +
  `- Answer questions about the collection and its items (hardest/best questions, summaries, study advice).\n` +
  `- Add, edit, or delete items when asked.\n\n` +
  `Rules:\n` +
  (itemsBlock
    ? `- The full collection is given below. Base every answer on the actual item content there — read it carefully rather than guessing from titles.\n`
    : `- Use list_items to see the collection before reasoning about it as a whole. The list only has short previews, so before you judge difficulty, compare, or answer questions about what an item actually says, call read_item to get its full content.\n`) +
  `- NEVER claim you created, edited, or deleted anything. The propose_* tools only show the user an approval card — the user makes the final change. After proposing, briefly tell the user to review the card.\n` +
  `- When the user asks for "N exercises/questions", propose exactly N with propose_create_items.\n` +
  `- Put every edit you are making into ONE propose_update_items call so the user approves them all at once — never call it repeatedly with a single item each. Cover the whole request in that one call whenever you can; the user approves the batch in one click, so a bigger batch is better for them, and splitting a request across messages costs them more. Only if a request touches more than ${maxProposals} items, do ${maxProposals} per message (more than that overruns the reply limit and the whole batch is lost), say how many are left, and continue when the user asks.\n` +
  `- Keep chat replies concise and friendly. Use markdown.` +
  (itemsBlock
    ? `\n\n---\nFull collection (${itemCount} item${itemCount === 1 ? '' : 's'}):\n\n${itemsBlock}`
    : '')
