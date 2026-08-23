<!-- CollectionAssistant.vue -->
<!--
  Floating AI chat for a collection. Ask questions about the items or drive
  CRUD; every write is surfaced as an approval card (create/delete checklists,
  edit preview) that the user confirms before the parent applies it.
-->
<template>
  <div class="assistant-root">
    <!-- Launcher -->
    <v-btn
      v-if="!open"
      class="assistant-fab"
      color="primary"
      icon="mdi-robot-happy-outline"
      size="large"
      elevation="6"
      title="Ask the AI assistant"
      @click="open = true"
    />

    <!-- Chat popup -->
    <div v-else class="assistant-panel" role="dialog" aria-label="AI assistant">
      <div class="assistant-header">
        <v-icon size="20" class="mr-2">mdi-robot-happy-outline</v-icon>
        <span class="assistant-title">Assistant</span>
        <span class="assistant-sub">{{ collection.title }}</span>
        <v-spacer />
        <v-btn
          icon="mdi-broom" size="x-small" variant="text"
          title="Clear conversation" :disabled="loading || messages.length === 0"
          @click="clearChat"
        />
        <v-btn icon="mdi-close" size="x-small" variant="text" title="Close" @click="open = false" />
      </div>

      <div ref="scrollEl" class="assistant-body">
        <div v-if="messages.length === 0" class="assistant-empty">
          <v-icon size="34" color="grey-lighten-1">mdi-message-text-outline</v-icon>
          <p>Ask about this collection, or have me add, edit, or remove items.</p>
          <div class="suggestions">
            <button v-for="s in suggestions" :key="s" class="chip" @click="send(s)">{{ s }}</button>
          </div>
        </div>

        <template v-for="(m, i) in messages" :key="i">
          <!-- Text bubbles -->
          <div v-if="m.role === 'user'" class="msg user">{{ m.text }}</div>
          <!-- renderMarkdown sanitizes with DOMPurify before this is injected -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-else-if="m.role === 'assistant'"
            class="msg assistant"
            v-html="renderMarkdown(m.text)"
          />
          <!-- eslint-enable vue/no-v-html -->

          <!-- Progress step: what the assistant is doing right now -->
          <div v-else-if="m.role === 'activity'" class="activity" :class="m.activity.status">
            <v-progress-circular
              v-if="m.activity.status === 'running'"
              indeterminate size="12" width="2"
            />
            <v-icon v-else size="14" class="activity-icon">
              {{ m.activity.status === 'failed' ? 'mdi-alert-circle-outline' : m.activity.icon }}
            </v-icon>
            <span class="activity-label">{{ m.activity.label }}</span>
            <span v-if="m.activity.detail" class="activity-detail">{{ m.activity.detail }}</span>
          </div>

          <!-- Proposal cards -->
          <div v-else class="proposal" :class="m.status">
            <!-- Create -->
            <template v-if="m.proposal.kind === 'create'">
              <div class="proposal-head">
                <v-icon size="16" color="primary">mdi-plus-circle-outline</v-icon>
                Add {{ selectedCount(m) }} item{{ selectedCount(m) === 1 ? '' : 's' }}
              </div>
              <ul class="proposal-list">
                <li v-for="(it, j) in m.proposal.items" :key="j">
                  <input
                    type="checkbox" :checked="m.selected[String(j)]"
                    :disabled="m.status !== 'pending'"
                    @change="toggle(m, String(j))"
                  />
                  <div class="proposal-item-text">
                    <div class="proposal-item-title">{{ it.title }}</div>
                    <div class="proposal-item-body">{{ shorten(it.content) }}</div>
                  </div>
                </li>
              </ul>
            </template>

            <!-- Delete -->
            <template v-else-if="m.proposal.kind === 'delete'">
              <div class="proposal-head">
                <v-icon size="16" color="error">mdi-delete-outline</v-icon>
                Delete {{ selectedCount(m) }} item{{ selectedCount(m) === 1 ? '' : 's' }}
              </div>
              <ul class="proposal-list">
                <li v-for="it in m.proposal.items" :key="it.id">
                  <input
                    type="checkbox" :checked="m.selected[it.id]"
                    :disabled="m.status !== 'pending'"
                    @change="toggle(m, it.id)"
                  />
                  <div class="proposal-item-text">
                    <div class="proposal-item-title">{{ it.title }}</div>
                    <div v-if="it.reason" class="proposal-item-body">{{ it.reason }}</div>
                  </div>
                </li>
              </ul>
            </template>

            <!-- Update -->
            <template v-else>
              <div class="proposal-head">
                <v-icon size="16" color="primary">mdi-pencil-outline</v-icon>
                Edit {{ selectedCount(m) }} item{{ selectedCount(m) === 1 ? '' : 's' }}
              </div>
              <ul class="proposal-list">
                <li v-for="it in m.proposal.items" :key="it.id">
                  <input
                    type="checkbox" :checked="m.selected[it.id]"
                    :disabled="m.status !== 'pending'"
                    @change="toggle(m, it.id)"
                  />
                  <div class="proposal-item-text">
                    <div class="proposal-item-title">{{ it.title ?? it.currentTitle }}</div>
                    <div v-if="it.title" class="proposal-item-body">
                      was "{{ it.currentTitle }}"
                    </div>
                    <div v-if="it.content !== undefined" class="proposal-item-body">
                      {{ shorten(it.content) }}
                    </div>
                  </div>
                </li>
              </ul>
            </template>

            <!-- Actions / status -->
            <div v-if="m.status === 'pending'" class="proposal-actions">
              <v-btn
                size="small" variant="flat"
                :color="m.proposal.kind === 'delete' ? 'error' : 'primary'"
                :disabled="applying || selectedCount(m) === 0"
                :loading="applying"
                @click="apply(m)"
              >
                {{ applyLabel(m) }}
              </v-btn>
              <v-btn size="small" variant="text" :disabled="applying" @click="m.status = 'cancelled'">
                Cancel
              </v-btn>
              <v-spacer />
              <button
                v-if="m.proposal.items.length > 1"
                class="link-btn" :disabled="applying" @click="toggleAll(m)"
              >
                {{ allSelected(m) ? 'Clear all' : 'Select all' }}
              </button>
            </div>
            <div v-else class="proposal-status" :class="m.status">
              <v-icon size="14">{{ m.status === 'applied' ? 'mdi-check' : 'mdi-close' }}</v-icon>
              {{ m.status === 'applied' ? m.result : 'Cancelled' }}
            </div>
          </div>
        </template>

        <div v-if="loading && !stepRunning" class="msg assistant thinking">
          <span class="dot" /><span class="dot" /><span class="dot" />
        </div>
        <div v-if="error" class="assistant-error">{{ error }}</div>
      </div>

      <form class="assistant-input" @submit.prevent="send()">
        <v-textarea
          v-model="draft"
          placeholder="Ask or instruct…"
          variant="solo" density="compact" hide-details
          rows="1" auto-grow max-rows="4"
          :disabled="loading"
          @keydown.enter.exact.prevent="send()"
        />
        <v-btn
          type="submit" icon="mdi-send" size="small" variant="text" color="primary"
          :disabled="loading || !draft.trim()"
        />
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type Anthropic from '@anthropic-ai/sdk'
import type { Collection, LearningItem } from '../../database/types'
import { getApiKey, setApiKey } from '../../utils/claude'
import {
  runAssistantTurn,
  type Proposal,
  type AssistantItem,
  type AssistantActivity,
} from '../../utils/collectionAssistant'

