<template>
  <div class="tiptap-display">
    <editor-content v-if="editor" :editor="editor" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import type { JSONContent } from '@tiptap/vue-3'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

const lowlight = createLowlight(all)

const props = defineProps<{ content: JSONContent }>()

const editor = new Editor({
  extensions: [
    StarterKit,
    Image,
    Color,
    TextStyle,
    Highlight,
    Underline,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.configure({ lowlight }),
  ],
  content: props.content,
  editable: false,
})

onBeforeUnmount(() => editor.destroy())
</script>

<style scoped lang="scss">
.tiptap-display {
  :deep(.ProseMirror) {
    outline: none;
    padding: 0;

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
    }

    .tableWrapper {
      margin: 1.5rem 0;
      overflow-x: auto;
    }

    pre {
      background: #1f2937;
      border-radius: 0.5rem;
      color: #f3f4f6;
      font-family: 'JetBrainsMono', monospace;
      margin: 1.5rem 0;
      padding: 0.75rem 1rem;

      code {
        background: none;
        color: inherit;
        font-size: 0.8rem;
        padding: 0;
      }

      .hljs-comment, .hljs-quote { color: #616161; }
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
}
</style>
