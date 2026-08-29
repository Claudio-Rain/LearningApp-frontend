// The Study Options assistant: turning "the easy, essential cards from these
// three collections, balanced" into a study set.
//
// It shares the agentic loop (`./assistantLoop`) and the label vocabulary
// (`./itemLabels`) with the collection assistant, and nothing else — different
// job, different tools. Notably it cannot create, edit, or delete cards; the
// only thing it proposes is a selection.
//
// The division of labour is deliberate and is what keeps this cheap: the model
// picks the *criteria*, `./studySet` does the *arithmetic*. The model never
// names an item id, so a 300-card set costs the same handful of output tokens
// as a 3-card one, and the counts are always exactly right.

import type Anthropic from '@anthropic-ai/sdk'
import { runAgentTurn, type ToolOutcome } from './assistantLoop'
import { ITEM_LABEL_DEFS, LABEL_LEVELS, labelText, parseLabelLevel } from './itemLabels'
import { resolveStudySet, type BalanceMode, type StudySetFilter, type StudySetItem, type StudySetPlan, type StudySetSpec } from './studySet'
import type { AssistantActivity } from './collectionAssistant/types'

export interface StudySetCollection {
  id: string
  title: string
}

/** A proposed set, awaiting the user's approval. */
export interface StudySetProposal {
  kind: 'set'
  /** Short name for the set, e.g. "Easy essentials". */
  label: string
  spec: StudySetSpec
  plan: StudySetPlan
  /** Why the assistant chose these criteria. */
  reason?: string
}

/**
 * A proposed change to which collections Study View draws from — the selector
 * itself, with no filtering. Separate from a study set because it is a
 * different intent: "study these whole collections" rather than "study this
 * slice of them".
 */
export interface CollectionsProposal {
  kind: 'collections'
  collections: Array<{ id: string; title: string; cardCount: number }>
  /** Total cards across the chosen collections. */
  cardCount: number
  /** How many of those are currently excluded and would stay hidden. */
  hiddenByExclusions: number
  /** Whether approving also lifts those exclusions. */
  clearExclusions: boolean
  reason?: string
}

export type AssistantProposal = StudySetProposal | CollectionsProposal

/**
 * What the user currently has set up on the page — their selections, not their
 * library. Without this the assistant can't answer "use the ones I selected",
 * because the page's state is invisible to it otherwise.
 */
export interface StudySetSettings {
  /** Collections Study View draws from right now. */
  studyViewCollectionIds: string[]
  /** Collections the content widget cycles through right now. */
  contentWidgetCollectionIds: string[]
  /** Items excluded from study — non-empty means an earlier set is active. */
  excludedItemIds: Set<string>
}

export interface StudySetHandlers {
  onText: (chunk: string) => void
  onActivity: (activity: AssistantActivity) => void
  onProposal: (proposal: AssistantProposal) => void
  /** Live view of the catalog, re-read each turn. */
  getCollections: () => StudySetCollection[]
  getItems: () => StudySetItem[]
  /** Live view of the page's own settings, re-read each turn. */
  getSettings: () => StudySetSettings
}

const levelNames = (kind: 'priority' | 'difficulty') =>
  LABEL_LEVELS.map(level => ITEM_LABEL_DEFS[kind].levels[level].label)

const levelBound = (kind: 'priority' | 'difficulty', edge: 'Lowest' | 'Highest') => ({
  type: 'string' as const,
  enum: levelNames(kind),
  description: `${edge} ${kind} to include. Omit for no bound on this side.`,
})

