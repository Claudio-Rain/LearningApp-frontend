<template>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">{{ stats.avgRevisionsToMaster }}</div>
      <div class="stat-label">Revisions to Master</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ stats.totalAttempts }}</div>
      <div class="stat-label">Total Attempts</div>
    </div>
    <div class="stat-card projection-card">
      <div class="projection-icon">
        <v-icon icon="mdi-cards-outline" size="28" />
      </div>
      <div class="projection-body">
        <div class="projection-value">{{ stats.projectedAttemptsToFinish.toLocaleString() }}</div>
        <div class="projection-label">Estimated revisions to master all cards</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ stats.cardsLearned }}</div>
      <div class="stat-label">Cards Learned</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ stats.totalCards }}</div>
      <div class="stat-label">Total Cards</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProgressStats } from '../aggregation'

defineProps<{ stats: ProgressStats }>()
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  padding: 24px 20px;
}

.stat-card {
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: rgb(var(--v-theme-chartAccent));
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.projection-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 20px;
  border-radius: 16px;
  color: white;
  background: linear-gradient(135deg, rgb(var(--v-theme-gradientPurpleFrom)) 0%, rgb(var(--v-theme-gradientPurpleTo)) 100%);
  box-shadow: 0 8px 24px rgba(106, 27, 154, 0.28);
  position: relative;
  overflow: hidden;
  border: none;
  text-align: left;
}

.projection-card::after {
  content: '';
  position: absolute;
  top: -40%;
  right: -10%;
  width: 160px;
  height: 160px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 50%;
}

.projection-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.18);
  flex-shrink: 0;
  z-index: 1;
}

.projection-body {
  z-index: 1;
}

.projection-value {
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1;
}

.projection-label {
  font-size: 0.85rem;
  margin-top: 6px;
  opacity: 0.9;
}
</style>
