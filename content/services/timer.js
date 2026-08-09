import { RING_CIRCUMFERENCE, TIMER_DURATION } from '../constants.js';
import { sendMessageSafely } from '../utils/messaging.js';

let duration = TIMER_DURATION;
let timeLeft = TIMER_DURATION;
let interval = null;
// Set while the AI chat panel holds the card open (see pauseContentTimer).
let paused = false;

export function setTimerDuration(seconds) {
  duration = seconds;
}

function updateTimerDisplay() {
  const ringFill = document.getElementById('content-timer-ring-fill');
  const label = document.getElementById('content-timer-label');
  // "Low" is the final sixth of the interval, not a fixed 30s — otherwise a
  // short total (e.g. 30s) would read as red the entire time. Matches the old
  // behavior at the 3-minute default (last 30s of 180s).
  const low = timeLeft <= duration / 6;
  if (ringFill) {
    const frac = timeLeft / duration;
    ringFill.style.strokeDasharray = RING_CIRCUMFERENCE;
    ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - frac);
    ringFill.classList.toggle('timer-low', low);
  }
  if (label) {
    label.textContent = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
    label.classList.toggle('timer-label-low', low);
  }
}

function clearContentTimer() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

function runContentTimer() {
  clearContentTimer();
  updateTimerDisplay();
  interval = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      updateTimerDisplay();
    } else {
      clearContentTimer();
    }
  }, 1000);
}

export function startContentTimer() {
  timeLeft = duration;
  // A card can still change while paused (rating, navigation). The new card
  // gets a full countdown, but it stays frozen until the chat closes — and the
  // background alarm, which contentService re-armed on the way in, is paused
  // again to match.
  if (paused) {
    clearContentTimer();
    updateTimerDisplay();
    sendMessageSafely({ action: 'pauseAutoAdvance' });
    return;
  }
  runContentTimer();
}

// Pause/resume the visible countdown *and* the background auto-advance alarm,
// so opening the AI chat never has the card swap out mid-question (mirrors
// Study View, where the chat panel suspends the timer).
export function pauseContentTimer() {
  paused = true;
  clearContentTimer();
  sendMessageSafely({ action: 'pauseAutoAdvance' });
}

export function resumeContentTimer() {
  if (!paused) return;
  paused = false;
  runContentTimer();
  sendMessageSafely({ action: 'resumeAutoAdvance', secondsLeft: timeLeft });
}