<template>
  <div class="code-scratchpad">
    <div class="scratchpad-toolbar">
      <v-select
        v-model="mode"
        :items="MODE_ITEMS"
        item-title="label"
        item-value="id"
        variant="outlined"
        density="compact"
        hide-details
        class="scratchpad-lang"
      />
      <span v-if="mode === 'auto'" class="scratchpad-detected">
        {{ detected ? CODE_LANGUAGE_LABELS[detected] : 'detecting…' }}
      </span>
      <v-spacer />
      <v-btn
        variant="text"
        size="x-small"
        prepend-icon="mdi-broom"
        :disabled="!text"
        @click="clear"
      >
        Clear
      </v-btn>
      <v-btn
        variant="tonal"
        color="primary"
        size="x-small"
        prepend-icon="mdi-check-decagram-outline"
        :loading="reviewing"
        :disabled="!text.trim()"
        @click="review"
      >
        Review
      </v-btn>
    </div>

    <div ref="hostEl" class="scratchpad-editor" />

    <div v-if="reviewOpen" class="scratchpad-review">
      <div class="review-header">
        <span>Review · {{ CODE_LANGUAGE_LABELS[activeLanguage] }}</span>
        <v-btn icon="mdi-close" variant="text" size="x-small" title="Close review" @click="reviewOpen = false" />
      </div>
      <div class="review-body">
        <div v-if="reviewError" class="review-error">{{ reviewError }}</div>
        <div v-else-if="!reviewText" class="review-thinking">Reading it over…</div>
        <TiptapDisplay v-else :content="markdownToTiptap(reviewText)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { Compartment, type Extension } from '@codemirror/state'
import { StreamLanguage } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { vue } from '@codemirror/lang-vue'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { sql } from '@codemirror/lang-sql'
import { json } from '@codemirror/lang-json'
import { csharp, java, cpp } from '@codemirror/legacy-modes/mode/clike'
import { go } from '@codemirror/legacy-modes/mode/go'
import { rust } from '@codemirror/legacy-modes/mode/rust'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import TiptapDisplay from './TiptapDisplay.vue'
import { markdownToTiptap } from '@/utils/markdown'
import { streamCodeReview } from '@/utils/claude'
import {
  detectCodeLanguage,
  CODE_LANGUAGES,
  CODE_LANGUAGE_LABELS,
  type CodeLanguage,
} from '@/utils/detectCodeLanguage'

type Mode = 'auto' | CodeLanguage

const MODE_ITEMS: { id: Mode; label: string }[] = [
  { id: 'auto', label: 'Auto-detect' },
  ...CODE_LANGUAGES,
]

const SUPPORT: Record<CodeLanguage, () => Extension> = {
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  jsx: () => javascript({ jsx: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  vue: () => vue(),
  python: () => python(),
  html: () => html(),
  css: () => css(),
  sql: () => sql(),
  json: () => json(),
  csharp: () => StreamLanguage.define(csharp),
  java: () => StreamLanguage.define(java),
  cpp: () => StreamLanguage.define(cpp),
  go: () => StreamLanguage.define(go),
  rust: () => StreamLanguage.define(rust),
  bash: () => StreamLanguage.define(shell),
}

const STORAGE_KEY = 'studyScratchpad'
const DETECT_DEBOUNCE_MS = 500

const hostEl = ref<HTMLElement | null>(null)
const mode = ref<Mode>('auto')
const detected = ref<CodeLanguage | null>(null)
const text = ref('')

const reviewOpen = ref(false)
const reviewing = ref(false)
const reviewText = ref('')
const reviewError = ref('')

const activeLanguage = computed<CodeLanguage>(() =>
  mode.value === 'auto' ? (detected.value ?? 'javascript') : mode.value
)

let view: EditorView | null = null
let detectTimer: ReturnType<typeof setTimeout> | null = null
const languageCompartment = new Compartment()

const readSession = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as { text?: string; mode?: Mode }
    if (typeof saved.text === 'string') text.value = saved.text
    if (saved.mode && MODE_ITEMS.some(m => m.id === saved.mode)) mode.value = saved.mode
  } catch {
    // ignore
  }
}

const writeSession = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ text: text.value, mode: mode.value }))
  } catch {
    // ignore
  }
}

const runDetection = () => {
  if (mode.value !== 'auto') return
  detected.value = detectCodeLanguage(text.value)
}

const scheduleDetection = () => {
  if (detectTimer) clearTimeout(detectTimer)
  detectTimer = setTimeout(runDetection, DETECT_DEBOUNCE_MS)
}

const clear = () => {
  view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '' } })
  view?.focus()
}

const review = async () => {
  if (reviewing.value) return
  reviewOpen.value = true
  reviewing.value = true
  reviewText.value = ''
  reviewError.value = ''
  try {
    await streamCodeReview(
      CODE_LANGUAGE_LABELS[activeLanguage.value],
      text.value,
      chunk => { reviewText.value += chunk }
    )
  } catch (e) {
    reviewError.value = e instanceof Error ? e.message : 'Review failed'
  } finally {
    reviewing.value = false
  }
}

const focus = () => view?.focus()
defineExpose({ focus })

onMounted(() => {
  readSession()
  runDetection()
  view = new EditorView({
    doc: text.value,
    parent: hostEl.value!,
    extensions: [
      basicSetup,
      oneDark,
      languageCompartment.of(SUPPORT[activeLanguage.value]()),
      EditorView.updateListener.of(update => {
        if (!update.docChanged) return
        text.value = update.state.doc.toString()
        writeSession()
        scheduleDetection()
      }),
    ],
  })
  view.focus()
})

// Reconfiguring mid-session preserves the document and the cursor, so the
// language can change under the caret while typing without interrupting it.
watch(activeLanguage, language => {
  view?.dispatch({ effects: languageCompartment.reconfigure(SUPPORT[language]()) })
})

watch(mode, () => {
  writeSession()
  runDetection()
  view?.focus()
})

onBeforeUnmount(() => {
  if (detectTimer) clearTimeout(detectTimer)
  view?.destroy()
  view = null
})
</script>

<style scoped lang="scss">
.code-scratchpad {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.scratchpad-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  flex-shrink: 0;
}

.scratchpad-lang {
  max-width: 150px;
  flex: 0 0 auto;
}

.scratchpad-detected {
  font-size: 0.72rem;
  opacity: 0.6;
  white-space: nowrap;
}

.scratchpad-editor {
  flex: 1;
  min-height: 0;
  overflow: hidden;

  :deep(.cm-editor) {
    height: 100%;
    font-size: 0.82rem;
  }

  :deep(.cm-editor.cm-focused) {
    outline: none;
  }

  :deep(.cm-scroller) {
    font-family: 'JetBrainsMono', monospace;
  }
}

.scratchpad-review {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 0 1 auto;
  max-height: 45%;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 6px 6px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  flex-shrink: 0;
}

.review-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px 12px;
  font-size: 0.82rem;
}

.review-thinking {
  opacity: 0.6;
  font-style: italic;
}

.review-error {
  color: rgb(var(--v-theme-error));
}
</style>
