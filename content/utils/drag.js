import { PANEL_POSITION_KEY } from '../constants.js';

function applyPanelPosition(widget, left, top) {
  const maxLeft = Math.max(0, window.innerWidth - widget.offsetWidth);
  const maxTop = Math.max(0, window.innerHeight - widget.offsetHeight);
  widget.style.left = Math.min(Math.max(0, left), maxLeft) + 'px';
  widget.style.top = Math.min(Math.max(0, top), maxTop) + 'px';
  widget.style.right = 'auto';
  widget.style.bottom = 'auto';
}

// Apply a saved position, clamped into the current viewport so the panel can't
// end up off-screen after a resize.
export function restorePanelPosition(widget) {
  if (!widget || typeof chrome === 'undefined' || !chrome.storage) return;
  chrome.storage.local.get(PANEL_POSITION_KEY, (data) => {
    const pos = data?.[PANEL_POSITION_KEY];
    if (!pos || typeof pos.left !== 'number' || typeof pos.top !== 'number') return;
    applyPanelPosition(widget, pos.left, pos.top);
  });
}

export function savePanelPosition(pos) {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  chrome.storage.local.set({ [PANEL_POSITION_KEY]: pos });
}

// onDrop (optional): called with the final {left, top} so callers can persist
// the position. Omit it for ephemeral panels that shouldn't be remembered.
export function makeDraggable(widget, handle, onDrop) {
  if (!widget || !handle) return;

  let startX = 0,
    startY = 0,
    originLeft = 0,
    originTop = 0,
    dragging = false;

  const onPointerMove = (e) => {
    if (!dragging) return;
    applyPanelPosition(widget, originLeft + (e.clientX - startX), originTop + (e.clientY - startY));
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    onDrop?.({ left: widget.offsetLeft, top: widget.offsetTop });
  };

  handle.addEventListener('pointerdown', (e) => {
    // Don't hijack clicks on the action buttons (e.g. delete).
    if (e.button !== 0 || e.target.closest('button')) return;
    const rect = widget.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    startX = e.clientX;
    startY = e.clientY;
    dragging = true;
    handle.classList.add('dragging');
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  });
}