export const STUDY_SET_TOOLS: Anthropic.Tool[] = [
  {
    name: 'propose_study_set',
    description:
      'Propose a study set: which collections to draw from and which cards qualify. This does NOT save — it runs the selection and shows the user an approval card with the exact split per collection, which they confirm. ' +
      'Describe the criteria only; never list individual cards. The app picks the cards, divides the total across collections, and guarantees the counts are exact. ' +
      'Call this once you know what the user wants; if their request is ambiguous in a way that changes the result, ask first instead.',
    input_schema: {
      type: 'object',
      properties: {
        collection_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ids of the collections to draw from.',
        },
        label: {
          type: 'string',
          description: 'Short name for this set, 2-4 words, e.g. "Easy essentials".',
        },
        total: {
          type: 'integer',
          description:
            'How many cards the set should hold IN TOTAL, across all the collections. Omit to take every card that qualifies — which is usually right when the user is capping individual collections rather than sizing the whole set.',
        },
        collection_limits: {
          type: 'array',
          description:
            'Hard per-collection ceilings. Each entry caps ONE collection; collections not listed are untouched. This is how you honour "at most 10 from X" or "less of Y" — set a limit for that collection and omit `total`, and every other collection stays exactly as it was. A cap always holds, whatever the balance mode.',
          items: {
            type: 'object',
            properties: {
              collection_id: { type: 'string', description: 'The collection to cap.' },
              max: { type: 'integer', description: 'Most cards this collection may contribute. 0 drops it entirely.' },
            },
            required: ['collection_id', 'max'],
            additionalProperties: false,
          },
        },
        priority_min: levelBound('priority', 'Lowest'),
        priority_max: levelBound('priority', 'Highest'),
        difficulty_min: levelBound('difficulty', 'Lowest'),
        difficulty_max: levelBound('difficulty', 'Highest'),
        include_unlabeled: {
          type: 'boolean',
          description:
            'Whether cards with no label pass a label filter. Defaults to false — an unlabeled card is not known to be easy.',
        },
        max_strength: {
          type: 'number',
          description:
            'Only cards at or below this mastery, 0 to 1. Use to exclude what the user already knows well.',
        },
        only_new: {
          type: 'boolean',
          description: 'true = only never-studied cards; false = only cards already seen.',
        },
        exclude_current_set: {
          type: 'boolean',
          description:
            'Leave out every card the user is studying right now, so the proposal is the NEXT batch instead of the one they just finished. Set it when they ask for "the next chunk", "more", "what comes after these". ' +
            'Defaults to false, and it is never right to set it just because a card has been studied — if the user asks for something that overlaps what they are on, give them the overlap.',
        },
        balance: {
          type: 'string',
          enum: ['balanced', 'proportional', 'equal'],
          description:
            'How to divide the total across collections. "balanced" (the default) splits by size but guarantees every collection a share and never starves a small one. "proportional" splits strictly by size. "equal" gives every collection the same count.',
        },
        reason: {
          type: 'string',
          description: 'One line on why these criteria, shown to the user.',
        },
      },
      required: ['collection_ids', 'label'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_study_view_collections',
    description:
      "Propose changing which collections Study View draws from — the Study View selector itself, with no filtering. This does NOT save; it shows the user an approval card they confirm. " +
      'Use this when the user wants to study whole collections ("add these to Study View", "study everything in my grammar collections"). ' +
      'Use propose_study_set instead when they want a filtered slice of the cards.',
    input_schema: {
      type: 'object',
      properties: {
        collection_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ids of the collections Study View should draw from. This REPLACES the current selection, so include any existing ones the user wants to keep.',
        },
        clear_exclusions: {
          type: 'boolean',
          description:
            'Whether to also un-hide cards excluded by an earlier study set. Set true when the user wants to study these collections in full; leave false to keep their exclusions.',
        },
        reason: {
          type: 'string',
          description: 'One line on why, shown to the user.',
        },
      },
      required: ['collection_ids'],
      additionalProperties: false,
    },
  },
]

const asLevel = (kind: 'priority' | 'difficulty', raw: unknown): number | undefined => {
  if (raw === undefined || raw === null) return undefined
  return parseLabelLevel(kind, raw) ?? undefined
}

const range = (min?: number, max?: number) =>
  min === undefined && max === undefined ? undefined : { min, max }

const asNumber = (raw: unknown): number | undefined =>
  typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined

const asBoolean = (raw: unknown): boolean | undefined =>
  typeof raw === 'boolean' ? raw : undefined

const asBalance = (raw: unknown): BalanceMode =>
  (['balanced', 'proportional', 'equal'] as const).includes(raw as BalanceMode)
    ? (raw as BalanceMode)
    : 'balanced'

/** Which cards qualify, from the model's flat input. Every field is validated. */
const toFilter = (input: any, activeSetIds?: ReadonlySet<string>): StudySetFilter => ({
  priority: range(asLevel('priority', input?.priority_min), asLevel('priority', input?.priority_max)),
  difficulty: range(asLevel('difficulty', input?.difficulty_min), asLevel('difficulty', input?.difficulty_max)),
  maxStrength: asNumber(input?.max_strength),
  onlyNew: asBoolean(input?.only_new),
  includeUnlabeled: input?.include_unlabeled === true,
  // Only ever honoured on request: a card the user has studied is never dropped
  // behind their back, only when they asked for what comes next.
  excludeIds:
    input?.exclude_current_set === true && activeSetIds && activeSetIds.size > 0
      ? activeSetIds
      : undefined,
})

