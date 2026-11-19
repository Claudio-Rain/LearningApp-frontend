<!-- MathNode.vue -->
<!--
  Node view for both math nodes (see shared/tiptap/math.ts). Renders the LaTeX
  with KaTeX; in an editable editor a click opens the source for editing.
  Enter (or leaving the field) commits, Escape cancels, and a formula left
  empty is removed. Bad LaTeX renders as red source instead of throwing.
-->
<template>
  <node-view-wrapper
    :as="isBlock ? 'div' : 'span'"
    class="math-node"
    :class="{
      'math-node--block': isBlock,
      'math-node--selected': selected,
      'math-node--editable': editable,
    }"
  >
    <span
      v-show="!editing || isBlock"
      ref="output"
      class="math-node__render"
      contenteditable="false"
      @click="startEdit"
    />
    <span v-if="!latex && !editing" class="math-node__empty" contenteditable="false" @click="startEdit">
      {{ isBlock ? 'Empty formula' : 'ƒ' }}
    </span>

    <textarea
      v-if="editing && isBlock"
      ref="field"
      v-model="draft"
      class="math-node__field math-node__field--block"
      rows="2"
      spellcheck="false"
      placeholder="\int_0^1 x^2 \, dx"
      @keydown="onKeydown"
      @blur="commit"
    />
    <input
      v-else-if="editing"
      ref="field"
      v-model="draft"
      class="math-node__field"
      spellcheck="false"
      placeholder="\frac{d}{dx} f(x)"
      @keydown="onKeydown"
      @blur="commit"
    />
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { TextSelection } from '@tiptap/pm/state'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps(nodeViewProps)

const output = ref<HTMLElement | null>(null)
const field = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
const editing = ref(false)
const draft = ref('')

const isBlock = computed(() => props.node.type.name === 'mathBlock')
const latex = computed<string>(() => props.node.attrs.latex ?? '')
const editable = computed(() => props.editor.isEditable)

const render = () => {
  // While editing a block, the preview stays visible and follows the draft.
  const source = editing.value ? draft.value : latex.value
  if (!output.value) return
  katex.render(source, output.value, {
    displayMode: isBlock.value,
    throwOnError: false,
    strict: 'ignore',
  })
}

watch([latex, draft, editing], render)
onMounted(() => {
  render()
  // A freshly inserted empty formula opens straight into editing.
  if (editable.value && !latex.value) startEdit()
})

function startEdit() {
  if (!editable.value || editing.value) return
  draft.value = latex.value
  editing.value = true
  nextTick(() => field.value?.focus())
}

// Put the caret right after the formula and hand focus back to the editor.
const leave = () => {
  const pos = props.getPos()
  if (typeof pos !== 'number') return
  const { state, view } = props.editor
  const after = Math.min(pos + props.node.nodeSize, state.doc.content.size)
  view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(after))))
  view.focus()
}

function commit() {
  if (!editing.value) return
  editing.value = false
  const source = draft.value.trim()
  if (!source) {
    props.deleteNode()
    props.editor.commands.focus()
    return
  }
  if (source !== latex.value) props.updateAttributes({ latex: source })
  leave()
}

function cancel() {
  if (!editing.value) return
  editing.value = false
  if (!latex.value) {
    props.deleteNode()
    props.editor.commands.focus()
    return
  }
  leave()
}

function onKeydown(event: KeyboardEvent) {
  // Shift+Enter adds a line inside a display formula (e.g. for \begin{aligned}).
  if (event.key === 'Enter' && !(isBlock.value && event.shiftKey)) {
    event.preventDefault()
    commit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
  }
}
</script>

<style lang="scss">
.math-node {
  .katex-error {
    font-family: 'JetBrainsMono', monospace;
    font-size: 0.85em;
  }

  &--editable .math-node__render,
  &--editable .math-node__empty {
    cursor: pointer;
  }

  &--selected .math-node__render {
    border-radius: 4px;
    outline: 2px solid rgba(var(--v-theme-primary), 0.5);
  }

  &__empty {
    color: rgba(var(--v-theme-on-surface), 0.45);
    font-style: italic;
  }

  &__field {
    border: 1px solid rgba(var(--v-theme-primary), 0.6);
    border-radius: 6px;
    background: rgba(var(--v-theme-on-surface), 0.04);
    color: inherit;
    font-family: 'JetBrainsMono', monospace;
    font-size: 0.85em;
    padding: 0.1em 0.4em;
    outline: none;
    min-width: 10ch;
  }

  &--block {
    margin: 1rem 0;
    text-align: center;
    overflow-x: auto;
    overflow-y: hidden;

    .katex-display {
      margin: 0.25rem 0;
    }
  }

  &__field--block {
    display: block;
    width: 100%;
    margin-top: 0.5rem;
    resize: vertical;
    text-align: left;
  }
}
</style>
