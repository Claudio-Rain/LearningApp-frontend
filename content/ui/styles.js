// Injected stylesheet for the content widget and its floating panels.
// Kept as one string so the content script needs no CSS file at runtime.
export const WIDGET_STYLES = `
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

    .content-chat-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #059669;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }

    .content-chat-btn:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    .content-chat-btn.active {
      background: rgba(5, 150, 105, 0.12);
      color: #047857;
    }

    .learning-chat-panel {
      position: fixed;
      top: 20px;
      right: 516px;
      z-index: 999997;
      display: none;
      flex-direction: column;
      width: 320px;
      height: 420px;
      max-width: 80vw;
      max-height: 75vh;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .learning-chat-panel.open {
      display: flex;
    }

    .learning-chat-header {
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
      flex-shrink: 0;
    }

    .learning-chat-close {
      border: none;
      background: transparent;
      color: #9ca3af;
      font-size: 18px;
      line-height: 1;
      padding: 0 2px;
      cursor: pointer;
      border-radius: 4px;
    }

    .learning-chat-close:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .learning-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .learning-chat-empty {
      margin: auto;
      color: #9ca3af;
      font-size: 13px;
      text-align: center;
      padding: 0 16px;
    }

    .learning-chat-bubble {
      max-width: 88%;
      border-radius: 12px;
      padding: 7px 10px;
      font-size: 13px;
      line-height: 1.45;
      overflow-wrap: break-word;
    }

    .learning-chat-bubble.user {
      align-self: flex-end;
      background: #2563eb;
      color: white;
      white-space: pre-wrap;
    }

    .learning-chat-bubble.assistant {
      align-self: flex-start;
      background: #f3f4f6;
      color: #1f2937;
    }

    .learning-chat-bubble.assistant.error {
      background: rgba(239, 68, 68, 0.1);
      color: #b91c1c;
    }

    .learning-chat-bubble.assistant p { margin: 0 0 6px; }
    .learning-chat-bubble.assistant p:last-child { margin-bottom: 0; }
    .learning-chat-bubble.assistant ul,
    .learning-chat-bubble.assistant ol { margin: 4px 0; padding-left: 18px; }
    .learning-chat-bubble.assistant pre {
      background: #1f2937;
      color: #e5e7eb;
      border-radius: 6px;
      padding: 8px;
      overflow-x: auto;
      font-size: 12px;
      margin: 6px 0;
    }
    .learning-chat-bubble.assistant code {
      background: rgba(0, 0, 0, 0.07);
      border-radius: 3px;
      padding: 1px 4px;
      font-size: 12px;
    }
    .learning-chat-bubble.assistant pre code {
      background: transparent;
      padding: 0;
    }

    .learning-chat-bubble.thinking {
      color: #9ca3af;
      font-style: italic;
    }

    .learning-chat-input-row {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      padding: 8px 10px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
      flex-shrink: 0;
    }

    .learning-chat-input {
      flex: 1;
      resize: none;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      outline: none;
      padding: 7px 10px;
      font-size: 13px;
      line-height: 1.4;
      max-height: 90px;
      color: #1f2937;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-sizing: border-box;
    }

    .learning-chat-input:focus {
      border-color: #2563eb;
    }

    .learning-chat-input::placeholder {
      color: #9ca3af;
    }

    .learning-chat-send {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      border: none;
      border-radius: 8px;
      background: #2563eb;
      color: white;
      cursor: pointer;
    }

    .learning-chat-send:hover {
      background: #1d4ed8;
    }

    .learning-chat-send:disabled {
      background: #9ca3af;
      cursor: default;
    }

    .learning-chat-panel.dark {
      background: #1e1e2e;
      border-color: #313244;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .learning-chat-panel.dark .learning-chat-header {
      background: #181825;
      border-bottom-color: #313244;
      color: #9ca3af;
    }

    .learning-chat-panel.dark .learning-chat-empty {
      color: #6b7280;
    }

    .learning-chat-panel.dark .learning-chat-bubble.assistant {
      background: #313244;
      color: #d1d5db;
    }

    .learning-chat-panel.dark .learning-chat-bubble.assistant code {
      background: rgba(255, 255, 255, 0.1);
    }

    .learning-chat-panel.dark .learning-chat-input-row {
      background: #181825;
      border-top-color: #313244;
    }

    .learning-chat-panel.dark .learning-chat-input {
      background: #1e1e2e;
      border-color: #313244;
      color: #d1d5db;
    }

    .learning-chat-panel.dark .learning-chat-input::placeholder {
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

    .content-timer-ring {
      position: relative;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }

    .content-timer-ring svg {
      width: 40px;
      height: 40px;
      /* Start the countdown from the top of the ring */
      transform: rotate(-90deg);
    }

    .content-timer-ring .ring-track {
      fill: none;
      stroke: rgba(0, 0, 0, 0.1);
      stroke-width: 4;
    }

    .content-timer-ring .ring-fill {
      fill: none;
      stroke: #4caf50;
      stroke-width: 4;
      stroke-linecap: round;
      transition: stroke-dashoffset 1s linear, stroke 0.5s;
    }

    .content-timer-ring .ring-fill.timer-low {
      stroke: #f44336;
    }

    .content-timer-label {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #6b7280;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      transition: color 0.5s;
    }

    .content-timer-label.timer-label-low {
      color: #f44336;
      font-weight: 700;
    }

    .content-daily {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .content-daily-bar-bg {
      flex: 1;
      height: 6px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .content-daily-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 3px;
      transition: width 0.4s ease;
    }

    .content-daily-label {
      font-size: 12px;
      color: #6b7280;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      white-space: nowrap;
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
      justify-content: flex-start;
    }

    .front-question-wrapper {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      padding: 24px 0;
      box-sizing: border-box;
    }

    .card-side.back {
      opacity: 0;
      z-index: 1;
      justify-content: flex-start;
    }

    .front-question {
      margin: auto 0;
      font-size: 32px;
      font-weight: 700;
      color: #111827;
      text-align: center;
      line-height: 1.4;
      user-select: none;
      word-wrap: break-word;
      overflow-wrap: break-word;
      width: 100%;
      box-sizing: border-box;
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

    .learning-content-widget.dark .content-timer-ring .ring-track {
      stroke: rgba(255, 255, 255, 0.12);
    }

    .learning-content-widget.dark .content-daily-bar-bg {
      background: rgba(255, 255, 255, 0.1);
    }

    .learning-content-widget.dark .content-timer-label,
    .learning-content-widget.dark .content-daily-label {
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

    /* ---- New-item button + modal ---- */
    .content-add-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #10b981;
      cursor: pointer;
      transition: background 0.2s;
      font-family: inherit;
    }

    .content-add-btn:hover {
      background: rgba(16, 185, 129, 0.1);
    }

    .learning-add-panel {
      position: fixed;
      top: 80px;
      right: 516px;
      z-index: 999999;
      display: none;
      flex-direction: column;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .learning-add-panel.open {
      display: flex;
    }

    .learning-add-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 600;
      color: #111827;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      border-radius: 12px 12px 0 0;
      user-select: none;
      cursor: grab;
    }

    .learning-add-panel-header.dragging {
      cursor: grabbing;
    }

    .learning-add-panel-body {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 14px;
    }

    .learning-add-close {
      border: none;
      background: transparent;
      color: #9ca3af;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      border-radius: 4px;
      padding: 0 4px;
    }

    .learning-add-close:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .learning-add-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      margin-top: 8px;
    }

    .learning-add-input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      color: #1f2937;
      background: white;
      font-family: inherit;
      outline: none;
    }

    .learning-add-input:focus {
      border-color: #3b82f6;
    }

    .learning-add-check {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font-size: 13px;
      color: #374151;
      cursor: pointer;
    }

    .learning-add-check input {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .learning-add-error {
      color: #ef4444;
      font-size: 12px;
      min-height: 14px;
    }

    .learning-add-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }

    .learning-add-btn-cancel,
    .learning-add-btn-create {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-family: inherit;
    }

    .learning-add-btn-cancel {
      background: #f3f4f6;
      color: #374151;
    }

    .learning-add-btn-cancel:hover {
      background: #e5e7eb;
    }

    .learning-add-btn-create {
      background: #10b981;
      color: white;
    }

    .learning-add-btn-create:hover {
      background: #059669;
    }

    .learning-add-btn-create:disabled {
      opacity: 0.6;
      cursor: default;
    }

    .learning-add-panel.dark {
      background: #1e1e2e;
      border-color: #313244;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .learning-add-panel.dark .learning-add-panel-header {
      background: #181825;
      border-bottom-color: #313244;
      color: #f3f4f6;
    }

    .learning-add-panel.dark .learning-add-input {
      background: #181825;
      border-color: #313244;
      color: #d1d5db;
    }

    .learning-add-panel.dark .learning-add-check {
      color: #d1d5db;
    }

    .learning-add-panel.dark .learning-add-btn-cancel {
      background: #313244;
      color: #d1d5db;
    }

    .learning-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      z-index: 1000000;
      max-width: 80vw;
      padding: 12px 18px;
      border-radius: 10px;
      background: #111827;
      color: white;
      font-size: 13px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
    }

    .learning-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    .learning-toast.error {
      background: #b91c1c;
    }
`;
