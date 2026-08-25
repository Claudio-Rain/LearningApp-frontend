import { ref } from 'vue'

declare const chrome: any

// Unlike the other study options, notification settings are chrome.storage-only:
// they are read by the extension's background script, not by the web app, so
// there is no Firestore or local-DB copy to keep in sync.
const STORAGE_KEYS = [
  'notificationCollectionId',
  'sessionStartHour',
  'sessionEndHour',
  'notificationIntervalSeconds',
] as const

const notificationCollectionId = ref<string | null>(null)
const startHour = ref(9)
const endHour = ref(10)
const intervalSeconds = ref(30)

export const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}))

export const intervalOptions = [
  { value: 30, label: 'Every 30 seconds' },
  { value: 60, label: 'Every minute' },
  { value: 120, label: 'Every 2 minutes' },
  { value: 300, label: 'Every 5 minutes' },
  { value: 600, label: 'Every 10 minutes' },
]

// The web app runs outside the extension, where chrome.storage is absent; there
// the notification form is inert rather than an error.
function hasChromeStorage() {
  return typeof chrome !== 'undefined' && !!chrome.storage
}

/**
 * The editable form for the notifications section: which collection to draw
 * notifications from, the daily window they may fire in, and how often.
 */
export function useNotificationForm() {
  async function load() {
    if (!hasChromeStorage()) return
    const stored = await chrome.storage.local.get([...STORAGE_KEYS])
    if (stored.notificationCollectionId) notificationCollectionId.value = stored.notificationCollectionId
    if (stored.sessionStartHour != null) startHour.value = stored.sessionStartHour
    if (stored.sessionEndHour != null) endHour.value = stored.sessionEndHour
    if (stored.notificationIntervalSeconds) intervalSeconds.value = stored.notificationIntervalSeconds
  }

  async function save() {
    if (!hasChromeStorage()) return
    await chrome.storage.local.set({
      notificationCollectionId: notificationCollectionId.value,
      sessionStartHour: startHour.value,
      sessionEndHour: endHour.value,
      notificationIntervalSeconds: intervalSeconds.value,
    })
  }

  return { notificationCollectionId, startHour, endHour, intervalSeconds, load, save }
}
