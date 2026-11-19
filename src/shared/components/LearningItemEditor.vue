<!-- LearningItemEditor.vue -->
<template>
  <div class="learning-item-editor">
    <div v-if="editor" class="container">
      <div class="editor-menu">
        <div class="editor-group">
          <v-btn
size="small" variant="text" icon :class="{ 'is-active': editor.isActive('bold') }"
            @click="editor.chain().focus().toggleBold().run()">
            <v-icon>mdi-format-bold</v-icon>
            <v-tooltip activator="parent" location="top">Bold</v-tooltip>
          </v-btn>
          <v-btn
size="small" variant="text" icon :class="{ 'is-active': editor.isActive('italic') }"
            @click="editor.chain().focus().toggleItalic().run()">
            <v-icon>mdi-format-italic</v-icon>
            <v-tooltip activator="parent" location="top">Italic</v-tooltip>
          </v-btn>
          <v-btn
size="small" variant="text" icon :class="{ 'is-active': editor.isActive('underline') }"
            @click="editor.chain().focus().toggleUnderline().run()">
            <v-icon>mdi-format-underline</v-icon>
            <v-tooltip activator="parent" location="top">Underline</v-tooltip>
          </v-btn>
          <v-menu location="bottom">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" size="small" variant="text" icon :class="{ 'is-active': editor.isActive('highlight') }">
                <v-icon>mdi-marker</v-icon>
                <v-tooltip activator="parent" location="top">Highlight</v-tooltip>
              </v-btn>
            </template>
            <div class="palette">
              <button
                v-for="c in HIGHLIGHT_COLORS"
                :key="c"
                type="button"
                class="palette__swatch"
                :class="{ 'is-current': editor.isActive('highlight', { color: highlightAttr(c) }) }"
                :style="{ background: `rgb(var(--v-theme-mark${cap(c)}))` }"
                :title="cap(c)"
                @click="applyHighlight(c)"
              />
              <button type="button" class="palette__none" title="No highlight" @click="editor.chain().focus().unsetHighlight().run()">
                <v-icon size="16">mdi-close</v-icon>
              </button>
            </div>
          </v-menu>
          <v-menu location="bottom">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" size="small" variant="text" icon :class="{ 'is-active': editor.isActive('tone') }">
                <v-icon>mdi-format-color-text</v-icon>
                <v-tooltip activator="parent" location="top">Text colour</v-tooltip>
              </v-btn>
            </template>
            <div class="palette">
              <button
                v-for="c in TEXT_COLORS"
                :key="c"
                type="button"
                class="palette__swatch palette__swatch--text"
                :class="{ 'is-current': editor.isActive('tone', { color: c }) }"
                :style="{ color: `rgb(var(--v-theme-ink${cap(c)}))` }"
                :title="cap(c)"
                @click="editor.chain().focus().setTone(c).run()"
              >
                A
              </button>
              <button type="button" class="palette__none" title="Default colour" @click="editor.chain().focus().setTone(null).run()">
                <v-icon size="16">mdi-close</v-icon>
              </button>
            </div>
          </v-menu>

        </div>

        <div class="editor-divider"></div>

        <div class="editor-group">
          <v-btn
size="small" variant="text" icon :class="{ 'is-active': editor.isActive('codeBlock') }"
            @click="editor.chain().focus().toggleCodeBlock().run()">
            <v-icon>mdi-code-tags</v-icon>
            <v-tooltip activator="parent" location="top">Code block</v-tooltip>
          </v-btn>
          <v-btn
