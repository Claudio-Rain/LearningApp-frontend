import { registerEventListeners, registerMessageListener } from '../content/events.js';
import { injectContentDisplay } from '../content/ui/widget.js';
import { sendMessageSafely } from '../content/utils/messaging.js';

registerMessageListener();
registerEventListeners();

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
