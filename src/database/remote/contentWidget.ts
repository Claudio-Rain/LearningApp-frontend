import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { ContentWidgetSettings } from '../types'

const SETTINGS_DOC = doc(db, 'app_settings', 'content_widget')

export async function getContentWidgetSettings(): Promise<ContentWidgetSettings | null> {
  const snap = await getDoc(SETTINGS_DOC)
  return snap.exists() ? (snap.data() as ContentWidgetSettings) : null
}

export async function setContentWidgetSettings(settings: ContentWidgetSettings): Promise<void> {
  await setDoc(SETTINGS_DOC, settings)
}
