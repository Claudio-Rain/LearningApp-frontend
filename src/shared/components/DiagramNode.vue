<!-- DiagramNode.vue -->
<!--
  Node view for `diagram` (shared/tiptap/diagram.ts). Draws the Mermaid source
  in the app's colours (see shared/tiptap/diagramTheme.ts) and redraws when the
  theme flips. Mermaid is large, so it's only loaded once a diagram is shown.
  In an editable editor an Edit button opens the source with a live preview;
  a syntax error keeps the last good drawing and shows the message below.
-->
<template>
  <node-view-wrapper class="diagram" :class="{ 'diagram--selected': selected }">
    <div class="diagram__frame" contenteditable="false">
      <div v-show="hasDrawing" ref="target" class="diagram__target" />
      <div v-if="!hasDrawing && loading" class="diagram__message">Drawing…</div>
      <div v-else-if="!hasDrawing && !error" class="diagram__message">Empty diagram</div>
      <div v-else-if="!hasDrawing && !editing" class="diagram__message diagram__message--error">
        Couldn't draw this diagram: {{ error }}
      </div>

      <button v-if="editable && !editing" type="button" class="diagram__tool" title="Edit diagram" @click="startEdit">
        <v-icon size="16">mdi-pencil</v-icon>
      </button>
    </div>

    <div v-if="editing" class="diagram__form" contenteditable="false" @keydown.esc.prevent="cancel">
      <textarea
        ref="field"
        v-model="draft"
        class="diagram__source"
        rows="8"
        spellcheck="false"
        @keydown.ctrl.enter.prevent="commit"
        @keydown.meta.enter.prevent="commit"
      />
      <p v-if="error" class="diagram__error">{{ error }}</p>
      <p class="diagram__help">
        Mermaid syntax: <code>flowchart</code>, <code>sequenceDiagram</code>, <code>mindmap</code>,
        <code>timeline</code>, <code>stateDiagram-v2</code>, <code>classDiagram</code>,
        <code>erDiagram</code>, <code>pie</code>…
        <a href="https://mermaid.js.org/intro/" target="_blank" rel="noopener">Examples</a> · Ctrl+Enter to finish
      </p>
      <div class="diagram__actions">
        <button type="button" class="diagram__btn diagram__btn--danger" @click="deleteNode()">Delete</button>
        <span class="diagram__spacer" />
        <button type="button" class="diagram__btn" @click="cancel">Cancel</button>
        <button type="button" class="diagram__btn diagram__btn--primary" @click="commit">Done</button>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { useTheme } from 'vuetify'
import { diagramThemeVariables } from '../tiptap/diagramTheme'

const props = defineProps(nodeViewProps)
const theme = useTheme()

const STARTER = 'flowchart TD\n  A[Start] --> B{Question?}\n  B -->|Yes| C[One way]\n  B -->|No| D[Another way]'

const target = ref<HTMLElement | null>(null)
const field = ref<HTMLTextAreaElement | null>(null)
const editing = ref(false)
const draft = ref('')
const error = ref('')
const loading = ref(false)
const hasDrawing = ref(false)

const editable = computed(() => props.editor.isEditable)
const saved = computed<string>(() => props.node.attrs.source ?? '')
const shown = computed(() => (editing.value ? draft.value : saved.value))

// Each node needs its own ids: Mermaid uses them for the svg and its styles.
const uid = Math.random().toString(36).slice(2, 9)
let seq = 0

// Our colours win over any theme the source asks for (%%{init: …}%%).
const withoutDirectives = (source: string) => source.replace(/^\s*%%\{[\s\S]*?\}%%\s*$/gm, '').trim()

const errorText = (e: unknown) =>
  (e instanceof Error ? e.message : String(e)).split('\n').filter(Boolean).slice(0, 3).join(' ')

