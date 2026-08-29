import { describe, it, expect } from 'vitest'
import {
  activeSetItems,
  masterySummary,
  renderActiveSet,
  renderDistribution,
  toStudySetSpec,
  type StudySetCollection,
  type StudySetSettings,
} from './studySetAssistant'
import type { StudySetItem } from './studySet'

const item = (over: Partial<StudySetItem> & { id: string; collectionId: string }): StudySetItem => ({
  title: over.id,
  ...over,
})

const collections: StudySetCollection[] = [
  { id: 'idioms', title: 'Idioms' },
  { id: 'phrasal', title: 'Phrasal Verbs' },
]

const settings = (over: Partial<StudySetSettings> = {}): StudySetSettings => ({
  studyViewCollectionIds: ['idioms'],
  contentWidgetCollectionIds: [],
  excludedItemIds: new Set(),
  ...over,
})

describe('masterySummary', () => {
  it('reports studied and never-studied side by side', () => {
    const summary = masterySummary([
      item({ id: 'a', collectionId: 'c', strength: 0.8 }),
      item({ id: 'b', collectionId: 'c', strength: 0.6 }),
      item({ id: 'c', collectionId: 'c' }),
    ])

    expect(summary).toBe('2 studied (average mastery 70%), 1 never studied')
  })

  it('averages only the studied cards, so untouched ones do not drag it to zero', () => {
    const summary = masterySummary([
      item({ id: 'a', collectionId: 'c', strength: 0.9 }),
      ...Array.from({ length: 9 }, (_, i) => item({ id: `n${i}`, collectionId: 'c' })),
    ])

    expect(summary).toContain('90%')
    expect(summary).toContain('9 never studied')
  })

  it('says so plainly when nothing has been studied', () => {
    const summary = masterySummary([item({ id: 'a', collectionId: 'c' })])
    expect(summary).toBe('none of these studied yet (1 never studied)')
  })

  it('drops the never-studied clause when everything has been seen', () => {
    const summary = masterySummary([item({ id: 'a', collectionId: 'c', strength: 0.5 })])
    expect(summary).toBe('all 1 studied (average mastery 50%)')
  })
})

describe('renderDistribution', () => {
  it('gives every collection its own mastery line', () => {
    const text = renderDistribution(collections, [
      item({ id: 'i1', collectionId: 'idioms', priority: 5, difficulty: 1, strength: 0.8 }),
      item({ id: 'i2', collectionId: 'idioms', priority: 5, difficulty: 1 }),
      item({ id: 'p1', collectionId: 'phrasal', priority: 3, difficulty: 3 }),
    ])

    // Untouched collections are the actionable case: the model should be able to
    // see "you have not started this one" without doing arithmetic.
    expect(text).toContain('1 studied (average mastery 80%), 1 never studied')
    expect(text).toContain('none of these studied yet (1 never studied)')
  })

  it('marks an empty collection rather than reporting mastery for nothing', () => {
    expect(renderDistribution(collections, [])).toContain('Idioms (id: idioms): empty')
  })
})

describe('activeSetItems', () => {
  const library = [
    item({ id: 'a', collectionId: 'idioms' }),
    item({ id: 'b', collectionId: 'idioms' }),
    item({ id: 'c', collectionId: 'phrasal' }),
  ]

  it('is the selected collections minus the exclusions', () => {
    const active = activeSetItems(settings({ excludedItemIds: new Set(['b']) }), library)
    expect(active.map(i => i.id)).toEqual(['a'])
  })

  it('ignores collections Study View is not pointed at', () => {
    const active = activeSetItems(settings(), library)
    expect(active.every(i => i.collectionId === 'idioms')).toBe(true)
  })
})

describe('renderActiveSet', () => {
  const library = [
    item({ id: 'a', collectionId: 'idioms', priority: 5, difficulty: 1, strength: 0.7 }),
    item({ id: 'b', collectionId: 'idioms', priority: 5, difficulty: 1, strength: 0.9 }),
    item({ id: 'c', collectionId: 'idioms', priority: 2, difficulty: 4 }),
  ]

  it('describes what is in play, with its label mix and mastery', () => {
    const text = renderActiveSet(settings({ excludedItemIds: new Set(['c']) }), collections, library)

    expect(text).toContain('2 cards in play')
    expect(text).toContain('a filtered set is active')
    expect(text).toContain('all 2 studied (average mastery 80%)')
    expect(text).toContain('from: Idioms 2')
  })

  it('distinguishes whole collections from a filtered set', () => {
    const text = renderActiveSet(settings(), collections, library)
    expect(text).toContain('3 cards in play')
    expect(text).toContain('no filtering')
  })

  it('says there is no set rather than rendering an empty one', () => {
    expect(renderActiveSet(settings({ studyViewCollectionIds: [] }), collections, library))
      .toContain('no active set')

    const allExcluded = settings({ excludedItemIds: new Set(['a', 'b', 'c']) })
    expect(renderActiveSet(allExcluded, collections, library)).toContain('active set is empty')
  })
})

describe('toStudySetSpec', () => {
  const activeIds = new Set(['a', 'b'])

  it('leaves strength alone unless the model asked for a strength filter', () => {
    const spec = toStudySetSpec({ collection_ids: ['idioms'] }, collections, activeIds)

    expect(spec.filter?.maxStrength).toBeUndefined()
    expect(spec.filter?.onlyNew).toBeUndefined()
    expect(spec.filter?.excludeIds).toBeUndefined()
  })

  it('only excludes the current set when explicitly asked', () => {
    const off = toStudySetSpec({ collection_ids: ['idioms'] }, collections, activeIds)
    const on = toStudySetSpec(
      { collection_ids: ['idioms'], exclude_current_set: true },
      collections,
      activeIds
    )

    expect(off.filter?.excludeIds).toBeUndefined()
    expect(on.filter?.excludeIds).toBe(activeIds)
  })

  it('ignores the flag when there is no active set to exclude', () => {
    const spec = toStudySetSpec(
      { collection_ids: ['idioms'], exclude_current_set: true },
      collections,
      new Set()
    )
    expect(spec.filter?.excludeIds).toBeUndefined()
  })

  it('drops collection ids and caps that name nothing real', () => {
    const spec = toStudySetSpec(
      {
        collection_ids: ['idioms', 'nope'],
        collection_limits: [
          { collection_id: 'phrasal', max: 10 },
          { collection_id: 'ghost', max: 5 },
        ],
      },
      collections
    )

    expect(spec.collectionIds).toEqual(['idioms'])
    expect(spec.limits).toEqual({ phrasal: 10 })
  })
})
