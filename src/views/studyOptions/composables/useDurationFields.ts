import { ref, computed } from 'vue'

/**
 * Backs a DurationFields.vue pair: a duration the user edits as separate
 * "minutes" and "seconds" number inputs, read back as a single total that never
 * drops below `minSeconds`.
 *
 * Both the Study View card timer and the content widget's auto-advance interval
 * are edited this way; they differ only in their floor.
 */
export function useDurationFields(initialSeconds: number, minSeconds: number) {
  const minutes = ref(Math.floor(initialSeconds / 60))
  const seconds = ref(initialSeconds % 60)

  // The `.number` modifiers on the inputs let a cleared field hold '' while the
  // user retypes, so coerce rather than trusting the declared number type.
  const totalSeconds = computed(() =>
    Math.max(
      minSeconds,
      (Number(minutes.value) || 0) * 60 + (Number(seconds.value) || 0)
    )
  )

  // Used when a stored value arrives after setup (e.g. an async remote pull).
  function setFromSeconds(total: number) {
    minutes.value = Math.floor(total / 60)
    seconds.value = total % 60
  }

  return { minutes, seconds, totalSeconds, setFromSeconds }
}