/** Per-collection ceilings, keeping only the ones naming a real collection. */
const toLimits = (input: any, knownIds: Set<string>): Record<string, number> | undefined => {
  const limits: Record<string, number> = {}
  for (const entry of input?.collection_limits ?? []) {
    const id = String(entry?.collection_id ?? '')
    const max = asNumber(entry?.max)
    if (knownIds.has(id) && max !== undefined && max >= 0) limits[id] = Math.floor(max)
  }
  return Object.keys(limits).length > 0 ? limits : undefined
}

/**
 * Turn the model's flat tool input into a spec the resolver understands.
 * Every field is validated rather than trusted: an unknown collection id, a
 * level name that isn't on the ladder, or a non-numeric total is dropped, so a
 * malformed call degrades into a broader set instead of throwing.
 */
export function toStudySetSpec(
  input: any,
  known: StudySetCollection[],
  activeSetIds?: ReadonlySet<string>
): StudySetSpec {
  const knownIds = new Set(known.map(c => c.id))
  const total = asNumber(input?.total)

  return {
    collectionIds: (input?.collection_ids ?? []).map(String).filter((id: string) => knownIds.has(id)),
    total: total !== undefined && total > 0 ? Math.floor(total) : undefined,
    balance: asBalance(input?.balance),
    limits: toLimits(input, knownIds),
    filter: toFilter(input, activeSetIds),
  }
}

const runProposeStudySet = (input: any, handlers: StudySetHandlers): ToolOutcome => {
  const collections = handlers.getCollections()
  const settings = handlers.getSettings()
  const activeIds = new Set(activeSetItems(settings, handlers.getItems()).map(i => i.id))
  const spec = toStudySetSpec(input, collections, activeIds)

  if (spec.collectionIds.length === 0) {
    return {
      ok: false,
      result: 'None of the given collection_ids match a collection. Use the ids listed in the system prompt.',
      label: 'No matching collections',
    }
  }

  // Resolve here, not in the model: the counts the user approves are the same
  // numbers the app will act on, and the model gets the real result to describe.
  const plan = resolveStudySet(handlers.getItems(), spec)
  const titleFor = (id: string) => collections.find(c => c.id === id)?.title ?? id

  if (plan.items.length === 0) {
    // Say which lever emptied it. "Nothing matched" sends the model off
    // loosening labels when the real cause is that the batch is the last one.
    const nextBatchNote = spec.filter?.excludeIds
      ? ' Note that exclude_current_set was on, so everything they are already studying was left out — there may be no cards left after this batch.'
      : ''
    return {
      ok: false,
      result: `That filter matches no cards. ${plan.shortfall ?? ''}${nextBatchNote} Try loosening it, or allow unlabeled cards.`.trim(),
      label: 'Nothing matched that filter',
    }
  }

  handlers.onProposal({
    kind: 'set',
    label: String(input?.label ?? 'Study set').trim() || 'Study set',
    spec,
    plan,
    reason: input?.reason ? String(input.reason) : undefined,
  })

  const split = plan.allocations
    .map(a => {
      const capped = a.cap !== undefined && a.cap < a.pool ? `, capped at ${a.cap}` : ''
      return `${titleFor(a.collectionId)}: ${a.taken} of ${a.pool} available${capped}`
    })
    .join('; ')

  return {
    ok: true,
    result:
      `Showed the user an approval card for a ${plan.items.length}-card set. Split — ${split}.` +
      (spec.filter?.excludeIds ? ' Every card in it is one they are NOT currently studying.' : '') +
      (plan.shortfall ? ` Note: ${plan.shortfall}` : '') +
      ' Awaiting their review; tell them briefly what the split is.',
    label: `Proposed a ${plan.items.length}-card set`,
  }
}

