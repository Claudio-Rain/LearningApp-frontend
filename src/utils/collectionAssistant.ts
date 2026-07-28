// Collection-scoped AI assistant.
//
// A general chat assistant for one collection and its learning items. It can
// answer questions ("what's the hardest question?", "summarize this
// collection") and drive CRUD through a tool-use loop. Reads run silently;
// every write (create / update / delete) is surfaced to the user as an
// interactive proposal they must approve before anything touches the database.
//
// Bring-your-own-key, same as ../utils/claude.ts: the user's Anthropic key
// lives only in this browser and is sent directly from it, so
// `dangerouslyAllowBrowser` is safe here.

import Anthropic from '@anthropic-ai/sdk'
import type { JSONContent } from '@tiptap/vue-3'
import { getApiKey, extractText, type ChatMessage } from './claude'

// Matches the model the rest of the app uses (see ../utils/claude.ts) so a
// user's key sees one consistent model across every AI feature.
const MODEL = 'claude-sonnet-4-6'

// Cap the agentic loop so a misbehaving turn can't spin forever against the
// user's key. Each pass is one model request; reads add passes, so this leaves
// generous room (list -> read a few -> propose -> summarize).
const MAX_STEPS = 8

export type { ChatMessage }

/** One learning item as the assistant sees it. */
export interface AssistantItem {
  id: string
  title: string
  content?: JSONContent
}

export interface CreateProposalItem {
  title: string
  /** Markdown; converted to rich text when the user approves. */
  content: string
}

export interface DeleteProposalItem {
  id: string
  title: string
  reason?: string
}

export interface UpdateProposal {
  id: string
  currentTitle: string
  title?: string
  content?: string
}

/** A pending write the user must approve before it runs. */
export type Proposal =
  | { kind: 'create'; items: CreateProposalItem[] }
  | { kind: 'delete'; items: DeleteProposalItem[] }
  | { kind: 'update'; update: UpdateProposal }

export interface AssistantHandlers {
  /** Streamed assistant text, chunk by chunk. */
  onText: (chunk: string) => void
  /** A write proposal to render as an approval card. */
  onProposal: (proposal: Proposal) => void
  /** Live view of the collection's items (re-read each tool call). */
  getItems: () => AssistantItem[]
}

