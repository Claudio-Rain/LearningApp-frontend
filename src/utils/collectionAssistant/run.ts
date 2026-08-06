// The agentic loop: one assistant turn, streaming text and raising proposals.

import type Anthropic from '@anthropic-ai/sdk'
import { MODEL, createClient } from '../claude'
import { READ_TOOLS, WRITE_TOOLS } from './tools'
import { buildSystem, renderItemsBlock, MAX_EMBED_CHARS } from './prompt'
import { handleToolUses } from './toolHandlers'
import type { AssistantHandlers } from './types'

// Cap the agentic loop so a misbehaving turn can't spin forever against the
// user's key. Each pass is one model request; reads add passes, so this leaves
// generous room (list -> read a few -> propose -> summarize).
const MAX_STEPS = 8

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
  const client = await createClient()

  // Decide once per turn: if the whole collection fits, embed it in the system
  // prompt and drop the read tools; otherwise fall back to preview + read tools.
  const items = handlers.getItems()
  const itemsBlock = renderItemsBlock(items)
  const embed = itemsBlock.length <= MAX_EMBED_CHARS
  const system = buildSystem(collection, items.length, embed ? itemsBlock : null)
  const tools = embed ? WRITE_TOOLS : [...READ_TOOLS, ...WRITE_TOOLS]

  for (let step = 0; step < MAX_STEPS; step++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system,
      tools,
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
