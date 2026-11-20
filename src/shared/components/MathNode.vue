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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { TextSelection } from '@tiptap/pm/state'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { repairLatex } from '@/utils/latex'

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
  katex.render(repairLatex(source), output.value, {
    displayMode: isBlock.value,
    // Display formulas sit indented under the line that introduces them; in a
    // wide editor a centred one floats far from its step.
    fleqn: true,
    throwOnError: false,
    strict: 'ignore',
  })
  fitWidth()
}

// A display formula a little too wide for its column shrinks to fit, but only
// down to SHRINK_TO, where it still reads as the same size as the rest.
// Anything wider stays one line at that size and scrolls sideways in its box;
// shrinking it further made long chains of equalities unreadably small, and
// breaking them onto more lines read as cut up. The box gets the overflows
// class (a fade on the right edge says there's more) until scrolled to the end.
const SHRINK_TO = 0.9
let fittedWidth = -1

const updateScrollHint = () => {
  const box = output.value?.parentElement
  if (!box) return
  const overflows = box.scrollWidth > box.clientWidth + 1
  const atEnd = box.scrollLeft + box.clientWidth >= box.scrollWidth - 2
  box.classList.toggle('math-node--overflows', overflows && !atEnd)
}

const fitWidth = () => {
  const el = output.value
  const box = el?.parentElement
  if (!el || !box || !isBlock.value) return
  fittedWidth = box.clientWidth
  el.style.fontSize = ''
  if (box.clientWidth > 0) {
    // The width doesn't shrink exactly in step with the font size (the indent,
    // rounding), so measure again after each step; a few steps always settle it.
    let scale = 1
    for (let i = 0; i < 4 && box.scrollWidth > box.clientWidth + 1 && scale > SHRINK_TO; i++) {
      scale = Math.max(SHRINK_TO, Math.floor((scale * box.clientWidth * 100) / box.scrollWidth) / 100)
      el.style.fontSize = `${scale}em`
    }
  }
  updateScrollHint()
}

// Refit when the column changes width (rotating the phone, the splitter, a
// panel opening). Only on a width change: fitting itself changes the height.
const resizeObserver =
  typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver(entries => {
        const width = entries[0]?.target.clientWidth
        if (width !== undefined && width !== fittedWidth) fitWidth()
      })

watch([latex, draft, editing], render)
onMounted(() => {
  render()
  const box = output.value?.parentElement
  if (isBlock.value && box) {
    resizeObserver?.observe(box)
    box.addEventListener('scroll', updateScrollHint, { passive: true })
    // KaTeX's fonts change the formula's width once they load. They load
    // lazily, when a formula first needs them, so this can be after
    // fonts.ready has already settled; refit whenever a batch finishes.
    document.fonts?.addEventListener('loadingdone', fitWidth)
  }
  // A freshly inserted empty formula opens straight into editing.
  if (editable.value && !latex.value) startEdit()
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  output.value?.parentElement?.removeEventListener('scroll', updateScrollHint)
  document.fonts?.removeEventListener('loadingdone', fitWidth)
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
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;

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
