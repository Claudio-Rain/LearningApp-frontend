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
          label="All collections"
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

      <!-- 3. Am I improving? / When do I study? -->
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
      </div>

      <!-- 4. Everything else, out of the way until asked for -->
      <div class="more-toggle">
        <v-btn
          variant="text"
          :append-icon="showMore ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          class="more-toggle__btn"
          @click="showMore = !showMore"
        >
          {{ showMore ? 'Fewer charts' : 'More charts' }}
        </v-btn>
      </div>

      <div v-if="showMore" class="progress-grid">
        <ChartCard
          full-width
          title="Collections compared"
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
          title="Strength mix over time"
          subtitle="How your cards shifted between strength levels"
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
import { computed, nextTick, ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
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
import {
  renderCollectionOverviewChart,
  type CollectionOverviewSort
} from './studyProgress/charts/collectionOverviewChart'

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
const collectionOverviewChartRef = ref<HTMLElement>()

// Collapsed by default: the page answers the main questions without them.
const showMore = ref(false)
const MORE_CHART_KEYS = ['collectionOverview', 'composition', 'strengthScatter']

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
// element is not mounted (e.g. the collapsed "more charts").
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
  draw(dailyStrengthChartRef, el => renderDailyStrengthChart(ctx, el, chartData.value)),
  draw(studyHeatmapChartRef, el => renderStudyHeatmapChart(ctx, el, chartData.value)),
  renderTimeline,
  renderCollectionOverview,
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

// Hiding the extra charts removes their elements, so their chart instances go
// too; showing them again draws fresh ones into the new elements.
watch(showMore, shown => {
  if (shown) nextTick(renderCharts)
  else MORE_CHART_KEYS.forEach(key => ctx.registry.destroy(key))
})

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

.more-toggle {
  display: flex;
  justify-content: center;
}

.more-toggle__btn {
  text-transform: none !important;
  letter-spacing: 0.01em !important;
  color: rgba(var(--v-theme-on-surface), 0.7);
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

.chart-hscroll {
  overflow-x: auto;
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
