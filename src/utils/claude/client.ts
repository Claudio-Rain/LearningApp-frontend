// Shared Anthropic client and thin request helpers.
//
// `dangerouslyAllowBrowser` is safe here precisely because the key belongs to
// the end user and never leaves their machine (see ./apiKey).

import Anthropic from '@anthropic-ai/sdk'
import { getApiKey } from './apiKey'

// One model across every AI feature, so a user's key sees consistent behavior.
export const MODEL = 'claude-sonnet-4-6'

/** Build a browser Anthropic client from the user's stored key. Throws if unset. */
export const createClient = async (): Promise<Anthropic> => {
  const apiKey = await getApiKey()
  if (!apiKey) throw new Error('No API key set')
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

/**
 * Stream a message, forwarding each text chunk to `onToken`. The model is
 * injected so callers only pass request-specific fields (system, messages…).
 */
export const streamText = async (
  params: Omit<Anthropic.MessageStreamParams, 'model'>,
  onToken: (chunk: string) => void
): Promise<void> => {
  const client = await createClient()
  const stream = client.messages.stream({ model: MODEL, ...params })
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      onToken(event.delta.text)
    }
  }
}

/** Send a non-streaming message and return its concatenated text blocks. */
export const createText = async (
  params: Omit<Anthropic.MessageCreateParamsNonStreaming, 'model'>
): Promise<string> => {
  const client = await createClient()
  const response = await client.messages.create({ model: MODEL, ...params })
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}
