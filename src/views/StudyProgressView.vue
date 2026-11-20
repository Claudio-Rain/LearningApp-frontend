<template>
  <div class="progress-view">
    <!-- Header: title, the collection filter and sync in one row -->
    <div class="progress-header">
      <div class="progress-header__title">
        <v-btn icon="mdi-arrow-left" variant="text" size="small" title="Back to collections" @click="goBack" />
        <h1>Study Progress</h1>
      </div>
      <div class="progress-header__controls">
        <CollectionMultiSelect
          v-model="selectedCollectionIds"
          :collections="selectableCollections"
          :categories="categories"
          :label="selectedCollectionIds.length ? 'Collections' : 'All collections'"
          density="compact"
          hide-details
          class="collection-select"
          name="collection-filter-no-autocomplete"
          @update:model-value="saveSelection"
        />
        <v-btn
          :icon="syncing ? undefined : 'mdi-sync'"
          :loading="syncing"
          variant="text"
          title="Sync latest data"
          @click="syncAndReload"
        />
      </div>
    </div>

    <div class="progress-body">
      <!-- 1. How am I doing? -->
      <ProgressOverview
        :tiers="tiers"
        :attempts="stats.totalAttempts"
        :remaining="stats.projectedAttemptsToFinish"
      />

      <!-- 2. What should I study? -->
      <StudyNext :collections="weakCollections" :cards="hardCards" @study="goToStudy" @open-card="openCard" />

      <!-- 3. The charts: progress over time first, then the detail -->
      <div class="progress-grid">
        <ChartCard
          title="Strength over time"
          subtitle="Average strength across all cards, day by day — never-studied cards count as 0"
        >
          <div ref="dailyStrengthChartRef" class="chart"></div>
        </ChartCard>

        <ChartCard title="Daily revisions" subtitle="Drag across the chart to zoom into a range">
          <template #actions>
            <div class="date-range-filter">
              <v-text-field
                v-model="timelineStartDate"
                type="date"
                label="From"
                density="compact"
                variant="outlined"
                hide-details
                :max="timelineEndDate"
              />
              <v-text-field
                v-model="timelineEndDate"
                type="date"
                label="To"
                density="compact"
                variant="outlined"
                hide-details
                :min="timelineStartDate"
              />
            </div>
          </template>
          <div ref="timelineChartRef" class="chart"></div>
        </ChartCard>

        <ChartCard
          full-width
          title="When you study"
          subtitle="Revisions by day and hour, last 30 days — brighter means more"
          :empty-text="noRecentStudy"
        >
          <div ref="studyHeatmapChartRef" class="chart chart-heatmap"></div>
        </ChartCard>

        <ChartCard
          full-width
          title="Cards over time"
          subtitle="The line is every card you had each day; below it, how well you knew them — the gap is cards not studied yet. Drag to zoom."
        >
          <div ref="compositionChartRef" class="chart"></div>
        </ChartCard>

        <ChartCard
          full-width
          title="Strength vs revisions"
          subtitle="Each dot is one card after a revision — strength tends to climb the more you revise it"
        >
          <template #actions>
            <v-checkbox
              v-model="showCardTitles"
              label="Show card titles"
              density="compact"
              hide-details
              class="flex-shrink-0"
            />
          </template>
          <div ref="strengthScatterChartRef" class="chart"></div>
        </ChartCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import { format, startOfDay, subDays } from 'date-fns'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { syncAll } from '@/database'
import CollectionMultiSelect from '@/shared/components/CollectionMultiSelect.vue'
import { useStudyViewCollection } from '@/shared/composables/useStudyViewCollection'
import ChartCard from './studyProgress/components/ChartCard.vue'
import ProgressOverview from './studyProgress/components/ProgressOverview.vue'
import StudyNext from './studyProgress/components/StudyNext.vue'
import { useProgressData } from './studyProgress/composables/useProgressData'
import {
  hardestCards,
  newCardCount,
  recentLogs,
  strengthBuckets,
  tierCountsWithNew,
  weakestCollections,
  type HardCard
} from './studyProgress/aggregation'
import { applyGlobalChartTheme, createChartPalette } from './studyProgress/charts/chartTheme'
import { createChartRegistry, type ChartContext } from './studyProgress/charts/chartRegistry'
import { renderTimelineChart } from './studyProgress/charts/timelineChart'
import { renderCompositionChart } from './studyProgress/charts/compositionChart'
import { renderDailyStrengthChart } from './studyProgress/charts/dailyStrengthChart'
import { renderStrengthScatterChart } from './studyProgress/charts/strengthScatterChart'
import { renderStudyHeatmapChart } from './studyProgress/charts/activityCharts'