const props = defineProps<{
  collection: Collection
  items: LearningItem[]
  applyCreate: (items: { title: string; content: string }[]) => Promise<void>
  applyDelete: (ids: string[]) => Promise<void>
  applyUpdate: (id: string, patch: { title?: string; content?: string }) => Promise<void>
}>()

type ProposalMessage = {
  role: 'proposal'
  proposal: Proposal
  status: 'pending' | 'applied' | 'cancelled'
  selected: Record<string, boolean>
  result?: string
}
type ActivityMessage = { role: 'activity'; activity: AssistantActivity }
type DisplayMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; streaming?: boolean }
  | ProposalMessage
  | ActivityMessage

const open = ref(false)
const draft = ref('')
const loading = ref(false)
const applying = ref(false)
const error = ref('')
const messages = ref<DisplayMessage[]>([])
const scrollEl = ref<HTMLElement | null>(null)

// Anthropic message history, preserved across turns so the model keeps context.
const apiMessages: Anthropic.MessageParam[] = []

const suggestions = [
  'Summarize this collection',
  'What are the 5 hardest questions?',
  'Suggest 5 items to remove',
]

const renderMarkdown = (text: string): string =>
  DOMPurify.sanitize(marked.parse(text, { async: false }) as string)

const shorten = (s: string, n = 160): string => {
  const t = s.trim().replace(/\s+/g, ' ')
  return t.length > n ? t.slice(0, n) + '…' : t
}

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}

