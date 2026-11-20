<template>
  <node-view-wrapper class="code-block">
    <select v-model="selectedLanguage" contenteditable="false">
      <option :value="null">auto</option>
      <option disabled>—</option>
      <option v-for="(language, index) in languages" :key="index" :value="language">
        {{ language }}
      </option>
    </select>
    <pre><code><node-view-content /></code></pre>
  </node-view-wrapper>
</template>

<script>
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },

  props: nodeViewProps,

  data() {
    return {
      languages: this.extension.options.lowlight.listLanguages(),
    }
  },

  computed: {
    selectedLanguage: {
      get() {
        return this.node.attrs.language
      },
      set(language) {
        this.updateAttributes({ language })
      },
    },
  },
}
</script>

<style lang="scss">
.tiptap {
  .code-block {
    position: relative;

    select {
      position: absolute;
      right: 0.5rem;
      top: 0.5rem;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      // Small and quiet until pointed at: it's a setting, not content.
      font-size: 0.75rem;
      opacity: 0.7;
      transition: opacity 0.15s ease;
      padding: 0.1rem 1.4rem 0.1rem 0.45rem;
      border-radius: 0.35rem;
      color: rgb(var(--v-theme-darkColor));
      background-color: rgb(var(--v-theme-lightColor));
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="Black" d="M7 10l5 5 5-5z"/></svg>');
      background-repeat: no-repeat;
      background-position: right 0.25rem center;
      background-size: 1rem;

      &:hover,
      &:focus {
        opacity: 1;
      }
    }

    // A long first line of code ran under the picker (on a laptop's editor
    // column as much as on a phone), so the code starts below it.
    pre {
      padding-top: 2.3rem;
    }
  }
}
</style>