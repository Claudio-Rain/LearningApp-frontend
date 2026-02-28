<template>
  <div class="timer">
    <h2>Timer</h2>
    <p>{{ formattedTime }}</p>
    
    <div>
      <input type="number" v-model.number="minutes" min="0" /> minutes
    </div>

    <button @click="startTimer" :disabled="running">Start</button>
    <button @click="stopTimer" :disabled="!running">Stop</button>
    <button @click="resetTimer">Reset</button>    
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'

export default {
  setup() {
    const minutes = ref(1)
    const time = ref(0)
    const running = ref(false)
    const repeat = ref(false)
    let timerInterval = null
    let uiInterval = null

    const formattedTime = computed(() => {
      const m = Math.floor(time.value / 60).toString().padStart(2, '0')
      const s = (time.value % 60).toString().padStart(2, '0')
      return `${m}:${s}`
    })

    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "RESTART_TIMER") {
        minutes.value = message.minutes
        startTimer()
        }
      })
    }


    function startTimer() {
      const endTime = Date.now() + minutes.value * 60 * 1000

      // Enviar al background
      chrome.runtime.sendMessage({
        type: "START_TIMER",
        minutes: minutes.value
      })

      // Guardar localmente para UI inmediata
      time.value = minutes.value * 60
      running.value = true

      if (uiInterval) clearInterval(uiInterval)

      uiInterval = setInterval(() => {
        const remaining = Math.floor((endTime - Date.now()) / 1000)

        if (remaining > 0) {
          time.value = remaining
        } else {
          clearInterval(uiInterval)
          running.value = false
          time.value = 0
        }
      }, 1000)
      }

    function stopTimer() {
      chrome.runtime.sendMessage({
        type: "STOP_TIMER"
      })
      running.value = false
    }


    function resetTimer() {
      stopTimer()
      time.value = minutes.value * 60
    }

    onMounted(() => {
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.get("endTime", (data) => {
          if (data.endTime) {
            const endTime = data.endTime
            const remaining = Math.floor((endTime - Date.now()) / 1000)

            if (remaining > 0) {
              time.value = remaining
              running.value = true

              if (uiInterval) clearInterval(uiInterval)

              uiInterval = setInterval(() => {
                const newRemaining = Math.floor((endTime - Date.now()) / 1000)

                if (newRemaining > 0) {
                  time.value = newRemaining
                } else {
                  clearInterval(uiInterval)
                  running.value = false
                  time.value = 0
                }
              }, 1000)
            }
          }
        })
      }
    })

    return { minutes, time, running, repeat, formattedTime, startTimer, stopTimer, resetTimer }
  }
}
</script>

<style>
.timer {
  font-family: sans-serif;
  text-align: center;
  padding: 10px;
}
input {
  width: 60px;
}
button {
  margin: 5px;
}
</style>
