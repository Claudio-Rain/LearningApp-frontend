import { getCurrentItem } from '../state.js';
import { pauseContentTimer, resumeContentTimer } from '../services/timer.js';
import { ensureApiKey } from '../utils/apiKey.js';
import { sendMessageForResponse } from '../utils/messaging.js';
import { extractPlainText, renderTiptapContent } from '../utils/tiptap.js';
import { syncPanelTheme } from './theme.js';

const GENERIC_ERROR = 'Something went wrong — check your API key and try again.';

// Per-card AI chat thread; wiped whenever a new card is displayed.
let chatHistory = [];
let chatBusy = false;

export function toggleChatPanel() {
  const panel = document.getElementById('learning-chat-panel');
  const btn = document.getElementById('content-chat-toggle');
  if (!panel) return;
  const open = panel.classList.toggle('open');
  if (btn) btn.classList.toggle('active', open);
  syncPanelTheme(panel);
  // Hold the card still while the question is being asked; pick the countdown
  // back up (from where it stopped) once the chat closes.
  if (open) {
    pauseContentTimer();
    panel.querySelector('.learning-chat-input')?.focus();
  } else {
    resumeContentTimer();
  }
}

// Wipe the chat thread (called whenever a new card is shown).
export function resetChatThread() {
  chatHistory = [];
  chatBusy = false;
  const messagesEl = document.getElementById('learning-chat-messages');
  if (messagesEl) {
    messagesEl.innerHTML =
      '<div class="learning-chat-empty">Ask anything about the current card</div>';
  }
  const sendBtn = document.getElementById('learning-chat-send');
  if (sendBtn) sendBtn.disabled = false;
}

function appendChatBubble(role, extraClass = '') {
  const messagesEl = document.getElementById('learning-chat-messages');
  if (!messagesEl) return null;
  messagesEl.querySelector('.learning-chat-empty')?.remove();
  const bubble = document.createElement('div');
  bubble.className = `learning-chat-bubble ${role}${extraClass ? ' ' + extraClass : ''}`;
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return bubble;
}

// Drop the failed turn so the API never sees a user message with no reply.
function showChatError(bubble, message) {
  chatHistory.pop();
  bubble.className = 'learning-chat-bubble assistant error';
  bubble.textContent = message;
}

function scrollChatToBottom() {
  const messagesEl = document.getElementById('learning-chat-messages');
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setChatBusy(busy) {
  chatBusy = busy;
  const sendBtn = document.getElementById('learning-chat-send');
  if (sendBtn) sendBtn.disabled = busy;
}

// The chat needs an Anthropic API key in the extension's storage (same one
// auto-answer uses); prompt for it here if it isn't set yet.
async function hasApiKey() {
  try {
    return await ensureApiKey();
  } catch {
    return false;
  }
}

// A reply only belongs on screen if it answers the card still being shown; if
// the card changed while Claude was answering, the thread was already reset.
function isStillCurrent(itemId) {
  return getCurrentItem()?.id === itemId;
}

function openTurn(text) {
  const userBubble = appendChatBubble('user');
  if (userBubble) userBubble.textContent = text;
  chatHistory.push({ role: 'user', content: text });

  const thinkingBubble = appendChatBubble('assistant', 'thinking');
  if (thinkingBubble) thinkingBubble.textContent = 'Thinking…';
  return thinkingBubble;
}

async function requestReply(item, bubble) {
  const res = await sendMessageForResponse({
    action: 'cardChat',
    title: item.title || '',
    body: extractPlainText(item.content),
    messages: chatHistory,
  });
  if (!isStillCurrent(item.id)) return;

  if (res?.success) {
    chatHistory.push({ role: 'assistant', content: res.markdown });
    bubble.className = 'learning-chat-bubble assistant';
    bubble.innerHTML = renderTiptapContent(res.content);
  } else {
    showChatError(bubble, res?.error || GENERIC_ERROR);
  }
  scrollChatToBottom();
}

export async function sendChatMessage() {
  const input = document.getElementById('learning-chat-input');
  const messagesEl = document.getElementById('learning-chat-messages');
  const item = getCurrentItem();
  const text = input?.value.trim();
  if (!text || chatBusy || !item || !messagesEl) return;
  if (!(await hasApiKey())) return;

  input.value = '';
  setChatBusy(true);
  const bubble = openTurn(text);

  try {
    await requestReply(item, bubble);
  } catch {
    if (isStillCurrent(item.id)) showChatError(bubble, GENERIC_ERROR);
  } finally {
    if (isStillCurrent(item.id)) {
      setChatBusy(false);
      input?.focus();
    }
  }
}
