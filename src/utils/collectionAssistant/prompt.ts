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

// How many item edits the model may write in one message. They all land on a
// single approval card, so this is not about clicks — it is the output budget:
// each rewritten card body runs to hundreds of tokens, and a batch that
// overruns MAX_TOKENS in ./run loses the proposal it was mid-way through.
// Sized to sit comfortably inside that budget with room for the reply text.
const MAX_PROPOSALS_PER_MESSAGE = 25

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
  `- Put every edit you are making into ONE propose_update_items call so the user approves them all at once — never call it repeatedly with a single item each. If a request touches more than ${MAX_PROPOSALS_PER_MESSAGE} items, do ${MAX_PROPOSALS_PER_MESSAGE} per message (more than that overruns the reply limit and the whole batch is lost), say how many are left, and continue when the user asks.\n` +
  `- Keep chat replies concise and friendly. Use markdown.` +
  (itemsBlock
    ? `\n\n---\nFull collection (${itemCount} item${itemCount === 1 ? '' : 's'}):\n\n${itemsBlock}`
    : '')
