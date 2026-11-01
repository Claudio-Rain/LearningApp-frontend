import { onMounted, onUnmounted } from 'vue'
import { RATING_KEYS } from '../ratings'

interface Handlers {
  /** Close the top open panel; false when none was open. */
  closeTopPanel: () => boolean
  /** True while a dialog or the editor owns the keyboard. */
  isBlocked: () => boolean
  hasItem: () => boolean
  isFlipped: () => boolean
  toggleChat: () => void
  toggleCode: () => void
  flip: () => void
  prev: () => void
  next: () => void
  rate: (ease: number) => void
}

// Typing inside an input, a textarea or CodeMirror (a contenteditable the tag
// check can't see) must not flip or change the card.
const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null
  if (el?.closest('.cm-editor')) return true
  return el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA'
}

/**
 * Study screen keys: Escape closes a panel, C chat, K scratchpad, Enter/Space
 * flip, arrows navigate, and number keys rate a flipped card.
 */
export function useStudyShortcuts(h: Handlers) {
  const actions: Record<string, () => void> = {
    c: () => { if (h.hasItem()) h.toggleChat() },
    k: h.toggleCode,
    Enter: h.flip,
    ' ': h.flip,
    ArrowLeft: h.prev,
    ArrowRight: h.next
  }

  const onKeydown = (e: KeyboardEvent) => {
    // Escape works from anywhere, even while typing inside a panel.
    if (e.key === 'Escape' && h.closeTopPanel()) {
      e.preventDefault()
      return
    }
    if (h.isBlocked() || isTypingTarget(e.target)) return

    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
    // C without a card falls through to nothing, as before: no preventDefault.
    if (key === 'c' && !h.hasItem()) return
    const action = actions[key]
    if (action) {
      e.preventDefault()
      action()
      return
    }
    const ease = RATING_KEYS[key]
    if (ease !== undefined && h.isFlipped()) h.rate(ease)
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}
