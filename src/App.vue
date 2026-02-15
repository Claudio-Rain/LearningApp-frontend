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
    
    <label>
      <input type="checkbox" v-model="repeat" /> Repeat when finished
    </label>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  setup() {
    const minutes = ref(1)
    const time = ref(0)
    const running = ref(false)
    const repeat = ref(false)
    let timerInterval = null

    const formattedTime = computed(() => {
      const m = Math.floor(time.value / 60).toString().padStart(2, '0')
      const s = (time.value % 60).toString().padStart(2, '0')
      return `${m}:${s}`
    })

    function startTimer() {
      if (running.value) return
      time.value = minutes.value * 60
      running.value = true

      timerInterval = setInterval(() => {
        if (time.value > 0) {
          time.value--
        } else {
          clearInterval(timerInterval)
          running.value = false
          if (repeat.value) {
            startTimer()
          }
        }
      }, 1000)
    }

    function stopTimer() {
      clearInterval(timerInterval)
      running.value = false
    }

    function resetTimer() {
      stopTimer()
      time.value = minutes.value * 60
    }

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
