<template>
  <div class="progress-view">
    <!-- Header -->
    <div class="progress-header">
      <div>
        <h1>Study Progress</h1>
        <p class="subtitle">Track your learning journey</p>
      </div>
      <div class="header-actions">
        <v-btn
          :icon="syncing ? undefined : 'mdi-sync'"
          :loading="syncing"
          variant="text"
          title="Sync latest data"
          @click="syncAndReload"
        />
        <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
      </div>
    </div>

    <!-- Collection Filter -->
    <div class="collection-filter-bar">
      <CollectionMultiSelect
        v-model="selectedCollectionIds"
        :collections="selectableCollections"
        :categories="categories"
        label="Collections"
        density="compact"
        hide-details
        class="collection-select"
        name="collection-filter-no-autocomplete"
        @update:model-value="saveSelection"
      />
    </div>

    <ProgressStats :stats="stats" />

    <!-- Charts -->
    <div class="charts-container">
      <ChartCard title="Weak vs Strong Cards">
        <div ref="accuracyChartRef" class="chart"></div>
      </ChartCard>

      <ChartCard title="Cards by Strength">
        <div ref="strengthChartRef" class="chart"></div>
      </ChartCard>

      <ChartCard
        title="Peak Study Hours"
        subtitle="Average attempts in each hour of the day (last 30 days)"
      >
        <div ref="studyHoursChartRef" class="chart"></div>
      </ChartCard>

      <ChartCard
        title="Most Active Days"
        subtitle="Average attempts on each day of the week (last 30 days)"
      >
        <div ref="studyDaysChartRef" class="chart"></div>
      </ChartCard>

      <ChartCard title="Study History" subtitle="Drag across the chart to zoom into a range">
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
        title="Study Heatmap"
        subtitle="Attempts by day of month and hour — darker means more study (last 30 days)"
      >
        <div ref="studyHeatmapChartRef" class="chart chart-heatmap"></div>
      </ChartCard>

      <ChartCard
        full-width
        title="Collection Overview"
        subtitle="Strength, revisions, and card coverage per collection"
      >
        <template #actions>
          <v-btn-toggle
            v-model="collectionOverviewSortBy"
            mandatory
            density="compact"
            variant="outlined"
            class="sort-toggle"
            @update:model-value="renderCollectionOverview"
          >
            <v-btn value="name" size="small">Name</v-btn>
            <v-btn value="strength" size="small">Strength</v-btn>
            <v-btn value="revisions" size="small">Revisions</v-btn>
            <v-btn value="revised" size="small">Revised</v-btn>
            <v-btn value="notRevised" size="small">Not Revised</v-btn>
          </v-btn-toggle>
        </template>
        <div class="chart-hscroll">
          <div
            ref="collectionOverviewChartRef"
            class="chart"
            :style="{ width: collectionOverviewWidth }"
          ></div>
        </div>
      </ChartCard>

      <ChartCard
        full-width
        title="Strength Composition Over Time"
        subtitle="How your card distribution shifted across strength tiers over time"
      >
        <div ref="compositionChartRef" class="chart"></div>
      </ChartCard>

      <ChartCard
        full-width
        title="Average Strength Per Day"
        subtitle="Your overall strength each day, averaged over all cards — cards never revised count as 0"
      >
        <div ref="dailyStrengthChartRef" class="chart"></div>
      </ChartCard>

      <ChartCard
        full-width
        title="Strength vs Attempts"
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

      <ChartCard full-width title="Most Challenging Cards">
        <div class="chart-scroll-container">
          <div ref="challengingChartRef" class="chart"></div>
        </div>
      </ChartCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import { format, subDays } from 'date-fns'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { syncAll } from '@/database'
