import { ref, onUnmounted } from 'vue'

const MIN_WIDTH = 280
/** Space kept for the editor on the right, so the splitter can't swallow it. */
const RIGHT_RESERVE = 320

/** Drag-to-resize state for the divider between the item table and the editor. */
export function useSplitPane(initialWidth = 520) {
  const leftWidth = ref(initialWidth)
  const isDragging = ref(false)

  // Width follows how far the mouse has moved since the press, not where it
  // is: the panel doesn't start at the window's left edge (the nav drawer sits
  // there), so using clientX as the width made the divider jump away from the
  // pointer on the first move.
  let startX = 0
  let startWidth = initialWidth
  // The split view's width, measured at the press: the nav drawer takes part
  // of the window, so the window width would let the list squeeze the editor.
  let containerWidth = window.innerWidth

  const onDrag = (e: MouseEvent) => {
    if (!isDragging.value) return
    const max = Math.max(MIN_WIDTH, containerWidth - RIGHT_RESERVE)
    leftWidth.value = Math.min(max, Math.max(MIN_WIDTH, startWidth + e.clientX - startX))
  }

  const stopDrag = () => {
    isDragging.value = false
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  }

  const startDrag = (e: MouseEvent) => {
    // No text selection or native drag kicking in from the press itself.
    e.preventDefault()
    startX = e.clientX
    startWidth = leftWidth.value
    containerWidth =
      (e.currentTarget as HTMLElement | null)?.parentElement?.getBoundingClientRect().width ?? window.innerWidth
    isDragging.value = true
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  onUnmounted(stopDrag)

  return { leftWidth, isDragging, startDrag }
}
