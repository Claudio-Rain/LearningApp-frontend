// Progress reporting for the agentic loop.
//
// A long instruction ("rewrite every item…") can keep the model busy for many
// steps without emitting a single character of reply text, so the chat would
// otherwise sit on blinking dots. Each tool call opens an activity line the UI
// renders as a live step, and closes it with a summary of what it did.

import type { AssistantActivity } from './types'

export interface ActivityFeed {
  /** Open a step. Returns its id. */
  start: (icon: string, label: string) => number
  /** Refresh an open step's label / trailing detail. */
  update: (id: number, patch: { label?: string; detail?: string }) => void
  /** Close a step with what it accomplished; `ok: false` marks it failed. */
  finish: (id: number, label?: string, ok?: boolean) => void
  /** Report a step that never got to run, e.g. the turn was cut short. */
  fail: (icon: string, label: string) => void
  /**
   * Mark every still-open step failed. Anything open once a turn is over never
   * ran, so this always reports failure.
   */
  failAll: (label: string) => void
}

// Ids must stay unique across turns, not just within one: the UI upserts steps
// by id, so a per-feed counter would make turn 2's first step silently rewrite
// turn 1's instead of showing up as a new line.
let nextId = 0

export const createActivityFeed = (
  emit: (activity: AssistantActivity) => void,
): ActivityFeed => {
  const open = new Map<number, AssistantActivity>()

  const push = (activity: AssistantActivity) => emit({ ...activity })

  const start = (icon: string, label: string): number => {
    const activity: AssistantActivity = { id: nextId++, icon, label, status: 'running' }
    open.set(activity.id, activity)
    push(activity)
    return activity.id
  }

  const update = (id: number, patch: { label?: string; detail?: string }) => {
    const activity = open.get(id)
    if (!activity) return
    Object.assign(activity, patch)
    push(activity)
  }

  const finish = (id: number, label?: string, isOk = true) => {
    const activity = open.get(id)
    if (!activity) return
    open.delete(id)
    push({
      ...activity,
      label: label ?? activity.label,
      detail: undefined,
      status: isOk ? 'done' : 'failed',
    })
  }

  const fail = (icon: string, label: string) => {
    push({ id: nextId++, icon, label, status: 'failed' })
  }

  const failAll = (label: string) => {
    for (const id of [...open.keys()]) finish(id, label, false)
  }

  return { start, update, finish, fail, failAll }
}

/** What each tool looks like while it is still running. */
export const TOOL_ACTIVITY: Record<string, { icon: string; label: string }> = {
  list_items: { icon: 'mdi-format-list-bulleted', label: 'Looking through the collection' },
  read_item: { icon: 'mdi-text-box-search-outline', label: 'Reading an item' },
  propose_create_items: { icon: 'mdi-plus-circle-outline', label: 'Writing new items' },
  propose_delete_items: { icon: 'mdi-delete-outline', label: 'Picking items to remove' },
  propose_update_items: { icon: 'mdi-pencil-outline', label: 'Writing edits' },
  propose_label_items: { icon: 'mdi-label-outline', label: 'Judging priority and difficulty' },
  propose_study_set: { icon: 'mdi-playlist-check', label: 'Putting a study set together' },
  propose_study_view_collections: { icon: 'mdi-book-multiple-outline', label: 'Choosing collections' },
}

export const activityForTool = (name: string) =>
  TOOL_ACTIVITY[name] ?? { icon: 'mdi-cog-outline', label: `Running ${name}` }
