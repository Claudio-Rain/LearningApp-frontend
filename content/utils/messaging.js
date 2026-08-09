function logSendError(error, message) {
  if (error?.message?.includes('context invalidated')) {
    console.warn('[content] Extension context invalidated, message not sent:', message.action);
  } else {
    console.error('[content] Error sending message:', error);
  }
}

// Safe message sender that handles context invalidation
export function sendMessageSafely(message) {
  try {
    chrome.runtime.sendMessage(message).catch((error) => logSendError(error, message));
  } catch (error) {
    logSendError(error, message);
  }
}

// Promise-based sender for messages that need a response back from background.
export function sendMessageForResponse(message) {
  try {
    return chrome.runtime.sendMessage(message);
  } catch (error) {
    return Promise.reject(error);
  }
}