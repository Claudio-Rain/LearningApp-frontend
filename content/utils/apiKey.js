import { sendMessageForResponse } from './messaging.js';

// The AI features (chat, auto-answer) need an Anthropic API key in the
// extension's own storage. The one from `npm run dev` lives in a different
// origin, so prompt for it here if it isn't set yet — it's saved into
// chrome.storage.local via the background.
//
// Resolves true when a key is available, false when the user dismissed the
// prompt. Rejects if the background can't be reached.
export async function ensureApiKey() {
  const keyRes = await sendMessageForResponse({ action: 'hasApiKey' });
  if (keyRes?.hasKey) return true;

  const key = prompt(
    'Paste your Anthropic API key (stored in this extension, used directly from your browser):'
  );
  if (!key || !key.trim()) return false;

  await sendMessageForResponse({ action: 'setApiKey', key: key.trim() });
  return true;
}