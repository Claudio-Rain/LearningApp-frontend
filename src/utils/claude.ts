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

// The key lives in chrome.storage.local so both the SPA editor and the
// extension's background service worker can read it (the worker has no
// localStorage). Falls back to localStorage during `npm run dev`, where the
// chrome APIs aren't present.
const chromeStorage: any =
  (globalThis as any).chrome?.storage?.local ?? null

export const getApiKey = async (): Promise<string | null> => {
  if (chromeStorage) {
    const data = await chromeStorage.get(KEY_STORAGE)
    let key = data?.[KEY_STORAGE] ?? null
    // One-time migration: a key set before this store existed lives in the
    // SPA's localStorage. Copy it into chrome.storage so the worker can read it.
    if (!key && typeof localStorage !== 'undefined') {
      const legacy = localStorage.getItem(KEY_STORAGE)
      if (legacy) {
        await chromeStorage.set({ [KEY_STORAGE]: legacy })
        key = legacy
      }
    }
    return key
  }
  return localStorage.getItem(KEY_STORAGE)
}

export const setApiKey = async (key: string): Promise<void> => {
  const value = key.trim()
  if (chromeStorage) await chromeStorage.set({ [KEY_STORAGE]: value })
  else localStorage.setItem(KEY_STORAGE, value)
}

export const clearApiKey = async (): Promise<void> => {
  if (chromeStorage) await chromeStorage.remove(KEY_STORAGE)
  else localStorage.removeItem(KEY_STORAGE)
}

export const hasApiKey = async (): Promise<boolean> => !!(await getApiKey())

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
  const apiKey = await getApiKey()
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

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Stream a multi-turn chat about a specific flashcard. The card's title and
 * content ride along as the system prompt so every turn stays grounded in the
 * card being studied. Throws if no key is set or the request fails.
 */
export const streamCardChat = async (
  title: string,
  content: JSONContent | undefined,
  messages: ChatMessage[],
  onToken: (chunk: string) => void
): Promise<void> => {
  const apiKey = await getApiKey()
  if (!apiKey) throw new Error('No API key set')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const body = extractText(content).trim()
  const system =
    `You are a study assistant. The user is reviewing this flashcard:\n\n` +
    `Front: ${title}` +
    (body ? `\n\nBack:\n${body}` : '') +
    `\n\nAnswer the user's questions about this card clearly and concisely. ` +
    `Stay focused on helping them understand this material.`

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages,
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

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Multi-turn Q&A about a specific flashcard, used by the background worker on
 * behalf of the content widget. The card's front/back ride along as the system
 * prompt so every turn stays grounded in the card being studied. Non-streaming
 * because the reply crosses the extension message channel in one piece.
 * Throws if no key is set or the request fails.
 */
export const cardChatMarkdown = async (
  title: string,
  body: string,
  messages: ChatMessage[]
): Promise<string> => {
  const apiKey = await getApiKey()
  if (!apiKey) throw new Error('No API key set')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const system =
    `You are a study assistant. The user is reviewing this flashcard:\n\n` +
    `Front: ${title}` +
    (body.trim() ? `\n\nBack:\n${body.trim()}` : '') +
    `\n\nAnswer the user's questions about this card clearly and concisely. ` +
    `Stay focused on helping them understand this material.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages,
  })

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

/**
 * Rewrite a chat question into a self-contained flashcard title. Questions
 * asked mid-chat ("why do we need this?") lean on the card for context, so
 * saved verbatim they make meaningless titles; Claude resolves the pronouns
 * against the card first ("Why do we need named routes?"). Throws if no key
 * is set or the request fails.
 */
export const rewriteAsStandaloneQuestion = async (
  cardTitle: string,
  cardContent: JSONContent | undefined,
  question: string
): Promise<string> => {
  const apiKey = await getApiKey()
  if (!apiKey) throw new Error('No API key set')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const body = extractText(cardContent).trim()
  const system =
    `The user is studying this flashcard:\n\n` +
    `Front: ${cardTitle}` +
    (body ? `\n\nBack:\n${body}` : '') +
    `\n\nThey asked a follow-up question in chat and want to save it as a new standalone flashcard. ` +
    `Rewrite their question so it makes sense on its own, away from this card: replace words like ` +
    `"this", "it", "that" with the concrete concept they refer to. Preserve the user's intent and ` +
    `phrasing as much as possible, keep it to one short sentence, and reply with ONLY the rewritten ` +
    `question — no quotes, no explanation.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    system,
    messages: [{ role: 'user', content: question }],
  })

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()
}

/**
 * Non-streaming variant used by the extension's background worker: returns the
 * whole answer as markdown. Throws if no key is set or the request fails.
 */
export const generateAnswerMarkdown = async (
  title: string,
  content?: JSONContent
): Promise<string> => {
  let out = ''
  await streamAnswer(title, content, (chunk) => { out += chunk })
  return out
}