// A step is on screen and spinning, so the generic typing dots would be noise.
const stepRunning = computed(() =>
  messages.value.some((m) => m.role === 'activity' && m.activity.status === 'running'),
)

const selectedCount = (m: ProposalMessage): number =>
  Object.values(m.selected).filter(Boolean).length

const toggle = (m: ProposalMessage, key: string) => {
  m.selected[key] = !m.selected[key]
}

const applyLabel = (m: ProposalMessage): string => {
  const n = selectedCount(m)
  if (m.proposal.kind === 'delete') return `Delete selected (${n})`
  if (m.proposal.kind === 'update') return `Save selected (${n})`
  return `Add selected (${n})`
}

const allSelected = (m: ProposalMessage): boolean =>
  selectedCount(m) === m.proposal.items.length

// One click to clear the batch, one to take it all back.
const toggleAll = (m: ProposalMessage) => {
  const next = !allSelected(m)
  for (const key of Object.keys(m.selected)) m.selected[key] = next
}

const getItems = (): AssistantItem[] =>
  props.items
    .filter((i) => i.id)
    .map((i) => ({ id: i.id!, title: i.title, content: i.content }))

// Append streamed text to the trailing assistant bubble, or start a new one.
const appendText = (chunk: string) => {
  const last = messages.value[messages.value.length - 1]
  if (last && last.role === 'assistant' && last.streaming) last.text += chunk
  else messages.value.push({ role: 'assistant', text: chunk, streaming: true })
  scrollToBottom()
}

const closeStreamingBubble = () => {
  const last = messages.value[messages.value.length - 1]
  if (last && last.role === 'assistant') last.streaming = false
}

// Upsert a progress step: the loop re-emits the same id as the step advances.
const pushActivity = (activity: AssistantActivity) => {
  const existing = messages.value.find(
    (m): m is ActivityMessage => m.role === 'activity' && m.activity.id === activity.id,
  )
  if (existing) {
    existing.activity = activity
    return
  }
  closeStreamingBubble()
  messages.value.push({ role: 'activity', activity })
  scrollToBottom()
}

const pushProposal = (proposal: Proposal) => {
  closeStreamingBubble()
  const selected: Record<string, boolean> = {}
  // Everything starts checked, so approving the whole batch is one click.
  if (proposal.kind === 'create') proposal.items.forEach((_, j) => (selected[String(j)] = true))
  else proposal.items.forEach((it) => (selected[it.id] = true))
  messages.value.push({ role: 'proposal', proposal, status: 'pending', selected })
  scrollToBottom()
}

const ensureKey = async (): Promise<boolean> => {
  if (await getApiKey()) return true
  const key = prompt('Paste your Anthropic API key (stored only in this browser, used directly from it):')
  if (!key?.trim()) return false
  await setApiKey(key)
  return true
}

