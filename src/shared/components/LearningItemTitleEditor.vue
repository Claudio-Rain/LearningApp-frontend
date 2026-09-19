<!-- LearningItemTitleEditor.vue -->
<!--
  The question side of a card. It's a Tiptap editor rather than a text field so
  a title can hold a code block or an image, but it stays deliberately poorer
  than LearningItemEditor: no headings, lists, tables or quotes, because a title
  that needs those is really an answer. The toolbar only appears on focus, so
  the panel still reads as a title above an editor rather than two editors.
-->
<template>
  <div class="title-editor">
    <div v-if="editor" v-show="focused" class="title-editor-menu">
      <v-btn
        v-for="tool in TOOLS"
        :key="tool.name"
        size="x-small"
        variant="text"
        icon
        :class="{ 'is-active': editor.isActive(tool.name) }"
        @mousedown.prevent
        @click="tool.run()"
      >
        <v-icon size="small">{{ tool.icon }}</v-icon>
        <v-tooltip activator="parent" location="top">{{ tool.label }}</v-tooltip>
      </v-btn>
    </div>

    <editor-content :editor="editor" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import type { JSONContent } from '@tiptap/vue-3'
import { Editor, EditorContent, VueNodeViewRenderer } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import CodeBlock from './CodeBlock.vue'

const lowlight = createLowlight(all)

const props = defineProps<{ value: JSONContent }>()
const emit = defineEmits<{ (e: 'change', value: JSONContent): void }>()

const focused = ref(false)
let skipNextUpdate = false

const editor = new Editor({
  extensions: [
    StarterKit.configure({
      heading: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      blockquote: false,
      horizontalRule: false,
      // Replaced below by the highlighted version.
      codeBlock: false,
    }),
    Image,
    CodeBlockLowlight.extend({
      addNodeView() {
        return VueNodeViewRenderer(CodeBlock)
      },
    }).configure({ lowlight }),
  ],
  content: props.value,
  onUpdate: ({ editor }) => {
    skipNextUpdate = true
    emit('change', editor.getJSON())
    setTimeout(() => {
      skipNextUpdate = false
    }, 0)
  },
  onFocus: () => {
    focused.value = true
  },
  onBlur: () => {
    focused.value = false
  },
})

const TOOLS = [
  { name: 'bold', icon: 'mdi-format-bold', label: 'Bold', run: () => editor.chain().focus().toggleBold().run() },
  { name: 'italic', icon: 'mdi-format-italic', label: 'Italic', run: () => editor.chain().focus().toggleItalic().run() },
  { name: 'code', icon: 'mdi-code-tags', label: 'Inline code', run: () => editor.chain().focus().toggleCode().run() },
  { name: 'codeBlock', icon: 'mdi-code-braces-box', label: 'Code block', run: () => editor.chain().focus().toggleCodeBlock().run() },
]

// Same guard as the content editor: only take an outside change when it's a
// real one and the user isn't mid-edit, or the caret jumps to the end on every
// debounced save.
watch(
  () => props.value,
  newVal => {
    if (skipNextUpdate) return
    if (editor.isFocused) return
    if (JSON.stringify(editor.getJSON()) === JSON.stringify(newVal)) return

    editor.commands.setContent(newVal, false)
  }
)

onBeforeUnmount(() => editor.destroy())
</script>

<style scoped lang="scss">
.title-editor {
  position: relative;
}

.title-editor-menu {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-left: 12px;
  margin-bottom: 2px;

  .v-btn {
    color: rgba(var(--v-theme-on-surface), 0.7);
    border-radius: 6px;

    &.is-active {
      background-color: rgb(var(--v-theme-primary));
      color: rgb(var(--v-theme-on-primary));
    }
  }
}

.title-editor :deep(.ProseMirror) {
  outline: none;
  padding: 0 16px;

  /* Title-sized text, but only for prose — a code block keeps its own scale. */
  p {
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.3;
    margin: 0;
  }

  /* The shared .tiptap styles space code blocks out like body copy; a title
     needs them tight against the line above. */
  pre {
    margin: 0.4rem 0;
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
  }
}
</style>
