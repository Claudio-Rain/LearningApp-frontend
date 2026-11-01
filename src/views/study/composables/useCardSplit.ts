import { ref, watch, type Ref } from 'vue'
import { ensureApiKey, proposeCardSplit, type SplitProposal } from '@/utils/claude'
import { markdownToTiptap } from '@/utils/markdown'
import { titleFieldsFromMarkdown } from '@/utils/itemTitle'
import type { CardFactory } from './useCardFactory'
import type { Notify, StudyItem } from '../types'

export type SplitStep = 'idle' | 'slider' | 'generating' | 'proposal' | 'fate' | 'creating'

interface Options {
  cards: CardFactory
  notify: Notify
  /** Called whenever the flow shows a new step, e.g. to scroll it into view. */
  onStepShown?: () => void
  /** Called with the original card's id once the user chose to delete it. */
  onDeleteOriginal: (id: string) => void | Promise<void>
}

/**
 * "Split" flow: divides the current card into N smaller cards. Steps: pick a
 * count → Claude proposes question/answer pairs → the user approves the list →
 * the user decides whether the original is kept or deleted → cards are created.
 * The flow resets whenever the card changes.
 */
export function useCardSplit(item: Ref<StudyItem | undefined>, { cards, notify, onStepShown, onDeleteOriginal }: Options) {
  const step = ref<SplitStep>('idle')
  const count = ref(3)
  const proposals = ref<SplitProposal[]>([])
  const error = ref('')

  const reset = () => {
    step.value = 'idle'
    proposals.value = []
    error.value = ''
  }

  watch(() => item.value?.id, reset)

  const show = (next: SplitStep) => {
    step.value = next
    onStepShown?.()
  }

  const start = async () => {
    if (!item.value || step.value !== 'idle') return
    if (!(await ensureApiKey())) return
    error.value = ''
    show('slider')
  }

  const generate = async () => {
    const card = item.value
    if (!card) return
    error.value = ''
    show('generating')
    try {
      const result = await proposeCardSplit(card.title, card.content, count.value)
      // The card changed while Claude was working; the watcher already reset
      // the flow, so drop the stale proposal instead of resurrecting it.
      if (item.value?.id !== card.id) return
      proposals.value = result
      show('proposal')
    } catch (err) {
      console.error('Card split failed:', err)
      if (item.value?.id === card.id) {
        error.value = 'Something went wrong — check your API key and try again.'
        step.value = 'slider'
      }
    }
  }

  const removeProposal = (i: number) => {
    proposals.value.splice(i, 1)
  }

  const approve = () => {
    if (proposals.value.length) show('fate')
  }

  // Final step: create the approved cards, then keep or delete the original.
  const finish = async (deleteOriginal: boolean) => {
    const card = item.value
    if (!card?.id) return
    step.value = 'creating'
    error.value = ''
    try {
      const approved = proposals.value
      await cards.createCards(card.collectionId, approved.map(p => ({
        ...titleFieldsFromMarkdown(p.question),
        content: p.answer ? markdownToTiptap(p.answer) : undefined
      })))
      notify(`Added ${approved.length} card${approved.length === 1 ? '' : 's'} from the split`)
      reset()
      if (deleteOriginal) await onDeleteOriginal(card.id)
    } catch (err) {
      console.error('Failed to create split cards:', err)
      error.value = 'Failed to create the cards — try again.'
      step.value = 'fate'
    }
  }

  return { step, count, proposals, error, reset, start, generate, removeProposal, approve, finish }
}
