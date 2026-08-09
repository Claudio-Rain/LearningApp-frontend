import { setCurrentItem, setFlipped } from '../state.js';
import { startContentTimer } from '../services/timer.js';
import { makeDraggable, restorePanelPosition, savePanelPosition } from '../utils/drag.js';
import { escapeHtml, extractPlainText, renderTiptapContent } from '../utils/tiptap.js';
import { resetChatThread } from './chatPanel.js';
import { updateMetaDisplay } from './meta.js';
import { clearNotes } from './notesPanel.js';
import { WIDGET_STYLES } from './styles.js';
import {
  ADD_PANEL_TEMPLATE,
  CHAT_PANEL_TEMPLATE,
  NOTES_PANEL_TEMPLATE,
  WIDGET_TEMPLATE,
} from './templates.js';
import { restoreDarkMode } from './theme.js';

function appendPanel(id, className, html) {
  const panel = document.createElement('div');
  panel.id = id;
  if (className) panel.className = className;
  panel.innerHTML = html;
  document.body.appendChild(panel);
  return panel;
}

// Create persistent content display
export function injectContentDisplay() {
  const contentWidget = appendPanel('learning-app-content', '', WIDGET_TEMPLATE);
  const notesPanel = appendPanel(
    'learning-notes-panel',
    'learning-notes-panel',
    NOTES_PANEL_TEMPLATE
  );
  appendPanel('learning-chat-panel', 'learning-chat-panel', CHAT_PANEL_TEMPLATE);
  const addPanel = appendPanel('learning-add-panel', 'learning-add-panel', ADD_PANEL_TEMPLATE);

  const style = document.createElement('style');
  style.textContent = WIDGET_STYLES;
  document.head.appendChild(style);

  const widget = contentWidget.querySelector('.learning-content-widget');
  const header = contentWidget.querySelector('.content-header');
  restorePanelPosition(widget);
  makeDraggable(widget, header, savePanelPosition);
  restoreDarkMode(widget);

  // Scratchpad drags by its header or footer bar; position is ephemeral (not persisted).
  makeDraggable(notesPanel, notesPanel.querySelector('.learning-notes-header'));
  makeDraggable(notesPanel, notesPanel.querySelector('.learning-notes-footer'));

  makeDraggable(addPanel, addPanel.querySelector('.learning-add-panel-header'));

  return contentWidget;
}

function renderAnswer(answerEl, content) {
  const plainText = extractPlainText(content);
  if (!plainText || plainText.trim().length === 0) {
    answerEl.innerHTML = '<p>(No answer)</p>';
    return '0.6';
  }
  // Render answer with Tiptap support for rich content
  try {
    answerEl.innerHTML = renderTiptapContent(content);
  } catch {
    answerEl.innerHTML = `<p>${escapeHtml(plainText)}</p>`;
  }
  return '1';
}

export function updateContentDisplay(item, meta) {
  setCurrentItem(item);
  setFlipped(false);

  // Fresh item — wipe the ephemeral scratchpad and AI chat thread.
  clearNotes();
  resetChatThread();

  updateMetaDisplay(meta);
  startContentTimer();

  const frontQuestionEl = document.getElementById('front-question');
  const answerEl = document.getElementById('content-answer');
  const flashcard = document.getElementById('flashcard');
  const widget = document.querySelector('.learning-content-widget');

  if (!frontQuestionEl || !answerEl || !flashcard || !widget) return;

  frontQuestionEl.textContent = item.title || '';
  const targetOpacity = renderAnswer(answerEl, item.content);

  // Reset flip state
  flashcard.classList.remove('flipped');

  widget.style.opacity = targetOpacity;
}

export function showLoadingState() {
  const flashcard = document.getElementById('flashcard');
  const frontQuestionEl = document.getElementById('front-question');
  const answerEl = document.getElementById('content-answer');
  const widget = document.querySelector('.learning-content-widget');

  if (!flashcard || !widget) return;

  setFlipped(false);
  flashcard.classList.remove('flipped');
  if (frontQuestionEl) frontQuestionEl.textContent = '';
  if (answerEl) answerEl.innerHTML = '';
}

export function toggleFlip() {
  const flashcard = document.getElementById('flashcard');
  if (!flashcard) return;
  flashcard.classList.toggle('flipped');
  setFlipped(flashcard.classList.contains('flipped'));
}
