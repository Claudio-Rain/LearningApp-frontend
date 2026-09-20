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
        {{ detected ? labelFor(detected) : 'detecting…' }}
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
    </div>
    <div ref="hostEl" class="scratchpad-editor" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { Compartment } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { sql } from '@codemirror/lang-sql'
import { json } from '@codemirror/lang-json'
import { detectCodeLanguage, CODE_LANGUAGES, type CodeLanguage } from '@/utils/detectCodeLanguage'

type Mode = 'auto' | CodeLanguage

const MODE_ITEMS: { id: Mode; label: string }[] = [
  { id: 'auto', label: 'Auto-detect' },
  ...CODE_LANGUAGES,
]

const SUPPORT: Record<CodeLanguage, () => ReturnType<typeof javascript>> = {
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  python: () => python(),
  html: () => html(),
  css: () => css(),
  sql: () => sql(),
  json: () => json(),
}

const STORAGE_KEY = 'studyScratchpad'
const DETECT_DEBOUNCE_MS = 500

const hostEl = ref<HTMLElement | null>(null)
const mode = ref<Mode>('auto')
const detected = ref<CodeLanguage | null>(null)
const text = ref('')

const activeLanguage = computed<CodeLanguage>(() =>
  mode.value === 'auto' ? (detected.value ?? 'javascript') : mode.value
)

let view: EditorView | null = null
let detectTimer: ReturnType<typeof setTimeout> | null = null
const languageCompartment = new Compartment()

const labelFor = (id: CodeLanguage) => CODE_LANGUAGES.find(l => l.id === id)?.label ?? id

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
</style>
