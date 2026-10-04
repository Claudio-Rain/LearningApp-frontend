import { describe, expect, test } from 'vitest'
import {
  buildCollectionListSystem,
  runCollectionListTool,
  type CollectionListHandlers,
  type CollectionListProposal,
} from '@/utils/collectionListAssistant'

const collections = [
  { id: 'c-1', title: 'JS', itemCount: 3 },
  { id: 'c-2', title: 'Docker', itemCount: 5 },
]

const harness = () => {
  const proposals: CollectionListProposal[] = []
  const handlers: CollectionListHandlers = {
    onText: () => {},
    onActivity: () => {},
    onProposal: (p) => proposals.push(p),
    getCollections: () => collections,
  }
  return { proposals, handlers }
}

describe('propose_rename_collections', () => {
  test('renames one collection', () => {
    const { proposals, handlers } = harness()
    const outcome = runCollectionListTool(
      'propose_rename_collections',
      { items: [{ id: 'c-1', title: 'JavaScript' }] },
      handlers,
    )
    expect(outcome.ok).toBe(true)
    expect(proposals).toEqual([
      { kind: 'rename', items: [{ id: 'c-1', currentTitle: 'JS', title: 'JavaScript' }] },
    ])
  })

  test('renames many collections on one card', () => {
    const { proposals, handlers } = harness()
    runCollectionListTool(
      'propose_rename_collections',
      { items: [{ id: 'c-1', title: 'JavaScript' }, { id: 'c-2', title: 'Containers' }] },
      handlers,
    )
    expect(proposals).toHaveLength(1)
    expect(proposals[0]!.items.map((it) => it.title)).toEqual(['JavaScript', 'Containers'])
  })

  test('drops unknown ids, blank and unchanged names', () => {
    const { proposals, handlers } = harness()
    const outcome = runCollectionListTool(
      'propose_rename_collections',
      {
        items: [
          { id: 'nope', title: 'X' },
          { id: 'c-1', title: '  ' },
          { id: 'c-2', title: 'Docker' },
        ],
      },
      handlers,
    )
    expect(outcome.ok).toBe(false)
    expect(proposals).toHaveLength(0)
  })

  test('the system prompt carries collection ids', () => {
    expect(buildCollectionListSystem(collections)).toContain('- c-1: JS')
  })
})
