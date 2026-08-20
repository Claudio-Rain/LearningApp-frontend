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

export interface UpdateProposalItem {
  id: string
  currentTitle: string
  title?: string
  /** Markdown; converted to rich text when the user approves. */
  content?: string
}

/** A pending write the user must approve before it runs. */
export type Proposal =
  | { kind: 'create'; items: CreateProposalItem[] }
  | { kind: 'delete'; items: DeleteProposalItem[] }
  | { kind: 'update'; items: UpdateProposalItem[] }

/**
 * One step of work the assistant is doing, so a long silent turn still shows
 * progress. The same `id` is emitted repeatedly as the step advances; the last
 * emission for an id is `done` (it worked) or `failed` (it didn't, e.g. the
 * tool hit an unknown item, or the turn was cut short).
 */
export interface AssistantActivity {
  id: number
  /** mdi icon name for the step. */
  icon: string
  label: string
  /** Trailing hint while the step runs, e.g. how much has been written. */
  detail?: string
  status: 'running' | 'done' | 'failed'
}

export interface AssistantHandlers {
  /** Streamed assistant text, chunk by chunk. */
  onText: (chunk: string) => void
  /** A write proposal to render as an approval card. */
  onProposal: (proposal: Proposal) => void
  /** Progress steps: upsert by `activity.id`. */
  onActivity: (activity: AssistantActivity) => void
  /** Live view of the collection's items (re-read each tool call). */
  getItems: () => AssistantItem[]
}
