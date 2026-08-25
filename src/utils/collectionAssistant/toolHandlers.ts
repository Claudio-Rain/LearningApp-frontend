// Executing the model's tool calls. Reads (list_items / read_item) run against
// the live collection and feed data back; writes (propose_*) raise an approval
// card via the handlers and never touch the database directly.
//
// Every call reports an outcome: `result` goes back to the model, while `label`
// and `ok` describe the same thing to the user as a finished progress step. A
// tool that can't do its job (unknown id, nothing valid to propose) tells the
// model so it can recover, and shows up as a failed step rather than a silent
// success.

import type Anthropic from '@anthropic-ai/sdk'
import { extractText } from '../claude'
import { ITEM_LABEL_KINDS, labelText, parseLabelLevel } from '../itemLabels'
import { CLEAR_LABEL_VALUE } from './tools'
import type {
  AssistantItem,
  AssistantHandlers,
  CreateProposalItem,
  DeleteProposalItem,
  LabelProposalItem,
  UpdateProposalItem,
} from './types'

const PREVIEW_CHARS = 200

// Labels go to the model as their level names, the same words the write tool's
// enum accepts, so what it reads and what it writes speak one vocabulary.
const labelsFor = (item: AssistantItem) => ({
  priority: item.priority === undefined ? null : labelText('priority', item.priority),
  difficulty: item.difficulty === undefined ? null : labelText('difficulty', item.difficulty),
})

/** What one tool call did: `result` for the model, `label`/`ok` for the user. */
interface ToolOutcome {
  result: string
  label: string
  ok: boolean
}

const ok = (result: string, label: string): ToolOutcome => ({ result, label, ok: true })
const failed = (result: string, label: string): ToolOutcome => ({ result, label, ok: false })

const preview = (item: AssistantItem): string => {
  const body = extractText(item.content).trim().replace(/\s+/g, ' ')
  return body.length > PREVIEW_CHARS ? body.slice(0, PREVIEW_CHARS) + '…' : body
}

// Feed the model back the result of a read tool.
const runReadTool = (
  name: string,
  input: any,
  getItems: () => AssistantItem[],
): ToolOutcome => {
  const items = getItems()
  if (name === 'list_items') {
    if (items.length === 0) {
      return ok('The collection has no learning items yet.', 'The collection is empty')
    }
    return ok(
      JSON.stringify(
        items.map((it) => ({ id: it.id, title: it.title, preview: preview(it), ...labelsFor(it) })),
      ),
      `Looked through ${items.length} item${plural(items.length)}`,
    )
  }
  if (name === 'read_item') {
    const item = items.find((it) => it.id === input?.id)
    if (!item) {
      return failed(`No item found with id "${input?.id}".`, "Couldn't find that item")
    }
    return ok(
      JSON.stringify({
        id: item.id,
        title: item.title,
        content: extractText(item.content).trim(),
        ...labelsFor(item),
      }),
      `Read "${item.title}"`,
    )
  }
  return failed(`Unknown tool: ${name}`, `Unknown tool: ${name}`)
}

const plural = (n: number) => (n === 1 ? '' : 's')

const proposeCreate = (input: any, handlers: AssistantHandlers): ToolOutcome => {
  const items: CreateProposalItem[] = (input?.items ?? [])
    .map((p: any) => ({ title: String(p?.title ?? '').trim(), content: String(p?.content ?? '') }))
    .filter((p: CreateProposalItem) => p.title)
  if (items.length === 0) {
    return failed('No valid items to create were provided.', 'No items to add')
  }
  handlers.onProposal({ kind: 'create', items })
  return ok(
    `Showed the user an approval card to add ${items.length} item${plural(items.length)}. Awaiting their review.`,
    `Suggested ${items.length} new item${plural(items.length)}`,
  )
}

const proposeDelete = (input: any, handlers: AssistantHandlers): ToolOutcome => {
  const live = handlers.getItems()
  const titleFor = (id: string) => live.find((it) => it.id === id)?.title ?? '(unknown item)'
  const items: DeleteProposalItem[] = (input?.items ?? [])
    .map((p: any) => ({ id: String(p?.id ?? ''), title: titleFor(String(p?.id ?? '')), reason: p?.reason ? String(p.reason) : undefined }))
    .filter((p: DeleteProposalItem) => p.id && live.some((it) => it.id === p.id))
  if (items.length === 0) {
    return failed(
      'None of the given ids matched an item in this collection.',
      'No matching items to remove',
    )
  }
  handlers.onProposal({ kind: 'delete', items })
  return ok(
    `Showed the user a deletion checklist for ${items.length} item${plural(items.length)}. Awaiting their review.`,
    `Suggested removing ${items.length} item${plural(items.length)}`,
  )
}

