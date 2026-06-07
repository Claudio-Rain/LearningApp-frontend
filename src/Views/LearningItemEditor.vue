<!-- LearningItemEditor.vue -->
<template>
  <div class="learning-item-editor">
    <div v-if="editor" class="container">
      <div class="editor-menu">
        <div class="editor-group">
          <v-btn size="small" variant="text" icon @click="editor.chain().focus().toggleBold().run()"
            :class="{ 'is-active': editor.isActive('bold') }">
            <v-icon>mdi-format-bold</v-icon>
            <v-tooltip activator="parent" location="top">Bold</v-tooltip>
          </v-btn>
          <v-btn size="small" variant="text" icon @click="editor.chain().focus().toggleItalic().run()"
            :class="{ 'is-active': editor.isActive('italic') }">
            <v-icon>mdi-format-italic</v-icon>
            <v-tooltip activator="parent" location="top">Italic</v-tooltip>
          </v-btn>
          <v-btn size="small" variant="text" icon @click="editor.chain().focus().toggleUnderline().run()"
            :class="{ 'is-active': editor.isActive('underline') }">
            <v-icon>mdi-format-underline</v-icon>
            <v-tooltip activator="parent" location="top">Underline</v-tooltip>
          </v-btn>
          <v-btn size="small" variant="text" icon @click="editor.chain().focus().toggleHighlight().run()"
            :class="{ 'is-active': editor.isActive('highlight') }">
            <v-icon>mdi-marker</v-icon>
            <v-tooltip activator="parent" location="top">Highlight</v-tooltip>
          </v-btn>

        </div>

        <div class="editor-divider"></div>

        <div class="editor-group">
          <v-btn size="small" variant="text" icon @click="editor.chain().focus().toggleCodeBlock().run()"
            :class="{ 'is-active': editor.isActive('codeBlock') }">
            <v-icon>mdi-code-tags</v-icon>
            <v-tooltip activator="parent" location="top">Code block</v-tooltip>
          </v-btn>
          <v-btn size="small" variant="text" icon
            @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()">
            <v-icon>mdi-table-plus</v-icon>
            <v-tooltip activator="parent" location="top">Insert table</v-tooltip>
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
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import CodeBlockComponent from '../shared/components/CodeBlockComponent.vue'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

const lowlight = createLowlight(all)

const props = defineProps<{ value: JSONContent }>()
const emit = defineEmits<{ (e: 'change', value: JSONContent): void }>()

let skipNextUpdate = false

const normalizeContent = (content: JSONContent): JSONContent => {
  if (!content) return { type: 'doc', content: [] }

  // Si es un objeto sin type, agregar type: 'doc'
  if (typeof content === 'object' && !content.type) {
    console.warn('[LearningItemEditor] Content missing type field, normalizing', content)
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
    Highlight,
    Underline,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.extend({
      addNodeView() {
        return VueNodeViewRenderer(CodeBlockComponent)
      },
    }).configure({ lowlight }),

  ],
  content: normalizeContent(props.value),
  onUpdate: ({ editor }) => {
    console.log('[LearningItemEditor] onUpdate fired', { contentLength: JSON.stringify(editor.getJSON()).length })
    skipNextUpdate = true
    emit('change', editor.getJSON())
    setTimeout(() => {
      console.log('[LearningItemEditor] skipNextUpdate reset to false')
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

    console.log('[LearningItemEditor] props.value changed', {
      skipNextUpdate,
      isFocused: editor.isFocused,
      isSame,
      newContentLength: newContent.length,
      currentContentLength: currentContent.length
    })

    if (skipNextUpdate) {
      console.log('[LearningItemEditor] SKIP: skipNextUpdate is true')
      return
    }
    if (editor.isFocused) {
      console.log('[LearningItemEditor] SKIP: editor is focused')
      return
    }
    if (isSame) {
      console.log('[LearningItemEditor] SKIP: content is already the same')
      return
    }

    console.log('[LearningItemEditor] CALLING setContent - content differs')
    console.log('[LearningItemEditor] CURRENT editor content:', currentContent)
    console.log('[LearningItemEditor] NEW content from props:', newContent)
    editor.commands.setContent(normalized, false)
  }
)

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
  // background: rgba(0, 0, 0, 0.02);

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
    background: rgba(0, 0, 0, 0.1);
  }

  .v-btn {
    color: rgba(0, 0, 0, 0.7);
    border-radius: 8px;
    transition: background-color 0.15s ease, color 0.15s ease;
    border: 1px solid rgba(0, 0, 0, 0.08);
  
    &:hover {
      background-color: rgba(0, 0, 0, 0.06);
    }

    &.is-active {
      background-color: rgb(var(--v-theme-primary));
      color: white;
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
    color: rgba(0, 0, 0, 0.7);
    transition: background-color 0.15s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.06);
    }

    .color-swatch {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid rgba(0, 0, 0, 0.2);
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
      border: 1px solid #d1d5db;
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
      background-color: #f3f4f6;
      font-weight: bold;
      text-align: left;
    }

    .selectedCell:after {
      background: #e5e7eb;
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
      background-color: #7c3aed;
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
    border-top: 1px solid #d1d5db;
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
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.07);
    border-radius: 0.35rem;
    color: rgba(0, 0, 0, 0.75);
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