import { ref, onUnmounted } from 'vue'

const MIN_WIDTH = 280
/** Space kept for the editor on the right, so the splitter can't swallow it. */
const RIGHT_RESERVE = 320

/** Drag-to-resize state for the divider between the item table and the editor. */
export function useSplitPane(initialWidth = 520) {
  const leftWidth = ref(initialWidth)
  const isDragging = ref(false)

  const onDrag = (e: MouseEvent) => {
    if (!isDragging.value) return
    const max = window.innerWidth - RIGHT_RESERVE
    leftWidth.value = Math.min(max, Math.max(MIN_WIDTH, e.clientX))
  }

  const stopDrag = () => {
    isDragging.value = false
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  }

  const startDrag = () => {
    isDragging.value = true
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  onUnmounted(stopDrag)

  return { leftWidth, isDragging, startDrag }
}
