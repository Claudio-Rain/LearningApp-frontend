<!-- ProgressOverview.vue -->
<!--
  The top of Study Progress: how much you know (one big number and one bar),
  then a few plain facts about how you've been studying lately.
-->
<template>
  <section class="overview">
    <div class="overview__main">
      <div class="overview__headline">
        <span class="overview__pct">{{ knownPct }}%</span>
        <span class="overview__pct-label">known well</span>
      </div>
      <div class="overview__sub">
        {{ known.toLocaleString() }} of {{ total.toLocaleString() }} cards are good or mastered
      </div>

      <div class="overview__bar" :title="barTitle">
        <template v-for="tier in STRENGTH_TIERS" :key="tier">
          <div
            v-if="tiers[tier] > 0"
            class="overview__seg"
            :style="{ flexGrow: tiers[tier], background: `rgb(var(--v-theme-${STRENGTH_TIER_META[tier].bar}))` }"
          />
        </template>
      </div>
      <div class="overview__legend">
        <span v-for="tier in STRENGTH_TIERS" :key="tier" class="overview__legend-item">
          <i class="overview__dot" :style="{ background: `rgb(var(--v-theme-${STRENGTH_TIER_META[tier].bar}))` }" />
          {{ STRENGTH_TIER_META[tier].label }} <b>{{ tiers[tier].toLocaleString() }}</b>
        </span>
      </div>
    </div>

    <div class="overview__side">
      <!-- The headline number of what's left: the goal to work down. -->
      <div v-if="remaining > 0" class="goal">
        <v-icon class="goal__icon" size="30">mdi-flag-checkered</v-icon>
        <div>
          <div class="goal__value">{{ remaining.toLocaleString() }}</div>
          <div class="goal__label">revisions to master every card</div>
        </div>
      </div>
      <div v-else class="goal goal--done">
        <v-icon class="goal__icon" size="30">mdi-trophy-outline</v-icon>
        <div>
          <div class="goal__value">All mastered</div>
          <div class="goal__label">nothing left to master here</div>
        </div>
      </div>

      <div class="fact">
        <v-icon class="fact__icon" size="20">mdi-history</v-icon>
        <div>
          <div class="fact__value">{{ attempts.toLocaleString() }}</div>
          <div class="fact__label">revisions done so far</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { STRENGTH_TIERS, STRENGTH_TIER_META, type StrengthTier } from '@/utils/strength'

const props = defineProps<{
  tiers: Record<StrengthTier, number>
  /** Every revision made so far. */
  attempts: number
  /** Estimated revisions left until every card is mastered. */
  remaining: number
}>()

const total = computed(() => STRENGTH_TIERS.reduce((n, t) => n + props.tiers[t], 0))
const known = computed(() => props.tiers.good + props.tiers.mastered)
const knownPct = computed(() => (total.value ? Math.round((known.value / total.value) * 100) : 0))

const barTitle = computed(() =>
  STRENGTH_TIERS.map(t => `${STRENGTH_TIER_META[t].label} ${props.tiers[t]}`).join(' · ')
)
</script>

<style scoped>
.overview {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 28px;
  padding: 24px 28px;
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.overview__headline {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.overview__pct {
  font-size: 56px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
}

.overview__pct-label {
  font-size: 18px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.overview__sub {
  margin: 8px 0 18px;
  font-size: 15px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.overview__bar {
  display: flex;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.overview__seg {
  flex-basis: 0;
  min-width: 4px;
}

.overview__seg + .overview__seg {
  margin-left: 2px;
}

.overview__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin-top: 12px;
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.overview__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.overview__legend-item b {
  color: rgba(var(--v-theme-on-surface), 0.9);
  font-weight: 600;
}

.overview__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.overview__side {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
}

.goal {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 14px;
  color: white;
  background: linear-gradient(135deg, rgb(var(--v-theme-gradientPurpleFrom)) 0%, rgb(var(--v-theme-gradientPurpleTo)) 100%);
  box-shadow: 0 8px 24px rgba(106, 27, 154, 0.25);
}

.goal--done {
  background: linear-gradient(135deg, rgb(var(--v-theme-chartPositiveMuted)) 0%, rgb(var(--v-theme-chartPositive)) 100%);
  box-shadow: none;
}

.goal__icon {
  flex-shrink: 0;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.18);
  box-sizing: content-box;
}

.goal__value {
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
}

.goal__label {
  margin-top: 6px;
  font-size: 15px;
  opacity: 0.9;
}

.fact {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.fact__icon {
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.fact__value {
  font-size: 22px;
  font-weight: 650;
  line-height: 1.2;
}

.fact__label {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

@media (max-width: 900px) {
  .overview {
    grid-template-columns: 1fr;
  }
}
</style>
