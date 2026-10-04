// Review of whatever is in the study scratchpad.

import { streamText, FAST_MODEL } from './client'

/**
 * Stream a short review of a scratchpad buffer. The language is the one the
 * pad is set to, detected or pinned. Runs on the fast model: this is a quick
 * read while studying, not a full audit. Throws if no key is set or the
 * request fails.
 */
export const streamCodeReview = async (
  language: string,
  code: string,
  onToken: (chunk: string) => void
): Promise<void> => {
  await streamText(
    {
      model: FAST_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content:
            `Review this ${language} code, written in a scratchpad while studying. ` +
            `Say what's working before anything else, flag real bugs, and leave the ` +
            `small stuff alone. Encouraging, a few short bullets, no preamble.` +
            `\n\n${code}`,
        },
      ],
    },
    onToken
  )
}