size="small" variant="text" icon
            @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()">
            <v-icon>mdi-table-plus</v-icon>
            <v-tooltip activator="parent" location="top">Insert table</v-tooltip>
          </v-btn>
          <v-btn size="small" variant="text" icon @click="editor.chain().focus().insertMathInline().run()">
            <v-icon>mdi-sigma</v-icon>
            <v-tooltip activator="parent" location="top">Inline formula ($…$)</v-tooltip>
          </v-btn>
          <v-btn size="small" variant="text" icon @click="editor.chain().focus().insertMathBlock().run()">
            <v-icon>mdi-function-variant</v-icon>
            <v-tooltip activator="parent" location="top">Formula block ($$ + space)</v-tooltip>
          </v-btn>
          <v-menu location="bottom">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" size="small" variant="text" icon :class="{ 'is-active': editor.isActive('callout') }">
                <v-icon>mdi-card-text-outline</v-icon>
                <v-tooltip activator="parent" location="top">Highlight box (definition, key result, tip…)</v-tooltip>
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item
                v-for="v in CALLOUT_VARIANTS"
                :key="v"
                :prepend-icon="CALLOUTS[v].icon"
                :title="CALLOUTS[v].label"
                :class="`callout-tone--${CALLOUTS[v].tone}`"
                @click="editor.chain().focus().setCallout(v).run()"
              />
            </v-list>
          </v-menu>
          <v-btn size="small" variant="text" icon @click="editor.chain().focus().insertFunctionPlot().run()">
            <v-icon>mdi-chart-bell-curve-cumulative</v-icon>
            <v-tooltip activator="parent" location="top">Function plot</v-tooltip>
          </v-btn>
        </div>

        <template v-if="editor.isActive('table')">
          <div class="editor-divider"></div>

          <div class="editor-group">
            <v-btn size="small" variant="text" icon @click="editor.chain().focus().addColumnBefore().run()">
              <v-icon>mdi-table-column-plus-before</v-icon>
              <v-tooltip activator="parent" location="top">Column before</v-tooltip>
            </v-btn>
            <v-btn size="small" variant="text" icon @click="editor.chain().focus().addColumnAfter().run()">
              <v-icon>mdi-table-column-plus-after</v-icon>
              <v-tooltip activator="parent" location="top">Column after</v-tooltip>
            </v-btn>
            <v-btn size="small" variant="text" icon @click="editor.chain().focus().deleteColumn().run()">
              <v-icon>mdi-table-column-remove</v-icon>
              <v-tooltip activator="parent" location="top">Delete column</v-tooltip>
            </v-btn>
            <v-btn size="small" variant="text" icon @click="editor.chain().focus().addRowBefore().run()">
              <v-icon>mdi-table-row-plus-before</v-icon>
              <v-tooltip activator="parent" location="top">Row before</v-tooltip>
            </v-btn>
            <v-btn size="small" variant="text" icon @click="editor.chain().focus().addRowAfter().run()">
              <v-icon>mdi-table-row-plus-after</v-icon>
              <v-tooltip activator="parent" location="top">Row after</v-tooltip>
            </v-btn>
            <v-btn size="small" variant="text" icon @click="editor.chain().focus().deleteRow().run()">
              <v-icon>mdi-table-row-remove</v-icon>
              <v-tooltip activator="parent" location="top">Delete row</v-tooltip>
            </v-btn>
            <v-btn size="small" variant="text" icon @click="editor.chain().focus().mergeOrSplit().run()">
              <v-icon>mdi-table-merge-cells</v-icon>
              <v-tooltip activator="parent" location="top">Merge / split</v-tooltip>
            </v-btn>
            <v-btn size="small" variant="text" icon @click="editor.chain().focus().deleteTable().run()">
              <v-icon>mdi-table-remove</v-icon>
              <v-tooltip activator="parent" location="top">Delete table</v-tooltip>
            </v-btn>
          </div>
        </template>

        <v-btn
          color="primary"
          size="small"
          variant="tonal"
          prepend-icon="mdi-creation"
          :loading="answering"
          class="answer-btn"
          @click="emit('answer')"
        >
          Answer
        </v-btn>
      </div>

      <editor-content :editor="editor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import type { JSONContent } from '@tiptap/vue-3'
