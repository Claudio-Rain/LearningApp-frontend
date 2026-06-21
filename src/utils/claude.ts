// Bring-your-own-key Claude integration.
//
// Each user supplies their OWN Anthropic API key. It is stored only in this
// browser (localStorage) and sent directly from the browser to Anthropic, so
// no backend is required and you are never billed for anyone else's usage.
//
// `dangerouslyAllowBrowser` is safe here precisely because the key belongs to
// the end user and never leaves their machine.

import Anthropic from '@anthropic-ai/sdk'
import type { JSONContent } from '@tiptap/vue-3'

const KEY_STORAGE = 'claude_api_key'

const MODEL = 'claude-sonnet-4-6'

export const getApiKey = (): string | null => localStorage.getItem(KEY_STORAGE)
export const setApiKey = (key: string): void => localStorage.setItem(KEY_STORAGE, key.trim())
export const clearApiKey = (): void => localStorage.removeItem(KEY_STORAGE)
export const hasApiKey = (): boolean => !!getApiKey()

/** Flatten TipTap JSONContent into plain text for the prompt. */
export const extractText = (node?: JSONContent | string): string => {
  if (!node) return ''
  if (typeof node === 'string') return node
  let text = node.text ?? ''
  if (node.content) text += node.content.map(extractText).join('')
  // Treat block-level nodes as line breaks so structure survives flattening.
  if (node.type && node.type !== 'text' && text) text += '\n'
  return text
}

/**
 * Stream an answer to a learning item. Calls `onToken` with each chunk of text
 * as it arrives. Throws if no key is set or the request fails.
 */
export const streamAnswer = async (
  title: string,
  content: JSONContent | undefined,
  onToken: (chunk: string) => void
): Promise<void> => {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('No API key set')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const body = extractText(content).trim()
  const prompt = body
    ? `Learning item: "${title}"\n\n${body}\n\nAnswer or explain this learning item clearly and concisely.`
    : `Answer or explain this learning item clearly and concisely: "${title}"`

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      onToken(event.delta.text)
    }
  }
}
