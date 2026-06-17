import { formatISO, isAfter, parseISO } from 'date-fns'
import type { ContentWidgetSettings } from '../types'
import * as local from '../local'
import * as remote from '../remote'

// Pull remote → cache, lastModified-wins. If a local change is pending, push it instead.
export async function pullContentWidget() {
  try {
    const localS = await local.getLocalContentWidget()
    const remoteS = await remote.getContentWidgetSettings()

    if (localS.pending) {            // local edit not yet pushed → push, don't clobber
      await pushContentWidget()
      return
    }
    if (!remoteS) return             // nothing remote yet
    if (!localS.lastModified ||
        isAfter(parseISO(remoteS.lastModified), parseISO(localS.lastModified))) {
      await local.setLocalContentWidget(remoteS, { pending: false })
    }
  } catch (err) {
    console.error('Failed to pull content widget settings:', err)
  }
}

// Persist a user change: write cache immediately, push to remote if online (else stays pending).
export async function saveContentWidget(contentCollectionIds: string[]) {
  const settings: ContentWidgetSettings = {
    contentCollectionIds,
    lastModified: formatISO(new Date()),
  }
  await local.setLocalContentWidget(settings, { pending: true })
  if (navigator.onLine) {
    try {
      await remote.setContentWidgetSettings(settings)
      await local.markContentWidgetSynced()
    } catch {
      // stays pending; syncAll will retry
    }
  }
}

// Full two-way sync of the content widget settings: pull remote → cache
// (lastModified-wins, pushing instead if a local edit is pending), then flush
// any still-pending local change. Cheap enough for a view to call on entry.
export async function syncContentWidget() {
  if (!navigator.onLine) return
  await pullContentWidget()
  await pushContentWidget()
}

// Retry path used by the sync engine.
export async function pushContentWidget() {
  const localS = await local.getLocalContentWidget()
  if (!localS.pending || !localS.lastModified || !localS.contentCollectionIds) return
  await remote.setContentWidgetSettings({
    contentCollectionIds: localS.contentCollectionIds,
    lastModified: localS.lastModified,
  })
  await local.markContentWidgetSynced()
}