import CollectionMultiSelect from '@/shared/components/CollectionMultiSelect.vue'
import ChartCard from './studyProgress/components/ChartCard.vue'
import ProgressStats from './studyProgress/components/ProgressStats.vue'
import { useProgressData } from './studyProgress/composables/useProgressData'
import {
  applyGlobalChartTheme,
  createChartPalette
} from './studyProgress/charts/chartTheme'
import { createChartRegistry, type ChartContext } from './studyProgress/charts/chartRegistry'
import {
  renderAccuracyChart,
  renderStrengthChart
} from './studyProgress/charts/strengthCharts'
import { renderTimelineChart } from './studyProgress/charts/timelineChart'
import { renderChallengingChart } from './studyProgress/charts/challengingChart'
import { renderCompositionChart } from './studyProgress/charts/compositionChart'
import { renderDailyStrengthChart } from './studyProgress/charts/dailyStrengthChart'
import { renderStrengthScatterChart } from './studyProgress/charts/strengthScatterChart'
import {
  renderStudyDaysChart,
  renderStudyHeatmapChart,
  renderStudyHoursChart
} from './studyProgress/charts/activityCharts'
import {
  renderCollectionOverviewChart,
  type CollectionOverviewSort
} from './studyProgress/charts/collectionOverviewChart'

const router = useRouter()
const theme = useTheme()

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

const accuracyChartRef = ref<HTMLElement>()
const strengthChartRef = ref<HTMLElement>()
const timelineChartRef = ref<HTMLElement>()
const challengingChartRef = ref<HTMLElement>()
const compositionChartRef = ref<HTMLElement>()
const dailyStrengthChartRef = ref<HTMLElement>()
const strengthScatterChartRef = ref<HTMLElement>()
const studyHoursChartRef = ref<HTMLElement>()
const studyDaysChartRef = ref<HTMLElement>()
const studyHeatmapChartRef = ref<HTMLElement>()
const collectionOverviewChartRef = ref<HTMLElement>()

// Chart-local controls.
const showCardTitles = ref(false)
const collectionOverviewSortBy = ref<CollectionOverviewSort>('strength')
// Width of the (scrollable) collection overview chart; fills the container when
// there are few collections, and grows past it — scrolling — when there are many.
const collectionOverviewWidth = ref('100%')
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

const renderCollectionOverview = draw(collectionOverviewChartRef, el => {
  const width = renderCollectionOverviewChart(ctx, el, chartData.value, {
    collections: selectedCollections.value,
    sortBy: collectionOverviewSortBy.value
  })
  if (width) collectionOverviewWidth.value = width
})

const chartRenderers = [
  draw(accuracyChartRef, el => renderAccuracyChart(ctx, el, chartData.value)),
  draw(strengthChartRef, el => renderStrengthChart(ctx, el, chartData.value)),
  renderTimeline,
  draw(challengingChartRef, el => renderChallengingChart(ctx, el, chartData.value)),
  draw(compositionChartRef, el => renderCompositionChart(ctx, el, chartData.value)),
  draw(dailyStrengthChartRef, el => renderDailyStrengthChart(ctx, el, chartData.value)),
  draw(strengthScatterChartRef, el =>
    renderStrengthScatterChart(ctx, el, chartData.value, {
      showCardTitles: () => showCardTitles.value
    })
  ),
  draw(studyHoursChartRef, el => renderStudyHoursChart(ctx, el, chartData.value)),
  draw(studyDaysChartRef, el => renderStudyDaysChart(ctx, el, chartData.value)),
  draw(studyHeatmapChartRef, el => renderStudyHeatmapChart(ctx, el, chartData.value)),
  renderCollectionOverview
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
  background: transparent;
  padding-bottom: 40px;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background-color: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.progress-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.collection-filter-bar {
  padding: 12px 20px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.collection-select {
  max-width: 600px;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 24px;
  padding: 0 20px;
}

.chart {
  min-height: 350px;
}

.chart-heatmap {
  min-height: unset;
}

.sort-toggle {
  flex-shrink: 0;
}

.date-range-filter {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.date-range-filter :deep(.v-text-field) {
  width: 150px;
}

.chart-scroll-container {
  max-height: 500px;
  overflow-y: auto;
}

.chart-hscroll {
  overflow-x: auto;
}

@media (max-width: 1024px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
}
</style>
