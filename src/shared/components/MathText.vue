<!-- MathText.vue -->
<!--
  A line of plain text that may contain $...$ math — an item title in a list,
  a flashcard front — rendered with KaTeX instead of showing raw dollar signs.
  Text without math stays a plain text node. Rendered with h() so the tag can
  vary (span, div, h2) without v-html on a dynamic component.
-->
<script setup lang="ts">
import { computed, h } from 'vue'
import 'katex/dist/katex.min.css'
import { hasMath, mathTextHtml } from '@/utils/mathText'

const props = withDefaults(defineProps<{ text: string; tag?: string }>(), { tag: 'span' })

const withMath = computed(() => hasMath(props.text))

// mathTextHtml escapes the text and KaTeX escapes the math, so innerHTML is safe.
const render = () =>
  withMath.value
    ? h(props.tag, { class: 'math-text', innerHTML: mathTextHtml(props.text) })
    : h(props.tag, { class: 'math-text' }, props.text)
</script>

<template>
  <render />
</template>

<style scoped>
/* KaTeX's default 1.21em makes inline math loom over the words around it. */
.math-text :deep(.katex) {
  font-size: 1.08em;
}
</style>
