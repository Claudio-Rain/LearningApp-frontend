// Simple Tiptap JSON to HTML renderer
function renderTiptapContent(node, isQuestion = false) {
  if (!node) return '';
  if (typeof node === 'string') return escapeHtml(node);

  // Handle text nodes
  if (node.type === 'text') {
    let text = escapeHtml(node.text || '');
    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold':
            text = `<strong>${text}</strong>`;
            break;
          case 'italic':
            text = `<em>${text}</em>`;
            break;
          case 'underline':
            text = `<u>${text}</u>`;
            break;
          case 'code':
            text = `<code>${text}</code>`;
            break;
          case 'highlight':
            text = `<mark>${text}</mark>`;
            break;
          case 'textStyle':
            if (mark.attrs?.color) {
              text = `<span style="color: ${mark.attrs.color}">${text}</span>`;
            }
            break;
        }
      }
    }
    return text;
  }

  // Handle block nodes
  const content = node.content ? node.content.map(child => renderTiptapContent(child)).join('') : '';

  switch (node.type) {
    case 'doc':
      return content;
    case 'paragraph':
      return `<p>${content}</p>`;
    case 'heading':
      const level = node.attrs?.level || 1;
      return `<h${level}>${content}</h${level}>`;
    case 'bulletList':
      return `<ul>${content}</ul>`;
    case 'orderedList':
      return `<ol>${content}</ol>`;
    case 'listItem':
      return `<li>${content}</li>`;
    case 'codeBlock':
      return `<pre><code>${content}</code></pre>`;
    case 'blockquote':
      return `<blockquote>${content}</blockquote>`;
    case 'horizontalRule':
      return '<hr/>';
    case 'hardBreak':
      return '<br/>';
    case 'image':
      return `<img src="${escapeHtml(node.attrs?.src || '')}" alt="${escapeHtml(node.attrs?.alt || '')}" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;">`;
    case 'table':
      return `<table>${content}</table>`;
    case 'tableRow':
      return `<tr>${content}</tr>`;
    case 'tableHeader':
      return `<th>${content}</th>`;
    case 'tableCell':
      return `<td>${content}</td>`;
    default:
      return content;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Create persistent content display
function injectContentDisplay() {
  const contentWidget = document.createElement('div');
  contentWidget.id = 'learning-app-content';
  contentWidget.innerHTML = `
    <div class="learning-content-widget">
      <div class="content-header">
        <div class="content-header-main">
          <h3 id="content-title">Learning Item</h3>
          <div class="content-subtitle">
            <span class="content-counter" id="content-counter">0 / 0</span>
            <span class="content-stat-badge content-new-badge" id="content-new-badge">New: 0</span>
            <span class="content-stat-badge content-revised-badge" id="content-revised-badge">Revised: 0</span>
            <span class="content-strength-badge" id="content-strength-badge" style="display: none;"></span>
          </div>
        </div>
        <div class="content-header-actions">
          <span class="content-side-indicator" id="side-indicator">Question</span>
          <button class="content-delete-btn" id="content-delete" title="Delete item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </div>
      <div class="content-timer" id="content-timer">
        <div class="content-timer-bar-bg">
          <div class="content-timer-bar-fill" id="content-timer-fill"></div>
        </div>
        <div class="content-timer-label" id="content-timer-label">3:00</div>
      </div>
      <div class="flashcard-container" id="flashcard">
        <div class="card-side front">
          <h2 id="front-question" class="front-question"></h2>
        </div>
        <div class="card-side back">
          <div class="content-body">
            <div id="content-answer"></div>
          </div>
        </div>
      </div>
      <div class="content-footer">
        <div class="content-rating-buttons" id="rating-buttons">
          <button class="content-rating-btn btn-very-hard" data-score="-0.15" title="Very Hard">✕</button>
          <button class="content-rating-btn btn-hard" data-score="-0.10" title="Hard">−</button>
          <button class="content-rating-btn btn-good" data-score="0.10" title="Good">✓</button>
          <button class="content-rating-btn btn-easy" data-score="0.15" title="Easy">★</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(contentWidget);

  const style = document.createElement('style');
  style.textContent = `
    #learning-app-content {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      all: initial;
    }

    .learning-content-widget {
      position: fixed;
      bottom: auto;
      top: 20px;
      right: 20px;
      background: white;
      border-radius: 12px;
      width: 480px;
      max-height: 90vh;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      transition: all 0.2s ease;
    }

    .content-header {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      border-radius: 12px 12px 0 0;
    }

    .content-header-main {
      min-width: 0;
      flex: 1;
    }

    .content-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .content-subtitle {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .content-counter {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      font-variant-numeric: tabular-nums;
    }

    .content-stat-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      transition: box-shadow 0.3s ease;
    }

    .content-new-badge {
      background-color: rgba(33, 150, 243, 0.15);
      color: #1976d2;
    }

    .content-revised-badge {
      background-color: rgba(76, 175, 80, 0.15);
      color: #388e3c;
    }

    .content-stat-badge.glowing {
      box-shadow: inset 0 0 0 2px currentColor;
      font-weight: 700;
    }

    .content-strength-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .content-strength-badge.strength-weak {
      background: rgba(244, 67, 54, 0.15);
      color: #d32f2f;
    }

    .content-strength-badge.strength-fair {
      background: rgba(255, 152, 0, 0.15);
      color: #e65100;
    }

    .content-strength-badge.strength-good {
      background: rgba(76, 175, 80, 0.15);
      color: #2e7d32;
    }

    .content-strength-badge.strength-mastered {
      background: rgba(156, 39, 176, 0.15);
      color: #6a1b9a;
    }

    .content-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .content-delete-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #ef4444;
      cursor: pointer;
      transition: background 0.2s;
      font-family: inherit;
    }

    .content-delete-btn:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    .content-timer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-bottom: 1px solid #e5e7eb;
      background: #fafbfc;
    }

    .content-timer-bar-bg {
      flex: 1;
      height: 6px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .content-timer-bar-fill {
      height: 100%;
      width: 100%;
      background: #4caf50;
      border-radius: 3px;
      transition: width 1s linear, background 0.5s;
    }

    .content-timer-bar-fill.timer-low {
      background: #f44336;
    }

    .content-timer-label {
      font-size: 12px;
      color: #6b7280;
      font-variant-numeric: tabular-nums;
      font-weight: 500;
      transition: color 0.5s;
    }

    .content-timer-label.timer-label-low {
      color: #f44336;
      font-weight: 700;
    }

    .content-side-indicator {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: rgba(0, 0, 0, 0.05);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .flashcard-container {
      position: relative;
      width: 100%;
      flex: 1;
      min-height: 300px;
      cursor: pointer;
    }

    .card-side {
      position: absolute;
      width: 100%;
      height: 100%;
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      backface-visibility: hidden;
      transition: opacity 0.3s ease;
      overflow-y: auto;
      overflow-x: hidden;
      box-sizing: border-box;
    }

    .card-side.front {
      opacity: 1;
      z-index: 2;
      justify-content: center;
      align-items: center;
    }

    .card-side.back {
      opacity: 0;
      z-index: 1;
      justify-content: flex-start;
    }

    .front-question {
      margin: 0;
      font-size: clamp(1.5rem, 4vw, 2.5rem);
      font-weight: 700;
      color: #111827;
      text-align: center;
      line-height: 1.4;
      user-select: none;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .flashcard-container.flipped .card-side.front {
      opacity: 0;
      z-index: 1;
    }

    .flashcard-container.flipped .card-side.back {
      opacity: 1;
      z-index: 2;
    }

    .content-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      width: 100%;
      box-sizing: border-box;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: break-word;
    }

    .content-body p {
      margin: 0 0 12px 0;
      font-size: 15px;
      line-height: 1.6;
      color: #1f2937;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .content-body div {
      font-size: 15px;
      line-height: 1.6;
      color: #1f2937;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    /* Tiptap rendered content styles */
    .content-body .ProseMirror {
      outline: none;
      padding: 0;
    }

    .content-body h1, .content-body h2, .content-body h3, .content-body h4, .content-body h5, .content-body h6 {
      margin: 16px 0 8px 0;
      font-weight: 600;
      color: #111827;
    }

    .content-body h1 { font-size: 1.4em; }
    .content-body h2 { font-size: 1.3em; }
    .content-body h3 { font-size: 1.2em; }

    .content-body ul, .content-body ol {
      margin: 12px 0;
      padding-left: 24px;
    }

    .content-body li {
      margin: 4px 0;
    }

    .content-body code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .content-body pre {
      background: #1f2937;
      color: #f3f4f6;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      overflow-y: auto;
      margin: 12px 0;
      width: 100%;
      box-sizing: border-box;
      max-width: 100%;
    }

    .content-body pre code {
      background: none;
      padding: 0;
      color: inherit;
      word-wrap: normal;
    }

    .content-body blockquote {
      border-left: 3px solid #3b82f6;
      padding-left: 12px;
      margin: 12px 0;
      color: #6b7280;
      font-style: italic;
    }

    .content-body table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
      box-sizing: border-box;
      font-size: 0.95em;
    }

    .content-body table td, .content-body table th {
      border: 1px solid #d1d5db;
      padding: 8px;
      box-sizing: border-box;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .content-body table th {
      background: #f3f4f6;
      font-weight: 600;
    }

    .content-body img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 12px 0;
      display: block;
    }

    .content-footer {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      background: #fafbfc;
      border-radius: 0 0 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .content-rating-buttons {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .content-rating-btn {
      padding: 8px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      color: white;
      font-family: inherit;
      opacity: 0;
      pointer-events: none;
    }

    .flashcard-container.flipped ~ .content-footer .content-rating-btn {
      opacity: 1;
      pointer-events: auto;
    }

    .btn-very-hard {
      background: #ef4444;
    }

    .btn-very-hard:hover {
      background: #dc2626;
    }

    .btn-hard {
      background: #f97316;
    }

    .btn-hard:hover {
      background: #ea580c;
    }

    .btn-good {
      background: #3b82f6;
    }

    .btn-good:hover {
      background: #2563eb;
    }

    .btn-easy {
      background: #22c55e;
    }

    .btn-easy:hover {
      background: #16a34a;
    }

    .content-rating-btn:active {
      transform: scale(0.95);
    }
  `;

  document.head.appendChild(style);

  return contentWidget;
}

// Inyectar el modal cuando se carga el content script
function injectModal() {
  // Crear contenedor del modal
  const modal = document.createElement('div');
  modal.id = 'learning-app-modal';
  modal.innerHTML = `
    <div class="learning-modal-overlay">
      <div class="learning-modal-container">
        <div class="learning-modal-header">
          <h2 id="modal-title">Study Question</h2>
          <button class="modal-close-btn" id="modal-close">&times;</button>
        </div>

        <div class="learning-modal-content">
          <div id="modal-question" class="modal-question"></div>
        </div>

        <div class="learning-modal-footer">
          <button id="modal-review-later" class="modal-btn modal-btn-secondary">
            Review Later
          </button>
          <button id="modal-correct" class="modal-btn modal-btn-primary">
            Answered Correctly
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Inyectar CSS
  const style = document.createElement('style');
  style.textContent = `
    #learning-app-modal {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      all: initial;
    }

    .learning-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .learning-modal-container {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 700px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .learning-modal-header {
      padding: 24px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .learning-modal-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #111827;
    }

    .modal-close-btn {
      background: none;
      border: none;
      font-size: 28px;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .modal-close-btn:hover {
      color: #111827;
    }

    .learning-modal-content {
      flex: 1;
      padding: 32px;
      overflow-y: auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-question {
      font-size: 18px;
      line-height: 1.6;
      color: #374151;
      text-align: center;
      word-wrap: break-word;
    }

    .learning-modal-footer {
      padding: 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .modal-btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }

    .modal-btn-primary {
      background: #3b82f6;
      color: white;
    }

    .modal-btn-primary:hover {
      background: #2563eb;
    }

    .modal-btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }

    .modal-btn-secondary:hover {
      background: #d1d5db;
    }

    .learning-modal-overlay.hidden {
      display: none;
    }
  `;

  document.head.appendChild(style);

  return modal;
}

// Ocultar el modal
function hideModal() {
  const overlay = document.querySelector('.learning-modal-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

// Mostrar el modal con una pregunta
function showQuestion(item) {
  const overlay = document.querySelector('.learning-modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const questionEl = document.getElementById('modal-question');

  if (overlay && titleEl && questionEl) {
    titleEl.textContent = item.title || 'Study Question';

    // Extraer texto plano del contenido
    const plainText = extractPlainText(item.content);
    questionEl.textContent = plainText;

    overlay.classList.remove('hidden');
  }
}

// Función para extraer texto plano (igual que en background.js)
function extractPlainText(node, separator = '\n') {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (!node.content?.length) return '';

  const blockTypes = new Set(['paragraph', 'heading', 'blockquote', 'listItem', 'bulletList', 'orderedList', 'codeBlock']);
  const parts = node.content.map(child => extractPlainText(child, separator));
  return blockTypes.has(node.type)
    ? parts.join('').trim()
    : parts.join(separator);
}

// State management
let currentNotificationId = null;
let currentItem = null;
let isFlipped = false;

// Timer (mirrors Study View: 3-minute countdown, resets on each new item)
const TIMER_DURATION = 180;
let contentTimeLeft = TIMER_DURATION;
let contentTimerInterval = null;

function updateTimerDisplay() {
  const fill = document.getElementById('content-timer-fill');
  const label = document.getElementById('content-timer-label');
  const low = contentTimeLeft <= 30;
  if (fill) {
    fill.style.width = (contentTimeLeft / TIMER_DURATION * 100) + '%';
    fill.classList.toggle('timer-low', low);
  }
  if (label) {
    label.textContent = `${Math.floor(contentTimeLeft / 60)}:${String(contentTimeLeft % 60).padStart(2, '0')}`;
    label.classList.toggle('timer-label-low', low);
  }
}

function clearContentTimer() {
  if (contentTimerInterval) {
    clearInterval(contentTimerInterval);
    contentTimerInterval = null;
  }
}

function startContentTimer() {
  clearContentTimer();
  contentTimeLeft = TIMER_DURATION;
  updateTimerDisplay();
  contentTimerInterval = setInterval(() => {
    if (contentTimeLeft > 0) {
      contentTimeLeft--;
      updateTimerDisplay();
    } else {
      clearContentTimer();
    }
  }, 1000);
}

function strengthInfo(score) {
  if (score < 0.25) return { label: 'Weak', cls: 'strength-weak' };
  if (score < 0.5) return { label: 'Fair', cls: 'strength-fair' };
  if (score < 0.75) return { label: 'Good', cls: 'strength-good' };
  return { label: 'Mastered', cls: 'strength-mastered' };
}

function updateMetaDisplay(meta) {
  if (!meta) return;
  const counter = document.getElementById('content-counter');
  const newBadge = document.getElementById('content-new-badge');
  const revisedBadge = document.getElementById('content-revised-badge');
  const strengthBadge = document.getElementById('content-strength-badge');

  if (counter) counter.textContent = `${meta.sessionIndex + 1} / ${meta.sessionTotal}`;
  if (newBadge) {
    newBadge.textContent = `New: ${meta.newCards}`;
    newBadge.classList.toggle('glowing', !!meta.isNew);
  }
  if (revisedBadge) {
    revisedBadge.textContent = `Revised: ${meta.revisedCards}`;
    revisedBadge.classList.toggle('glowing', !meta.isNew);
  }
  if (strengthBadge) {
    if (meta.isNew || meta.strengthScore == null) {
      strengthBadge.style.display = 'none';
    } else {
      const { label, cls } = strengthInfo(meta.strengthScore);
      strengthBadge.textContent = label;
      strengthBadge.className = `content-strength-badge ${cls}`;
      strengthBadge.style.display = 'inline-block';
    }
  }
}

// Safe message sender that handles context invalidation
function sendMessageSafely(message) {
  try {
    chrome.runtime.sendMessage(message).catch((error) => {
      if (error?.message?.includes('context invalidated')) {
        console.warn('[content] Extension context invalidated, message not sent:', message.action);
      } else {
        console.error('[content] Error sending message:', error);
      }
    });
  } catch (error) {
    if (error?.message?.includes('context invalidated')) {
      console.warn('[content] Extension context invalidated, message not sent:', message.action);
    } else {
      console.error('[content] Error sending message:', error);
    }
  }
}

function updateContentDisplay(item, meta) {
  currentItem = item;
  isFlipped = false;

  updateMetaDisplay(meta);
  startContentTimer();

  const titleEl = document.getElementById('content-title');
  const frontQuestionEl = document.getElementById('front-question');
  const answerEl = document.getElementById('content-answer');
  const flashcard = document.getElementById('flashcard');
  const sideIndicator = document.getElementById('side-indicator');
  const widget = document.querySelector('.learning-content-widget');

  if (!titleEl || !frontQuestionEl || !answerEl || !flashcard || !widget) return;

  titleEl.textContent = item.title || 'Learning Item';
  frontQuestionEl.textContent = item.title || 'Question';

  // Render answer with Tiptap support for rich content
  const plainText = extractPlainText(item.content);

  let targetOpacity = '1';
  if (!plainText || plainText.trim().length === 0) {
    answerEl.innerHTML = '<p>(No answer)</p>';
    targetOpacity = '0.6';
  } else {
    // Render answer with Tiptap support for rich content
    try {
      const renderedHTML = renderTiptapContent(item.content);
      answerEl.innerHTML = renderedHTML;
    } catch {
      answerEl.innerHTML = `<p>${escapeHtml(plainText)}</p>`;
    }
  }

  // Reset flip state
  flashcard.classList.remove('flipped');
  sideIndicator.textContent = 'Question';

  // Animate transition, settling on the target opacity for this item
  widget.style.opacity = '0.7';
  setTimeout(() => {
    widget.style.opacity = targetOpacity;
  }, 100);
}

function showLoadingState() {
  const flashcard = document.getElementById('flashcard');
  const sideIndicator = document.getElementById('side-indicator');
  const frontQuestionEl = document.getElementById('front-question');
  const answerEl = document.getElementById('content-answer');
  const titleEl = document.getElementById('content-title');
  const widget = document.querySelector('.learning-content-widget');

  if (!flashcard || !widget) return;

  isFlipped = false;
  flashcard.classList.remove('flipped');
  if (sideIndicator) sideIndicator.textContent = 'Question';
  if (titleEl) titleEl.textContent = '...';
  if (frontQuestionEl) frontQuestionEl.textContent = '';
  if (answerEl) answerEl.innerHTML = '';
  widget.style.opacity = '0.5';
}

function toggleFlip() {
  const flashcard = document.getElementById('flashcard');
  const sideIndicator = document.getElementById('side-indicator');

  if (!flashcard) return;

  isFlipped = !isFlipped;
  flashcard.classList.toggle('flipped');
  sideIndicator.textContent = isFlipped ? 'Answer' : 'Question';
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  try {
    if (request.action === 'showQuestion') {
      currentNotificationId = request.notificationId;
      showQuestion(request.item);
      sendResponse({ success: true });
    } else if (request.action === 'hideQuestion') {
      hideModal();
      sendResponse({ success: true });
    } else if (request.action === 'updateContent') {
      updateContentDisplay(request.item, request.meta);
      sendResponse({ success: true });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
});

// Inyectar content display al cargar la página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectContentDisplay();
    injectModal();
  });
} else {
  injectContentDisplay();
  injectModal();
}

// Keyboard shortcuts
function handleKeydown(e) {
  // Space or Enter to flip
  if ((e.key === ' ' || e.key === 'Enter') && e.target.closest('#learning-app-content')) {
    e.preventDefault();
    toggleFlip();
  }
  // Number keys for rating when flipped
  else if (isFlipped && /^[1-4]$/.test(e.key) && e.target.closest('#learning-app-content')) {
    const scores = { '1': -0.15, '2': -0.10, '3': 0.10, '4': 0.15 };
    const score = scores[e.key];
    showLoadingState();
    sendMessageSafely({
      action: 'recordRating',
      score: score
    });
  }
}

// Click listeners
document.addEventListener('click', (e) => {
  // Delete current item
  if (e.target.closest('#content-delete')) {
    e.stopPropagation();
    if (confirm('Delete this item permanently? Its progress and attempt history will be removed.')) {
      showLoadingState();
      sendMessageSafely({ action: 'deleteContentItem' });
    }
    return;
  }
  // Flashcard flip
  if (e.target.closest('#flashcard')) {
    toggleFlip();
  }
  // Modal controls
  else if (e.target.id === 'modal-close') {
    hideModal();
    sendMessageSafely({ action: 'questionClosed' });
  } else if (e.target.id === 'modal-review-later') {
    hideModal();
    sendMessageSafely({ action: 'buttonClicked', buttonIndex: 0, notificationId: currentNotificationId });
  } else if (e.target.id === 'modal-correct') {
    hideModal();
    sendMessageSafely({ action: 'buttonClicked', buttonIndex: 1, notificationId: currentNotificationId });
  }
  // Content rating buttons (fire-and-forget)
  else if (e.target.classList.contains('content-rating-btn')) {
    const score = parseFloat(e.target.getAttribute('data-score'));
    showLoadingState();
    sendMessageSafely({
      action: 'recordRating',
      score: score
    });
  }
});

document.addEventListener('keydown', handleKeydown);