async function draw() {
  const run = ++seq
  const source = withoutDirectives(shown.value)
  if (!source) {
    if (target.value) target.value.innerHTML = ''
    hasDrawing.value = false
    error.value = ''
    return
  }
  loading.value = true
  try {
    const mermaid = (await import('mermaid')).default
    // global.current carries the derived on-* colors; the injected `current`
    // inside <v-app> is the raw theme without them.
    const current = theme.global.current.value
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'base',
      themeVariables: diagramThemeVariables(
        current.colors as Record<string, string>,
        current.dark,
        getComputedStyle(target.value ?? document.body).fontFamily,
      ),
    })
    const { svg } = await mermaid.render(`diagram-${uid}-${run}`, source)
    if (run !== seq || !target.value) return
    // Mermaid sanitises labels itself in strict mode.
    target.value.innerHTML = svg
    hasDrawing.value = true
    error.value = ''
  } catch (e) {
    if (run !== seq) return
    // While editing, keep the last good drawing up and show why the new one failed.
    error.value = errorText(e)
    if (!editing.value) hasDrawing.value = false
  } finally {
    if (run === seq) loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
const scheduleDraw = () => {
  clearTimeout(timer)
  timer = setTimeout(draw, 300)
}

watch(saved, draw)
watch(draft, () => editing.value && scheduleDraw())
watch(() => theme.global.current.value.dark, draw)

function startEdit() {
  if (!editable.value || editing.value) return
  draft.value = saved.value || STARTER
  editing.value = true
  nextTick(() => field.value?.focus())
}

function commit() {
  if (!editing.value) return
  const source = draft.value.trim()
  editing.value = false
  if (!source) {
    props.deleteNode()
    return
  }
  if (source !== saved.value) props.updateAttributes({ source })
  else draw()
}

function cancel() {
  if (!editing.value) return
  editing.value = false
  if (!saved.value) {
    props.deleteNode()
    return
  }
  draw()
}

onMounted(() => {
  draw()
  // A freshly inserted diagram has no source yet: open the editor straight away.
  if (editable.value && !saved.value) startEdit()
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  seq++
})
</script>

<style lang="scss">
.diagram {
  margin: 1rem 0;

  &__frame {
    position: relative;
    min-height: 48px;
    padding: 12px;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    border-radius: 10px;
    background: rgb(var(--v-theme-surface));
  }

  &--selected &__frame {
    outline: 2px solid rgba(var(--v-theme-primary), 0.5);
  }

  // Mermaid sizes the svg to 100% with a max-width of its natural size, so a
  // small diagram stays small and a big one shrinks to fit.
  &__target {
    overflow-x: auto;
    text-align: center;

    svg {
      display: inline-block;
      height: auto;
    }
  }

  &__message {
    padding: 0.5rem;
    font-size: 0.85rem;
    text-align: center;
    color: rgba(var(--v-theme-on-surface), 0.55);

    &--error {
      color: rgb(var(--v-theme-error));
    }
  }

  &__tool {
    position: absolute;
    top: 6px;
    right: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    background: rgb(var(--v-theme-surface));
    color: rgba(var(--v-theme-on-surface), 0.7);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease;

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.06);
    }
  }

  &__frame:hover &__tool,
  &__tool:focus-visible {
    opacity: 1;
  }

  &__form {
    margin-top: 8px;
    padding: 10px 12px;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 0.85rem;
  }

  &__source {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
    border-radius: 6px;
    padding: 6px 8px;
    background: rgba(var(--v-theme-on-surface), 0.03);
    color: inherit;
    font-family: 'JetBrainsMono', monospace;
    font-size: 0.85rem;
    outline: none;
    resize: vertical;

    &:focus {
      border-color: rgb(var(--v-theme-primary));
    }
  }

  &__error {
    margin: 0;
    color: rgb(var(--v-theme-error));
    font-family: 'JetBrainsMono', monospace;
    font-size: 0.75rem;
  }

  &__help {
    margin: 0;
    font-size: 0.75rem;
    color: rgba(var(--v-theme-on-surface), 0.6);

    code {
      font-size: 0.95em;
    }
  }

  &__actions {
    display: flex;
    gap: 6px;
  }

  &__spacer {
    flex: 1;
  }

  &__btn {
    padding: 4px 12px;
    border-radius: 6px;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
    background: transparent;
    color: inherit;
    cursor: pointer;

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.06);
    }

    &--primary {
      background: rgb(var(--v-theme-primary));
      border-color: rgb(var(--v-theme-primary));
      color: rgb(var(--v-theme-on-primary));

      &:hover {
        background: rgba(var(--v-theme-primary), 0.85);
      }
    }

    &--danger {
      color: rgb(var(--v-theme-error));
    }
  }
}
</style>