const router = useRouter()
const theme = useTheme()
const { setStudyViewCollectionIds } = useStudyViewCollection()

const {
  categories,
  selectableCollections,
  selectedCollectionIds,
  selectedCollections,
  chartData,
  stats,
  loadData,
  saveSelection
} = useProgressData()

const syncing = ref(false)

// --- Overview and "study next" ----------------------------------------------

const tiers = computed(() =>
  tierCountsWithNew(strengthBuckets(chartData.value.progress), newCardCount(chartData.value))
)
const weakCollections = computed(() =>
  weakestCollections(selectedCollections.value, chartData.value.items, chartData.value.progress)
)
const hardCards = computed(() => hardestCards(chartData.value.progress, chartData.value.items))

// The heatmap looks at the last 30 days; with no study in that window it
// would be an empty grid, so it says so instead.
const noRecentStudy = computed(() => {
  const since = startOfDay(subDays(new Date(), 29))
  return recentLogs(chartData.value.logs, since).length
    ? undefined
    : 'No study in the last 30 days — this fills in as you study'
})

const goToStudy = (collectionId: string) => {
  setStudyViewCollectionIds([collectionId])
  router.push({ name: 'study', params: { id: collectionId } })
}

const openCard = (card: HardCard) => {
  router.push({ name: 'collectionItemView', params: { id: card.collectionId, itemId: card.id } })
}

// --- Charts -------------------------------------------------------------------

const dailyStrengthChartRef = ref<HTMLElement>()
const studyHeatmapChartRef = ref<HTMLElement>()
const timelineChartRef = ref<HTMLElement>()
const compositionChartRef = ref<HTMLElement>()
const strengthScatterChartRef = ref<HTMLElement>()

const showCardTitles = ref(false)
const timelineStartDate = ref(format(subDays(new Date(), 29), 'yyyy-MM-dd'))
const timelineEndDate = ref(format(new Date(), 'yyyy-MM-dd'))

const ctx: ChartContext = {
  registry: createChartRegistry(),
  palette: createChartPalette(theme)
}

// Binds a chart's render to its container element, skipping it while the
// element is not mounted yet.
const draw = (el: Ref<HTMLElement | undefined>, render: (el: HTMLElement) => void) => () => {
  if (el.value) render(el.value)
}

const renderTimeline = draw(timelineChartRef, el =>
  renderTimelineChart(ctx, el, chartData.value, {
    start: timelineStartDate.value,
    end: timelineEndDate.value
  })
)

const chartRenderers = [
  draw(dailyStrengthChartRef, el => renderDailyStrengthChart(ctx, el, chartData.value)),
  draw(studyHeatmapChartRef, el => renderStudyHeatmapChart(ctx, el, chartData.value)),
  renderTimeline,
  draw(compositionChartRef, el => renderCompositionChart(ctx, el, chartData.value)),
  draw(strengthScatterChartRef, el =>
    renderStrengthScatterChart(ctx, el, chartData.value, {
      showCardTitles: () => showCardTitles.value
    })
  )
]

// One chart per frame, so a full refresh never blocks the main thread.
const renderCharts = () => {
  applyGlobalChartTheme(ctx.palette)
  let i = 0
  const next = () => {
    const render = chartRenderers[i++]
    if (!render) return
    render()
    requestAnimationFrame(next)
  }
  requestAnimationFrame(next)
}

watch(chartData, renderCharts)
watch([timelineStartDate, timelineEndDate], renderTimeline)

// Chart colors are baked in at creation and the render functions reuse cached
// instances via setData, so a theme switch has to tear the charts down rather
// than just re-running the renders.
watch(() => theme.global.name.value, () => {
  ctx.registry.destroyAll()
  renderCharts()
})

const syncAndReload = async () => {
  syncing.value = true
  await syncAll()
  await loadData()
  syncing.value = false
}

const goBack = () => {
  router.push({ name: 'collections' })
}

onMounted(loadData)
onUnmounted(() => ctx.registry.destroyAll())
</script>

<style scoped>
.progress-view {
  min-height: 100vh;
  padding-bottom: 48px;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 24px 8px;
}

.progress-header__title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.progress-header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.progress-header__controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.collection-select {
  width: 340px;
}

.progress-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 24px 0;
}

.progress-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
  gap: 20px;
}

.chart {
  min-height: 320px;
}

.chart-heatmap {
  min-height: unset;
}


.date-range-filter {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.date-range-filter :deep(.v-text-field) {
  width: 150px;
}

@media (max-width: 1024px) {
  .progress-grid {
    grid-template-columns: 1fr;
  }

  .collection-select {
    width: 100%;
  }
}
</style>
