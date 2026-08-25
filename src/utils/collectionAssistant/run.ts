// The agentic loop: one assistant turn, streaming text and raising proposals.

import type Anthropic from '@anthropic-ai/sdk'
import { MODEL, createClient } from '../claude'
import { READ_TOOLS, WRITE_TOOLS } from './tools'
import {
  buildSystem,
  renderItemsBlock,
  maxProposalsPerMessage,
  MAX_EMBED_CHARS,
} from './prompt'
import { handleToolUses } from './toolHandlers'
import { createActivityFeed, activityForTool, type ActivityFeed } from './activity'
import type { AssistantHandlers } from './types'

// Cap the agentic loop so a misbehaving turn can't spin forever against the
// user's key. Each pass is one model request; reads add passes, so this leaves
// generous room (list -> read a few -> propose -> summarize).
const MAX_STEPS = 8

// Output budget per request. A batch of rewritten cards runs to many thousands
// of tokens, and blowing this cap truncates the proposal the model was writing
// — so keep it generous. We always stream, which is what makes a budget this
// size safe (a non-streaming request would risk an HTTP timeout); the model's
// ceiling is 128k. Pairs with MAX_PROPOSALS_PER_MESSAGE in ./prompt.
const MAX_TOKENS = 64_000

/**
 * The id of the tool call the model was still writing when it ran out of output
 * budget, if any. Only the final content block can be cut off mid-JSON, so
 * everything before it is complete.
 */
const truncatedToolUseId = (message: Anthropic.Message): string | undefined => {
  if (message.stop_reason !== 'max_tokens') return undefined
  const last = message.content[message.content.length - 1]
  return last?.type === 'tool_use' ? last.id : undefined
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
  const client = await createClient()

  // Decide once per turn: if the whole collection fits, embed it in the system
  // prompt and drop the read tools; otherwise fall back to preview + read tools.
  const items = handlers.getItems()
  const itemsBlock = renderItemsBlock(items)
  const embed = itemsBlock.length <= MAX_EMBED_CHARS
  const tools = embed ? WRITE_TOOLS : [...READ_TOOLS, ...WRITE_TOOLS]

  // The whole collection rides in the system prompt and the loop below re-sends
  // it on every step, so cache it. Render order is tools -> system -> messages,
  // which means this one breakpoint covers the tool schemas too.
  const system: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: buildSystem(
        collection,
        items.length,
        embed ? itemsBlock : null,
        maxProposalsPerMessage(items, MAX_TOKENS),
      ),
      cache_control: { type: 'ephemeral' },
    },
  ]

  const feed = createActivityFeed(handlers.onActivity)

  try {
    let step = 0
    for (; step < MAX_STEPS; step++) {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        tools,
        messages: withConversationBreakpoint(messages),
      })

      const activityFor = await consumeStream(stream, handlers, feed)

      const message = await stream.finalMessage()
      // Cache reads bill at a fraction of full input. If `read` stays 0 across
      // steps, something in the prefix is changing per request.
      console.debug('[assistant] tokens', {
        cacheRead: message.usage.cache_read_input_tokens,
        cacheWrite: message.usage.cache_creation_input_tokens,
        uncached: message.usage.input_tokens,
        output: message.usage.output_tokens,
      })
      messages.push({ role: 'assistant', content: message.content })

      // Only the block the model was mid-way through can be truncated; every
      // earlier tool call in the message is complete and safe to run.
      const truncatedId = truncatedToolUseId(message)

      if (message.stop_reason !== 'tool_use' && !truncatedId) {
        if (message.stop_reason === 'max_tokens') {
          feed.failAll('Cut short — that answer got too long')
        }
        break
      }

      // Close each step with what the tool actually did as it executes.
      const results = handleToolUses(
        message.content,
        handlers,
        (toolUseId, label, isOk) => {
          const activityId = activityFor.get(toolUseId)
          if (activityId !== undefined) feed.finish(activityId, label, isOk)
        },
        truncatedId,
      )
      // A tool call the model started but never completed can't have run.
      feed.failAll("Didn't finish")
      messages.push({ role: 'user', content: results })
    }

    // The loop cap, not the model, ended the turn: there was more to do.
    if (step === MAX_STEPS) {
      feed.fail('mdi-flag-outline', `Stopped after ${MAX_STEPS} steps — ask me to continue`)
    }
  } catch (err) {
    feed.failAll("Didn't finish")
    throw err
  }
}

// Thinking blocks are the content types that can't carry a breakpoint; marking
// one is a 400.
type CacheableBlock = Exclude<
  Anthropic.ContentBlockParam,
  { type: 'thinking' } | { type: 'redacted_thinking' }
>

const isCacheable = (block: Anthropic.ContentBlockParam): block is CacheableBlock =>
  block.type !== 'thinking' && block.type !== 'redacted_thinking'

/**
 * Put a cache breakpoint on the conversation's final content block, so the next
 * request reads the whole history back instead of re-sending it at full price.
 * Copies only the message it touches — leaving the caller's history unmarked is
 * what keeps a long turn under the four-breakpoint-per-request cap.
 */
const withConversationBreakpoint = (
  messages: Anthropic.MessageParam[],
): Anthropic.MessageParam[] => {
  const last = messages[messages.length - 1]
  if (!last) return messages

  const blocks: Anthropic.ContentBlockParam[] =
    typeof last.content === 'string'
      ? [{ type: 'text', text: last.content }]
      : [...last.content]

  const tail = blocks[blocks.length - 1]
  if (!tail || !isCacheable(tail)) return messages

  blocks[blocks.length - 1] = { ...tail, cache_control: { type: 'ephemeral' } }
  return [...messages.slice(0, -1), { ...last, content: blocks }]
}

const formatChars = (n: number): string =>
  n < 1000 ? `${n} characters` : `${(n / 1000).toFixed(1)}k characters`

/**
 * Drain one model response: stream reply text to the user and open a progress
 * step for every tool call as it is written. Returns tool_use id -> activity id
 * so the caller can close each step once that tool runs.
 */
const consumeStream = async (
  stream: AsyncIterable<Anthropic.MessageStreamEvent>,
  handlers: AssistantHandlers,
  feed: ActivityFeed,
): Promise<Map<string, number>> => {
  // Keyed by streaming block index, which is how deltas identify their block.
  const inFlight = new Map<number, { toolUseId: string; activityId: number; chars: number }>()

  for await (const event of stream) {
    if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
      const { icon, label } = activityForTool(event.content_block.name)
      inFlight.set(event.index, {
        toolUseId: event.content_block.id,
        activityId: feed.start(icon, label),
        chars: 0,
      })
    } else if (event.type !== 'content_block_delta') {
      continue
    } else if (event.delta.type === 'text_delta') {
      handlers.onText(event.delta.text)
    } else if (event.delta.type === 'input_json_delta') {
      // Drafting a big proposal can run for a long while with nothing else to
      // show, so report how much of it has been written so far.
      const pending = inFlight.get(event.index)
      if (pending) {
        pending.chars += event.delta.partial_json.length
        feed.update(pending.activityId, { detail: formatChars(pending.chars) })
      }
    }
  }

  return new Map([...inFlight.values()].map((p) => [p.toolUseId, p.activityId]))
}
