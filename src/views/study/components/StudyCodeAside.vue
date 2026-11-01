<template>
  <aside class="study-code-aside" :style="{ width: `${width}px` }">
    <div class="code-resize-handle" title="Drag to resize" @pointerdown="startResize" />
    <div class="study-code-header">
      <span>Code scratchpad</span>
      <v-btn icon="mdi-close" variant="text" size="x-small" title="Close scratchpad" @click="emit('close')" />
    </div>
    <CodeScratchpad ref="scratchpadEl" />
  </aside>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, onUnmounted } from 'vue'

// Pulled in on demand: CodeMirror and its language packs are the heaviest
// thing on this screen and most sessions never open the scratchpad.
const CodeScratchpad = defineAsyncComponent(() => import('@/shared/components/CodeScratchpad.vue'))

const emit = defineEmits<{ close: [] }>()

const WIDTH_KEY = 'studyScratchpadWidth'
const MIN_WIDTH = 280
const MAX_WIDTH = 900
const DEFAULT_WIDTH = 460

const clampWidth = (px: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, px))
const width = ref(clampWidth(Number(localStorage.getItem(WIDTH_KEY)) || DEFAULT_WIDTH))

const scratchpadEl = ref<{ focus: () => void } | null>(null)

// The handle sits on the panel's left edge, so dragging left widens it.
let stopResize: (() => void) | null = null
const startResize = (down: PointerEvent) => {
  down.preventDefault()
  const startX = down.clientX
  const startWidth = width.value
  const onMove = (move: PointerEvent) => {
    width.value = clampWidth(startWidth + (startX - move.clientX))
  }
  stopResize = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    stopResize = null
  }
  const onUp = () => {
    stopResize?.()
    localStorage.setItem(WIDTH_KEY, String(width.value))
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

onUnmounted(() => stopResize?.())

defineExpose({ focus: () => scratchpadEl.value?.focus() })
</script>

<style scoped>
.study-code-aside {
  position: relative;
  flex: 0 0 auto;
  max-width: 60%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.code-resize-handle {
  position: absolute;
  left: -3px;
  top: 0;
  bottom: 0;
  width: 7px;
  cursor: col-resize;
  z-index: 1;
}

.code-resize-handle:hover {
  background: rgba(var(--v-theme-primary), 0.25);
}

.study-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  flex-shrink: 0;
}

/* Too narrow to sit beside the card, so the panel stacks under it instead of
   squeezing both into nothing. */
@media (max-width: 900px) {
  .study-code-aside {
    width: auto !important;
    max-width: none;
    flex: 1 1 50%;
    border-left: none;
    border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  }

  .code-resize-handle {
    display: none;
  }
}
</style>