import { Editor, EditorContent, VueNodeViewRenderer } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import CodeBlock from './CodeBlock.vue'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { MathExtensions } from '../tiptap/math'
import { FunctionPlot } from '../tiptap/plot'
import { RichFormatExtensions } from '../tiptap/richFormat'
import { CALLOUTS, CALLOUT_VARIANTS, HIGHLIGHT_COLORS, TEXT_COLORS, type HighlightColor } from '@/utils/richFormat'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Yellow is the highlighter's default, stored without a colour so it matches
// every highlight saved before colours existed.
const highlightAttr = (c: HighlightColor) => (c === 'yellow' ? null : c)

const lowlight = createLowlight(all)

const props = defineProps<{ value: JSONContent; answering?: boolean }>()
const emit = defineEmits<{
  (e: 'change', value: JSONContent): void
  (e: 'answer'): void
}>()

let skipNextUpdate = false

const normalizeContent = (content: JSONContent): JSONContent => {
  if (!content) return { type: 'doc', content: [] }

  // Si es un objeto sin type, agregar type: 'doc'
  if (typeof content === 'object' && !content.type) {
    return { type: 'doc', content: content.content || [] }
  }

  return content
}

const editor = new Editor({
  extensions: [
    StarterKit,
    Image,
    Color,
    TextStyle,
    Underline,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.extend({
      addNodeView() {
        return VueNodeViewRenderer(CodeBlock)
      },
    }).configure({ lowlight }),
    ...MathExtensions,
    FunctionPlot,
    ...RichFormatExtensions,
  ],
  content: normalizeContent(props.value),
  onUpdate: ({ editor }) => {
    skipNextUpdate = true
    emit('change', editor.getJSON())
    setTimeout(() => {
      skipNextUpdate = false
    }, 0)
  },
})

watch(
  () => props.value,
  (newVal) => {
    const normalized = normalizeContent(newVal)
    const currentContent = JSON.stringify(editor.getJSON())
    const newContent = JSON.stringify(normalized)
    const isSame = currentContent === newContent

    if (skipNextUpdate) return
    if (editor.isFocused) return
    if (isSame) return

    editor.commands.setContent(normalized, false)
  }
)

const applyHighlight = (c: HighlightColor) => {
  const color = highlightAttr(c)
  editor.chain().focus().setHighlight(color ? { color } : undefined).run()
}

onBeforeUnmount(() => editor.destroy())
</script>

<style lang="scss">
.learning-item-editor {
  width: 100%;
}

.editor-menu {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  // padding: 6px 8px;
  // border-radius: 10px;
  // background: rgba(var(--v-theme-on-surface), 0.02);

  .editor-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
  }

  .editor-divider {
    width: 1px;
    align-self: stretch;
    margin: 2px 6px;
    background: rgba(var(--v-theme-on-surface), 0.1);
  }

  .answer-btn {
    text-transform: none;
    font-weight: 500;
  }

  .v-btn {
    color: rgba(var(--v-theme-on-surface), 0.7);
    border-radius: 8px;
    transition: background-color 0.15s ease, color 0.15s ease;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  
    &:hover {
      background-color: rgba(var(--v-theme-on-surface), 0.06);
    }

    &.is-active {
      background-color: rgb(var(--v-theme-primary));
      color: rgb(var(--v-theme-on-primary));
    }
  }

  // Color picker styled as a toolbar button with a swatch.
  .color-picker {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 32px;
    padding: 0 8px;
    border-radius: 8px;
    cursor: pointer;
    color: rgba(var(--v-theme-on-surface), 0.7);
    transition: background-color 0.15s ease;

    &:hover {
      background-color: rgba(var(--v-theme-on-surface), 0.06);
    }

    .color-swatch {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
    }

    input[type='color'] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }
  }
}