// Tool surface. Reads (`list_items`, `read_item`) execute and feed results back
// to the model. Writes (`propose_*`) never touch the DB here — they raise a
// proposal for the user and return an acknowledgement so the model can wrap up.
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_items',
    description:
      'List every learning item in this collection with its id, title, and a short content preview. Call this first whenever you need to reason about the collection as a whole — finding the hardest / best / least-relevant items, counting, or summarizing.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'read_item',
    description:
      'Read the full title and content of one learning item by id. Use when the short preview from list_items is not enough.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'The learning item id.' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_create_items',
    description:
      'Propose one or more NEW learning items to add. This does NOT create them — it shows the user an approval card they confirm first. Each item is a flashcard: `title` is the question/front, `content` is the answer/explanation as markdown.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'The items to propose adding.',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'The question / front of the card.' },
              content: { type: 'string', description: 'The answer / back, in markdown.' },
            },
            required: ['title', 'content'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_delete_items',
    description:
      'Propose learning items to DELETE. This does NOT delete anything — it shows the user a checklist they approve per-item or all at once. Give each item a short `reason` so the user can judge.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'The items to propose deleting.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The learning item id to delete.' },
              reason: { type: 'string', description: 'Why this item is a deletion candidate.' },
            },
            required: ['id'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_update_item',
    description:
      "Propose an edit to an existing item's title and/or content. This does NOT save — it shows the user a proposal to approve. Provide `content` as markdown when changing the body.",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The learning item id to edit.' },
        title: { type: 'string', description: 'New title, if changing it.' },
        content: { type: 'string', description: 'New content as markdown, if changing it.' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
]

const PREVIEW_CHARS = 200

const preview = (item: AssistantItem): string => {
  const body = extractText(item.content).trim().replace(/\s+/g, ' ')
  return body.length > PREVIEW_CHARS ? body.slice(0, PREVIEW_CHARS) + '…' : body
}

const buildSystem = (
  collection: { title: string; description?: string },
  itemCount: number,
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
  `- Use list_items to see the collection before reasoning about it as a whole; use read_item for full content.\n` +
  `- NEVER claim you created, edited, or deleted anything. The propose_* tools only show the user an approval card — the user makes the final change. After proposing, briefly tell the user to review the card.\n` +
  `- When the user asks for "N exercises/questions", propose exactly N with propose_create_items.\n` +
  `- Keep chat replies concise and friendly. Use markdown.`

// Feed the model back the result of a read tool. Returns the tool_result block.
const runReadTool = (
  name: string,
  input: any,
  getItems: () => AssistantItem[],
): string => {
  const items = getItems()
  if (name === 'list_items') {
    if (items.length === 0) return 'The collection has no learning items yet.'
    return JSON.stringify(
      items.map((it) => ({ id: it.id, title: it.title, preview: preview(it) })),
    )
  }
  if (name === 'read_item') {
    const item = items.find((it) => it.id === input?.id)
    if (!item) return `No item found with id "${input?.id}".`
    return JSON.stringify({
      id: item.id,
      title: item.title,
      content: extractText(item.content).trim(),
    })
  }
  return `Unknown tool: ${name}`
}

const plural = (n: number) => (n === 1 ? '' : 's')

const proposeCreate = (input: any, handlers: AssistantHandlers): string => {
  const items: CreateProposalItem[] = (input?.items ?? [])
    .map((p: any) => ({ title: String(p?.title ?? '').trim(), content: String(p?.content ?? '') }))
    .filter((p: CreateProposalItem) => p.title)
  if (items.length === 0) return 'No valid items to create were provided.'
  handlers.onProposal({ kind: 'create', items })
  return `Showed the user an approval card to add ${items.length} item${plural(items.length)}. Awaiting their review.`
}

const proposeDelete = (input: any, handlers: AssistantHandlers): string => {
  const live = handlers.getItems()
  const titleFor = (id: string) => live.find((it) => it.id === id)?.title ?? '(unknown item)'
  const items: DeleteProposalItem[] = (input?.items ?? [])
    .map((p: any) => ({ id: String(p?.id ?? ''), title: titleFor(String(p?.id ?? '')), reason: p?.reason ? String(p.reason) : undefined }))
    .filter((p: DeleteProposalItem) => p.id && live.some((it) => it.id === p.id))
  if (items.length === 0) return 'None of the given ids matched an item in this collection.'
  handlers.onProposal({ kind: 'delete', items })
  return `Showed the user a deletion checklist for ${items.length} item${plural(items.length)}. Awaiting their review.`
}

const proposeUpdate = (input: any, handlers: AssistantHandlers): string => {
  const live = handlers.getItems()
  const id = String(input?.id ?? '')
  const current = live.find((it) => it.id === id)
  if (!current) return `No item found with id "${id}".`
  handlers.onProposal({
    kind: 'update',
    update: {
      id,
      currentTitle: current.title,
      title: input?.title ? String(input.title) : undefined,
      content: input?.content !== undefined ? String(input.content) : undefined,
    },
  })
  return `Showed the user an edit proposal for "${current.title}". Awaiting their review.`
}

// Turn a write tool call into a Proposal for the UI. Returns the acknowledgement
// text sent back to the model so it knows the card is up. Never touches the DB —
// the actual write happens only when the user approves the card.
const runWriteTool = (name: string, input: any, handlers: AssistantHandlers): string => {
  switch (name) {
    case 'propose_create_items': return proposeCreate(input, handlers)
    case 'propose_delete_items': return proposeDelete(input, handlers)
    case 'propose_update_item': return proposeUpdate(input, handlers)
    default: return `Unknown tool: ${name}`
  }
}

// Execute every tool_use block in an assistant message and return the matching
// tool_result blocks. Reads run and feed data back; writes raise a proposal.
const handleToolUses = (
  content: Anthropic.ContentBlock[],
  handlers: AssistantHandlers,
): Anthropic.ToolResultBlockParam[] => {
  const results: Anthropic.ToolResultBlockParam[] = []
  for (const block of content) {
    if (block.type !== 'tool_use') continue
    const isRead = block.name === 'list_items' || block.name === 'read_item'
    const result = isRead
      ? runReadTool(block.name, block.input, handlers.getItems)
      : runWriteTool(block.name, block.input, handlers)
    results.push({ type: 'tool_result', tool_use_id: block.id, content: result })
  }
  return results
}

/**
 * Run one assistant turn. `messages` is the mutable Anthropic message history
 * held by the caller across turns (the user's new message must already be
 * appended). Streams reply text through `handlers.onText`, raises write
 * proposals through `handlers.onProposal`, and mutates `messages` in place so
 * the next turn continues the same conversation. Throws if no key is set or a
 * request fails.
 */
export const runAssistantTurn = async (
  collection: { title: string; description?: string },
  messages: Anthropic.MessageParam[],
  handlers: AssistantHandlers,
): Promise<void> => {
  const apiKey = await getApiKey()
  if (!apiKey) throw new Error('No API key set')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const system = buildSystem(collection, handlers.getItems().length)

  for (let step = 0; step < MAX_STEPS; step++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system,
      tools: TOOLS,
      messages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        handlers.onText(event.delta.text)
      }
    }

    const message = await stream.finalMessage()
    messages.push({ role: 'assistant', content: message.content })

    if (message.stop_reason !== 'tool_use') break

    messages.push({ role: 'user', content: handleToolUses(message.content, handlers) })
  }
}
