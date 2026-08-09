import { syncPanelTheme } from './theme.js';

export function clearNotes() {
  const textarea = document.querySelector('.learning-notes-textarea');
  if (textarea) textarea.value = '';
}

export function toggleNotesPanel() {
  const panel = document.getElementById('learning-notes-panel');
  const btn = document.getElementById('content-notes-toggle');
  if (!panel) return;
  const open = panel.classList.toggle('open');
  if (btn) btn.classList.toggle('active', open);
  syncPanelTheme(panel);
  if (open) panel.querySelector('.learning-notes-textarea')?.focus();
}