const send = async (preset?: string) => {
  const text = (preset ?? draft.value).trim()
  if (!text || loading.value) return
  if (!(await ensureKey())) return

  error.value = ''
  draft.value = ''
  messages.value.push({ role: 'user', text })
  apiMessages.push({ role: 'user', content: text })
  loading.value = true
  scrollToBottom()

  try {
    await runAssistantTurn(props.collection, apiMessages, {
      onText: appendText,
      onProposal: pushProposal,
      onActivity: pushActivity,
      getItems,
    })
    closeStreamingBubble()
  } catch (err) {
    console.error('Assistant turn failed:', err)
    error.value = 'Something went wrong. Check your API key and try again.'
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

const apply = async (m: ProposalMessage) => {
  applying.value = true
  error.value = ''
  try {
    if (m.proposal.kind === 'create') {
      const chosen = m.proposal.items.filter((_, j) => m.selected[String(j)])
      await props.applyCreate(chosen)
      m.result = `Added ${chosen.length} item${chosen.length === 1 ? '' : 's'}`
    } else if (m.proposal.kind === 'delete') {
      const ids = m.proposal.items.filter((it) => m.selected[it.id]).map((it) => it.id)
      await props.applyDelete(ids)
      m.result = `Deleted ${ids.length} item${ids.length === 1 ? '' : 's'}`
    } else {
      const chosen = m.proposal.items.filter((it) => m.selected[it.id])
      // Sequential: applyUpdate writes to the same collection, and a failure
      // partway through should leave the earlier edits saved.
      for (const it of chosen) {
        await props.applyUpdate(it.id, { title: it.title, content: it.content })
      }
      m.result = `Saved ${chosen.length} edit${chosen.length === 1 ? '' : 's'}`
    }
    m.status = 'applied'
  } catch (err) {
    console.error('Failed to apply proposal:', err)
    error.value = "Couldn't apply that change. Please try again."
  } finally {
    applying.value = false
    scrollToBottom()
  }
}

const clearChat = () => {
  messages.value = []
  apiMessages.length = 0
  error.value = ''
}
</script>

<style scoped>
.assistant-root {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2000;
}

.assistant-fab {
  border-radius: 50% !important;
}

.assistant-panel {
  display: flex;
  flex-direction: column;
  width: min(400px, calc(100vw - 32px));
  height: min(560px, calc(100vh - 96px));
  background: rgb(var(--v-theme-surface));
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

.assistant-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  flex-shrink: 0;
}

.assistant-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.assistant-sub {
  font-size: 0.7rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
  margin-left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 130px;
}

.assistant-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.assistant-empty {
  margin: auto;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-top: 4px;
}

.chip {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 14px;
  padding: 4px 10px;
  font-size: 0.75rem;
  cursor: pointer;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.chip:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.msg {
  max-width: 88%;
  padding: 8px 11px;
  border-radius: 12px;
  font-size: 0.85rem;
  line-height: 1.45;
  word-wrap: break-word;
}

.msg.user {
  align-self: flex-end;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  white-space: pre-wrap;
}

.msg.assistant {
  align-self: flex-start;
  background: rgba(var(--v-theme-on-surface), 0.05);
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.msg.assistant :deep(p) { margin: 0 0 6px; }
.msg.assistant :deep(p:last-child) { margin-bottom: 0; }
.msg.assistant :deep(ul),
.msg.assistant :deep(ol) { margin: 4px 0; padding-left: 18px; }
.msg.assistant :deep(code) {
  background: rgba(var(--v-theme-on-surface), 0.08);
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 0.8em;
}
.msg.assistant :deep(pre) {
  background: rgba(var(--v-theme-on-surface), 0.08);
  padding: 8px;
  border-radius: 6px;
  overflow-x: auto;
}

.thinking {
  display: flex;
  gap: 4px;
  align-items: center;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.4);
  animation: blink 1.4s infinite both;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; }
  40% { opacity: 1; }
}

.activity {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 7px;
  max-width: 100%;
  padding: 2px 2px;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
}

.activity.done {
  color: rgba(var(--v-theme-on-surface), 0.42);
}

.activity.failed,
.activity.failed .activity-icon {
  color: rgb(var(--v-theme-error));
}

.activity-icon {
  color: rgba(var(--v-theme-on-surface), 0.35);
}

.activity-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-detail {
  font-size: 0.7rem;
  color: rgba(var(--v-theme-on-surface), 0.4);
  flex-shrink: 0;
}

.proposal {
  align-self: stretch;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  padding: 10px;
  background: rgba(var(--v-theme-on-surface), 0.015);
}

.proposal.cancelled { opacity: 0.6; }

.proposal-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.82rem;
  margin-bottom: 8px;
}

.proposal-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
}

.proposal-list li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.proposal-list input[type='checkbox'] {
  margin-top: 3px;
  flex-shrink: 0;
}

.proposal-item-text { min-width: 0; }

.proposal-item-title {
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.3;
}

.proposal-item-body {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
  line-height: 1.35;
  margin-top: 2px;
}

.proposal-update {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.proposal-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.proposal-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

.link-btn {
  background: none;
  border: none;
  padding: 2px 4px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
  cursor: pointer;
  text-decoration: underline;
}

.link-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.proposal-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  margin-top: 8px;
}
.proposal-status.applied { color: rgb(var(--v-theme-primary)); }
.proposal-status.cancelled { color: rgba(var(--v-theme-on-surface), 0.5); }

.assistant-error {
  color: rgb(var(--v-theme-error));
  font-size: 0.78rem;
  padding: 4px 2px;
}

.assistant-input {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 8px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  flex-shrink: 0;
}

.assistant-input :deep(.v-field) {
  border-radius: 10px;
}
</style>
