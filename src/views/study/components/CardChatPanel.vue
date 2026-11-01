<template>
  <!-- Ask Claude about the card on screen. The thread is per-card and resets
       whenever the card changes (mirrors content.js). -->
  <div class="study-chat-panel">
    <div class="study-chat-header">
      <span>Ask AI about this card</span>
      <v-btn icon="mdi-close" variant="text" size="x-small" title="Close chat" @click="emit('close')" />
    </div>
    <div ref="messagesEl" class="study-chat-messages">
      <div v-if="messages.length === 0" class="study-chat-empty">Ask anything about the current card</div>
      <template v-for="(msg, i) in messages" :key="i">
        <div v-if="msg.role === 'user'" class="study-chat-user-group">
          <div class="study-chat-bubble user">{{ msg.text }}</div>
          <v-btn
            class="study-chat-save-btn"
            size="x-small"
            variant="text"
            :color="msg.added ? 'success' : 'primary'"
            :prepend-icon="msg.added ? 'mdi-check' : 'mdi-plus'"
            :loading="msg.saving"
            :disabled="msg.added"
            title="Save this question as a new card in this collection"
            @click="saveQuestion(msg, i)"
          >
            {{ msg.added ? 'Added' : 'Add to collection' }}
          </v-btn>
        </div>
        <div v-else-if="msg.error" class="study-chat-bubble assistant error">{{ msg.text }}</div>
        <div v-else-if="!msg.text" class="study-chat-bubble assistant thinking">Thinking…</div>
        <div v-else class="study-chat-bubble assistant">
          <TiptapDisplay :content="markdownToTiptap(msg.text)" />
        </div>
      </template>

      <!-- Split flow: slider → proposed cards → approve → original's fate. -->
      <div v-if="split.step.value !== 'idle'" class="study-chat-split">
        <template v-if="split.step.value === 'slider'">
          <div class="split-title">Split this card into how many cards?</div>
          <v-slider
            v-model="split.count.value"
            :min="1"
            :max="10"
            :step="1"
            show-ticks="always"
            thumb-label
            hide-details
            density="compact"
          />
          <div class="split-actions">
            <v-btn size="small" variant="text" @click="split.reset">Cancel</v-btn>
            <v-btn size="small" color="primary" variant="tonal" @click="split.generate">
              Propose {{ split.count.value }} card{{ split.count.value === 1 ? '' : 's' }}
            </v-btn>
          </div>
        </template>

        <div v-else-if="split.step.value === 'generating'" class="split-thinking">
          Splitting the card into {{ split.count.value }}…
        </div>

        <template v-else-if="split.step.value === 'proposal'">
          <div class="split-title">Proposed cards — approve to create them</div>
          <div v-for="(p, i) in split.proposals.value" :key="i" class="split-proposal">
            <div class="split-proposal-body">
              <div class="split-proposal-question">{{ i + 1 }}. {{ titlePreviewFromMarkdown(p.question) }}</div>
              <div v-if="p.answer" class="split-proposal-answer">{{ p.answer }}</div>
            </div>
            <v-btn
              icon="mdi-close"
              size="x-small"
              variant="text"
              title="Drop this card from the split"
              @click="split.removeProposal(i)"
            />
          </div>
          <div class="split-actions">
            <v-btn size="small" variant="text" @click="split.reset">Cancel</v-btn>
            <v-btn size="small" variant="text" prepend-icon="mdi-refresh" @click="split.generate">Regenerate</v-btn>
            <v-btn
              size="small"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-check"
              :disabled="!split.proposals.value.length"
              @click="split.approve"
            >
              Approve
            </v-btn>
          </div>
        </template>

        <template v-else-if="split.step.value === 'fate'">
          <div class="split-title">What should happen to the original card?</div>
          <div class="split-actions">
            <v-btn size="small" variant="text" @click="split.reset">Cancel</v-btn>
            <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-content-save-outline" @click="split.finish(false)">
              Keep it
            </v-btn>
            <v-btn size="small" color="error" variant="tonal" prepend-icon="mdi-delete-outline" @click="split.finish(true)">
              Delete it
            </v-btn>
          </div>
        </template>

        <div v-else-if="split.step.value === 'creating'" class="split-thinking">Creating cards…</div>

        <div v-if="split.error.value" class="split-error">{{ split.error.value }}</div>
      </div>
    </div>
    <div class="study-chat-presets">
      <v-btn
        size="x-small"
        variant="tonal"
        prepend-icon="mdi-call-split"
        :disabled="busy || split.step.value !== 'idle'"
        @click="split.start"
      >
        Split
      </v-btn>
    </div>
    <div class="study-chat-input-row">
      <textarea
        ref="inputEl"
        v-model="input"
        class="study-chat-input"
        rows="1"
        placeholder="Ask a question…"
        @keydown.enter.exact.prevent="send"
      />
      <v-btn icon="mdi-send" size="small" color="primary" variant="tonal" :disabled="busy" title="Send" @click="send" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef, nextTick } from 'vue'
