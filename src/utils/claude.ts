// Bring-your-own-key Claude integration.
//
// Barrel for the ./claude modules — keeps the public API stable so existing
// imports (`../utils/claude`, `./claude`) keep working. Each concern lives in
// its own file:
//   apiKey  — key storage (chrome.storage / localStorage)
//   client  — shared Anthropic client + stream/create helpers
//   text    — TipTap → plain-text flattening
//   answers — single-card answer generation
//   chat    — multi-turn card chat
//   cards   — split-card and question-rewrite helpers

export { MODEL, createClient } from './claude/client'
export { getApiKey, setApiKey, clearApiKey, hasApiKey } from './claude/apiKey'
export { extractText } from './claude/text'
export type { ChatMessage, SplitProposal } from './claude/types'
export { streamAnswer, generateAnswerMarkdown } from './claude/answers'
export { streamCardChat, cardChatMarkdown } from './claude/chat'
export { proposeCardSplit, rewriteAsStandaloneQuestion } from './claude/cards'
