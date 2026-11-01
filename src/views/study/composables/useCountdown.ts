import { ref, onUnmounted, type Ref } from 'vue'

/**
 * A per-card countdown that calls `onExpire` when it hits zero. `pause` and
 * `resume` keep the remaining time; `start` gives the card a fresh timer.
 */
export function useCountdown(totalSeconds: Ref<number>, onExpire: () => void) {
  const timeLeft = ref(totalSeconds.value)
  let interval: ReturnType<typeof setInterval> | null = null

  const pause = () => {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
  }

  const resume = () => {
    pause()
    interval = setInterval(() => {
      if (timeLeft.value > 0) {
        timeLeft.value--
      } else {
        pause()
        onExpire()
      }
    }, 1000)
  }

  const start = () => {
    timeLeft.value = totalSeconds.value
    resume()
  }

  onUnmounted(pause)

  return { timeLeft, start, resume, pause }
}
