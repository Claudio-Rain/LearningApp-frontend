import { getCurrentItem } from '../state.js';
import { ensureApiKey } from '../utils/apiKey.js';
import { sendMessageForResponse } from '../utils/messaging.js';
import { escapeHtml } from '../utils/tiptap.js';
import { syncPanelTheme } from './theme.js';

export function isAddModalOpen() {
  return !!document.getElementById('learning-add-panel')?.classList.contains('open');
}

export async function openAddModal() {
  const panel = document.getElementById('learning-add-panel');
  const select = document.getElementById('learning-add-collection');
  const nameInput = document.getElementById('learning-add-name');
  const errorEl = document.getElementById('learning-add-error');
  if (!panel || !select) return;

  // Reset fields and mirror the widget theme.
  if (nameInput) nameInput.value = '';
  if (errorEl) errorEl.textContent = '';
  document.getElementById('learning-add-autoanswer').checked = true;
  syncPanelTheme(panel);

  // Prefill the collection of the item being studied, when known.
  select.innerHTML = '<option value="">Loading…</option>';
  panel.classList.add('open');
  nameInput?.focus();

  try {
    const res = await sendMessageForResponse({ action: 'getCollections' });
    const collections = res?.collections || [];
    if (!collections.length) {
      select.innerHTML = '<option value="">No collections found</option>';
      return;
    }
    select.innerHTML = collections
      .map((c) => `<option value="${c.id}">${escapeHtml(c.title)}</option>`)
      .join('');
    const collectionId = getCurrentItem()?.collectionId;
    if (collectionId) select.value = collectionId;
  } catch {
    select.innerHTML = '<option value="">Failed to load</option>';
  }
}

export function closeAddModal() {
  document.getElementById('learning-add-panel')?.classList.remove('open');
}

const CREATE_FAILED = 'Failed to create item.';

function setAddError(message) {
  const errorEl = document.getElementById('learning-add-error');
  if (errorEl) errorEl.textContent = message;
}

function setCreatingState(creating) {
  const createBtn = document.getElementById('learning-add-create');
  if (!createBtn) return;
  createBtn.disabled = creating;
  createBtn.textContent = creating ? 'Creating…' : 'Create';
}

function readAddForm() {
  return {
    title: document.getElementById('learning-add-name')?.value.trim(),
    collectionId: document.getElementById('learning-add-collection')?.value,
    autoAnswer: document.getElementById('learning-add-autoanswer')?.checked,
  };
}

// Returns the message to show, or '' when the form is good to submit.
function validateAddForm({ title, collectionId }) {
  if (!title) return 'Please enter a name.';
  if (!collectionId) return 'Please pick a collection.';
  return '';
}

export async function submitAddModal() {
  const form = readAddForm();
  const validationError = validateAddForm(form);
  setAddError(validationError);
  if (validationError) return;

  // Without a key, create the item but skip the answer.
  const autoAnswer = form.autoAnswer ? await ensureApiKey() : false;

  setCreatingState(true);
  try {
    const res = await sendMessageForResponse({
      action: 'createItem',
      title: form.title,
      collectionId: form.collectionId,
      autoAnswer,
    });
    if (res?.success) closeAddModal();
    else setAddError(res?.error || CREATE_FAILED);
  } catch {
    setAddError(CREATE_FAILED);
  } finally {
    setCreatingState(false);
  }
}
