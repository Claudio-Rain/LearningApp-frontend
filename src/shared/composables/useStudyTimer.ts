import { ref } from 'vue'

const STORAGE_KEY = 'studyTimerSeconds'

export const DEFAULT_STUDY_TIMER_SECONDS = 180
// Unlike the content widget's auto-advance (floored at 30s by Chrome alarms),
// this timer is a plain setInterval, so only guard against nonsense values.
export const MIN_STUDY_TIMER_SECONDS = 10

function readStoredSeconds(): number {
  const parsed = Number(localStorage.getItem(STORAGE_KEY))
  return Number.isFinite(parsed) && parsed >= MIN_STUDY_TIMER_SECONDS
    ? Math.floor(parsed)
    : DEFAULT_STUDY_TIMER_SECONDS
}

const studyTimerSeconds = ref(readStoredSeconds())

export function useStudyTimer() {
  function setStudyTimerSeconds(seconds: number) {
    const clamped = Math.max(MIN_STUDY_TIMER_SECONDS, Math.floor(Number(seconds) || 0))
    studyTimerSeconds.value = clamped
    localStorage.setItem(STORAGE_KEY, String(clamped))
  }

  return { studyTimerSeconds, setStudyTimerSeconds }
}
