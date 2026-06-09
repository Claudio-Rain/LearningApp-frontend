import type { ContentWidgetSettings } from '../types'

declare const chrome: any

const hasStorage = () => typeof chrome !== 'undefined' && chrome.storage

export async function getLocalContentWidget(): Promise<{
  contentCollectionIds?: string[]; lastModified?: string; pending?: boolean
}> {
  if (!hasStorage()) return {}
  const stored = await chrome.storage.local.get([
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
  if (!hasStorage()) return
  await chrome.storage.local.set({
    contentCollectionIds: settings.contentCollectionIds,
    contentWidgetLastModified: settings.lastModified,
    contentWidgetPending: opts?.pending ?? false,
  })
}

export async function markContentWidgetSynced(): Promise<void> {
  if (!hasStorage()) return
  await chrome.storage.local.set({ contentWidgetPending: false })
}