import TiptapDisplay from '@/shared/components/TiptapDisplay.vue'
import { markdownToTiptap } from '@/utils/markdown'
import { titlePreviewFromMarkdown } from '@/utils/itemTitle'
import { useCardChat } from '../composables/useCardChat'
import { useCardSplit } from '../composables/useCardSplit'
import type { CardFactory } from '../composables/useCardFactory'
import type { StudyItem } from '../types'

// The parent keeps this panel mounted while hidden (v-show), so the thread
// survives closing and reopening the panel on the same card.
const props = defineProps<{
  item: StudyItem | undefined
  cards: CardFactory
}>()

const emit = defineEmits<{
  close: []
  notify: [message: string, error?: boolean]
  'delete-item': [id: string]
}>()

const messagesEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)
const item = toRef(props, 'item')
const notify = (message: string, error?: boolean) => emit('notify', message, error)

const focus = () => inputEl.value?.focus()

// Pin the just-sent question to the top of the thread, then leave the scroll
// alone while the answer streams in below it, so reading isn't yanked around.
const scrollToLatestQuestion = async () => {
  await nextTick()
  const el = messagesEl.value
  if (!el) return
  const bubbles = el.querySelectorAll<HTMLElement>('.study-chat-bubble.user')
  const last = bubbles[bubbles.length - 1]
  if (last) el.scrollTop += last.getBoundingClientRect().top - el.getBoundingClientRect().top - 12
}

const scrollToBottom = async () => {
  await nextTick()
  const el = messagesEl.value
  if (el) el.scrollTop = el.scrollHeight
}

const { messages, input, busy, send, saveQuestion } = useCardChat(item, {
  cards: props.cards,
  notify,
  onQuestionSent: scrollToLatestQuestion,
  onReplyDone: focus
})

const split = useCardSplit(item, {
  cards: props.cards,
  notify,
  onStepShown: scrollToBottom,
  onDeleteOriginal: id => emit('delete-item', id)
})

defineExpose({ focus })
</script>

<style scoped>
.study-chat-panel {
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: min(560px, calc(100vw - 32px));
  height: min(760px, calc(100vh - 120px));
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  z-index: 2000;
  overflow: hidden;
}

.study-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  flex-shrink: 0;
}

.study-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
}

.study-chat-empty {
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-size: 0.85rem;
  text-align: center;
  margin: auto;
}

.study-chat-bubble {
  max-width: 88%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.875rem;
  line-height: 1.45;
  overflow-wrap: break-word;
}

.study-chat-bubble.user {
  align-self: flex-end;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  white-space: pre-wrap;
}

/* User bubble plus its "Add to collection" action, kept right-aligned as one unit. */
.study-chat-user-group {
  align-self: flex-end;
  max-width: 88%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.study-chat-user-group .study-chat-bubble.user {
  max-width: 100%;
}

.study-chat-save-btn {
  text-transform: none;
  letter-spacing: normal;
  opacity: 0.85;
}

.study-chat-bubble.assistant {
  align-self: flex-start;
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.study-chat-bubble.assistant.error {
  background: rgba(var(--v-theme-error), 0.1);
  color: rgb(var(--v-theme-error));
}

.study-chat-bubble.thinking,
.split-thinking {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-style: italic;
}

.study-chat-split {
  align-self: stretch;
  background: rgba(var(--v-theme-primary), 0.06);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.split-title {
  font-weight: 600;
  font-size: 0.85rem;
}

.split-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
}

.split-actions .v-btn,
.study-chat-presets .v-btn {
  text-transform: none;
  letter-spacing: normal;
}

.split-proposal {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.split-proposal-body {
  flex: 1;
  min-width: 0;
}

.split-proposal-question {
  font-weight: 600;
  line-height: 1.35;
}

.split-proposal-answer {
  margin-top: 2px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.8rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
}

.split-error {
  color: rgb(var(--v-theme-error));
  font-size: 0.8rem;
}

.study-chat-presets {
  display: flex;
  gap: 6px;
  padding: 8px 10px 0;
  flex-shrink: 0;
}

.study-chat-input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  flex-shrink: 0;
}

.study-chat-input {
  flex: 1;
  resize: none;
  background: transparent;
  color: inherit;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.25);
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.4;
  max-height: 96px;
  outline: none;
}

.study-chat-input:focus {
  border-color: rgb(var(--v-theme-primary));
}
</style>
