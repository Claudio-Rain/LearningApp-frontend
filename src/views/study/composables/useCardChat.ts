import { ref, watch, type Ref } from 'vue'
import { ensureApiKey, streamCardChat, rewriteAsStandaloneQuestion, type ChatMessage } from '@/utils/claude'
import { markdownToTiptap } from '@/utils/markdown'
import { titleFieldsFromMarkdown } from '@/utils/itemTitle'
import type { CardFactory } from './useCardFactory'
import type { Notify, StudyItem } from '../types'

// Bubbles keep the raw markdown; the template converts it to TipTap on render.
// Errors are display-only and are excluded from the history sent to the API.
export interface ChatBubble {
  role: 'user' | 'assistant'
  text: string
  error?: boolean
  saving?: boolean
  added?: boolean
}

interface Options {
  cards: CardFactory
  notify: Notify
  /** Called once the question bubble is in the thread, before the reply streams. */
  onQuestionSent?: () => void
  /** Called when the reply finished (or failed) for the card still on screen. */
  onReplyDone?: () => void
}

/** A chat thread with Claude about one card. It resets whenever the card changes. */
export function useCardChat(item: Ref<StudyItem | undefined>, { cards, notify, onQuestionSent, onReplyDone }: Options) {
  const messages = ref<ChatBubble[]>([])
  const input = ref('')
  const busy = ref(false)

  watch(() => item.value?.id, () => {
    messages.value = []
    busy.value = false
  })

  const send = async () => {
    const text = input.value.trim()
    if (!text || busy.value || !item.value) return
    if (!(await ensureApiKey())) return

    // Bind the request to the card it was asked about; if the card changes
    // while Claude is answering, the stale reply is dropped instead of leaking
    // into the fresh thread.
    const card = item.value
    const isStillCurrent = () => item.value?.id === card.id
    const history: ChatMessage[] = messages.value
      .filter(m => !m.error && m.text)
      .map(m => ({ role: m.role, content: m.text }))
    history.push({ role: 'user', content: text })

    input.value = ''
    busy.value = true
    messages.value.push({ role: 'user', text })
    messages.value.push({ role: 'assistant', text: '' })
    // Grab the proxy out of the array so mutations during streaming are reactive.
    const reply = messages.value[messages.value.length - 1]!
    onQuestionSent?.()

    try {
      await streamCardChat(card.title, card.content, history, chunk => {
        if (isStillCurrent()) reply.text += chunk
      })
    } catch (error) {
      console.error('Card chat failed:', error)
      if (isStillCurrent()) {
        reply.text = 'Something went wrong — check your API key and try again.'
        reply.error = true
      }
    } finally {
      if (isStillCurrent()) {
        busy.value = false
        onReplyDone?.()
      }
    }
  }

  // One-click save of a chat question as a new card in the current card's
  // collection. Questions asked mid-chat lean on the card for context ("why do
  // we need this?"), so Claude rewrites them into a standalone title first (on
  // failure the raw text is used as-is). The reply Claude already gave becomes
  // the card's answer — nothing is generated twice; if the reply isn't in yet,
  // the answer is filled in the background.
  const saveQuestion = async (msg: ChatBubble, index: number) => {
    const card = item.value
    if (msg.saving || msg.added || !card) return
    const next = messages.value[index + 1]
    const answer = next?.role === 'assistant' && !next.error && next.text ? next.text : undefined

    msg.saving = true
    try {
      let title = msg.text
      try {
        title = (await rewriteAsStandaloneQuestion(card.title, card.content, msg.text)) || msg.text
      } catch (error) {
        console.error('Question rewrite failed:', error)
      }

      const content = answer ? markdownToTiptap(answer) : undefined
      const titleFields = titleFieldsFromMarkdown(title)
      const [created] = await cards.createCards(card.collectionId, [{ ...titleFields, content }])
      msg.added = true
      notify(`Added "${titleFields.title}"`)
      if (!content && created) {
        cards.autoAnswer(created)
          .catch(error => console.error(`Auto-answer failed for "${titleFields.title}":`, error))
      }
    } catch (error) {
      console.error('Failed to add chat question:', error)
      notify('Failed to add the question', true)
    } finally {
      msg.saving = false
    }
  }

  return { messages, input, busy, send, saveQuestion }
}
