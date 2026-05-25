// Create persistent content display
function injectContentDisplay() {
  const contentWidget = document.createElement('div');
  contentWidget.id = 'learning-app-content';
  contentWidget.innerHTML = `
    <div class="learning-content-widget">
      <div class="content-header">
        <h3 id="content-title">Learning Item</h3>
      </div>
      <div class="content-body">
        <p id="content-text"></p>
      </div>
      <div class="content-rating-buttons">
        <button class="content-rating-btn btn-very-hard" data-score="-0.15" title="Very Hard">✕</button>
        <button class="content-rating-btn btn-hard" data-score="-0.10" title="Hard">−</button>
        <button class="content-rating-btn btn-good" data-score="0.10" title="Good">✓</button>
        <button class="content-rating-btn btn-easy" data-score="0.15" title="Easy">★</button>
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
      border-radius: 8px;
      width: 300px;
      max-height: 200px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      transition: all 0.2s ease;
    }

    .learning-content-widget:hover {
      max-height: 280px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    }

    .content-header {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .content-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }

    .content-body {
      padding: 12px 16px;
      overflow-y: auto;
      flex: 1;
    }

    .content-body p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: #374151;
    }

    .content-rating-buttons {
      display: none;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      background: #fafbfc;
    }

    .learning-content-widget:hover .content-rating-buttons {
      display: grid;
    }

    .content-rating-btn {
      padding: 8px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      color: white;
      font-family: inherit;
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

// Escuchar mensajes del background script
let currentNotificationId = null;

function updateContentDisplay(item) {
  const titleEl = document.getElementById('content-title');
  const textEl = document.getElementById('content-text');
  const widget = document.querySelector('.learning-content-widget');

  if (titleEl && textEl && widget) {
    titleEl.textContent = item.title || 'Learning Item';
    const plainText = extractPlainText(item.content);

    if (!plainText || plainText.trim().length === 0) {
      textEl.textContent = '(No content available)';
      widget.style.opacity = '0.6';
    } else {
      textEl.textContent = plainText;
      widget.style.opacity = '1';
    }
  }
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

// Event listeners para los botones
document.addEventListener('click', (e) => {
  if (e.target.id === 'modal-close') {
    hideModal();
    chrome.runtime.sendMessage({ action: 'questionClosed' });
  } else if (e.target.id === 'modal-review-later') {
    hideModal();
    chrome.runtime.sendMessage({ action: 'buttonClicked', buttonIndex: 0, notificationId: currentNotificationId });
  } else if (e.target.id === 'modal-correct') {
    hideModal();
    chrome.runtime.sendMessage({ action: 'buttonClicked', buttonIndex: 1, notificationId: currentNotificationId });
  } else if (e.target.classList.contains('content-rating-btn')) {
    const score = parseFloat(e.target.getAttribute('data-score'));
    console.log('[content] Rating button clicked:', e.target.getAttribute('title'), 'Score:', score);
    chrome.runtime.sendMessage({
      action: 'recordRating',
      score: score
    }, (response) => {
      console.log('[content] Rating recorded:', { score, response });
    });
  }
});
