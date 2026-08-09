import { DAILY_GOAL } from '../constants.js';
import { setTimerDuration } from '../services/timer.js';

function updateDailyProgress(count, goal = DAILY_GOAL) {
  const fill = document.getElementById('content-daily-fill');
  const label = document.getElementById('content-daily-label');
  const done = count || 0;
  const pct = goal > 0 ? Math.min(100, (done / goal) * 100) : 0;
  if (fill) fill.style.width = pct + '%';
  if (label) label.textContent = `${done} / ${goal}`;
}

function strengthInfo(score) {
  if (score < 0.25) return { label: 'Weak', cls: 'strength-weak' };
  if (score < 0.5) return { label: 'Fair', cls: 'strength-fair' };
  if (score < 0.75) return { label: 'Good', cls: 'strength-good' };
  return { label: 'Mastered', cls: 'strength-mastered' };
}

function updateStrengthBadge(meta) {
  const strengthBadge = document.getElementById('content-strength-badge');
  if (!strengthBadge) return;
  if (meta.isNew || meta.strengthScore == null) {
    strengthBadge.style.display = 'none';
    return;
  }
  const { label, cls } = strengthInfo(meta.strengthScore);
  strengthBadge.textContent = label;
  strengthBadge.className = `content-strength-badge ${cls}`;
  strengthBadge.style.display = 'inline-block';
}

// Header stats for the card being shown: position in the session, new/revised
// counts, strength, plus the daily bar and the auto-advance interval.
export function updateMetaDisplay(meta) {
  if (!meta) return;
  const counterInput = document.getElementById('content-counter-input');
  const counterTotal = document.getElementById('content-counter-total');
  const newBadge = document.getElementById('content-new-badge');
  const revisedBadge = document.getElementById('content-revised-badge');

  if (typeof meta.autoAdvanceSeconds === 'number' && meta.autoAdvanceSeconds > 0) {
    setTimerDuration(meta.autoAdvanceSeconds);
  }
  if (typeof meta.dailyCount === 'number') {
    updateDailyProgress(meta.dailyCount, meta.dailyGoal || DAILY_GOAL);
  }
  if (counterInput) {
    counterInput.value = meta.sessionIndex + 1;
    counterInput.max = meta.sessionTotal;
  }
  if (counterTotal) counterTotal.textContent = meta.sessionTotal;
  if (newBadge) {
    newBadge.textContent = `New: ${meta.newCards}`;
    newBadge.classList.toggle('glowing', !!meta.isNew);
  }
  if (revisedBadge) {
    revisedBadge.textContent = `Revised: ${meta.revisedCards}`;
    revisedBadge.classList.toggle('glowing', !meta.isNew);
  }
  updateStrengthBadge(meta);
}