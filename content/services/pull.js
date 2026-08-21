import { sendMessageForResponse } from '../utils/messaging.js';
import { showToast } from '../ui/toast.js';

// Guards against a second click while a pull is still in flight — the sync is
// slow enough (full pull + push of every table) to make double-clicking likely.
let pulling = false;

// Manual sync: the widget only ever reads the local DB, so a device that has
// been offline (or edits made in another tab/device) needs this to catch up
// without waiting for the SPA to run its own syncAll.
export async function pullLatest() {
  if (pulling) return;
  const btn = document.getElementById('content-pull');

  pulling = true;
  btn?.classList.add('syncing');
  try {
    const res = await sendMessageForResponse({ action: 'syncNow' });
    if (res?.success) {
      showToast('Pulled latest data');
    } else {
      showToast(`Pull failed: ${res?.error || 'unknown error'}`, true);
    }
  } catch (error) {
    showToast(`Pull failed: ${error.message}`, true);
  } finally {
    pulling = false;
    btn?.classList.remove('syncing');
  }
}
