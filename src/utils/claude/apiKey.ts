// Bring-your-own-key storage.
//
// Each user supplies their OWN Anthropic API key. It is stored only in this
// browser and sent directly from the browser to Anthropic, so no backend is
// required and you are never billed for anyone else's usage.

const KEY_STORAGE = 'claude_api_key'

// The key lives in chrome.storage.local so both the SPA editor and the
// extension's background service worker can read it (the worker has no
// localStorage). Falls back to localStorage during `npm run dev`, where the
// chrome APIs aren't present.
const chromeStorage: any =
  (globalThis as any).chrome?.storage?.local ?? null

export const getApiKey = async (): Promise<string | null> => {
  if (chromeStorage) {
    const data = await chromeStorage.get(KEY_STORAGE)
    let key = data?.[KEY_STORAGE] ?? null
    // One-time migration: a key set before this store existed lives in the
    // SPA's localStorage. Copy it into chrome.storage so the worker can read it.
    if (!key && typeof localStorage !== 'undefined') {
      const legacy = localStorage.getItem(KEY_STORAGE)
      if (legacy) {
        await chromeStorage.set({ [KEY_STORAGE]: legacy })
        key = legacy
      }
    }
    return key
  }
  return localStorage.getItem(KEY_STORAGE)
}

export const setApiKey = async (key: string): Promise<void> => {
  const value = key.trim()
  if (chromeStorage) await chromeStorage.set({ [KEY_STORAGE]: value })
  else localStorage.setItem(KEY_STORAGE, value)
}

export const clearApiKey = async (): Promise<void> => {
  if (chromeStorage) await chromeStorage.remove(KEY_STORAGE)
  else localStorage.removeItem(KEY_STORAGE)
}

export const hasApiKey = async (): Promise<boolean> => !!(await getApiKey())
