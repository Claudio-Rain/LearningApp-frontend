<template>
  <div class="study-metrics">
    <div class="timer-ring-wrap" title="Time left on this card">
      <span class="timer-label" :class="{ 'timer-label-low': timerLow }">{{ timeLabel }}</span>
      <svg class="timer-ring" viewBox="0 0 36 36">
        <circle class="timer-ring-bg" cx="18" cy="18" :r="RING_RADIUS" />
        <circle
          class="timer-ring-fill"
          :class="{ 'timer-low': timerLow }"
          cx="18"
          cy="18"
          :r="RING_RADIUS"
          :stroke-dasharray="RING_CIRCUMFERENCE"
          :stroke-dashoffset="ringOffset"
        />
      </svg>
    </div>
    <div class="metric-group">
      <span class="metric" title="Revisions today, across all cards">
        <v-icon size="14">mdi-flash-outline</v-icon>{{ attemptsToday }} revisions today
      </span>
      <span class="metric-sep">·</span>
      <span class="metric" title="Revisions of this card">
        <v-icon size="14">mdi-refresh</v-icon>{{ currentAttempts }} revisions of this card
      </span>
      <span class="metric-sep">·</span>
      <span class="metric" :title="`${totalRevisions} revisions across the ${cardCount} cards loaded — avg ${avgRevisions} per card`">
        <v-icon size="14">mdi-history</v-icon>{{ totalRevisions }} revisions / {{ cardCount }} cards · avg {{ avgRevisions }}
      </span>
    </div>
    <div class="dist-bar" title="Strength distribution — new / weak / fair / good / mastered">
      <template v-for="seg in distribution" :key="seg.tier">
        <div
          v-if="seg.count > 0"
          class="dist-seg"
          :class="`dist-${seg.tier}`"
          :style="{ flexGrow: seg.count }"
          :title="`${seg.label}: ${seg.count}`"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { STRENGTH_TIERS, STRENGTH_TIER_META, type StrengthTier } from '@/utils/strength'

const props = defineProps<{
  timeLeft: number
  totalSeconds: number
  attemptsToday: number
  currentAttempts: number
  totalRevisions: number
  cardCount: number
  tierCounts: Record<StrengthTier, number>
}>()

// Countdown ring geometry: r=15.5 in a 36x36 viewBox.
const RING_RADIUS = 15.5
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const ringOffset = computed(() => RING_CIRCUMFERENCE * (1 - props.timeLeft / props.totalSeconds))
const timerLow = computed(() => props.timeLeft <= props.totalSeconds / 6)
const timeLabel = computed(() =>
  `${Math.floor(props.timeLeft / 60)}:${String(props.timeLeft % 60).padStart(2, '0')}`
)

const avgRevisions = computed(() =>
  props.cardCount ? (props.totalRevisions / props.cardCount).toFixed(1) : '0'
)

// New cards — here meaning never attempted — get their own grey segment so the
// colored ones only compare revised cards.
const distribution = computed(() =>
  STRENGTH_TIERS.map(tier => ({
    tier,
    label: STRENGTH_TIER_META[tier].label,
    count: props.tierCounts[tier]
  }))
)
</script>

<style scoped>
.study-metrics {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  flex-shrink: 0;
  padding: 2px 0;
}

.timer-ring-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.timer-ring {
  width: 34px;
  height: 34px;
  transform: rotate(-90deg);
}

.timer-ring-bg,
.timer-ring-fill {
  fill: none;
  stroke-width: 4;
}

.timer-ring-bg {
  stroke: rgba(var(--v-theme-on-surface), 0.1);
}

.timer-ring-fill {
  stroke: rgb(var(--v-theme-chartPositive));
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear, stroke 0.5s;
}

.timer-ring-fill.timer-low {
  stroke: rgb(var(--v-theme-error));
}

.timer-label {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-variant-numeric: tabular-nums;
  transition: color 0.5s;
  font-weight: 500;
}

.timer-label-low {
  color: rgb(var(--v-theme-error));
  font-weight: bold;
}

.metric-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.metric {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.62);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  cursor: default;
}

.metric .v-icon {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.metric-sep {
  color: rgba(var(--v-theme-on-surface), 0.25);
  font-size: 0.78rem;
}

.dist-bar {
  display: flex;
  flex: 0 1 180px;
  min-width: 60px;
  margin-left: auto;
  height: 5px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.dist-seg {
  flex-basis: 0;
  min-width: 4px;
  transition: flex-grow 0.4s ease;
}

.dist-seg + .dist-seg {
  margin-left: 1.5px;
}

.dist-new {
  background: rgb(var(--v-theme-barNew));
}

.dist-weak {
  background: rgb(var(--v-theme-barWeak));
}

.dist-fair {
  background: rgb(var(--v-theme-barFair));
}

.dist-good {
  background: rgb(var(--v-theme-barGood));
}

.dist-mastered {
  background: rgb(var(--v-theme-barMastered));
}

@media (max-width: 600px) {
  .study-metrics {
    gap: 6px;
  }

  .metric {
    font-size: 0.7rem;
  }

  .metric-sep {
    display: none;
  }

  .metric-group {
    gap: 6px;
    flex-wrap: wrap;
  }

  .timer-ring {
    width: 28px;
    height: 28px;
  }

  .timer-label {
    font-size: 0.75rem;
  }
}
</style>
