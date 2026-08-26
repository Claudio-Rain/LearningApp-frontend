// One assistant turn for a collection: what it knows, what it can do, and the
// wiring to the shared agentic loop in `@/utils/assistantLoop`.

import type Anthropic from '@anthropic-ai/sdk'
import { runAgentTurn, MAX_TOKENS, type ToolOutcome } from '../assistantLoop'
import { READ_TOOLS, WRITE_TOOLS } from './tools'
import {
  buildSystem,
  renderItemsBlock,
  maxProposalsPerMessage,
  MAX_EMBED_CHARS,
} from './prompt'
import { runToolCall } from './toolHandlers'
import type { AssistantHandlers } from './types'

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
  // Decide once per turn: if the whole collection fits, embed it in the system
  // prompt and drop the read tools; otherwise fall back to preview + read tools.
  const items = handlers.getItems()
  const itemsBlock = renderItemsBlock(items)
  const embed = itemsBlock.length <= MAX_EMBED_CHARS

  await runAgentTurn(
    {
      system: buildSystem(
        collection,
        items.length,
        embed ? itemsBlock : null,
        maxProposalsPerMessage(items, MAX_TOKENS),
      ),
      tools: embed ? WRITE_TOOLS : [...READ_TOOLS, ...WRITE_TOOLS],
      runTool: (name, input): ToolOutcome => runToolCall(name, input, handlers),
    },
    messages,
    { onText: handlers.onText, onActivity: handlers.onActivity },
  )
}
