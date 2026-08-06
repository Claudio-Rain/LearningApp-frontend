// Generating an answer/explanation for a single flashcard.

import type { JSONContent } from '@tiptap/vue-3'
import { extractText } from './text'
import { streamText } from './client'

/**
 * Stream an answer to a learning item. Calls `onToken` with each chunk of text
 * as it arrives. Throws if no key is set or the request fails.
 */
export const streamAnswer = async (
  title: string,
  content: JSONContent | undefined,
  onToken: (chunk: string) => void
): Promise<void> => {
  const body = extractText(content).trim()
  const prompt = body
    ? `Learning item: "${title}"\n\n${body}\n\nAnswer or explain this learning item clearly and concisely.`
    : `Answer or explain this learning item clearly and concisely: "${title}"`

  await streamText({ max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }, onToken)
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
