// The item-label scales, defined once for the whole app.
//
// A learning item carries two independent 1-5 labels — how much it matters
// (`priority`) and how hard the card itself is (`difficulty`) — both absent
// until the item has been labeled. Neither is CardProgress.strength_score,
// which measures how well *you* know the item; see `@/utils/strength`.
//
// Every surface that names, colors, orders or parses a label reads it from
// here: the editor's pickers today, and the collection assistant's read/write
// tools later. Adding a level or renaming one is a change in this file only.

import type { ItemLabelPatch, ItemLabels } from '@/database/types'

export type ItemLabelKind = keyof ItemLabels // 'priority' | 'difficulty'

/** The levels a label can take, ordered low→high. Absent = unlabeled. */
export const LABEL_LEVELS = [1, 2, 3, 4, 5] as const
export type LabelLevel = (typeof LABEL_LEVELS)[number]

export interface LabelLevelMeta {
  level: LabelLevel
  label: string
  // Vuetify theme token. Both scales share one intensity ramp (level 1 calm →
  // level 5 hot) so a row of labels reads as a single visual language.
  color: string
}

export interface ItemLabelDef {
  kind: ItemLabelKind
  /** Shown next to the value, e.g. "Priority: High". */
  title: string
  icon: string
  /** Shown in place of a level when the item has never been labeled. */
  unsetLabel: string
  /** One-line meaning, for tooltips and for the assistant's tool description. */
  description: string
  levels: Record<LabelLevel, LabelLevelMeta>
}

const levels = (names: [string, string, string, string, string]): Record<LabelLevel, LabelLevelMeta> =>
  Object.fromEntries(
    LABEL_LEVELS.map((level, i) => [
      level,
      { level, label: names[i]!, color: `labelLevel${level}` } satisfies LabelLevelMeta
    ])
  ) as Record<LabelLevel, LabelLevelMeta>

export const ITEM_LABEL_DEFS: Record<ItemLabelKind, ItemLabelDef> = {
  priority: {
    kind: 'priority',
    title: 'Priority',
    icon: 'mdi-flag-outline',
    unsetLabel: 'No priority',
    description:
      'How much this item matters to the user\'s current goal, 1 (someday) to 5 (essential). Relative to that goal, so it goes stale when the goal changes.',
    // Deliberately unhurried wording. This is a learner deciding what matters
    // to them, not a queue of incidents: "Someday" is a kind parking spot and
    // "Essential" is the top without implying anything is on fire. Keep any
    // future rename on that footing — urgency words don't belong on this scale.
    levels: levels(['Someday', 'Minor', 'Normal', 'Important', 'Essential'])
  },
  difficulty: {
    kind: 'difficulty',
    title: 'Difficulty',
    icon: 'mdi-speedometer',
    unsetLabel: 'No difficulty',
    description:
      'How hard the card itself is, 1 (trivial) to 5 (very hard). Independent of the goal and of how well the user knows it; only goes stale when the content is edited.',
    levels: levels(['Trivial', 'Easy', 'Moderate', 'Hard', 'Very hard'])
  }
}

/** Both defs in display order, for rendering a full row of label controls. */
export const ITEM_LABEL_KINDS: ItemLabelKind[] = ['priority', 'difficulty']

/** Label + color token for a stored value, or `null` when unlabeled. */
export function labelMeta(kind: ItemLabelKind, value: number | null | undefined): LabelLevelMeta | null {
  const level = toLabelLevel(value)
  return level === null ? null : ITEM_LABEL_DEFS[kind].levels[level]
}

/** The text to show for a value, falling back to the kind's unset wording. */
export function labelText(kind: ItemLabelKind, value: number | null | undefined): string {
  return labelMeta(kind, value)?.label ?? ITEM_LABEL_DEFS[kind].unsetLabel
}

/** A stored value narrowed to a valid level, or `null` if it isn't one. */
export function toLabelLevel(value: number | null | undefined): LabelLevel | null {
  if (value === null || value === undefined) return null
  const rounded = Math.round(value)
  return (LABEL_LEVELS as readonly number[]).includes(rounded) ? (rounded as LabelLevel) : null
}

/**
 * Read a level out of untrusted input — a number, a numeric string, or a level
 * name ("high", "Very hard"). Returns `null` for anything else, and for the
 * words that mean "unlabeled" ("none", "clear", null).
 *
 * Written for the assistant's future write tool, where the model may answer
 * with either a number or the name it saw in the prompt.
 */
export function parseLabelLevel(kind: ItemLabelKind, input: unknown): LabelLevel | null {
  if (typeof input === 'number') return toLabelLevel(input)
  if (typeof input !== 'string') return null

  const text = input.trim().toLowerCase()
  if (!text || text === 'none' || text === 'clear' || text === 'null') return null

  const numeric = Number(text)
  if (!Number.isNaN(numeric)) return toLabelLevel(numeric)

  const match = LABEL_LEVELS.find(
    level => ITEM_LABEL_DEFS[kind].levels[level].label.toLowerCase() === text
  )
  return match ?? null
}

/**
 * Normalize a caller-supplied patch into one the database layer can take:
 * unparseable values are dropped rather than written, and an explicit "clear"
 * survives as `null`. The single validation point for both the UI and the
 * assistant.
 */
export function toLabelPatch(patch: Partial<Record<ItemLabelKind, unknown>>): ItemLabelPatch {
  const result: ItemLabelPatch = {}
  for (const kind of ITEM_LABEL_KINDS) {
    if (!(kind in patch)) continue
    const raw = patch[kind]
    const level = parseLabelLevel(kind, raw)
    // Distinguish "clear it" from "that value made no sense": only the former
    // is written through as null, the latter is dropped from the patch.
    if (level !== null) result[kind] = level
    else if (isClearing(raw)) result[kind] = null
  }
  return result
}

function isClearing(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true
  if (typeof raw !== 'string') return false
  const text = raw.trim().toLowerCase()
  return text === '' || text === 'none' || text === 'clear' || text === 'null'
}
