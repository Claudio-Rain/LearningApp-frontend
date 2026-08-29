<!-- StudySetAssistant.vue -->
<!--
  Floating AI chat for Study Options. Describe the set you want in a sentence
  ("the easy, essential cards from these three, balanced") and it proposes one:
  which collections, which cards qualify, and the exact split. Approving it
  points Study View at those collections and excludes everything the set left
  out. Nothing is saved until you approve.
-->
<template>
  <div class="assistant-root">
    <v-btn
      v-if="!open"
      class="assistant-fab"
      color="primary"
      icon="mdi-playlist-star"
      size="large"
      elevation="6"
      title="Build a study set with AI"
      @click="open = true"
    />

    <div v-else class="assistant-panel" role="dialog" aria-label="Study set assistant">
      <div class="assistant-header">
        <v-icon size="20" class="mr-2">mdi-playlist-star</v-icon>
        <span class="assistant-title">Study set</span>
        <span class="assistant-sub">{{ collections.length }} collections</span>
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
          <v-icon size="34" color="grey-lighten-1">mdi-playlist-check</v-icon>
          <p>Describe the set you want to study and I'll put one together.</p>
          <div class="suggestions">
            <button v-for="s in suggestions" :key="s" class="chip" @click="send(s)">{{ s }}</button>
          </div>
        </div>

        <template v-for="(m, i) in messages" :key="i">
          <div v-if="m.role === 'user'" class="msg user">{{ m.text }}</div>
          <!-- renderMarkdown sanitizes with DOMPurify before this is injected -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-else-if="m.role === 'assistant'"
            class="msg assistant"
            v-html="renderMarkdown(m.text)"
          />
          <!-- eslint-enable vue/no-v-html -->

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

          <div v-else class="proposal" :class="m.status">
            <!-- A filtered set: the split is the thing to judge, so it leads. -->
            <template v-if="m.proposal.kind === 'set'">
              <div class="proposal-head">
                <v-icon size="16" color="primary">mdi-playlist-check</v-icon>
                {{ m.proposal.label }} — {{ m.proposal.plan.items.length }} cards
              </div>

              <ul class="proposal-list split-list">
                <li v-for="a in m.proposal.plan.allocations" :key="a.collectionId">
                  <div class="proposal-item-text">
                    <div class="split-row">
                      <span class="split-title">{{ titleFor(a.collectionId) }}</span>
                      <span class="split-count">{{ a.taken }}</span>
                    </div>
                    <!-- Share of the set, so an uneven split is visible at a glance -->
                    <div class="split-bar">
                      <div class="split-fill" :style="{ width: sharePercent(m.proposal, a.taken) + '%' }" />
                    </div>
                    <div class="proposal-item-body">
                      {{ a.pool }} matched this filter<template v-if="a.cap !== undefined"> · capped at {{ a.cap }}</template>
                    </div>
                  </div>
                </li>
              </ul>

              <div class="set-criteria">{{ describeFilter(m.proposal.spec) }}</div>
              <div v-if="m.proposal.reason" class="proposal-item-body">{{ m.proposal.reason }}</div>
              <div v-if="m.proposal.plan.shortfall" class="set-shortfall">
                <v-icon size="13">mdi-information-outline</v-icon>
                {{ m.proposal.plan.shortfall }}
              </div>
            </template>

            <!-- Whole collections: no filter, so the list and the card count are the whole story. -->
            <template v-else>
              <div class="proposal-head">
                <v-icon size="16" color="primary">mdi-book-multiple-outline</v-icon>
                Study View: {{ m.proposal.collections.length }} collection{{ m.proposal.collections.length === 1 ? '' : 's' }}
              </div>

              <ul class="proposal-list split-list">
                <li v-for="c in m.proposal.collections" :key="c.id">
                  <div class="proposal-item-text">
                    <div class="split-row">
                      <span class="split-title">{{ c.title }}</span>
                      <span class="split-count">{{ c.cardCount }}</span>
                    </div>
                  </div>
                </li>
              </ul>

              <div class="set-criteria">{{ m.proposal.cardCount }} cards in total</div>
              <div v-if="m.proposal.reason" class="proposal-item-body">{{ m.proposal.reason }}</div>
              <!-- The trap: approving "200 cards" and studying 153 because an
                   earlier set is still hiding some. Say it before they approve. -->
              <div v-if="m.proposal.hiddenByExclusions > 0" class="set-shortfall">
                <v-icon size="13">mdi-information-outline</v-icon>
                <span v-if="m.proposal.clearExclusions">
                  {{ m.proposal.hiddenByExclusions }} card{{ m.proposal.hiddenByExclusions === 1 ? '' : 's' }} hidden by an earlier set will be un-hidden.
                </span>
                <span v-else>
                  {{ m.proposal.hiddenByExclusions }} of these cards stay hidden by an earlier set — ask me to clear the exclusions to study them all.
                </span>
              </div>
            </template>

            <div v-if="m.status === 'pending'" class="proposal-actions">
              <v-btn
                size="small" variant="flat" color="primary"
                :disabled="applying" :loading="applying"
                @click="apply(m)"
              >
                {{ m.proposal.kind === 'set' ? 'Use this set' : 'Update Study View' }}
              </v-btn>
              <v-btn size="small" variant="text" :disabled="applying" @click="m.status = 'cancelled'">
                Cancel
              </v-btn>
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
          placeholder="Describe the set you want…"
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
import { getApiKey, setApiKey } from '@/utils/claude'
import {
  runStudySetTurn,
  type AssistantProposal,
  type CollectionsProposal,
  type StudySetProposal,
} from '@/utils/studySetAssistant'
import type { AssistantActivity } from '@/utils/collectionAssistant'
import { labelText } from '@/utils/itemLabels'
import type { StudySetSpec, Range } from '@/utils/studySet'
import { useCollectionCatalog } from '../composables/useCollectionCatalog'
import { useContentWidgetForm } from '../composables/useContentWidgetForm'
import { useStudySet } from '../composables/useStudySet'
import { useStudyViewCollection } from '@/shared/composables/useStudyViewCollection'
import { useExcludedItems } from '@/shared/composables/useExcludedItems'