const runProposeCollections = (input: any, handlers: StudySetHandlers): ToolOutcome => {
  const known = handlers.getCollections()
  const knownIds = new Set(known.map(c => c.id))
  const ids: string[] = [
    ...new Set((input?.collection_ids ?? []).map(String).filter((id: string) => knownIds.has(id))),
  ] as string[]

  if (ids.length === 0) {
    return {
      ok: false,
      result: 'None of the given collection_ids match a collection. Use the ids listed in the system prompt.',
      label: 'No matching collections',
    }
  }

  const items = handlers.getItems()
  const excluded = handlers.getSettings().excludedItemIds
  const chosen = ids.map(id => ({
    id,
    title: known.find(c => c.id === id)?.title ?? id,
    cardCount: items.filter(i => i.collectionId === id).length,
  }))

  const cardCount = chosen.reduce((sum, c) => sum + c.cardCount, 0)
  const hiddenByExclusions = items.filter(
    i => ids.includes(i.collectionId) && excluded.has(i.id)
  ).length
  const clearExclusions = input?.clear_exclusions === true

  handlers.onProposal({
    kind: 'collections',
    collections: chosen,
    cardCount,
    hiddenByExclusions,
    clearExclusions,
    reason: input?.reason ? String(input.reason) : undefined,
  })

  // The hidden count is the trap here: without it the user approves "200 cards"
  // and studies 153. Make the model say it out loud.
  const hiddenNote =
    hiddenByExclusions === 0
      ? ''
      : clearExclusions
        ? ` Approving also un-hides ${hiddenByExclusions} card${hiddenByExclusions === 1 ? '' : 's'} excluded by an earlier set.`
        : ` Warning: ${hiddenByExclusions} of those cards are still excluded by an earlier set and will NOT be studied — tell the user, and offer to clear the exclusions.`

  return {
    ok: true,
    result:
      `Showed the user an approval card to set Study View to ${ids.length} collection${ids.length === 1 ? '' : 's'} (${cardCount} cards).${hiddenNote} Awaiting their review.`,
    label: `Proposed ${ids.length} collection${ids.length === 1 ? '' : 's'} for Study View`,
  }
}

const tally = (items: StudySetItem[], kind: 'priority' | 'difficulty'): string => {
  const counts = LABEL_LEVELS.map(level => {
    const n = items.filter(i => i[kind] === level).length
    return n > 0 ? `${labelText(kind, level)} ${n}` : null
  }).filter(Boolean)
  return counts.length > 0 ? counts.join(', ') : 'none labeled'
}

/**
 * How well the user knows a group of cards, in one clause.
 *
 * Studied and never-studied are reported side by side on purpose: a mastery
 * average alone is misleading, because "82%" over four cards out of ninety says
 * something very different from "82%" over all ninety. The model needs both
 * numbers to tell "you know this" apart from "you have barely started it".
 *
 * An average, never a per-card score — the model never learns that one
 * particular card is weak, so it cannot quietly drop it. Strength is here to be
 * talked about, not to select with.
 */
export function masterySummary(items: StudySetItem[]): string {
  const studied = items.filter(i => i.strength !== undefined)
  if (studied.length === 0) return `none of these studied yet (${items.length} never studied)`

  const average = Math.round(
    (studied.reduce((sum, i) => sum + (i.strength ?? 0), 0) / studied.length) * 100
  )
  const untouched = items.length - studied.length
  return untouched === 0
    ? `all ${studied.length} studied (average mastery ${average}%)`
    : `${studied.length} studied (average mastery ${average}%), ${untouched} never studied`
}

/**
 * A compact picture of what the user has to work with: per collection, how many
 * cards sit at each priority and difficulty level, how many are unlabeled, and
 * how well they know the ones they have seen.
 *
 * Counts, never cards. This is what lets the model propose a set that can
 * actually be filled — it can see that a collection has only 8 easy essentials
 * before promising 30 — while costing a few hundred tokens regardless of
 * library size.
 *
 * Mastery is per collection rather than library-wide because that is the grain
 * decisions get made at: "you have not touched your idioms" is actionable in a
 * way that an average across everything is not.
 */
export function renderDistribution(collections: StudySetCollection[], items: StudySetItem[]): string {
  return collections
    .map(c => {
      const own = items.filter(i => i.collectionId === c.id)
      if (own.length === 0) return `- ${c.title} (id: ${c.id}): empty`

      const unlabeled = own.filter(i => i.priority === undefined && i.difficulty === undefined).length

      return (
        `- ${c.title} (id: ${c.id}): ${own.length} cards\n` +
        `  priority — ${tally(own, 'priority')}\n` +
        `  difficulty — ${tally(own, 'difficulty')}\n` +
        `  ${unlabeled} unlabeled · ${masterySummary(own)}`
      )
    })
    .join('\n')
}

/**
 * The cards the user is studying right now: everything in the Study View
 * collections that an earlier set didn't exclude.
 *
 * This is the whole definition of an active set — there is no stored set object
 * (see `useStudySet`), so "what am I studying" is only ever this subtraction.
 */