const proposeUpdates = (input: any, handlers: AssistantHandlers): ToolOutcome => {
  const live = handlers.getItems()
  const items: UpdateProposalItem[] = []
  for (const raw of input?.items ?? []) {
    const current = live.find((it) => it.id === String(raw?.id ?? ''))
    if (!current) continue
    items.push({
      id: current.id,
      currentTitle: current.title,
      title: raw?.title ? String(raw.title) : undefined,
      content: raw?.content !== undefined ? String(raw.content) : undefined,
    })
  }
  if (items.length === 0) {
    return failed(
      'None of the given ids matched an item in this collection.',
      'No matching items to edit',
    )
  }
  handlers.onProposal({ kind: 'update', items })
  const what =
    items.length === 1 && items[0] ? `"${items[0].currentTitle}"` : `${items.length} items`
  return ok(
    `Showed the user one approval card with edits to ${what}. Awaiting their review.`,
    `Suggested edits to ${what}`,
  )
}

type LabelChanges = Pick<LabelProposalItem, 'priority' | 'difficulty'>

/**
 * The subset of one item's proposed levels that would actually change it, or
 * null if none would. A value the model made up (not a level name, not "none")
 * is dropped rather than guessed at, and re-proposing the level an item already
 * has is noise on the approval card.
 */
const changedLabels = (raw: any, current: AssistantItem): LabelChanges | null => {
  const changes: LabelChanges = {}
  let changed = false

  for (const kind of ITEM_LABEL_KINDS) {
    const value = raw?.[kind]
    if (value === undefined) continue
    const level = parseLabelLevel(kind, value)
    if (level === null && String(value).toLowerCase() !== CLEAR_LABEL_VALUE) continue
    if (level === (current[kind] ?? null)) continue
    changes[kind] = level
    changed = true
  }

  return changed ? changes : null
}

const proposeLabels = (input: any, handlers: AssistantHandlers): ToolOutcome => {
  const live = handlers.getItems()
  const items: LabelProposalItem[] = []

  for (const raw of input?.items ?? []) {
    const current = live.find((it) => it.id === String(raw?.id ?? ''))
    const changes = current ? changedLabels(raw, current) : null
    if (!current || !changes) continue

    items.push({
      id: current.id,
      title: current.title,
      currentPriority: current.priority,
      currentDifficulty: current.difficulty,
      reason: raw?.reason ? String(raw.reason) : undefined,
      ...changes,
    })
  }

  if (items.length === 0) {
    return failed(
      'Nothing to label: the given ids matched no items in this collection, or every ' +
        'proposed level was one the item already has.',
      'No labels to change',
    )
  }

  handlers.onProposal({ kind: 'label', items })
  return ok(
    `Showed the user an approval card with labels for ${items.length} item${plural(items.length)}. Awaiting their review.`,
    `Suggested labels for ${items.length} item${plural(items.length)}`,
  )
}

// Turn a write tool call into a Proposal for the UI. The result text tells the
// model the card is up. Never touches the DB — the actual write happens only
// when the user approves the card.
const runWriteTool = (name: string, input: any, handlers: AssistantHandlers): ToolOutcome => {
  switch (name) {
    case 'propose_create_items': return proposeCreate(input, handlers)
    case 'propose_delete_items': return proposeDelete(input, handlers)
    case 'propose_update_items': return proposeUpdates(input, handlers)
    case 'propose_label_items': return proposeLabels(input, handlers)
    default: return failed(`Unknown tool: ${name}`, `Unknown tool: ${name}`)
  }
}

// A call cut off by the output limit has half-written arguments, so it must not
// run. Telling the model exactly why lets it retry with a smaller batch instead
// of repeating the same oversized message.
const truncatedOutcome = (): ToolOutcome =>
  failed(
    'This tool call was cut off: the message hit the output limit before the ' +
      'arguments were finished, so it did not run. Propose fewer items in one ' +
      'message — a few at a time — and continue from where you left off.',
    'Cut short — too much in one message',
  )

// Execute every tool_use block in an assistant message and return the matching
// tool_result blocks. Reads run and feed data back; writes raise a proposal.
// `onDone` reports each call's outcome, for the progress steps. `truncatedId`
// names a call the model never finished writing; every other call is complete
// and runs normally.
export const handleToolUses = (
  content: Anthropic.ContentBlock[],
  handlers: AssistantHandlers,
  onDone?: (toolUseId: string, label: string, ok: boolean) => void,
  truncatedId?: string,
): Anthropic.ToolResultBlockParam[] => {
  const results: Anthropic.ToolResultBlockParam[] = []
  for (const block of content) {
    if (block.type !== 'tool_use') continue
    const isRead = block.name === 'list_items' || block.name === 'read_item'
    const outcome =
      block.id === truncatedId
        ? truncatedOutcome()
        : isRead
          ? runReadTool(block.name, block.input, handlers.getItems)
          : runWriteTool(block.name, block.input, handlers)
    onDone?.(block.id, outcome.label, outcome.ok)
    results.push({
      type: 'tool_result',
      tool_use_id: block.id,
      content: outcome.result,
      // Let the model see the call didn't work so it can correct course.
      is_error: !outcome.ok,
    })
  }
  return results
}
