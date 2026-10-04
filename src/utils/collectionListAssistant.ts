import type Anthropic from '@anthropic-ai/sdk'
import { runAgentTurn, type ToolOutcome } from './assistantLoop'
import type { AssistantActivity } from './collectionAssistant/types'

export interface CollectionSummary {
  id: string
  title: string
  starred?: boolean
  categoryTitle?: string
  itemCount: number
}

export interface RenameProposalItem {
  id: string
  currentTitle: string
  title: string
}

export type CollectionListProposal = { kind: 'rename'; items: RenameProposalItem[] }

export interface CollectionListHandlers {
  onText: (chunk: string) => void
  onActivity: (activity: AssistantActivity) => void
  onProposal: (proposal: CollectionListProposal) => void
  getCollections: () => CollectionSummary[]
}

export const COLLECTION_LIST_TOOLS: Anthropic.Tool[] = [
  {
    name: 'propose_rename_collections',
    description:
      'Propose new names for one or more collections. This does NOT rename anything — it shows the user one approval card listing every rename. Put all renames in a single call.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The collection id.' },
              title: { type: 'string', description: 'The new name.' },
            },
            required: ['id', 'title'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
]

const line = (c: CollectionSummary): string =>
  `- ${c.id}: ${c.starred ? '★ ' : ''}${c.title} — ${c.itemCount} card${c.itemCount === 1 ? '' : 's'}` +
  (c.categoryTitle ? ` · ${c.categoryTitle}` : '')

export function buildCollectionListSystem(collections: CollectionSummary[]): string {
  return collections.map(line).join('\n')
}

const plural = (n: number) => (n === 1 ? '' : 's')

export const runCollectionListTool = (
  name: string,
  input: any,
  handlers: CollectionListHandlers,
): ToolOutcome => {
  if (name !== 'propose_rename_collections') {
    return { ok: false, result: `Unknown tool: ${name}`, label: `Unknown tool: ${name}` }
  }
  const live = handlers.getCollections()
  const items: RenameProposalItem[] = []
  for (const raw of input?.items ?? []) {
    const current = live.find((c) => c.id === String(raw?.id ?? ''))
    const title = String(raw?.title ?? '').trim()
    if (!current || !title || title === current.title) continue
    if (items.some((it) => it.id === current.id)) continue
    items.push({ id: current.id, currentTitle: current.title, title })
  }
  if (items.length === 0) {
    return {
      ok: false,
      result: 'Nothing to rename: the ids matched no collection, or every name was unchanged.',
      label: 'No collections to rename',
    }
  }
  handlers.onProposal({ kind: 'rename', items })
  return {
    ok: true,
    result: `Showed the user an approval card to rename ${items.length} collection${plural(items.length)}. Awaiting their review.`,
    label: `Suggested renaming ${items.length} collection${plural(items.length)}`,
  }
}

export const runCollectionListTurn = async (
  messages: Anthropic.MessageParam[],
  handlers: CollectionListHandlers,
): Promise<void> => {
  await runAgentTurn(
    {
      system: buildCollectionListSystem(handlers.getCollections()),
      tools: COLLECTION_LIST_TOOLS,
      runTool: (name, input) => runCollectionListTool(name, input, handlers),
    },
    messages,
    { onText: handlers.onText, onActivity: handlers.onActivity },
  )
}
