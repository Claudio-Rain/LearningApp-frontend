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
          <div class="content-subtitle">
            <div class="content-counter-nav">
              <button class="content-nav-btn" id="content-nav-prev" title="Previous card">&#8249;</button>
              <input class="content-counter-input" id="content-counter-input" type="number" value="1" min="1" max="1">
              <span class="content-counter-sep">/</span>
              <span class="content-counter-total" id="content-counter-total">0</span>
              <button class="content-nav-btn" id="content-nav-next" title="Next card">&#8250;</button>
            </div>
            <span class="content-stat-badge content-new-badge" id="content-new-badge">New: 0</span>
            <span class="content-stat-badge content-revised-badge" id="content-revised-badge">Revised: 0</span>
            <span class="content-strength-badge" id="content-strength-badge" style="display: none;"></span>
          </div>
        </div>
        <div class="content-header-actions">
          <button class="content-notes-btn" id="content-notes-toggle" title="Scratchpad notes">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 4a2 2 0 0 1 2-2h9l6 6v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4zm10 0v5h5l-5-5zM7 13h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>
          </button>
          <button class="content-theme-btn" id="content-theme-toggle" title="Toggle dark mode">
            <svg class="theme-icon-moon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-5.4-5.4c0-1.81.89-3.41 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>
            <svg class="theme-icon-sun" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 17a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1zM3 11h2a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2zm16 0h2a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2zM5.64 5.64a1 1 0 0 1 1.42 0l1.41 1.41a1 1 0 0 1-1.41 1.42L5.64 7.05a1 1 0 0 1 0-1.41zm9.9 9.9a1 1 0 0 1 1.41 0l1.41 1.41a1 1 0 0 1-1.41 1.42l-1.41-1.42a1 1 0 0 1 0-1.41zm2.82-9.9a1 1 0 0 1 0 1.41l-1.41 1.42a1 1 0 1 1-1.42-1.42l1.42-1.41a1 1 0 0 1 1.41 0zm-9.9 9.9a1 1 0 0 1 0 1.41l-1.41 1.42a1 1 0 0 1-1.42-1.42l1.41-1.41a1 1 0 0 1 1.42 0z"/></svg>
          </button>
          <button class="content-exclude-btn" id="content-exclude" title="Exclude item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2 5.27 3.28 4 20 20.72 18.73 22l-3.08-3.08A10 10 0 0 1 12 20c-5 0-9.27-3.11-11-7.5a11.1 11.1 0 0 1 3.17-4.61L2 5.27zM12 4c5 0 9.27 3.11 11 7.5a11.2 11.2 0 0 1-2.34 3.81L15.5 10.16A4 4 0 0 0 9.83 4.5L7.97 2.64A9.9 9.9 0 0 1 12 4zm-4 7.5a4 4 0 0 0 4.45 3.97L8.6 11.06A4 4 0 0 0 8 11.5z"/></svg>
          </button>
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
          <div class="front-question-wrapper">
            <h2 id="front-question" class="front-question"></h2>
          </div>
        </div>
        <div class="card-side back">
          <div class="content-body">
            <div id="content-answer"></div>
          </div>
        </div>
      </div>
      <div class="content-footer">
        <div class="content-footer-row">
          <div class="content-rating-buttons" id="rating-buttons">
            <button class="content-rating-btn btn-very-hard" data-score="-0.15" title="Very Hard">✕</button>
            <button class="content-rating-btn btn-hard" data-score="-0.10" title="Hard">−</button>
            <button class="content-rating-btn btn-good" data-score="0.10" title="Good">✓</button>
            <button class="content-rating-btn btn-easy" data-score="0.15" title="Easy">★</button>
          </div>
          <button class="content-edit-btn" id="content-edit" title="Edit this item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(contentWidget);

  // Standalone scratchpad panel (ephemeral — nothing is persisted).
  const notesPanel = document.createElement('div');
  notesPanel.id = 'learning-notes-panel';
  notesPanel.className = 'learning-notes-panel';
  notesPanel.innerHTML = `
    <div class="learning-notes-header">
      <span>Notes</span>
      <button class="learning-notes-close" id="learning-notes-close" title="Close notes">&times;</button>
    </div>
    <textarea class="learning-notes-textarea" placeholder="Jot something down…"></textarea>
    <div class="learning-notes-footer"></div>
  `;
  document.body.appendChild(notesPanel);

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
      cursor: grab;
      user-select: none;
    }

    .content-header.dragging {
      cursor: grabbing;
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

    .content-counter-nav {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .content-nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      font-size: 17px;
      font-weight: 300;
      line-height: 1;
      transition: background 0.2s, color 0.2s;
      font-family: inherit;
    }

    .content-nav-btn:hover {
      background: rgba(0, 0, 0, 0.06);
      color: #374151;
    }

    .content-counter-input {
      width: 32px;
      border: 1px solid transparent;
      border-radius: 4px;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      font-variant-numeric: tabular-nums;
      background: transparent;
      padding: 1px 2px;
      font-family: inherit;
      -moz-appearance: textfield;
    }

    .content-counter-input::-webkit-outer-spin-button,
    .content-counter-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .content-counter-input:hover,
    .content-counter-input:focus {
      border-color: #d1d5db;
      outline: none;
      background: white;
    }

    .content-counter-sep,
    .content-counter-total {
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

    .content-exclude-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #f59e0b;
      cursor: pointer;
      transition: background 0.2s;
      font-family: inherit;
    }

    .content-exclude-btn:hover {
      background: rgba(245, 158, 11, 0.1);
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

    .content-theme-btn, .content-notes-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
      font-family: inherit;
    }

    .content-notes-btn {
      color: #7c3aed;
    }

    .content-theme-btn:hover, .content-notes-btn:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    .content-notes-btn.active {
      background: rgba(59, 130, 246, 0.12);
      color: #2563eb;
    }

    .learning-notes-panel {
      position: fixed;
      top: 20px;
      right: 516px;
      z-index: 999997;
      display: none;
      flex-direction: column;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .learning-notes-panel.open {
      display: flex;
    }

    .learning-notes-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      user-select: none;
      cursor: grab;
    }

    .learning-notes-header.dragging {
      cursor: grabbing;
    }

    .learning-notes-close {
      border: none;
      background: transparent;
      color: #9ca3af;
      font-size: 18px;
      line-height: 1;
      padding: 0 2px;
      cursor: pointer;
      border-radius: 4px;
    }

    .learning-notes-close:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .learning-notes-footer {
      height: 14px;
      flex-shrink: 0;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      user-select: none;
      cursor: grab;
    }

    .learning-notes-footer.dragging {
      cursor: grabbing;
    }

    .learning-notes-textarea {
      width: 240px;
      height: 180px;
      min-width: 160px;
      min-height: 100px;
      max-width: 70vw;
      max-height: 70vh;
      resize: both;
      border: none;
      outline: none;
      padding: 12px;
      font-size: 15px;
      line-height: 1.5;
      color: #1f2937;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-sizing: border-box;
      display: block;
    }

    .learning-notes-textarea::placeholder {
      color: #9ca3af;
    }

    .learning-notes-panel.dark {
      background: #1e1e2e;
      border-color: #313244;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .learning-notes-panel.dark .learning-notes-header {
      background: #181825;
      border-bottom-color: #313244;
      color: #9ca3af;
    }

    .learning-notes-panel.dark .learning-notes-footer {
      background: #181825;
      border-top-color: #313244;
    }

    .learning-notes-panel.dark .learning-notes-textarea {
      background: #1e1e2e;
      color: #d1d5db;
    }

    .learning-notes-panel.dark .learning-notes-textarea::placeholder {
      color: #6b7280;
    }

    .content-theme-btn .theme-icon-sun {
      display: none;
    }

    .learning-content-widget.dark .content-theme-btn {
      color: #fbbf24;
    }

    .learning-content-widget.dark .content-theme-btn:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .learning-content-widget.dark .content-theme-btn .theme-icon-moon {
      display: none;
    }

    .learning-content-widget.dark .content-theme-btn .theme-icon-sun {
      display: block;
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
      align-items: stretch;
    }

    .front-question-wrapper {
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
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

    .content-body mark {
      background-color: #fde68a !important;
      color: #1a1a1a !important;
      border-radius: 2px;
      padding: 0 2px;
    }

    .content-footer {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      background: #fafbfc;
      border-radius: 0 0 12px 12px;
    }

    .content-footer-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .content-footer-row .content-rating-buttons {
      flex: 1;
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

    .content-edit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
      font-family: inherit;
    }

    .content-edit-btn:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    /* ---- Dark mode ---- */
    .learning-content-widget.dark {
      background: #1e1e2e;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .learning-content-widget.dark .content-header {
      background: #181825;
      border-bottom-color: #313244;
    }

    .learning-content-widget.dark .content-header h3 {
      color: #f3f4f6;
    }

    .learning-content-widget.dark .content-counter-input,
    .learning-content-widget.dark .content-counter-sep,
    .learning-content-widget.dark .content-counter-total {
      color: #9ca3af;
    }

    .learning-content-widget.dark .content-counter-input:hover,
    .learning-content-widget.dark .content-counter-input:focus {
      border-color: #4b5563;
      background: #1e1e2e;
    }

    .learning-content-widget.dark .content-nav-btn {
      color: #9ca3af;
    }

    .learning-content-widget.dark .content-nav-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #d1d5db;
    }

    .learning-content-widget.dark .content-timer {
      background: #181825;
      border-bottom-color: #313244;
    }

    .learning-content-widget.dark .content-timer-bar-bg {
      background: rgba(255, 255, 255, 0.1);
    }

    .learning-content-widget.dark .content-timer-label {
      color: #9ca3af;
    }

    .learning-content-widget.dark .front-question {
      color: #f3f4f6;
    }

    .learning-content-widget.dark .content-body p,
    .learning-content-widget.dark .content-body div {
      color: #d1d5db;
    }

    .learning-content-widget.dark .content-body h1,
    .learning-content-widget.dark .content-body h2,
    .learning-content-widget.dark .content-body h3,
    .learning-content-widget.dark .content-body h4,
    .learning-content-widget.dark .content-body h5,
    .learning-content-widget.dark .content-body h6 {
      color: #f3f4f6;
    }

    .learning-content-widget.dark .content-body code {
      background: #313244;
      color: #f3f4f6;
    }

    .learning-content-widget.dark .content-body pre {
      background: #11111b;
    }

    .learning-content-widget.dark .content-body blockquote {
      color: #9ca3af;
    }

    .learning-content-widget.dark .content-body table td,
    .learning-content-widget.dark .content-body table th {
      border-color: #313244;
    }

    .learning-content-widget.dark .content-body table th {
      background: #313244;
    }

    .learning-content-widget.dark .content-footer {
      background: #181825;
      border-top-color: #313244;
    }

    .learning-content-widget.dark .content-edit-btn {
      color: #9ca3af;
    }

    .learning-content-widget.dark .content-edit-btn:hover {
      background: rgba(255, 255, 255, 0.08);
    }
  `;

  document.head.appendChild(style);

  const widget = contentWidget.querySelector('.learning-content-widget');
  const header = contentWidget.querySelector('.content-header');
  restorePanelPosition(widget);
  makeDraggable(widget, header, (pos) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [PANEL_POSITION_KEY]: pos });
    }
  });
  restoreDarkMode(widget);

  // Scratchpad drags by its header or footer bar; position is ephemeral (not persisted).
  makeDraggable(notesPanel, notesPanel.querySelector('.learning-notes-header'));
  makeDraggable(notesPanel, notesPanel.querySelector('.learning-notes-footer'));

  return contentWidget;
}

const DARK_MODE_KEY = 'contentDarkMode';

function restoreDarkMode(widget) {
  if (!widget || typeof chrome === 'undefined' || !chrome.storage) return;
  chrome.storage.local.get(DARK_MODE_KEY, (data) => {
    widget.classList.toggle('dark', !!data?.[DARK_MODE_KEY]);
  });
}

function toggleDarkMode() {
  const widget = document.querySelector('.learning-content-widget');
  if (!widget) return;
  const enabled = widget.classList.toggle('dark');
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ [DARK_MODE_KEY]: enabled });
  }
}

const PANEL_POSITION_KEY = 'contentPanelPosition';

// Apply a saved position, clamped into the current viewport so the panel can't
// end up off-screen after a resize.
function restorePanelPosition(widget) {
  if (!widget || typeof chrome === 'undefined' || !chrome.storage) return;
  chrome.storage.local.get(PANEL_POSITION_KEY, (data) => {
    const pos = data?.[PANEL_POSITION_KEY];
    if (!pos || typeof pos.left !== 'number' || typeof pos.top !== 'number') return;
    applyPanelPosition(widget, pos.left, pos.top);
  });
}

function applyPanelPosition(widget, left, top) {
  const maxLeft = Math.max(0, window.innerWidth - widget.offsetWidth);
  const maxTop = Math.max(0, window.innerHeight - widget.offsetHeight);
  widget.style.left = Math.min(Math.max(0, left), maxLeft) + 'px';
  widget.style.top = Math.min(Math.max(0, top), maxTop) + 'px';
  widget.style.right = 'auto';
  widget.style.bottom = 'auto';
}

// onDrop (optional): called with the final {left, top} so callers can persist
// the position. Omit it for ephemeral panels that shouldn't be remembered.
function makeDraggable(widget, handle, onDrop) {
  if (!widget || !handle) return;

  let startX = 0, startY = 0, originLeft = 0, originTop = 0, dragging = false;

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
let currentItem = null;
let isFlipped = false;
let sessionTotal = 0;

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
  const counterInput = document.getElementById('content-counter-input');
  const counterTotal = document.getElementById('content-counter-total');
  const newBadge = document.getElementById('content-new-badge');
  const revisedBadge = document.getElementById('content-revised-badge');
  const strengthBadge = document.getElementById('content-strength-badge');

  sessionTotal = meta.sessionTotal || 0;
  if (counterInput) {
    counterInput.value = meta.sessionIndex + 1;
    counterInput.max = meta.sessionTotal;
  }
  if (counterTotal) counterTotal.textContent = meta.sessionTotal;
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

  // Fresh item — wipe the ephemeral scratchpad.
  const notesTextarea = document.querySelector('.learning-notes-textarea');
  if (notesTextarea) notesTextarea.value = '';

  updateMetaDisplay(meta);
  startContentTimer();

  const frontQuestionEl = document.getElementById('front-question');
  const answerEl = document.getElementById('content-answer');
  const flashcard = document.getElementById('flashcard');
  const widget = document.querySelector('.learning-content-widget');

  if (!frontQuestionEl || !answerEl || !flashcard || !widget) return;

  frontQuestionEl.textContent = item.title || '';

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

  widget.style.opacity = targetOpacity;
}

function showLoadingState() {
  const flashcard = document.getElementById('flashcard');
  const frontQuestionEl = document.getElementById('front-question');
  const answerEl = document.getElementById('content-answer');
  const widget = document.querySelector('.learning-content-widget');

  if (!flashcard || !widget) return;

  isFlipped = false;
  flashcard.classList.remove('flipped');
  if (frontQuestionEl) frontQuestionEl.textContent = '';
  if (answerEl) answerEl.innerHTML = '';
}

function toggleFlip() {
  const flashcard = document.getElementById('flashcard');
  if (!flashcard) return;
  isFlipped = !isFlipped;
  flashcard.classList.toggle('flipped');
}

function toggleNotesPanel() {
  const panel = document.getElementById('learning-notes-panel');
  const btn = document.getElementById('content-notes-toggle');
  const widget = document.querySelector('.learning-content-widget');
  if (!panel) return;
  const open = panel.classList.toggle('open');
  if (btn) btn.classList.toggle('active', open);
  // Mirror the widget's theme so the panel matches light/dark.
  panel.classList.toggle('dark', !!widget?.classList.contains('dark'));
  if (open) panel.querySelector('.learning-notes-textarea')?.focus();
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  try {
    if (request.action === 'updateContent') {
      updateContentDisplay(request.item, request.meta);
      sendResponse({ success: true });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
});

// Inyectar content display al cargar la página, then ask the background for
// the current item immediately instead of waiting up to 3 minutes for the next
// contentAlarm tick to push one.
function injectAndRequestContent() {
  injectContentDisplay();
  sendMessageSafely({ action: 'requestContent' });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectAndRequestContent);
} else {
  injectAndRequestContent();
}

// Keyboard shortcuts
function handleKeydown(e) {
  // Space or Enter to flip
  if ((e.key === ' ' || e.key === 'Enter') && e.target.closest('#learning-app-content') && e.target.tagName !== 'INPUT') {
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
document.addEventListener('change', (e) => {
  if (e.target.id === 'content-counter-input') {
    const total = parseInt(e.target.max) || 1;
    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > total) val = total;
    e.target.value = val;
    showLoadingState();
    sendMessageSafely({ action: 'navigateTo', index: val - 1 });
  }
});

document.addEventListener('click', (e) => {
  // Navigate prev/next
  if (e.target.closest('#content-nav-prev')) {
    e.stopPropagation();
    showLoadingState();
    sendMessageSafely({ action: 'navigatePrev' });
    return;
  }
  if (e.target.closest('#content-nav-next')) {
    e.stopPropagation();
    showLoadingState();
    sendMessageSafely({ action: 'navigateNext' });
    return;
  }
  // Toggle scratchpad notes panel
  if (e.target.closest('#content-notes-toggle')) {
    e.stopPropagation();
    toggleNotesPanel();
    return;
  }
  // Close scratchpad notes panel via its X button
  if (e.target.closest('#learning-notes-close')) {
    e.stopPropagation();
    toggleNotesPanel();
    return;
  }
  // Toggle dark mode
  if (e.target.closest('#content-theme-toggle')) {
    e.stopPropagation();
    toggleDarkMode();
    return;
  }
  // Exclude current item
  if (e.target.closest('#content-exclude')) {
    e.stopPropagation();
    if (confirm('Exclude this item from future study sessions?')) {
      showLoadingState();
      sendMessageSafely({ action: 'excludeContentItem' });
    }
    return;
  }
  // Edit current item — ask background to open a new tab (content scripts lack chrome.tabs)
  if (e.target.closest('#content-edit')) {
    e.stopPropagation();
    if (currentItem?.collectionId && currentItem?.id) {
      sendMessageSafely({ action: 'openEditTab', collectionId: currentItem.collectionId, itemId: currentItem.id });
    }
    return;
  }
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