export function activeSetItems(settings: StudySetSettings, items: StudySetItem[]): StudySetItem[] {
  return items.filter(
    i => settings.studyViewCollectionIds.includes(i.collectionId) && !settings.excludedItemIds.has(i.id)
  )
}

/**
 * What the user is studying *right now*, described the same way the library is.
 *
 * This is what makes "give me the next batch" answerable. Knowing only that 37
 * cards are excluded, the model can't tell that the 30 in play are all easy
 * essentials and that the tier is spent; with the tally in front of it, it can
 * step down to the next band and say why.
 *
 * Counts and averages, never ids — the model still never names a card, so this
 * costs a fixed handful of tokens no matter how big the set is.
 */
export function renderActiveSet(
  settings: StudySetSettings,
  collections: StudySetCollection[],
  items: StudySetItem[]
): string {
  if (settings.studyViewCollectionIds.length === 0) {
    return 'No collections are selected for Study View, so there is no active set.'
  }

  const active = activeSetItems(settings, items)
  if (active.length === 0) {
    return 'Every card in the selected collections is excluded — the active set is empty.'
  }

  const from = settings.studyViewCollectionIds
    .map(id => ({
      title: collections.find(c => c.id === id)?.title ?? id,
      n: active.filter(i => i.collectionId === id).length,
    }))
    .filter(c => c.n > 0)
    .map(c => `${c.title} ${c.n}`)
    .join(', ')

  // Whether a set was ever applied changes what "the next batch" can mean: with
  // no exclusions the user is studying whole collections, so there is nothing
  // "after" the current set except the rest of the library.
  const shape =
    settings.excludedItemIds.size > 0
      ? 'a filtered set is active'
      : 'no filtering — these are the selected collections in full'

  return (
    `- ${active.length} cards in play (${shape})\n` +
    `  priority — ${tally(active, 'priority')}\n` +
    `  difficulty — ${tally(active, 'difficulty')}\n` +
    `  ${masterySummary(active)}\n` +
    `  from: ${from}`
  )
}

/**
 * The user's current selections, named rather than listed as ids.
 *
 * Rebuilt every turn, so toggling a selector and asking again is picked up
 * immediately. The cost is one prompt-cache miss on the turn after a change,
 * which is the right trade: an assistant that can't see the page is one the
 * user has to describe the page to.
 */
export function renderSettings(
  settings: StudySetSettings,
  collections: StudySetCollection[]
): string {
  const names = (ids: string[]) => {
    const titles = ids
      .map(id => collections.find(c => c.id === id)?.title)
      .filter((t): t is string => !!t)
    return titles.length > 0 ? titles.join(', ') : 'none selected'
  }

  return (
    `- Study View is set to draw from: ${names(settings.studyViewCollectionIds)}\n` +
    `- The content widget cycles through: ${names(settings.contentWidgetCollectionIds)}\n` +
    `- ${settings.excludedItemIds.size} card${settings.excludedItemIds.size === 1 ? ' is' : 's are'} currently excluded from study` +
    (settings.excludedItemIds.size > 0 ? ' (a set is already active; proposing a new one replaces it)' : '')
  )
}

const ladder = (kind: 'priority' | 'difficulty') =>
  `${ITEM_LABEL_DEFS[kind].title}: ${LABEL_LEVELS.map(l => `${l} ${ITEM_LABEL_DEFS[kind].levels[l].label}`).join(', ')}`

