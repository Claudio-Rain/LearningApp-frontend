import type { ContentWidgetSettings } from '../types'

declare const chrome: any

const hasChromeStorage = () => typeof chrome !== 'undefined' && chrome.storage

// The content-widget cache lives in chrome.storage.local when running as the
// extension, and falls back to localStorage when it isn't (dev server / hosted
// webpage) so the setting works in every context. Firestore stays the
// cross-context source of truth — saveContentWidget()/pullContentWidget() keep
// these per-context caches in sync through it.

async function readKeys(keys: string[]): Promise<Record<string, any>> {
  if (hasChromeStorage()) return chrome.storage.local.get(keys)
  const out: Record<string, any> = {}
  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (raw !== null) out[key] = JSON.parse(raw)
  }
  return out
}

async function writeKeys(values: Record<string, unknown>): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.set(values)
    return
  }
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  }
}

export async function getLocalContentWidget(): Promise<{
  contentCollectionIds?: string[]; lastModified?: string; pending?: boolean
}> {
  const stored = await readKeys([
    'contentCollectionIds',
    'contentWidgetLastModified',
    'contentWidgetPending',
  ])
  return {
    contentCollectionIds: stored.contentCollectionIds,
    lastModified: stored.contentWidgetLastModified,
    pending: stored.contentWidgetPending,
  }
}

export async function setLocalContentWidget(
  settings: ContentWidgetSettings, opts?: { pending?: boolean }
): Promise<void> {
  await writeKeys({
    contentCollectionIds: settings.contentCollectionIds,
    contentWidgetLastModified: settings.lastModified,
    contentWidgetPending: opts?.pending ?? false,
  })
}

export async function markContentWidgetSynced(): Promise<void> {
  await writeKeys({ contentWidgetPending: false })
}
