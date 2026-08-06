// Executing the model's tool calls. Reads (list_items / read_item) run against
// the live collection and feed data back; writes (propose_*) raise an approval
// card via the handlers and never touch the database directly.

import type Anthropic from '@anthropic-ai/sdk'
import { extractText } from '../claude'
import type {
  AssistantItem,
  AssistantHandlers,
  CreateProposalItem,
  DeleteProposalItem,
} from './types'

const PREVIEW_CHARS = 200

const preview = (item: AssistantItem): string => {
  const body = extractText(item.content).trim().replace(/\s+/g, ' ')
  return body.length > PREVIEW_CHARS ? body.slice(0, PREVIEW_CHARS) + '…' : body
}

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
export const handleToolUses = (
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
