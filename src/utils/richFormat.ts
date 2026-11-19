// The vocabulary of rich card content beyond plain markdown: text colours,
// highlighter colours and callout boxes. Content stores these by name only;
// how a name looks (per light/dark theme) lives in plugins/vuetify.ts and
// shared/styles/richContent.scss. No DOM here: markdown.ts uses it in the
// service worker too.

export const TEXT_COLORS = ['blue', 'green', 'red', 'orange', 'purple', 'teal'] as const
export type TextColor = (typeof TEXT_COLORS)[number]

export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple', 'orange'] as const
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]

export const isTextColor = (c: string): c is TextColor => (TEXT_COLORS as readonly string[]).includes(c)
export const isHighlightColor = (c: string): c is HighlightColor =>
  (HIGHLIGHT_COLORS as readonly string[]).includes(c)

export interface CalloutDef {
  /** Shown when the callout has no title of its own. */
  label: string
  icon: string
  /** Accent: one of TEXT_COLORS. */
  tone: TextColor
}

export const CALLOUTS = {
  definition: { label: 'Definition', icon: 'mdi-book-open-variant', tone: 'blue' },
  theorem: { label: 'Key result', icon: 'mdi-star-four-points', tone: 'purple' },
  tip: { label: 'Intuition', icon: 'mdi-lightbulb-on-outline', tone: 'teal' },
  warning: { label: 'Common mistake', icon: 'mdi-alert-outline', tone: 'orange' },
  example: { label: 'Example', icon: 'mdi-pencil-outline', tone: 'green' },
  summary: { label: 'Summary', icon: 'mdi-text-box-check-outline', tone: 'red' },
  note: { label: 'Note', icon: 'mdi-information-outline', tone: 'blue' },
} as const satisfies Record<string, CalloutDef>

export type CalloutVariant = keyof typeof CALLOUTS

export const CALLOUT_VARIANTS = Object.keys(CALLOUTS) as CalloutVariant[]

// The tags Claude (or a person) may write in "> [!TAG]": GitHub's alert names,
// ours, and the Spanish words a Spanish-speaking student would reach for.
const CALLOUT_TAGS: Record<string, CalloutVariant> = {
  definition: 'definition', definicion: 'definition', definición: 'definition', def: 'definition',
  theorem: 'theorem', teorema: 'theorem', important: 'theorem', key: 'theorem', formula: 'theorem',
  fórmula: 'theorem', property: 'theorem', propiedad: 'theorem', rule: 'theorem', regla: 'theorem',
  tip: 'tip', hint: 'tip', intuition: 'tip', idea: 'tip', intuición: 'tip', intuicion: 'tip', truco: 'tip',
  warning: 'warning', caution: 'warning', pitfall: 'warning', mistake: 'warning', cuidado: 'warning',
  error: 'warning', ojo: 'warning',
  example: 'example', ejemplo: 'example',
  summary: 'summary', tldr: 'summary', resumen: 'summary',
  note: 'note', info: 'note', nota: 'note',
}

/** The callout a "> [!TAG]" stands for, or null for an unknown tag. */
export const calloutFromTag = (tag: string): CalloutVariant | null => CALLOUT_TAGS[tag.trim().toLowerCase()] ?? null

export const isCalloutVariant = (v: unknown): v is CalloutVariant => typeof v === 'string' && v in CALLOUTS