// Colour pickers for the highlighter and text colour menus.
.palette {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);

  &__swatch,
  &__none {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.1s ease;

    &:hover {
      transform: scale(1.12);
    }

    &.is-current {
      border-color: rgb(var(--v-theme-on-surface));
    }
  }

  &__swatch--text {
    background: rgba(var(--v-theme-on-surface), 0.06);
    font-weight: 800;
    font-size: 15px;
  }

  &__none {
    background: transparent;
    border-color: rgba(var(--v-theme-on-surface), 0.2);
    color: rgba(var(--v-theme-on-surface), 0.6);
  }
}

.ProseMirror-focused {
  outline: none;
  border: none;
  box-shadow: none;
}

.tiptap {
  :first-child {
    margin-top: 0;
  }

  h1,
  h2,
  h3,
  h4 {
    font-weight: 700;
    line-height: 1.2;
    margin: 1.5rem 0 0.5rem;
  }

  h1 {
    font-size: 1.6rem;
  }

  h2 {
    font-size: 1.35rem;
  }

  h3 {
    font-size: 1.15rem;
  }

  h4 {
    font-size: 1rem;
  }

  p {
    margin: 0.5rem 0;
  }

  ul,
  ol {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
  }

  li>p {
    margin: 0.15rem 0;
  }

  table {
    border-collapse: collapse;
    margin: 0;
    overflow: hidden;
    table-layout: fixed;
    width: 100%;

    td,
    th {
      border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
      box-sizing: border-box;
      min-width: 1em;
      padding: 6px 8px;
      position: relative;
      vertical-align: top;

      >* {
        margin-bottom: 0;
      }
    }

    th {
      background-color: rgba(var(--v-theme-on-surface), 0.05);
      font-weight: bold;
      text-align: left;
    }

    .selectedCell:after {
      background: rgba(var(--v-theme-on-surface), 0.10);
      content: '';
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      pointer-events: none;
      position: absolute;
      z-index: 2;
    }

    .column-resize-handle {
      background-color: rgb(var(--v-theme-primary));
      bottom: -2px;
      pointer-events: none;
      position: absolute;
      right: -2px;
      top: 0;
      width: 4px;
    }
  }

  hr {
    border: none;
    border-top: 1px solid rgba(var(--v-theme-on-surface), 0.18);
    margin: 0.75rem 0;
  }

  .tableWrapper {
    margin: 1.5rem 0;
    overflow-x: auto;
  }

  &.resize-cursor {
    cursor: col-resize;
  }

  // Inline code (`backticks`) — not inside a code block.
  code {
    background: rgba(var(--v-theme-on-surface), 0.04);
    border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
    border-radius: 0.35rem;
    color: rgba(var(--v-theme-on-surface), 0.75);
    font-family: 'JetBrainsMono', monospace;
    font-size: 0.85em;
    font-weight: 400;
    padding: 0.12em 0.4em;
  }

  pre {
    background: rgb(var(--v-theme-darkColor));
    border-radius: 0.5rem;
    color: rgb(var(--v-theme-lightColor));
    font-family: 'JetBrainsMono', monospace;
    margin: 1.5rem 0;
    padding: 0.75rem 1rem;

    code {
      background: none;
      border: none;
      color: inherit;
      font-size: 0.8rem;
      padding: 0;
    }

    .hljs-comment,
    .hljs-quote {
      color: #6dbf67;
    }

    .hljs-variable,
    .hljs-template-variable,
    .hljs-attribute,
    .hljs-tag,
    .hljs-regexp,
    .hljs-link,
    .hljs-selector-id,
    .hljs-selector-class {
      color: #f98181;
    }

    .hljs-number,
    .hljs-meta,
    .hljs-built_in,
    .hljs-literal,
    .hljs-type,
    .hljs-params {
      color: #fbbc88;
    }

    .hljs-string,
    .hljs-symbol,
    .hljs-bullet {
      color: #b9f18d;
    }

    .hljs-title,
    .hljs-section {
      color: #faf594;
    }

    .hljs-keyword,
    .hljs-selector-tag {
      color: #70cff8;
    }

    .hljs-emphasis {
      font-style: italic;
    }

    .hljs-strong {
      font-weight: 700;
    }
  }
}
</style>