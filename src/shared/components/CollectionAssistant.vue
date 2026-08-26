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

            <!-- Labels -->
            <template v-else-if="m.proposal.kind === 'label'">
              <div class="proposal-head">
                <v-icon size="16" color="primary">mdi-label-outline</v-icon>
                Label {{ selectedCount(m) }} item{{ selectedCount(m) === 1 ? '' : 's' }}
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
                    <!-- Before → after, so the user judges the change itself -->
                    <div class="label-changes">
                      <span v-for="change in labelChanges(it)" :key="change.kind" class="label-change">
                        {{ change.title }}:
                        <span class="label-was">{{ change.from }}</span>
                        <v-icon size="12">mdi-arrow-right</v-icon>
                        <span :style="{ color: change.color }">{{ change.to }}</span>
                      </span>
                    </div>
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
import type { Collection, ItemLabelPatch, LearningItem } from '../../database/types'
import { getApiKey, setApiKey } from '../../utils/claude'
import { ITEM_LABEL_DEFS, ITEM_LABEL_KINDS, labelMeta, labelText } from '../../utils/itemLabels'
import {
  runAssistantTurn,
  type Proposal,
  type AssistantItem,
  type AssistantActivity,
  type CreateProposalItem,
  type DeleteProposalItem,
  type UpdateProposalItem,
  type LabelProposalItem,
} from '../../utils/collectionAssistant'

const props = defineProps<{
  collection: Collection
  items: LearningItem[]
  applyCreate: (items: { title: string; content: string }[]) => Promise<void>
  applyDelete: (ids: string[]) => Promise<void>
  applyUpdate: (id: string, patch: { title?: string; content?: string }) => Promise<void>
  applyLabels: (id: string, patch: ItemLabelPatch) => Promise<void>
}>()

// The one-line before → after for each label this proposal changes.
const labelChanges = (it: LabelProposalItem) =>
  ITEM_LABEL_KINDS.filter((kind) => it[kind] !== undefined).map((kind) => {
    const to = it[kind] ?? null
    const meta = labelMeta(kind, to)
    return {
      kind,
      title: ITEM_LABEL_DEFS[kind].title,
      from: labelText(kind, kind === 'priority' ? it.currentPriority : it.currentDifficulty),
      to: labelText(kind, to),
      color: meta ? `rgb(var(--v-theme-${meta.color}))` : undefined,
    }
  })

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
  'Rate these by difficulty',
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
  if (m.proposal.kind === 'label') return `Apply labels (${n})`
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
    .map((i) => ({
      id: i.id!,
      title: i.title,
      content: i.content,
      priority: i.priority,
      difficulty: i.difficulty,
    }))

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

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`

// Each of these runs one approved batch and returns what to show on the card.
// The write loops are sequential on purpose: they hit the same collection, and
// a failure partway through should leave the earlier writes saved.
const runCreate = async (items: CreateProposalItem[]) => {
  await props.applyCreate(items)
  return `Added ${count(items.length, 'item')}`
}

const runDelete = async (items: DeleteProposalItem[]) => {
  await props.applyDelete(items.map((it) => it.id))
  return `Deleted ${count(items.length, 'item')}`
}

const runUpdate = async (items: UpdateProposalItem[]) => {
  for (const it of items) {
    await props.applyUpdate(it.id, { title: it.title, content: it.content })
  }
  return `Saved ${count(items.length, 'edit')}`
}

const runLabel = async (items: LabelProposalItem[]) => {
  for (const it of items) {
    const patch: ItemLabelPatch = {}
    for (const kind of ITEM_LABEL_KINDS) {
      if (it[kind] !== undefined) patch[kind] = it[kind]
    }
    await props.applyLabels(it.id, patch)
  }
  return `Labeled ${count(items.length, 'item')}`
}

const runProposal = async (m: ProposalMessage): Promise<string> => {
  // Create items have no id, so their checkbox key is their index.
  if (m.proposal.kind === 'create') {
    return runCreate(m.proposal.items.filter((_, j) => m.selected[String(j)]))
  }
  const chosen = m.proposal.items.filter((it) => m.selected[it.id])
  if (m.proposal.kind === 'delete') return runDelete(chosen as DeleteProposalItem[])
  if (m.proposal.kind === 'label') return runLabel(chosen as LabelProposalItem[])
  return runUpdate(chosen as UpdateProposalItem[])
}

const apply = async (m: ProposalMessage) => {
  applying.value = true
  error.value = ''
  try {
    m.result = await runProposal(m)
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

<style scoped src="./assistantChat.css"></style>
