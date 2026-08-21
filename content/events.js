import { RATING_SCORES } from './constants.js';
import { getCurrentItem, isFlipped } from './state.js';
import { pullLatest } from './services/pull.js';
import { sendMessageSafely } from './utils/messaging.js';
import { closeAddModal, isAddModalOpen, openAddModal, submitAddModal } from './ui/addPanel.js';
import { sendChatMessage, toggleChatPanel } from './ui/chatPanel.js';
import { toggleNotesPanel } from './ui/notesPanel.js';
import { toggleDarkMode } from './ui/theme.js';
import { showToast } from './ui/toast.js';
import { showLoadingState, toggleFlip, updateContentDisplay } from './ui/widget.js';

// Clear the card and tell the background which one to show next.
function navigate(message) {
  showLoadingState();
  sendMessageSafely(message);
}

function recordRating(score) {
  navigate({ action: 'recordRating', score });
}

// Toolbar/panel buttons, matched with closest() against the click target. The
// first match wins and stops there, so ordering only matters for nested ids.
const CLICK_ACTIONS = [
  ['#content-pull', pullLatest],
  ['#content-add', openAddModal],
  // Close the new-item panel (X button or Cancel)
  ['#learning-add-close', closeAddModal],
  ['#learning-add-cancel', closeAddModal],
  ['#learning-add-create', submitAddModal],
  ['#content-nav-prev', () => navigate({ action: 'navigatePrev' })],
  ['#content-nav-next', () => navigate({ action: 'navigateNext' })],
  ['#content-notes-toggle', toggleNotesPanel],
  ['#learning-notes-close', toggleNotesPanel],
  ['#content-chat-toggle', toggleChatPanel],
  ['#learning-chat-close', toggleChatPanel],
  ['#learning-chat-send', sendChatMessage],
  ['#content-theme-toggle', toggleDarkMode],
  [
    '#content-exclude',
    () => {
      if (confirm('Exclude this item from future study sessions?')) {
        navigate({ action: 'excludeContentItem' });
      }
    },
  ],
  // Edit current item — ask background to open a new tab (content scripts lack chrome.tabs)
  [
    '#content-edit',
    () => {
      const item = getCurrentItem();
      if (item?.collectionId && item?.id) {
        sendMessageSafely({
          action: 'openEditTab',
          collectionId: item.collectionId,
          itemId: item.id,
        });
      }
    },
  ],
  [
    '#content-delete',
    () => {
      if (confirm('Delete this item permanently? Its progress and attempt history will be removed.')) {
        navigate({ action: 'deleteContentItem' });
      }
    },
  ],
];

function handleClick(e) {
  for (const [selector, handler] of CLICK_ACTIONS) {
    if (e.target.closest(selector)) {
      e.stopPropagation();
      handler();
      return;
    }
  }
  // Flashcard flip
  if (e.target.closest('#flashcard')) {
    toggleFlip();
  }
  // Content rating buttons (fire-and-forget)
  else if (e.target.classList.contains('content-rating-btn')) {
    recordRating(parseFloat(e.target.getAttribute('data-score')));
  }
}

function handleChange(e) {
  if (e.target.id !== 'content-counter-input') return;
  const total = parseInt(e.target.max) || 1;
  let val = parseInt(e.target.value);
  if (isNaN(val) || val < 1) val = 1;
  if (val > total) val = total;
  e.target.value = val;
  navigate({ action: 'navigateTo', index: val - 1 });
}

// Enter submits, Escape closes — the shape both text-entry surfaces share.
// `canSubmit` guards the Enter case (e.g. Shift+Enter should insert a newline).
function handleSubmitEscapeKeys(e, { canSubmit, onSubmit, onClose }) {
  if (e.key === 'Enter' && canSubmit(e)) {
    e.preventDefault();
    onSubmit();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    onClose();
  }
}

// Flip on Space/Enter, rate with 1-4 once the answer is showing.
function handleCardKeys(e) {
  const insideWidget = e.target.closest('#learning-app-content');
  if (!insideWidget) return;

  if ((e.key === ' ' || e.key === 'Enter') && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    toggleFlip();
  } else if (isFlipped() && Object.hasOwn(RATING_SCORES, e.key)) {
    recordRating(RATING_SCORES[e.key]);
  }
}

// Keyboard shortcuts
function handleKeydown(e) {
  // AI chat input keys never leak to the flip/rating shortcuts.
  if (e.target.id === 'learning-chat-input') {
    handleSubmitEscapeKeys(e, {
      canSubmit: (ev) => !ev.shiftKey,
      onSubmit: sendChatMessage,
      onClose: toggleChatPanel,
    });
    return;
  }
  if (isAddModalOpen()) {
    handleSubmitEscapeKeys(e, {
      canSubmit: (ev) => ev.target.id !== 'learning-add-collection',
      onSubmit: submitAddModal,
      onClose: closeAddModal,
    });
    return;
  }
  handleCardKeys(e);
}

export function registerEventListeners() {
  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleChange);
  document.addEventListener('keydown', handleKeydown);
}

export function registerMessageListener() {
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    try {
      if (request.action === 'updateContent') {
        updateContentDisplay(request.item, request.meta);
        sendResponse({ success: true });
      } else if (request.action === 'notify') {
        showToast(request.message, request.isError);
        sendResponse({ success: true });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  });
}
