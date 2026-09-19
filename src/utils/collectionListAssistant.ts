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

export interface CollectionListHandlers {
  onText: (chunk: string) => void
  onActivity: (activity: AssistantActivity) => void
  getCollections: () => CollectionSummary[]
}

const line = (c: CollectionSummary): string =>
  `- ${c.starred ? '★ ' : ''}${c.title} — ${c.itemCount} card${c.itemCount === 1 ? '' : 's'}` +
  (c.categoryTitle ? ` · ${c.categoryTitle}` : '')

export function buildCollectionListSystem(collections: CollectionSummary[]): string {
  return collections.map(line).join('\n')
}

const noTools = (): ToolOutcome => ({
  ok: false,
  result: 'No tools available.',
  label: 'No tools available',
})

export const runCollectionListTurn = async (
  messages: Anthropic.MessageParam[],
  handlers: CollectionListHandlers,
): Promise<void> => {
  await runAgentTurn(
    {
      system: buildCollectionListSystem(handlers.getCollections()),
      tools: [],
      runTool: noTools,
    },
    messages,
    { onText: handlers.onText, onActivity: handlers.onActivity },
  )
}
