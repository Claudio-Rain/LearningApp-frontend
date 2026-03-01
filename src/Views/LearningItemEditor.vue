<template>
  <div class="learning-item-editor">
    <input v-model="title" type="text" placeholder="Título..." class="title-input" />

    <div v-if="editor" class="container">
      <!-- Toolbar -->
      <div class="editor-menu control-group">
        <button @click="toggleBold" :class="{ 'is-active': editor.isActive('bold') }">
          Bold
        </button>
        <button @click="toggleItalic" :class="{ 'is-active': editor.isActive('italic') }">
          Italic
        </button>
        <button @click="toggleUnderline" :class="{ 'is-active': editor.isActive('underline') }">
          Underline
        </button>
        <button @click="toggleHighlight" :class="{ 'is-active': editor.isActive('highlight') }">
          Highlight
        </button>

        <input type="color" v-model="textColor" @input="setTextColor" />

        <div class="button-">
          <button @click="editor.chain().focus().toggleCodeBlock().run()"
            :class="{ 'is-active': editor.isActive('codeBlock') }">
            Toggle code block
          </button>
        </div>

        <button @click="addImage">Image</button>
      </div>

      <!-- Editor Content -->
      <editor-content :editor="editor" />
    </div>
  </div>
</template>

<script>
import { ref, onBeforeUnmount } from 'vue'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { Editor, EditorContent, VueNodeViewRenderer } from '@tiptap/vue-3'

import css from 'highlight.js/lib/languages/css'
import js from 'highlight.js/lib/languages/javascript'
import ts from 'highlight.js/lib/languages/typescript'
import html from 'highlight.js/lib/languages/xml'
import { all, createLowlight } from 'lowlight'

const lowlight = createLowlight(all)
lowlight.register('html', html)
lowlight.register('css', css)
lowlight.register('js', js)
lowlight.register('ts', ts)

export default {
  components: { EditorContent },
  setup() {
    const title = ref('')
    const textColor = ref('#000000')

    const editor = new Editor({
      extensions: [
        StarterKit,
        TextStyle,
        Color,
        Highlight,
        Underline,
        Image,
        CodeBlockLowlight.configure({ lowlight }),
      ],
      content: '',
    })

    const toggleBold = () => editor.chain().focus().toggleBold().run()
    const toggleItalic = () => editor.chain().focus().toggleItalic().run()
    const toggleUnderline = () => editor.chain().focus().toggleUnderline().run()
    const toggleHighlight = () => editor.chain().focus().toggleHighlight().run()
    const setTextColor = () => editor.chain().focus().setColor(textColor.value).run()
    const setCodeBlock = () => editor.chain().focus().toggleCodeBlock().run()
    const addImage = () => {
      const url = prompt('URL de la imagen:')
      if (url) editor.chain().focus().setImage({ src: url }).run()
    }

    onBeforeUnmount(() => editor.destroy())

    return {
      title,
      editor,
      textColor,
      toggleBold,
      toggleItalic,
      toggleUnderline,
      toggleHighlight,
      setTextColor,
      setCodeBlock,
      addImage,
    }
  },
}
</script>

<style lang="scss">
.learning-item-editor {
  max-width: 800px;
  margin: auto;
}

.title-input {
  width: 100%;
  font-size: 1.5rem;
  padding: 8px;
  margin-bottom: 16px;
}

.editor-menu {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.editor-menu button.is-active {
  background-color: #007bff;
  color: white;
}
/* Basic editor styles */
.tiptap {
  :first-child {
    margin-top: 0;
  }

  pre {
    background: var(--black);
    border-radius: 0.5rem;
    color: var(--white);
    font-family: 'JetBrainsMono', monospace;
    margin: 1.5rem 0;
    padding: 0.75rem 1rem;

    code {
      background: none;
      color: inherit;
      font-size: 0.8rem;
      padding: 0;
    }

    /* Code styling */
    .hljs-comment,
    .hljs-quote {
      color: #616161;
    }

    .hljs-variable,
    .hljs-template-variable,
    .hljs-attribute,
    .hljs-tag,
    .hljs-name,
    .hljs-regexp,
    .hljs-link,
    .hljs-name,
    .hljs-selector-id,
    .hljs-selector-class {
      color: #f98181;
    }

    .hljs-number,
    .hljs-meta,
    .hljs-built_in,
    .hljs-builtin-name,
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