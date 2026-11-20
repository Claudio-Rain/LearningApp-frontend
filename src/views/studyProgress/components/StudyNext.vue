<!-- StudyNext.vue -->
<!--
  "What to study next": the collections you know least, each a click away
  from a study session, and the weakest cards you've already met, each a
  click away from its card.
-->
<template>
  <section class="study-next">
    <div class="panel">
      <h2 class="panel__title">Weakest collections</h2>
      <p class="panel__sub">Least of it known well — start here</p>
      <ul v-if="collections.length" class="rows">
        <li v-for="c in collections" :key="c.id" class="row">
          <div class="row__main">
            <div class="row__title">{{ c.title }}</div>
            <div class="row__meta">
              <div class="mini-bar"><div class="mini-bar__fill" :style="{ width: `${Math.round(c.known * 100)}%` }" /></div>
              <span>{{ Math.round(c.known * 100) }}% of {{ c.items }}</span>
            </div>
          </div>
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-play"
            class="row__action"
            @click="emit('study', c.id)"
          >
            Study
          </v-btn>
        </li>
      </ul>
      <p v-else class="panel__empty">Every collection here is known well. 🎉</p>
    </div>

    <div class="panel">
      <h2 class="panel__title">Hardest cards</h2>
      <p class="panel__sub">Cards you've studied that still aren't sticking</p>
      <ul v-if="cards.length" class="rows">
        <li
          v-for="card in cards"
          :key="card.id"
          class="row row--link"
          role="button"
          tabindex="0"
          @click="emit('open-card', card)"
          @keydown.enter="emit('open-card', card)"
        >
          <i class="row__dot" :style="{ background: tierColor(card.strength) }" />
          <MathText class="row__title row__title--card" :text="card.title" />
          <span class="row__pct">{{ Math.round(card.strength * 100) }}%</span>
        </li>
      </ul>
      <p v-else class="panel__empty">No struggling cards right now.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import MathText from '@/shared/components/MathText.vue'
import { STRENGTH_TIER_META, strengthTier } from '@/utils/strength'
import type { HardCard, WeakCollection } from '../aggregation'

defineProps<{
  collections: WeakCollection[]
  cards: HardCard[]
}>()

const emit = defineEmits<{
  study: [collectionId: string]
  'open-card': [card: HardCard]
}>()

const tierColor = (strength: number) => `rgb(var(--v-theme-${STRENGTH_TIER_META[strengthTier(strength)].bar}))`
</script>

<style scoped>
.study-next {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.panel {
  padding: 20px 22px;
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  min-width: 0;
}

.panel__title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
}

.panel__sub {
  margin: 2px 0 12px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.panel__empty {
  margin: 16px 0 4px;
  font-size: 15px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 6px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.row:first-child {
  border-top: 0;
}

.row--link {
  border-radius: 8px;
  cursor: pointer;
}

.row--link:hover,
.row--link:focus-visible {
  background: rgba(var(--v-theme-on-surface), 0.05);
  outline: none;
}

.row__main {
  flex: 1;
  min-width: 0;
}

.row__title {
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row__title--card {
  flex: 1;
  min-width: 0;
}

.row__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.mini-bar {
  width: 120px;
  height: 5px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.mini-bar__fill {
  height: 100%;
  border-radius: 3px;
  background: rgb(var(--v-theme-barGood));
}

.row__action {
  flex-shrink: 0;
  text-transform: none !important;
  letter-spacing: 0.01em !important;
}

.row__dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.row__pct {
  flex-shrink: 0;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

@media (max-width: 900px) {
  .study-next {
    grid-template-columns: 1fr;
  }
}
</style>
