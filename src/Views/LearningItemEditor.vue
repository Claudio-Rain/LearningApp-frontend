<!-- LearningItemEditor.vue -->
<template>
  <div class="learning-item-editor">
    <div v-if="editor" class="container">
      <div class="editor-menu control-group">
        <!-- existentes -->
        <v-btn @click="editor.chain().focus().toggleBold().run()"
          :class="{ 'is-active': editor.isActive('bold') }">Bold</v-btn>
        <v-btn @click="editor.chain().focus().toggleItalic().run()"
          :class="{ 'is-active': editor.isActive('italic') }">Italic</v-btn>
        <v-btn @click="editor.chain().focus().toggleUnderline().run()"
          :class="{ 'is-active': editor.isActive('underline') }">Underline</v-btn>
        <v-btn @click="editor.chain().focus().toggleHighlight().run()"
          :class="{ 'is-active': editor.isActive('highlight') }">Highlight</v-btn>
        <input type="color" v-model="textColor" @input="editor.chain().focus().setColor(textColor).run()" />
        <v-btn @click="editor.chain().focus().toggleCodeBlock().run()"
          :class="{ 'is-active': editor.isActive('codeBlock') }">Code</v-btn>
        <v-btn @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()">
          Insert table
        </v-btn>
        <template v-if="editor.isActive('table')">
          <v-btn @click="editor.chain().focus().addColumnBefore().run()">Col antes</v-btn>
          <v-btn @click="editor.chain().focus().addColumnAfter().run()">Col después</v-btn>
          <v-btn @click="editor.chain().focus().deleteColumn().run()">Del col</v-btn>
          <v-btn @click="editor.chain().focus().addRowBefore().run()">Fila antes</v-btn>
          <v-btn @click="editor.chain().focus().addRowAfter().run()">Fila después</v-btn>
          <v-btn @click="editor.chain().focus().deleteRow().run()">Del fila</v-btn>
          <v-btn @click="editor.chain().focus().mergeOrSplit().run()">Merge/split</v-btn>
          <v-btn @click="editor.chain().focus().deleteTable().run()">Del tabla</v-btn>
        </template>
      </div>

      <editor-content :editor="editor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
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

const textColor = ref('#000000')

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
  content: props.value,
  onUpdate: ({ editor }) => {
    emit('change', editor.getJSON())
  },
})

watch(
  () => props.value,
  (newVal) => {
    const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(newVal)
    if (!isSame) editor.commands.setContent(newVal, false)
  }
)

onBeforeUnmount(() => editor.destroy())
</script>

<style lang="scss">
.learning-item-editor {
  max-width: 800px;
}

.editor-menu {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;

  button.is-active {
    background-color: #007bff;
    color: white;
  }
}

.ProseMirror-focused {
  outline: none;
  border: none;
  box-shadow: none;
}

.tiptap {
  :first-child { margin-top: 0; }

  table {
    border-collapse: collapse;
    margin: 0;
    overflow: hidden;
    table-layout: fixed;
    width: 100%;

    td, th {
      border: 1px solid #d1d5db;
      box-sizing: border-box;
      min-width: 1em;
      padding: 6px 8px;
      position: relative;
      vertical-align: top;

      > * { margin-bottom: 0; }
    }

    th {
      background-color: #f3f4f6;
      font-weight: bold;
      text-align: left;
    }

    .selectedCell:after {
      background: #e5e7eb;
      content: '';
      left: 0; right: 0; top: 0; bottom: 0;
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

  .tableWrapper {
    margin: 1.5rem 0;
    overflow-x: auto;
  }

  &.resize-cursor {
    cursor: col-resize;
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
      color: inherit;
      font-size: 0.8rem;
      padding: 0;
    }

    .hljs-comment, .hljs-quote { color: #6dbf67; }
    .hljs-variable, .hljs-template-variable, .hljs-attribute,
    .hljs-tag, .hljs-regexp, .hljs-link, .hljs-selector-id,
    .hljs-selector-class { color: #f98181; }
    .hljs-number, .hljs-meta, .hljs-built_in, .hljs-literal,
    .hljs-type, .hljs-params { color: #fbbc88; }
    .hljs-string, .hljs-symbol, .hljs-bullet { color: #b9f18d; }
    .hljs-title, .hljs-section { color: #faf594; }
    .hljs-keyword, .hljs-selector-tag { color: #70cff8; }
    .hljs-emphasis { font-style: italic; }
    .hljs-strong { font-weight: 700; }
  }
}
</style>