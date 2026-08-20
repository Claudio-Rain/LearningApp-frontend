// Collection-scoped AI assistant.
//
// A general chat assistant for one collection and its learning items. It can
// answer questions ("what's the hardest question?", "summarize this
// collection") and drive CRUD through a tool-use loop. Reads run silently;
// every write (create / update / delete) is surfaced to the user as an
// interactive proposal they must approve before anything touches the database.
//
// Barrel for the ./collectionAssistant modules — keeps the public API stable so
// existing imports keep working. Each concern lives in its own file:
//   types        — item / proposal / handler shapes
//   tools        — read + write tool schemas
//   prompt       — system-prompt construction (and full-collection embedding)
//   toolHandlers — executing the model's tool calls
//   activity     — progress steps reported while a turn is working
//   run          — the agentic turn loop
//
// Bring-your-own-key, same as ./claude: the user's Anthropic key lives only in
// this browser and is sent directly from it.

export { runAssistantTurn } from './collectionAssistant/run'
export type {
  AssistantItem,
  CreateProposalItem,
  DeleteProposalItem,
  UpdateProposalItem,
  Proposal,
  AssistantActivity,
  AssistantHandlers,
} from './collectionAssistant/types'
export type { ChatMessage } from './claude'
