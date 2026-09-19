<template>
  <div class="assistant-root">
    <v-btn
      v-if="!open"
      class="assistant-fab"
      color="primary"
      icon="mdi-robot-happy-outline"
      size="large"
      elevation="6"
      title="Ask about your collections"
      @click="open = true"
    />

    <div v-else class="assistant-panel" role="dialog" aria-label="Collections assistant">
      <div class="assistant-header">
        <v-icon size="20" class="mr-2">mdi-robot-happy-outline</v-icon>
        <span class="assistant-title">Collections</span>
        <span class="assistant-sub">{{ subtitle }}</span>
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
          <v-icon size="34" color="grey-lighten-1">mdi-book-multiple-outline</v-icon>
          <p>Ask me about your collections.</p>
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

          <div v-else class="activity" :class="m.activity.status">
            <v-progress-circular
              v-if="m.activity.status === 'running'"
              indeterminate size="12" width="2"
            />
            <v-icon v-else size="14" class="activity-icon">
              {{ m.activity.status === 'failed' ? 'mdi-alert-circle-outline' : m.activity.icon }}
            </v-icon>
            <span class="activity-label">{{ m.activity.label }}</span>
          </div>
        </template>

        <div v-if="loading" class="msg assistant thinking">
          <span class="dot" /><span class="dot" /><span class="dot" />
        </div>
        <div v-if="error" class="assistant-error">{{ error }}</div>
      </div>

      <form class="assistant-input" @submit.prevent="send()">
        <v-textarea
          v-model="draft"
          placeholder="Ask about your collections…"
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
import { runCollectionListTurn, type CollectionSummary } from '@/utils/collectionListAssistant'
import type { AssistantActivity } from '@/utils/collectionAssistant'

const props = defineProps<{ collections: CollectionSummary[]; scope?: string }>()

const subtitle = computed(() => {
  const n = props.collections.length
  const count = `${n} collection${n === 1 ? '' : 's'}`
  return props.scope ? `${count} in ${props.scope}` : count
})

type DisplayMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; streaming?: boolean }
  | { role: 'activity'; activity: AssistantActivity }

const open = ref(false)
const draft = ref('')
const loading = ref(false)
const error = ref('')
const messages = ref<DisplayMessage[]>([])
const scrollEl = ref<HTMLElement | null>(null)

const apiMessages: Anthropic.MessageParam[] = []

const suggestions = [
  'What should I study first?',
  'Which of these overlap?',
  'What order do these build on each other in?',
]

const renderMarkdown = (text: string): string =>
  DOMPurify.sanitize(marked.parse(text, { async: false }) as string)

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}

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
    await runCollectionListTurn(apiMessages, {
      onText: appendText,
      onActivity: pushActivity,
      getCollections: () => props.collections,
    })
    closeStreamingBubble()
  } catch (err) {
    console.error('Collection list turn failed:', err)
    error.value = 'Something went wrong. Check your API key and try again.'
  } finally {
    loading.value = false
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