const { collections, items } = useCollectionCatalog()
const { applySet, applyCollections } = useStudySet()
// Read so the assistant can answer "the ones I selected" — these are the same
// module-level refs the page's own selectors bind to, so what it sees is
// exactly what is on screen.
const { studyViewCollectionIds } = useStudyViewCollection()
const { contentCollectionIds } = useContentWidgetForm()
const { excludedItemIds } = useExcludedItems()

type ProposalMessage = {
  role: 'proposal'
  proposal: AssistantProposal
  status: 'pending' | 'applied' | 'cancelled'
  result?: string
}
type DisplayMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; streaming?: boolean }
  | { role: 'activity'; activity: AssistantActivity }
  | ProposalMessage

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
  'The easy, essential cards from all my collections',
  'Put my content widget collections into Study View',
  'A 30-card set of what I know least well',
]

const renderMarkdown = (text: string): string =>
  DOMPurify.sanitize(marked.parse(text, { async: false }) as string)

const titleFor = (id: string) => collections.value.find(c => c.id === id)?.title ?? id

const sharePercent = (proposal: { plan: { items: unknown[] } }, taken: number): number => {
  const total = proposal.plan.items.length
  return total === 0 ? 0 : Math.round((taken / total) * 100)
}

/** The filter in the user's own vocabulary, so they can check it before approving. */
const describeFilter = (spec: StudySetSpec): string => {
  const parts: string[] = []
  const band = (kind: 'priority' | 'difficulty', range: Range | undefined) => {
    if (!range || (range.min === undefined && range.max === undefined)) return
    const low = labelText(kind, range.min ?? 1)
    const high = labelText(kind, range.max ?? 5)
    parts.push(low === high ? `${kind}: ${low}` : `${kind}: ${low} to ${high}`)
  }
  band('priority', spec.filter?.priority)
  band('difficulty', spec.filter?.difficulty)

  if (spec.filter?.onlyNew === true) parts.push('never studied')
  else if (spec.filter?.onlyNew === false) parts.push('already seen')
  if (spec.filter?.maxStrength !== undefined) {
    parts.push(`mastery at or below ${Math.round(spec.filter.maxStrength * 100)}%`)
  }
  if (spec.filter?.includeUnlabeled) parts.push('unlabeled cards included')

  return parts.length > 0 ? parts.join(' · ') : 'every card in the selected collections'
}

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}

const stepRunning = computed(() =>
  messages.value.some(m => m.role === 'activity' && m.activity.status === 'running'),
)

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

const pushActivity = (activity: AssistantActivity) => {
  const existing = messages.value.find(
    (m): m is { role: 'activity'; activity: AssistantActivity } =>
      m.role === 'activity' && m.activity.id === activity.id,
  )
  if (existing) {
    existing.activity = activity
    return
  }
  closeStreamingBubble()
  messages.value.push({ role: 'activity', activity })
  scrollToBottom()
}

const pushProposal = (proposal: AssistantProposal) => {
  closeStreamingBubble()
  messages.value.push({ role: 'proposal', proposal, status: 'pending' })
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
    await runStudySetTurn(apiMessages, {
      onText: appendText,
      onActivity: pushActivity,
      onProposal: pushProposal,
      getCollections: () => collections.value.map(c => ({ id: c.id, title: c.title })),
      getItems: () => items.value,
      getSettings: () => ({
        studyViewCollectionIds: studyViewCollectionIds.value,
        contentWidgetCollectionIds: contentCollectionIds.value,
        excludedItemIds: excludedItemIds.value,
      }),
    })
    closeStreamingBubble()
  } catch (err) {
    console.error('Study set turn failed:', err)
    error.value = 'Something went wrong. Check your API key and try again.'
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

const useSet = async (proposal: StudySetProposal): Promise<string> => {
  const result = await applySet(proposal.plan)
  return `Studying ${result.included} card${result.included === 1 ? '' : 's'}`
}

const useCollections = async (proposal: CollectionsProposal): Promise<string> => {
  const ids = proposal.collections.map(c => c.id)
  const itemIds = items.value.filter(i => ids.includes(i.collectionId)).map(i => i.id)
  const { restored } = await applyCollections(ids, itemIds, proposal.clearExclusions)
  return restored > 0
    ? `Study View updated — ${restored} card${restored === 1 ? '' : 's'} un-hidden`
    : `Study View set to ${ids.length} collection${ids.length === 1 ? '' : 's'}`
}

const apply = async (m: ProposalMessage) => {
  applying.value = true
  error.value = ''
  try {
    m.result = m.proposal.kind === 'set'
      ? await useSet(m.proposal)
      : await useCollections(m.proposal)
    m.status = 'applied'
  } catch (err) {
    console.error('Failed to apply study set:', err)
    error.value = "Couldn't switch to that set. Please try again."
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

<style scoped src="@/shared/components/assistantChat.css"></style>

<style scoped>
/* The split is the thing being approved, so it gets its own layout rather than
   reusing the checklist row shape. */
.split-list li {
  display: block;
}

.split-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.split-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.split-count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.split-bar {
  height: 4px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  margin: 4px 0 2px;
  overflow: hidden;
}

.split-fill {
  height: 100%;
  background: rgb(var(--v-theme-primary));
  border-radius: inherit;
}

.set-criteria {
  font-size: 0.72rem;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.set-shortfall {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-top: 4px;
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
</style>
