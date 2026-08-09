// Static markup for the content widget and its floating panels.

export const WIDGET_TEMPLATE = `
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
          <button class="content-add-btn" id="content-add" title="New learning item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>
          </button>
          <button class="content-notes-btn" id="content-notes-toggle" title="Scratchpad notes">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 4a2 2 0 0 1 2-2h9l6 6v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4zm10 0v5h5l-5-5zM7 13h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>
          </button>
          <button class="content-chat-btn" id="content-chat-toggle" title="Ask AI about this card">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4 2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8l-4 4v-4H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 3a3.5 3.5 0 0 0-3.5 3.5h2A1.5 1.5 0 1 1 12 10c-.55 0-1 .45-1 1v1.5h2v-.8a3.5 3.5 0 0 0-1-6.7zm-1 9h2v2h-2v-2z"/></svg>
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
        <div class="content-timer-ring">
          <svg viewBox="0 0 40 40">
            <circle class="ring-track" cx="20" cy="20" r="16"></circle>
            <circle class="ring-fill" id="content-timer-ring-fill" cx="20" cy="20" r="16"></circle>
          </svg>
          <span class="content-timer-label" id="content-timer-label">3:00</span>
        </div>
        <div class="content-daily">
          <div class="content-daily-bar-bg">
            <div class="content-daily-bar-fill" id="content-daily-fill"></div>
          </div>
          <div class="content-daily-label" id="content-daily-label">0 / 100</div>
        </div>
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

// Standalone scratchpad panel (ephemeral — nothing is persisted).
export const NOTES_PANEL_TEMPLATE = `
    <div class="learning-notes-header">
      <span>Notes</span>
      <button class="learning-notes-close" id="learning-notes-close" title="Close notes">&times;</button>
    </div>
    <textarea class="learning-notes-textarea" placeholder="Jot something down…"></textarea>
    <div class="learning-notes-footer"></div>
`;

// AI chat panel: ask Claude about the card currently on screen. The thread is
// ephemeral — it is wiped whenever a new card is shown (rating/nav/timer).
export const CHAT_PANEL_TEMPLATE = `
    <div class="learning-chat-header">
      <span>Ask about this card</span>
      <button class="learning-chat-close" id="learning-chat-close" title="Close chat">&times;</button>
    </div>
    <div class="learning-chat-messages" id="learning-chat-messages">
      <div class="learning-chat-empty">Ask anything about the current card</div>
    </div>
    <div class="learning-chat-input-row">
      <textarea class="learning-chat-input" id="learning-chat-input" rows="1" placeholder="Ask a question…"></textarea>
      <button class="learning-chat-send" id="learning-chat-send" title="Send">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
      </button>
    </div>
`;

// Floating panel for creating a new learning item (Name, Collection, auto-answer).
export const ADD_PANEL_TEMPLATE = `
    <div class="learning-add-panel-header">
      <span>New learning item</span>
      <button class="learning-add-close" id="learning-add-close" title="Close">&times;</button>
    </div>
    <div class="learning-add-panel-body">
      <label class="learning-add-label">Name</label>
      <input class="learning-add-input" id="learning-add-name" type="text" placeholder="What do you want to learn?" autocomplete="off">
      <label class="learning-add-label">Collection</label>
      <select class="learning-add-input" id="learning-add-collection"></select>
      <label class="learning-add-check">
        <input type="checkbox" id="learning-add-autoanswer" checked>
        <span>Auto-answer with Claude in the background</span>
      </label>
      <div class="learning-add-error" id="learning-add-error"></div>
      <div class="learning-add-actions">
        <button class="learning-add-btn-cancel" id="learning-add-cancel">Cancel</button>
        <button class="learning-add-btn-create" id="learning-add-create">Create</button>
      </div>
    </div>
`;
