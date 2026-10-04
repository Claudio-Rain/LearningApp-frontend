import { describe, expect, test } from 'vitest'
import { runToolCall } from '@/utils/collectionAssistant/toolHandlers'
import { buildSystem } from '@/utils/collectionAssistant/prompt'
import type { AssistantHandlers, Proposal } from '@/utils/collectionAssistant/types'

const items = [
  { id: 'i-1', title: 'What is a closure?' },
  { id: 'i-2', title: 'What is a Docker volume?' },
]
const others = [{ id: 'c-docker', title: 'Containerization' }]
const harness = () => {
  const proposals: Proposal[] = []
  const handlers: AssistantHandlers = {
    onText: () => {},
    onActivity: () => {},
    onProposal: (p) => proposals.push(p),
    getItems: () => items,
    getOtherCollections: () => others,  }
  return { proposals, handlers }
}

describe('propose_move_items', () => {
  test('moves to an existing collection by id', () => {
    const { proposals, handlers } = harness()
    const outcome = runToolCall(
      'propose_move_items',
      { collection_id: 'c-docker', items: [{ id: 'i-2' }] },
      handlers,
    )
    expect(outcome.ok).toBe(true)
    expect(proposals).toEqual([
      {
        kind: 'move',
        target: { id: 'c-docker', title: 'Containerization' },
        items: [{ id: 'i-2', title: 'What is a Docker volume?', reason: undefined }],
      },
    ])
  })

  test('a new title proposes creating a collection', () => {
    const { proposals, handlers } = harness()
    runToolCall('propose_move_items', { new_collection_title: 'JavaScript', items: [{ id: 'i-1' }] }, handlers)
    expect(proposals[0]).toMatchObject({ kind: 'move', target: { newTitle: 'JavaScript' } })
  })

  test('a new title matching an existing collection reuses it', () => {
    const { proposals, handlers } = harness()
    runToolCall('propose_move_items', { new_collection_title: 'containerization', items: [{ id: 'i-2' }] }, handlers)
    expect(proposals[0]).toMatchObject({ target: { id: 'c-docker' } })
  })

  test('fails without a valid destination', () => {
    const { proposals, handlers } = harness()
    const outcome = runToolCall('propose_move_items', { collection_id: 'nope', items: [{ id: 'i-1' }] }, handlers)
    expect(outcome.ok).toBe(false)
    expect(proposals).toHaveLength(0)
  })

  test('fails when no ids match this collection', () => {
    const { proposals, handlers } = harness()
    const outcome = runToolCall('propose_move_items', { collection_id: 'c-docker', items: [{ id: 'x' }] }, handlers)
    expect(outcome.ok).toBe(false)
    expect(proposals).toHaveLength(0)
  })

  test('the prompt lists other collections with their ids', () => {
    const system = buildSystem({ title: 'JS' }, 2, null, 10, others)
    expect(system).toContain('- c-docker: Containerization')
  })
})
