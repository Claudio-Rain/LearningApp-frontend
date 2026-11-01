import { ref, onUnmounted } from 'vue'

const MIN_WIDTH = 60
const FALLBACK_WIDTH = 120

/** Drag-to-resize widths for table columns, keyed by column key. */
export function useResizableColumns(initial: Record<string, number>) {
  const widths = ref<Record<string, number>>({ ...initial })
  let drag: { key: string; startX: number; startWidth: number } | null = null

  const onMove = (e: MouseEvent) => {
    if (!drag) return
    widths.value[drag.key] = Math.max(MIN_WIDTH, drag.startWidth + e.clientX - drag.startX)
  }

  const stop = () => {
    drag = null
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', stop)
  }

  const startResize = (e: MouseEvent, key: string) => {
    drag = { key, startX: e.clientX, startWidth: widths.value[key] ?? FALLBACK_WIDTH }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', stop)
  }

  onUnmounted(stop)

  return { widths, startResize }
}
