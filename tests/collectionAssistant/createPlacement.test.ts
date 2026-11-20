import { describe, expect, test } from 'vitest'
import { runToolCall } from '@/utils/collectionAssistant/toolHandlers'
import type { AssistantHandlers, Proposal } from '@/utils/collectionAssistant/types'

const items = [
  { id: 'i-1', title: 'What is git stash and when would you use it?' },
  { id: 'i-2', title: 'What is git bisect and how does it work?' },
]
const harness = () => {
  const proposals: Proposal[] = []
  const handlers: AssistantHandlers = {
    onText: () => {},
    onActivity: () => {},
    onProposal: (p) => proposals.push(p),
    getItems: () => items,
    getOtherCollections: () => [],
  }
  return { proposals, handlers }
}

const newItems = [{ title: 'What does git stash pop do?', content: 'Applies and drops the stash.' }]

describe('propose_create_items placement', () => {
  test('carries a known after_id onto the proposal, with its title', () => {
    const { proposals, handlers } = harness()
    const outcome = runToolCall('propose_create_items', { items: newItems, after_id: 'i-1' }, handlers)
    expect(outcome.ok).toBe(true)
    expect(proposals[0]).toMatchObject({
      kind: 'create',
      after: { id: 'i-1', title: 'What is git stash and when would you use it?' },
    })
    expect(outcome.result).toContain('right after')
  })

  test('an unknown after_id still proposes, at the end, and tells the model', () => {
    const { proposals, handlers } = harness()
    const outcome = runToolCall('propose_create_items', { items: newItems, after_id: 'nope' }, handlers)
    expect(outcome.ok).toBe(true)
    expect(proposals[0]).not.toHaveProperty('after')
    expect(outcome.result).toContain('matched no item')
  })

  test('without after_id the proposal has no placement', () => {
    const { proposals, handlers } = harness()
    runToolCall('propose_create_items', { items: newItems }, handlers)
    expect(proposals[0]).not.toHaveProperty('after')
  })
})
