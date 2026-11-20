import type Anthropic from '@anthropic-ai/sdk'
import type { JSONContent } from '@tiptap/vue-3'
import type { LabelLevel } from '../itemLabels'

/** One learning item as the assistant sees it. */
export interface AssistantItem {
  id: string
  title: string
  content?: JSONContent
  /** 1-5, absent when unlabeled. See `@/utils/itemLabels`. */
  priority?: number
  difficulty?: number
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

/**
 * One item's proposed labels. Separate from UpdateProposalItem because a
 * labeling pass is a different kind of edit: it never touches the card's text,
 * it usually covers the whole collection at once, and the user judges it by
 * comparing old value to new rather than by reading a rewritten body.
 *
 * A key is absent when the model isn't changing that label; `null` means clear
 * it back to unlabeled. `current*` is what the item holds today, for the
 * before → after the approval card shows.
 */
export interface LabelProposalItem {
  id: string
  title: string
  priority?: LabelLevel | null
  difficulty?: LabelLevel | null
  currentPriority?: number
  currentDifficulty?: number
  reason?: string
}

export interface MoveProposalItem {
  id: string
  title: string
  reason?: string
}

/**
 * One item the assistant wants placed in the list. `from` and `to` are 1-based
 * list positions (today's and after the change), for the card to show.
 */
export interface ReorderProposalItem {
  id: string
  title: string
  from: number
  to: number
}

export type MoveTarget = { id: string; title: string } | { newTitle: string }

export interface CollectionRef {
  id: string
  title: string
}

/** A pending write the user must approve before it runs. */
export type Proposal =
  /** `after`: the existing item to insert them right after; absent → end of the list. */
  | { kind: 'create'; items: CreateProposalItem[]; after?: { id: string; title: string } }
  | { kind: 'delete'; items: DeleteProposalItem[] }
  | { kind: 'update'; items: UpdateProposalItem[] }
  | { kind: 'label'; items: LabelProposalItem[] }
  | { kind: 'move'; target: MoveTarget; items: MoveProposalItem[] }
  /**
   * All-or-nothing: `ids` go to the start/end of the list in that order.
   * `items` is only the ones that end up somewhere new, for the card.
   */
  | { kind: 'reorder'; place: 'start' | 'end'; ids: string[]; items: ReorderProposalItem[]; reason?: string }

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
  /** Token usage of each request, for the cache timer. */
  onUsage?: (usage: Anthropic.Usage) => void
  /** Streamed assistant text, chunk by chunk. */
  onText: (chunk: string) => void
  /** A write proposal to render as an approval card. */
  onProposal: (proposal: Proposal) => void
  /** Progress steps: upsert by `activity.id`. */
  onActivity: (activity: AssistantActivity) => void
  /** Live view of the collection's items (re-read each tool call). */
  getItems: () => AssistantItem[]
  getOtherCollections: () => CollectionRef[]
}
