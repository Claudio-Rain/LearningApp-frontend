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
        <h3 id="content-title">Learning Item</h3>
        <span class="content-side-indicator" id="side-indicator">Question</span>
      </div>
      <div class="flashcard-container" id="flashcard">
        <div class="card-side front">
          <div class="content-body">
            <p id="content-text"></p>
          </div>
        </div>
        <div class="card-side back">
          <div class="content-body">
            <div id="content-answer"></div>
          </div>
        </div>
      </div>
      <div class="content-footer">
        <div class="flip-hint" id="flip-hint">Click to reveal answer</div>
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
      align-items: center;
      border-radius: 12px 12px 0 0;
    }

    .content-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      flex: 1;
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
    }

    .card-side.front {
      opacity: 1;
      z-index: 2;
      justify-content: center;
    }

    .card-side.back {
      opacity: 0;
      z-index: 1;
      justify-content: flex-start;
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
    }

    .content-body p {
      margin: 0 0 12px 0;
      font-size: 15px;
      line-height: 1.6;
      color: #1f2937;
    }

    .content-body div {
      font-size: 15px;
      line-height: 1.6;
      color: #1f2937;
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
      font-family: monospace;
      font-size: 0.9em;
    }

    .content-body pre {
      background: #1f2937;
      color: #f3f4f6;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 12px 0;
    }

    .content-body pre code {
      background: none;
      padding: 0;
      color: inherit;
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
    }

    .content-body table td, .content-body table th {
      border: 1px solid #d1d5db;
      padding: 8px;
    }

    .content-body table th {
      background: #f3f4f6;
      font-weight: 600;
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

    .flip-hint {
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
      transition: opacity 0.3s ease;
    }

    .flashcard-container.flipped ~ .content-footer .flip-hint {
      opacity: 0;
      pointer-events: none;
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

function updateContentDisplay(item) {
  currentItem = item;
  isFlipped = false;

  const titleEl = document.getElementById('content-title');
  const questionEl = document.getElementById('content-text');
  const answerEl = document.getElementById('content-answer');
  const flashcard = document.getElementById('flashcard');
  const sideIndicator = document.getElementById('side-indicator');
  const widget = document.querySelector('.learning-content-widget');

  if (!titleEl || !questionEl || !answerEl || !flashcard || !widget) return;

  titleEl.textContent = item.title || 'Learning Item';

  // Render answer with Tiptap support for rich content
  const plainText = extractPlainText(item.content);

  if (!plainText || plainText.trim().length === 0) {
    answerEl.innerHTML = '<p>(No answer)</p>';
    widget.style.opacity = '0.6';
  } else {
    // Render answer with Tiptap support for rich content
    try {
      const renderedHTML = renderTiptapContent(item.content);
      answerEl.innerHTML = renderedHTML;
    } catch (error) {
      console.error('[content] Error rendering content:', error);
      answerEl.innerHTML = `<p>${escapeHtml(plainText)}</p>`;
    }
    widget.style.opacity = '1';
  }

  // Reset flip state
  flashcard.classList.remove('flipped');
  sideIndicator.textContent = 'Question';

  // Animate transition
  widget.style.opacity = '0.7';
  setTimeout(() => {
    widget.style.opacity = '1';
  }, 100);
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
  if (request.action === 'showQuestion') {
    currentNotificationId = request.notificationId;
    showQuestion(request.item);
    sendResponse({ success: true });
  } else if (request.action === 'hideQuestion') {
    hideModal();
    sendResponse({ success: true });
  } else if (request.action === 'updateContent') {
    updateContentDisplay(request.item);
    sendResponse({ success: true });
  }
});

// Inyectar content display al cargar la página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectContentDisplay();
  });
} else {
  injectContentDisplay();
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
    console.log('[content] Keyboard rating:', { key: e.key, score });

    // Send rating without waiting for response
    chrome.runtime.sendMessage({
      action: 'recordRating',
      score: score
    });

    // Reset UI for next item
    const widget = document.querySelector('.learning-content-widget');
    if (widget) {
      widget.style.opacity = '0.8';
    }
  }
}

// Click listeners
document.addEventListener('click', (e) => {
  // Flashcard flip
  if (e.target.closest('#flashcard')) {
    toggleFlip();
  }
  // Modal controls
  else if (e.target.id === 'modal-close') {
    hideModal();
    chrome.runtime.sendMessage({ action: 'questionClosed' });
  } else if (e.target.id === 'modal-review-later') {
    hideModal();
    chrome.runtime.sendMessage({ action: 'buttonClicked', buttonIndex: 0, notificationId: currentNotificationId });
  } else if (e.target.id === 'modal-correct') {
    hideModal();
    chrome.runtime.sendMessage({ action: 'buttonClicked', buttonIndex: 1, notificationId: currentNotificationId });
  }
  // Content rating buttons (fire-and-forget)
  else if (e.target.classList.contains('content-rating-btn')) {
    const score = parseFloat(e.target.getAttribute('data-score'));
    console.log('[content] Rating button clicked:', e.target.getAttribute('title'), 'Score:', score);

    // Send rating without waiting for response (fire-and-forget)
    chrome.runtime.sendMessage({
      action: 'recordRating',
      score: score
    });

    // Immediately reset UI for next item
    setTimeout(() => {
      const widget = document.querySelector('.learning-content-widget');
      if (widget) {
        widget.style.opacity = '0.8';
      }
    }, 50);
  }
});

document.addEventListener('keydown', handleKeydown);
