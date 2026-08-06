import type { JSONContent } from '@tiptap/vue-3'

/** One learning item as the assistant sees it. */
export interface AssistantItem {
  id: string
  title: string
  content?: JSONContent
}

export interface CreateProposalItem {
  title: string
  /** Markdown; converted to rich text when the user approves. */
  content: string
}

export interface DeleteProposalItem {
  id: string
  title: string
  reason?: string
}

export interface UpdateProposal {
  id: string
  currentTitle: string
  title?: string
  content?: string
}

/** A pending write the user must approve before it runs. */
export type Proposal =
  | { kind: 'create'; items: CreateProposalItem[] }
  | { kind: 'delete'; items: DeleteProposalItem[] }
  | { kind: 'update'; update: UpdateProposal }

export interface AssistantHandlers {
  /** Streamed assistant text, chunk by chunk. */
  onText: (chunk: string) => void
  /** A write proposal to render as an approval card. */
  onProposal: (proposal: Proposal) => void
  /** Live view of the collection's items (re-read each tool call). */
  getItems: () => AssistantItem[]
}
