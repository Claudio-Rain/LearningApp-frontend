import { computed, ref } from 'vue'
import { useTheme } from 'vuetify'

const STORAGE_KEY = 'appThemePreference'

// 'system' follows the OS setting and keeps following it as the user changes
// it; 'light'/'dark' pin the choice.
export type ThemePreference = 'system' | 'light' | 'dark'
export type ThemeName = 'light' | 'dark'

function readStoredPreference(): ThemePreference {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
}

function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function resolve(preference: ThemePreference): ThemeName {
  if (preference === 'system') return prefersDark() ? 'dark' : 'light'
  return preference
}

// Read synchronously at module load so createVuetify can start on the right
// theme. Booting on the wrong one and correcting after mount would flash.
export function initialThemeName(): ThemeName {
  return resolve(readStoredPreference())
}

// Module-level so every consumer shares one source of truth. localStorage is
// not reactive, so the stored value is mirrored here rather than re-read.
const preference = ref<ThemePreference>(readStoredPreference())

export function useAppTheme() {
  const theme = useTheme()
  const isDark = computed(() => theme.global.current.value.dark)

  function setPreference(next: ThemePreference) {
    preference.value = next
    if (next === 'system') {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, next)
    }
    theme.change(resolve(next))
  }

  // Toggling away from 'system' pins the opposite of what is showing now,
  // which is what a user clicking a light/dark switch expects.
  function toggle() {
    setPreference(isDark.value ? 'light' : 'dark')
  }

  return { preference: computed(() => preference.value), isDark, setPreference, toggle }
}

// Track the OS setting for as long as the user has not pinned a choice. This
// lives outside the composable so it is registered once, not per-consumer.
export function watchSystemTheme(apply: (name: ThemeName) => void) {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  if (!media) return

  const onChange = (e: MediaQueryListEvent) => {
    if (readStoredPreference() !== 'system') return
    apply(e.matches ? 'dark' : 'light')
  }
  media.addEventListener('change', onChange)
}