export function buildStudySetSystem(
  collections: StudySetCollection[],
  items: StudySetItem[],
  settings: StudySetSettings
): string {
  return (
    `You are a study assistant embedded in a flashcard app. You help the user assemble a study set: which of their collections to draw from, and which cards from those collections are worth studying now.\n\n` +
    `Each card carries two optional 1-5 labels the user (or you) set earlier, plus a mastery score from their study history.\n` +
    `- ${ladder('priority')}. ${ITEM_LABEL_DEFS.priority.description}\n` +
    `- ${ladder('difficulty')}. ${ITEM_LABEL_DEFS.difficulty.description}\n` +
    `- Mastery is 0 to 1, measuring how well the user knows the card. A card with no mastery has never been studied.\n\n` +
    `Their library:\n${renderDistribution(collections, items)}\n\n` +
    `What they have set up on this page right now:\n${renderSettings(settings, collections)}\n\n` +
    `What they are studying right now:\n${renderActiveSet(settings, collections, items)}\n\n` +
    `Rules:\n` +
    `- The settings above are live — that IS what the user currently has selected on the page, so answer questions about their selection directly instead of saying you can't see it. It refreshes each time they message you, so if they change a selector and ask again, you will see the new value.\n` +
    `- When they say "the ones I selected", "these collections", or don't name any, use the Study View selection above. If that is empty, ask which collections rather than guessing.\n` +
    `- You CAN change the Study View selection: propose_study_view_collections does exactly that. Use it when they want whole collections (including copying the content widget's selection across); use propose_study_set when they want a filtered slice. Never tell the user to go and change the selector by hand.\n` +
    `- propose_study_view_collections REPLACES the selection rather than adding to it, so when the user says "also add these", include the collections already selected alongside the new ones.\n` +
    `- The active set above is live too, and it is what "these", "the ones I'm on", and "what I've been studying" refer to. You can see its size, its label mix and its mastery — use them; never say you cannot see what they are studying.\n` +
    `- "Give me the next batch/chunk/20 more" means: a fresh set of cards they are NOT currently studying. Set exclude_current_set: true, keep the same collections unless they say otherwise, and set total to the size they asked for. Approving REPLACES their current set, so say that plainly — the batch they just finished stops being in Study View.\n` +
    `- Size the next batch by reading the distribution and the active set together. If they are on 30 easy essentials and want 30 more, check how many easy essentials are left; when that tier is spent, widen to the next band (medium, or important rather than essential) to fill the batch, and tell them you did and why. A batch that steps down a tier is normal progress, not a problem.\n` +
    `- When they ask where they stand, what is left, or whether there is anything else worth studying, answer from the mastery and never-studied counts above — per collection and for the active set. "You have 40 easy essentials left in Idioms and have not touched Phrasal Verbs at all" is the kind of answer to give. Then offer a set; do not make them ask twice.\n` +
    `- Mastery and study history are there for you to REASON with, never to overrule the user. If they ask for cards they have already studied, or already know well, or that are in their current set, give them exactly that. Do not quietly filter it out, do not argue, do not propose something different from what they asked for. Only set exclude_current_set, only_new or max_strength when their request actually calls for it.\n` +
    `- You do NOT choose individual cards, and you never see or name card ids. You describe the criteria; the app picks the cards, splits the total across collections, and guarantees the counts are exact. Trust the numbers it returns and quote them back to the user.\n` +
    `- NEVER claim you built or saved a set. propose_study_set only shows an approval card — the user confirms it. After proposing, say briefly what the split is and let them review.\n` +
    `- Read the distribution above before promising a number. If a collection has only 8 cards matching what they asked for, say so rather than proposing a set that quietly under-delivers.\n` +
    `- To limit ONE collection without disturbing the others ("max 10 phrasal verbs", "less of X"), set collection_limits for that collection and DO NOT set total. A cap is a hard ceiling applied before any splitting, so the other collections keep every card that qualifies. Do not try to achieve a per-collection cap by computing a clever total — totals are split across all collections and cannot express a per-collection limit.\n` +
    `- Set total only when the user asks for a specific size of set overall ("a 30-card set"). If you set both a total and limits, the total is still divided across collections and a capped collection simply never exceeds its cap.\n` +
    `- "Balanced" is the default split and is almost always what someone means by "divided between these": it splits by size but guarantees every collection a share. Only use "proportional" or "equal" if the user clearly asks for that.\n` +
    `- Unlabeled cards are excluded from a label filter by default. If that would leave the set thin, say so and offer to include them.\n` +
    `- Ask a question only when the answer would genuinely change the set. A vague "I want to practice these" is enough to propose something sensible — propose it, say what you assumed, and let them adjust.\n` +
    `- Keep replies concise and friendly. Use markdown.`
  )
}

/** Run one turn of the Study Options assistant. Mutates `messages` in place. */
export const runStudySetTurn = async (
  messages: Anthropic.MessageParam[],
  handlers: StudySetHandlers,
): Promise<void> => {
  await runAgentTurn(
    {
      system: buildStudySetSystem(handlers.getCollections(), handlers.getItems(), handlers.getSettings()),
      tools: STUDY_SET_TOOLS,
      runTool: (name, input): ToolOutcome => {
        if (name === 'propose_study_set') return runProposeStudySet(input, handlers)
        if (name === 'propose_study_view_collections') return runProposeCollections(input, handlers)
        return { ok: false, result: `Unknown tool: ${name}`, label: `Unknown tool: ${name}` }
      },
    },
    messages,
    { onText: handlers.onText, onActivity: handlers.onActivity },
  )
}
