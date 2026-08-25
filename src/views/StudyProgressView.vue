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

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ avgRevisionsToMaster }}</div>
        <div class="stat-label">Revisions to Master</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalAttempts }}</div>
        <div class="stat-label">Total Attempts</div>
      </div>
      <div class="stat-card projection-card projection-card--alt">
        <div class="projection-icon">
          <v-icon icon="mdi-cards-outline" size="28" />
        </div>
        <div class="projection-body">
          <div class="projection-value">{{ projectedAttemptsToFinish.toLocaleString() }}</div>
          <div class="projection-label">Estimated revisions to master all cards</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ cardsLearned }}</div>
        <div class="stat-label">Cards Learned</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalCards }}</div>
        <div class="stat-label">Total Cards</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-container">
      <div class="chart-wrapper">
        <h3>Weak vs Strong Cards</h3>
        <div ref="accuracyChartRef" class="chart"></div>
      </div>

      <div class="chart-wrapper">
        <h3>Cards by Strength</h3>
        <div ref="strengthChartRef" class="chart"></div>
      </div>

      <div class="chart-wrapper">
        <h3>Peak Study Hours</h3>
        <p class="chart-subtitle">Which hours of the day you study the most (last 30 days)</p>
        <div ref="studyHoursChartRef" class="chart"></div>
      </div>

      <div class="chart-wrapper">
        <h3>Most Active Days</h3>
        <p class="chart-subtitle">Which days of the week you study the most (last 30 days)</p>
        <div ref="studyDaysChartRef" class="chart"></div>
      </div>

      <div class="chart-wrapper">
        <div class="chart-header-row">
          <div>
            <h3>Study History</h3>
            <p class="chart-subtitle">Drag across the chart to zoom into a range</p>
          </div>
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
        </div>
        <div ref="timelineChartRef" class="chart"></div>
      </div>

      <div class="chart-wrapper">
        <h3>Study Heatmap</h3>
        <p class="chart-subtitle">Attempts by day of month and hour — darker means more study (last 30 days)</p>
        <div ref="studyHeatmapChartRef" class="chart chart-heatmap"></div>
      </div>

      <div class="chart-wrapper full-width">
        <div class="chart-header-row">
          <div>
            <h3>Collection Overview</h3>
            <p class="chart-subtitle">Strength, revisions, and card coverage per collection</p>
          </div>
          <v-btn-toggle
            v-model="collectionOverviewSortBy"
            mandatory
            density="compact"
            variant="outlined"
            class="sort-toggle"
            @update:model-value="renderCollectionOverviewChart"
          >
            <v-btn value="name" size="small">Name</v-btn>
            <v-btn value="strength" size="small">Strength</v-btn>
            <v-btn value="revisions" size="small">Revisions</v-btn>
            <v-btn value="revised" size="small">Revised</v-btn>
            <v-btn value="notRevised" size="small">Not Revised</v-btn>
          </v-btn-toggle>
        </div>
        <div class="chart-hscroll">
          <div
            ref="collectionOverviewChartRef"
            class="chart"
            :style="{ width: collectionOverviewWidth }"
          ></div>
        </div>
      </div>

      <div class="chart-wrapper full-width">
        <h3>Strength Composition Over Time</h3>
        <p class="chart-subtitle">How your card distribution shifted across strength tiers over time</p>
        <div ref="compositionChartRef" class="chart"></div>
      </div>

      <div class="chart-wrapper full-width">
        <h3>Average Strength Per Day</h3>
        <p class="chart-subtitle">Your overall strength each day, averaged over all cards — cards never revised count as 0</p>
        <div ref="dailyStrengthChartRef" class="chart"></div>
      </div>

      <div class="chart-wrapper full-width">
        <div class="chart-header-row">
          <div>
            <h3>Strength vs Attempts</h3>
            <p class="chart-subtitle">Each dot is one card after a revision — strength tends to climb the more you revise it</p>
          </div>
          <v-checkbox
            v-model="showCardTitles"
            label="Show card titles"
            density="compact"
            hide-details
            class="flex-shrink-0"
          />
        </div>
        <div ref="strengthScatterChartRef" class="chart"></div>
      </div>

      <div class="chart-wrapper full-width">
        <h3>Most Challenging Cards</h3>
        <div class="chart-scroll-container">
          <div ref="challengingChartRef" class="chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { parseISO, subDays, format, eachDayOfInterval } from 'date-fns'
import { useRouter } from 'vue-router'
import Highcharts from 'highcharts'
import { useTheme } from 'vuetify'
import 'highcharts/modules/heatmap'
import 'highcharts/highcharts-more'
import {
  getAllAttemptLogs,
  getAllCardProgress,
  getLearningItems,
  getCollections,
  getCategories,
  syncAll
} from '../database'
import type { AttemptLog, CardProgress, LearningItem, Collection, Category } from '../database/types'
import CollectionMultiSelect from '../shared/components/CollectionMultiSelect.vue'
import {
  SCORED_TIERS,
  STRENGTH_TIER_META,
  STRENGTH_TIER_FLOORS,
  strengthTier,
  isAtLeastTier,
  clampStrength,
  type ScoredTier,
  type StrengthTier
} from '@/utils/strength'

const STORAGE_KEY = 'studyProgress_selectedCollections'

const router = useRouter()
const accuracyChartRef = ref<HTMLElement>()
const strengthChartRef = ref<HTMLElement>()
const timelineChartRef = ref<HTMLElement>()
const challengingChartRef = ref<HTMLElement>()
const compositionChartRef = ref<HTMLElement>()
const dailyStrengthChartRef = ref<HTMLElement>()
const strengthScatterChartRef = ref<HTMLElement>()
const showCardTitles = ref(false)
const studyHoursChartRef = ref<HTMLElement>()
const studyDaysChartRef = ref<HTMLElement>()
const studyHeatmapChartRef = ref<HTMLElement>()
const collectionOverviewChartRef = ref<HTMLElement>()
// width of the (scrollable) collection overview chart; fills the container when
// there are few collections, and grows past it — scrolling — when there are many
const collectionOverviewWidth = ref('100%')
const collectionOverviewSortBy = ref<'name' | 'strength' | 'revisions' | 'revised' | 'notRevised'>('strength')
const timelineStartDate = ref(format(subDays(new Date(), 29), 'yyyy-MM-dd'))
const timelineEndDate = ref(format(new Date(), 'yyyy-MM-dd'))

const totalAttempts = ref(0)
const cardsLearned = ref(0)
const avgRevisionsToMaster = ref(0)
const totalCards = ref(0)
const projectedAttemptsToFinish = ref(0)
const syncing = ref(false)

const collections = ref<Collection[]>([])
const categories = ref<Category[]>([])
const selectedCollectionIds = ref<string[]>([])

// CollectionMultiSelect requires a resolved id on every entry.
const selectableCollections = computed(() =>
  collections.value.filter((c): c is Collection & { id: string } => !!c.id)
)

const allAttemptLogs = ref<AttemptLog[]>([])
const allCardProgress = ref<CardProgress[]>([])
const allLearningItems = ref<LearningItem[]>([])

let chartInstances: Record<string, Highcharts.Chart> = {}
// Dates behind the timeline chart's categories; refreshed on each render so
// the tooltip formatter (bound once at chart creation) stays accurate.
let timelineDates: string[] = []

// ── domain constants & helpers ─────────────────────────────────────────────

// Highcharts renders SVG presentation attributes, which do not resolve CSS
// custom properties — passing `var(--v-theme-*)` through to a chart option
// silently yields no color. So every chart color is read out of the active
// Vuetify theme as a concrete value at render time instead.
const theme = useTheme()
const c = (token: string) => theme.current.value.colors[token] ?? '#000000'
const alpha = (token: string, a: number) => {
  const hex = c(token).replace('#', '')
  const n = parseInt(hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// Chart color for a strength tier, resolved from the shared tier table.
const tierColor = (tier: StrengthTier) => c(STRENGTH_TIER_META[tier].scale)

// Tier color for a 0–100 percentage.
const tierColorForPct = (pct: number) => tierColor(strengthTier(pct / 100))

// An empty count for every scored tier, ready to be incremented.
const emptyTierCounts = (): Record<ScoredTier, number> =>
  Object.fromEntries(SCORED_TIERS.map(t => [t, 0])) as Record<ScoredTier, number>

// Charts read the scale low→high and put never-studied cards last, rather than
// leading with them as STRENGTH_TIERS does for the distribution bar.
const CHART_TIER_ORDER: StrengthTier[] = [...SCORED_TIERS, 'new']

const tierCountsWithNew = (
  buckets: Record<ScoredTier, number>,
  newCards: number
): Record<StrengthTier, number> => ({ ...buckets, new: newCards })

/**
 * Dashed lines marking where each strength tier begins, labelled with the tier
 * name. `from` skips the lower tiers — a y-axis starting at 0 does not need a
 * line drawn on its own baseline.
 */
const tierPlotLines = (opts: { from?: ScoredTier; labelY: number }) => {
  const start = opts.from ? SCORED_TIERS.indexOf(opts.from) : 0
  return SCORED_TIERS.slice(start).map(tier => ({
    value: STRENGTH_TIER_FLOORS[tier],
    color: tierColor(tier),
    width: 1,
    dashStyle: 'Dash',
    zIndex: 3,
    label: {
      text: STRENGTH_TIER_META[tier].label,
      align: 'right',
      x: -6,
      y: opts.labelY,
      style: { color: c(STRENGTH_TIER_META[tier].scaleText), fontSize: '11px', fontWeight: '600' }
    }
  }))
}

const gridLineColor = () => alpha('on-surface', 0.08)
const axisLineColor = () => alpha('on-surface', 0.2)
const mutedTextColor = () => alpha('on-surface', 0.6)

// Hour-of-day labels: '12am', '1am', … '12pm', … '11pm'
const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
})

// Chronological comparator for anything carrying a created_at ISO timestamp.
const byCreatedAt = (a: { created_at: string }, b: { created_at: string }) =>
  parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime()

// Group attempt logs by their card (learning item) id.
const groupLogsByCard = (logs: AttemptLog[]) => {
  const map = new Map<string, AttemptLog[]>()
  for (const log of logs) {
    const list = map.get(log.learning_item_id)
    if (list) list.push(log)
    else map.set(log.learning_item_id, [log])
  }
  return map
}

// Create a Highcharts chart and stash it under `key`. Centralizes the loose
// options cast the chart configs rely on (formatter `this`, dashStyle strings,
// colorByPoint, etc.) so the individual render functions stay cast-free.
const createChart = (key: string, el: HTMLElement, options: unknown) => {
  const chart = Highcharts.chart(el, options as Highcharts.Options)
  chartInstances[key] = chart
  return chart
}

// ── derived filtered data ──────────────────────────────────────────────────

const filteredItemIds = computed(() => {
  if (isAllSelected.value) return new Set(allLearningItems.value.map((i: LearningItem) => i.id!))
  return new Set(
    allLearningItems.value
      .filter((i: LearningItem) => selectedCollectionIds.value.includes(i.collectionId))
      .map((i: LearningItem) => i.id!)
  )
})

const filteredAttemptLogs = computed(() =>
  allAttemptLogs.value.filter((l: AttemptLog) => filteredItemIds.value.has(l.learning_item_id))
)

const filteredCardProgress = computed(() =>
  allCardProgress.value.filter((p: CardProgress) => filteredItemIds.value.has(p.learning_item_id))
)

const filteredLearningItems = computed(() =>
  allLearningItems.value.filter((i: LearningItem) => filteredItemIds.value.has(i.id!))
)

const isAllSelected = computed(
  () => selectedCollectionIds.value.length === 0 || selectedCollectionIds.value.length === collections.value.length
)

// ── collection selection ───────────────────────────────────────────────────

const saveSelection = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCollectionIds.value))
}

const restoreSelection = (ids: string[]) => {
  const valid = ids.filter(id => collections.value.some(c => c.id === id))
  selectedCollectionIds.value = valid
}

// ── data loading ───────────────────────────────────────────────────────────

const loadData = async () => {
  allAttemptLogs.value = await getAllAttemptLogs()
  allCardProgress.value = await getAllCardProgress()
  collections.value = await getCollections()
  categories.value = await getCategories()

  const itemsPerCollection = await Promise.all(
    collections.value.filter(c => c.id).map(c => getLearningItems(c.id!))
  )
  allLearningItems.value = itemsPerCollection.flat()

  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try { restoreSelection(JSON.parse(saved)) } catch { /* ignore */ }
  }

  updateStats()
  renderCharts()
}

const updateStats = () => {
  totalAttempts.value = filteredAttemptLogs.value.length
  // "Learned" = out of the weak tiers, i.e. 'good' or better.
  cardsLearned.value = filteredCardProgress.value.filter(p => isAtLeastTier(p.strength_score, 'good')).length

  // Avg revisions to master: for each card, simulate cumulative strength from
  // logs sorted by date and count how many attempts until it first masters.
  const logsByCard = groupLogsByCard(filteredAttemptLogs.value)
  const masteredCounts: number[] = []
  for (const logs of logsByCard.values()) {
    const sorted = logs.slice().sort(byCreatedAt)
    let strength = 0
    for (let i = 0; i < sorted.length; i++) {
      strength = clampStrength(strength + sorted[i]!.ease_score)
      if (isAtLeastTier(strength, 'mastered')) { masteredCounts.push(i + 1); break }
    }
  }
  avgRevisionsToMaster.value = masteredCounts.length > 0
    ? Math.round(masteredCounts.reduce((s, v) => s + v, 0) / masteredCounts.length * 10) / 10
    : 0

  // Projection: how much work remains to master every card.
  totalCards.value = filteredLearningItems.value.length
  const masteredCards = filteredCardProgress.value.filter(p => isAtLeastTier(p.strength_score, 'mastered')).length
  const remainingCards = Math.max(0, totalCards.value - masteredCards)
  projectedAttemptsToFinish.value = Math.round(remainingCards * avgRevisionsToMaster.value)
}

watch([filteredAttemptLogs, filteredCardProgress], () => {
  updateStats()
  renderCharts()
})

watch(showCardTitles, () => renderStrengthScatterChart())
watch([timelineStartDate, timelineEndDate], () => renderTimelineChart())

// ── chart helpers ──────────────────────────────────────────────────────────

const computeStrengthBuckets = () => {
  const buckets = emptyTierCounts()
  // Every card here has a progress row, so no score lands in the 'new' tier.
  for (const p of filteredCardProgress.value) buckets[strengthTier(p.strength_score) as ScoredTier]++
  return buckets
}

// Cards never studied: no attempt log AND no card progress entry.
const computeNewCardCount = () => {
  const studiedIds = new Set<string>()
  filteredCardProgress.value.forEach(p => studiedIds.add(p.learning_item_id))
  filteredAttemptLogs.value.forEach(l => studiedIds.add(l.learning_item_id))
  return filteredLearningItems.value.filter(i => !studiedIds.has(i.id!)).length
}

const renderCollectionOverviewChart = () => {
  if (!collectionOverviewChartRef.value) return

  const baseCollections = isAllSelected.value
    ? [...collections.value]
    : collections.value.filter(c => selectedCollectionIds.value.includes(c.id!))

  // Build metric maps first so we can sort by computed values
  type CollectionMetrics = { strength: number; revisions: number; revised: number; notRevised: number }
  const metricsMap = new Map<string, CollectionMetrics>()
  for (const collection of baseCollections) {
    const items = allLearningItems.value.filter(i => i.collectionId === collection.id)
    const itemIds = new Set(items.map(i => i.id!))
    const logs = allAttemptLogs.value.filter(l => itemIds.has(l.learning_item_id))
    const progress = allCardProgress.value.filter(p => itemIds.has(p.learning_item_id))
    const revisedIds = new Set(logs.map(l => l.learning_item_id))
    const avgStrength = progress.length > 0
      ? (progress.reduce((sum, p) => sum + p.strength_score, 0) / progress.length) * 100
      : 0
    metricsMap.set(collection.id!, {
      strength: Math.round(avgStrength),
      revisions: logs.length,
      revised: revisedIds.size,
      notRevised: Math.max(0, items.length - revisedIds.size)
    })
  }

  const sortKey = collectionOverviewSortBy.value
  const visibleCollections = baseCollections.sort((a, b) => {
    if (sortKey === 'name') return a.title.localeCompare(b.title)
    const ma = metricsMap.get(a.id!)!
    const mb = metricsMap.get(b.id!)!
    return mb[sortKey] - ma[sortKey]
  })

  if (visibleCollections.length === 0) return

  const categories = visibleCollections.map(c =>
    c.title.length > 20 ? c.title.substring(0, 20) + '…' : c.title
  )
  // full (untruncated) titles for the tooltip, indexed by point position
  const fullTitles = visibleCollections.map(c => c.title)

  const strengthData: { y: number; color: string }[] = []
  const revisionsData: number[] = []
  const revisedData: number[] = []
  const notRevisedData: number[] = []

  for (const collection of visibleCollections) {
    const m = metricsMap.get(collection.id!)!
    strengthData.push({ y: m.strength, color: tierColorForPct(m.strength) })
    revisionsData.push(m.revisions)
    revisedData.push(m.revised)
    notRevisedData.push(m.notRevised)
  }

  if (chartInstances.collectionOverview) {
    chartInstances.collectionOverview.destroy()
    delete chartInstances.collectionOverview
  }

  // give each collection ~120px; the chart fills the container when it fits and
  // grows past it (scrolling horizontally) when there are many collections
  const minPlotWidth = visibleCollections.length * 120
  collectionOverviewWidth.value = `max(100%, ${minPlotWidth}px)`

  createChart('collectionOverview', collectionOverviewChartRef.value, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: { categories, crosshair: true },
    yAxis: [
      {
        title: { text: 'Count' },
        min: 0,
        gridLineWidth: 1,
        gridLineColor: gridLineColor()
      },
      {
        title: { text: 'Avg Strength (%)' },
        min: 0,
        max: 100,
        opposite: true,
        gridLineWidth: 0
      }
    ],
    series: [
      { name: 'Avg Strength (%)', data: strengthData, colorByPoint: true, type: 'column', yAxis: 1 },
      { name: 'Total Revisions', data: revisionsData, color: c('chartPrimary'), type: 'column' },
      { name: 'Cards Revised', data: revisedData, color: c('chartSecondary'), type: 'column' },
      { name: 'Cards Not Revised', data: notRevisedData, color: c('chartNeutral'), type: 'column' }
    ],
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: {
      shared: true,
      formatter: function(this: any) {
        const title = fullTitles[this.points?.[0]?.point?.index] ?? this.x
        let s = `<b>${title}</b><br/>`
        this.points.forEach((p: any) => {
          const suffix = p.series.name === 'Avg Strength (%)' ? '%' : ''
          s += `<span style="color:${p.color}">●</span> ${p.series.name}: <b>${p.y}${suffix}</b><br/>`
        })
        return s
      }
    }
  })
}

const renderCharts = () => {
  // Highcharts' built-in text colors are near-black and unreadable on a dark
  // surface, so axis/legend/title text is pinned to the theme's foreground
  // rather than left to the library default.
  const text = { color: alpha('on-surface', 0.87) }
  const muted = { color: mutedTextColor() }
  Highcharts.setOptions({
    chart: { backgroundColor: 'transparent', style: { color: alpha('on-surface', 0.87) } },
    title: { style: text },
    subtitle: { style: muted },
    xAxis: {
      lineColor: axisLineColor(),
      tickColor: axisLineColor(),
      labels: { style: muted },
      title: { style: muted }
    },
    yAxis: {
      lineColor: axisLineColor(),
      labels: { style: muted },
      title: { style: muted }
    },
    legend: { itemStyle: text, itemHoverStyle: { color: c('primary') } },
    tooltip: {
      backgroundColor: c('surface'),
      style: { color: alpha('on-surface', 0.87) },
      borderColor: alpha('on-surface', 0.2)
    },
    plotOptions: { series: { dataLabels: { style: text } } }
  })
  const renders = [
    renderAccuracyChart,
    renderStrengthChart,
    renderTimelineChart,
    renderChallengingChart,
    renderCompositionChart,
    renderDailyStrengthChart,
    renderStrengthScatterChart,
    renderStudyHoursChart,
    renderStudyDaysChart,
    renderStudyHeatmapChart,
    renderCollectionOverviewChart,
  ]
  let i = 0
  const next = () => {
    const fn = renders[i++]
    if (fn) { fn(); requestAnimationFrame(next) }
  }
  requestAnimationFrame(next)
}

const renderAccuracyChart = () => {
  if (!accuracyChartRef.value) return
  const buckets = computeStrengthBuckets()
  const newCards = computeNewCardCount()
  const weakCards = buckets.weak + buckets.fair
  const strongCards = buckets.good + buckets.mastered
  const total = filteredCardProgress.value.length + newCards
  const weakPct = total > 0 ? Math.round((weakCards / total) * 100) : 0
  const strongPct = total > 0 ? Math.round((strongCards / total) * 100) : 0
  const newPct = total > 0 ? Math.round((newCards / total) * 100) : 0
  const subtitle = `${weakPct}% weak · ${strongPct}% strong · ${newPct}% new`
  const counts = tierCountsWithNew(buckets, newCards)
  const data = CHART_TIER_ORDER.map(tier => ({
    name: STRENGTH_TIER_META[tier].label,
    y: counts[tier],
    color: tierColor(tier)
  }))
  if (chartInstances.accuracy) {
    chartInstances.accuracy.series[0]?.setData(data, true, { duration: 300 })
    chartInstances.accuracy.setTitle(null as any, { text: subtitle })
    return
  }
  createChart('accuracy', accuracyChartRef.value, {
    chart: { type: 'pie' },
    title: { text: '' },
    subtitle: { text: subtitle, style: { color: mutedTextColor(), fontSize: '13px' } },
    series: [{ name: 'Cards', innerSize: '55%', data, type: 'pie' }],
    plotOptions: { pie: { dataLabels: { enabled: true, format: '{point.percentage:.0f}%', style: { fontSize: '13px', fontWeight: '600' } } } },
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y} cards</b> ({point.percentage:.1f}%)' }
  })
}

const renderStrengthChart = () => {
  if (!strengthChartRef.value) return
  const counts = tierCountsWithNew(computeStrengthBuckets(), computeNewCardCount())
  const data = CHART_TIER_ORDER.map(tier => counts[tier])
  if (chartInstances.strength) {
    chartInstances.strength.series[0]?.setData(data, true, { duration: 300 })
    return
  }
  createChart('strength', strengthChartRef.value, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: { categories: CHART_TIER_ORDER.map(t => STRENGTH_TIER_META[t].label), crosshair: true },
    yAxis: { title: { text: 'Number of Cards' }, min: 0, gridLineWidth: 1, gridLineColor: gridLineColor() },
    series: [{ name: 'Cards', data, colorByPoint: true, colors: CHART_TIER_ORDER.map(tierColor), type: 'column' }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}</b> cards' }
  })
}

const renderTimelineChart = () => {
  if (!timelineChartRef.value) return

  const start = parseISO(timelineStartDate.value)
  const end = parseISO(timelineEndDate.value)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return

  const dateMap = new Map<string, number>()
  eachDayOfInterval({ start, end }).forEach(d => dateMap.set(format(d, 'yyyy-MM-dd'), 0))

  filteredAttemptLogs.value.forEach(log => {
    const d = format(parseISO(log.created_at), 'yyyy-MM-dd')
    if (!dateMap.has(d)) return // outside the selected range
    dateMap.set(d, dateMap.get(d)! + 1)
  })

  const dates = Array.from(dateMap.keys())
  const counts = Array.from(dateMap.values())

  const movingAvg = counts.map((_, i) => {
    const window = counts.slice(Math.max(0, i - 4), i + 1)
    return Math.round((window.reduce((s, v) => s + v, 0) / window.length) * 10) / 10
  })

  timelineDates = dates
  const dateLabels = dates.map(d => format(parseISO(d), 'MMM d, yy'))
  const tickInterval = Math.max(1, Math.round(dates.length / 6))
  if (chartInstances.timeline) {
    chartInstances.timeline.zoomOut()
    chartInstances.timeline.xAxis[0]?.update({ categories: dateLabels, tickInterval }, false)
    chartInstances.timeline.series[0]?.setData(counts, false, { duration: 300 })
    chartInstances.timeline.series[1]?.setData(movingAvg, true, { duration: 300 })
    return
  }
  createChart('timeline', timelineChartRef.value, {
    chart: { type: 'spline', zooming: { type: 'x' } },
    title: { text: '' },
    xAxis: { categories: dateLabels, tickInterval },
    yAxis: { title: { text: 'Attempts' }, min: 0, gridLineWidth: 1, gridLineColor: gridLineColor() },
    series: [
      { name: 'Daily Attempts', data: counts, color: c('chartAccent'), type: 'spline', lineWidth: 2, marker: { enabled: false } },
      { name: '5-Day Avg', data: movingAvg, color: c('chartAccentMuted'), type: 'spline', lineWidth: 2.5, marker: { enabled: false }, dashStyle: 'ShortDash' }
    ],
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: {
      shared: true,
      formatter: function(this: any) {
        const dateStr = timelineDates[this.points?.[0]?.point?.index ?? 0]
        const label = dateStr ? format(parseISO(dateStr), 'EEEE, MMM d') : this.x
        let s = `<span style="font-size:11px">${label}</span><br/>`
        this.points?.forEach((p: any) => {
          s += `<span style="color:${p.color}">●</span> ${p.series.name}: <b>${p.y}</b><br/>`
        })
        return s
      }
    }
  })
}

const renderChallengingChart = () => {
  if (!challengingChartRef.value) return
  const sorted = [...filteredCardProgress.value]
    // Challenging = not yet learned, i.e. still below the 'good' tier.
    .filter(p => !isAtLeastTier(p.strength_score, 'good') && filteredLearningItems.value.some(i => i.id === p.learning_item_id))
    .sort((a, b) => a.strength_score - b.strength_score)
  const labels = sorted.map(p => {
    const item = filteredLearningItems.value.find(i => i.id === p.learning_item_id)
    return item!.title.substring(0, 30)
  })
  const strengths = sorted.map(p => ({
    y: Math.round(p.strength_score * 100),
    color: tierColor(strengthTier(p.strength_score))
  }))
  const rowHeight = 35
  const chartHeight = Math.max(300, sorted.length * rowHeight)
  if (chartInstances.challenging) {
    chartInstances.challenging.xAxis[0]?.setCategories(labels, false)
    chartInstances.challenging.setSize(undefined, chartHeight, false)
    chartInstances.challenging.series[0]?.setData(strengths, true, { duration: 300 })
    return
  }
  createChart('challenging', challengingChartRef.value, {
    chart: { type: 'bar', height: chartHeight },
    title: { text: '' },
    xAxis: { categories: labels },
    yAxis: { title: { text: 'Strength Score (%)' }, min: 0, max: 100, gridLineWidth: 1, gridLineColor: gridLineColor() },
    series: [{ name: 'Strength', data: strengths, colorByPoint: true }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}%</b> strength' }
  })
}


const renderCompositionChart = () => {
  if (!compositionChartRef.value || filteredAttemptLogs.value.length === 0) return
  const sortedLogs = [...filteredAttemptLogs.value].sort(byCreatedAt)
  const runningStrength = new Map<string, number>()
  const compositionSnapshots: Array<Record<ScoredTier, number>> = []
  const labels: string[] = []
  const seenCards = new Set<string>()

  sortedLogs.forEach((log, index) => {
    seenCards.add(log.learning_item_id)
    const prev = runningStrength.get(log.learning_item_id) ?? 0
    runningStrength.set(log.learning_item_id, clampStrength(prev + log.ease_score))
    if ((index + 1) % 5 === 0) {
      const buckets = emptyTierCounts()
      // Every seen card has been revised at least once, so none is 'new'.
      seenCards.forEach(id => buckets[strengthTier(runningStrength.get(id) ?? 0) as ScoredTier]++)
      compositionSnapshots.push(buckets)
      labels.push(`After ${index + 1} attempts`)
    }
  })

  const pct = (snapshot: Record<ScoredTier, number>, key: ScoredTier) => {
    const total = SCORED_TIERS.reduce((sum, t) => sum + snapshot[t], 0)
    return total > 0 ? Math.round((snapshot[key] / total) * 100) : 0
  }
  // One stacked band per scored tier, low→high.
  const tierSeries = SCORED_TIERS.map(tier => compositionSnapshots.map(s => pct(s, tier)))
  if (chartInstances.composition) {
    chartInstances.composition.xAxis[0]?.setCategories(labels, false)
    tierSeries.forEach((data, i) => {
      const isLast = i === tierSeries.length - 1
      chartInstances.composition?.series[i]?.setData(data, isLast, isLast ? { duration: 300 } : undefined)
    })
    return
  }
  createChart('composition', compositionChartRef.value, {
    chart: { type: 'areaspline' },
    title: { text: '' },
    xAxis: { categories: labels, tickInterval: Math.max(1, Math.floor(labels.length / 8)) },
    yAxis: { title: { text: 'Composition (%)' }, min: 0, max: 100, stackLabels: { enabled: false }, gridLineWidth: 1, gridLineColor: gridLineColor() },
    plotOptions: { areaspline: { stacking: 'percent', lineWidth: 0, marker: { enabled: false }, dataLabels: { enabled: false } } },
    series: SCORED_TIERS.map((tier, i) => ({
      name: STRENGTH_TIER_META[tier].label,
      data: tierSeries[i],
      color: tierColor(tier),
      type: 'areaspline'
    })),
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.percentage:.0f}%</b> {series.name}' }
  })
}

const renderDailyStrengthChart = () => {
  if (!dailyStrengthChartRef.value || filteredAttemptLogs.value.length === 0) return
  const totalCardCount = filteredLearningItems.value.length
  if (totalCardCount === 0) return

  const sortedLogs = [...filteredAttemptLogs.value].sort(byCreatedAt)

  // Group logs by calendar day, then replay them chronologically: each card's
  // strength accumulates via ease_score (clamped 0–1, same as the composition
  // chart). At the end of each day, the average counts every card — cards
  // never revised contribute 0.
  const logsByDay = new Map<string, AttemptLog[]>()
  for (const log of sortedLogs) {
    const day = format(parseISO(log.created_at), 'yyyy-MM-dd')
    if (!logsByDay.has(day)) logsByDay.set(day, [])
    logsByDay.get(day)!.push(log)
  }

  const firstDay = parseISO(format(parseISO(sortedLogs[0]!.created_at), 'yyyy-MM-dd'))
  const days = eachDayOfInterval({ start: firstDay, end: new Date() })

  const runningStrength = new Map<string, number>()
  let strengthSum = 0
  const dates: string[] = []
  const avgStrengths: number[] = []
  for (const day of days) {
    const dayKey = format(day, 'yyyy-MM-dd')
    for (const log of logsByDay.get(dayKey) ?? []) {
      const prev = runningStrength.get(log.learning_item_id) ?? 0
      const next = clampStrength(prev + log.ease_score)
      runningStrength.set(log.learning_item_id, next)
      strengthSum += next - prev
    }
    dates.push(dayKey)
    avgStrengths.push(Math.round((strengthSum / totalCardCount) * 1000) / 10)
  }

  const dateLabels = dates.map(d => format(parseISO(d), 'MMM d, yy'))
  const tickInterval = Math.max(1, Math.round(dates.length / 8))

  if (chartInstances.dailyStrength) {
    chartInstances.dailyStrength.xAxis[0]?.update({ categories: dateLabels, tickInterval }, false)
    chartInstances.dailyStrength.series[0]?.setData(avgStrengths, true, { duration: 300 })
    return
  }
  createChart('dailyStrength', dailyStrengthChartRef.value, {
    chart: { type: 'areaspline', zooming: { type: 'x' } },
    title: { text: '' },
    xAxis: { categories: dateLabels, tickInterval },
    yAxis: {
      title: { text: 'Avg Strength (%)' },
      min: 0,
      max: 100,
      gridLineWidth: 1,
      gridLineColor: gridLineColor(),
      // Starts at 'fair' — the weak tier's floor is the axis baseline.
      plotLines: tierPlotLines({ from: 'fair', labelY: -6 })
    },
    series: [{
      name: 'Avg Strength',
      data: avgStrengths,
      type: 'areaspline',
      color: c('chartPrimary'),
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, 'rgba(21, 101, 192, 0.35)'],
          [1, 'rgba(21, 101, 192, 0.02)']
        ]
      },
      lineWidth: 2.5,
      marker: { enabled: false }
    }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: {
      formatter: function(this: any) {
        const dateStr = dates[this.point?.index ?? 0]
        const label = dateStr ? format(parseISO(dateStr), 'EEEE, MMM d, yyyy') : this.x
        return `<span style="font-size:11px">${label}</span><br/><b>${this.y}%</b> average strength`
      }
    }
  })
}

const renderStrengthScatterChart = () => {
  if (!strengthScatterChartRef.value) return

  // Replay each card's attempts in chronological order, accumulating strength.
  // One dot per attempt: x = that card's attempt number (1,2,3…), y = strength %.
  const logsByCard = groupLogsByCard(filteredAttemptLogs.value)

  const idToTitle = new Map(filteredLearningItems.value.map(i => [i.id!, i.title]))

  // Raw points (one per attempt) feed the trend line; bubbles aggregate them
  // by attempt # and a 10% strength band so overlapping cards merge into one
  // sized circle (z = how many cards land there). We also collect the card
  // titles per bucket so they can be shown as labels when the checkbox is on.
  const rawPoints: [number, number][] = []
  const bucketTitles = new Map<string, string[]>()
  for (const [itemId, logs] of logsByCard) {
    const sorted = logs.slice().sort(byCreatedAt)
    let strength = 0
    sorted.forEach((log, i) => {
      strength = clampStrength(strength + log.ease_score)
      const pct = Math.round(strength * 100)
      rawPoints.push([i + 1, pct])
      const band = Math.min(100, Math.round(pct / 10) * 10) // snap to 0,10,…,100
      const key = `${i + 1}:${band}`
      if (!bucketTitles.has(key)) bucketTitles.set(key, [])
      bucketTitles.get(key)!.push(idToTitle.get(itemId) ?? 'Untitled')
    })
  }

  // Full title list, one per line, no truncation.
  const labelFor = (titles: string[]) => titles.join('<br/>')

  const bubbles = Array.from(bucketTitles.entries()).map(([key, titles]) => {
    const [x, y] = key.split(':').map(Number)
    return { x, y, z: titles.length, titleLabel: labelFor(titles) }
  })

  // Trend = average strength at each attempt number, so the line follows the
  // real learning curve (steep early, flattening later) instead of a single slope.
  // Drop the noisy tail where too few cards reached that many attempts.
  const sumByAttempt = new Map<number, { sum: number; count: number }>()
  for (const [x, y] of rawPoints) {
    const agg = sumByAttempt.get(x) ?? { sum: 0, count: 0 }
    agg.sum += y
    agg.count += 1
    sumByAttempt.set(x, agg)
  }
  const MIN_SAMPLES = 3
  const trend: [number, number][] = Array.from(sumByAttempt.entries())
    .filter(([, agg]) => agg.count >= MIN_SAMPLES)
    .sort((a, b) => a[0] - b[0])
    .map(([x, agg]) => [x, Math.round((agg.sum / agg.count) * 10) / 10])

  if (chartInstances.strengthScatter) {
    chartInstances.strengthScatter.series[0]?.setData(bubbles, false, { duration: 300 })
    chartInstances.strengthScatter.series[1]?.setData(trend, true, { duration: 300 })
    return
  }

  createChart('strengthScatter', strengthScatterChartRef.value, {
    chart: { type: 'bubble', zooming: { type: 'xy' } },
    title: { text: '' },
    xAxis: { title: { text: 'Attempt number' }, min: 1, allowDecimals: false, gridLineWidth: 0 },
    yAxis: {
      title: { text: 'Strength (%)' },
      min: 0,
      max: 100,
      gridLineWidth: 0,
      tickPositions: [0, ...SCORED_TIERS.slice(1).map(t => STRENGTH_TIER_FLOORS[t]), 100],
      // Every tier, weak included — the labels double as the axis legend here.
      plotLines: tierPlotLines({ labelY: 14 })
    },
    series: [
      {
        name: 'Cards',
        type: 'bubble',
        data: bubbles,
        color: 'rgba(120,120,120,0.45)',
        marker: { fillOpacity: 0.45, lineWidth: 0 },
        minSize: 6,
        maxSize: 48
      },
      {
        name: 'Avg strength',
        type: 'spline',
        data: trend,
        color: c('chartPrimary'),
        lineWidth: 3,
        marker: { enabled: false },
        enableMouseTracking: false,
        states: { hover: { lineWidth: 3 } }
      }
    ],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: {
      useHTML: true,
      formatter: function(this: any) {
        let s = `Attempt <b>${this.point.x}</b> · ~<b>${this.point.y}%</b> strength · <b>${this.point.z}</b> cards`
        if (showCardTitles.value && this.point.titleLabel) {
          s += `<br/><span style="color:${mutedTextColor()}">${this.point.titleLabel}</span>`
        }
        return s
      }
    }
  })
}

const renderStudyHoursChart = () => {
  if (!studyHoursChartRef.value) return
  const cutoff = subDays(new Date(), 29)
  const hourCounts = Array(24).fill(0)
  filteredAttemptLogs.value.forEach(log => {
    const date = parseISO(log.created_at)
    if (date < cutoff) return
    const hour = date.getHours()
    hourCounts[hour]++
  })
  const peak = Math.max(...hourCounts)
  const data = hourCounts.map((count) => ({
    y: count,
    color: count === peak && peak > 0 ? c('chartAccent') : c('chartAccentMuted')
  }))
  const categories = HOUR_LABELS
  if (chartInstances.studyHours) {
    chartInstances.studyHours.series[0]?.setData(data, true, { duration: 300 })
    return
  }
  createChart('studyHours', studyHoursChartRef.value, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: { categories, title: { text: 'Hour of Day' } },
    yAxis: { title: { text: 'Attempts' }, min: 0, gridLineWidth: 1, gridLineColor: gridLineColor() },
    series: [{ name: 'Attempts', data, colorByPoint: true, type: 'column' }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: {
      formatter: function(this: any) {
        return `<b>${categories[this.point.index]}</b><br/><b>${this.y}</b> attempts`
      }
    }
  })
}

const renderStudyDaysChart = () => {
  if (!studyDaysChartRef.value) return
  const cutoff = subDays(new Date(), 29)
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayCounts = Array(7).fill(0)
  filteredAttemptLogs.value.forEach(log => {
    const date = parseISO(log.created_at)
    if (date < cutoff) return
    const jsDay = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
    const monFirst = jsDay === 0 ? 6 : jsDay - 1
    dayCounts[monFirst]++
  })
  const peak = Math.max(...dayCounts)
  const data = dayCounts.map((count, i) => ({
    y: count,
    color: count === peak && peak > 0 ? c('chartPositive') : c('chartPositiveMuted'),
    name: dayNames[i]
  }))
  if (chartInstances.studyDays) {
    chartInstances.studyDays.series[0]?.setData(data, true, { duration: 300 })
    return
  }
  createChart('studyDays', studyDaysChartRef.value, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: { categories: dayNames, title: { text: 'Day of Week' } },
    yAxis: { title: { text: 'Attempts' }, min: 0, gridLineWidth: 1, gridLineColor: gridLineColor() },
    series: [{ name: 'Attempts', data, colorByPoint: true, type: 'column' }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}</b> attempts' }
  })
}

const renderStudyHeatmapChart = () => {
  if (!studyHeatmapChartRef.value) return
  const cutoff = subDays(new Date(), 29)
  const today = new Date()

  const hourCategories = HOUR_LABELS

  // days[0] = 30 days ago, days[29] = today — today renders at the right (last X index)
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(today, 29 - i)
    return { dateStr: format(d, 'yyyy-MM-dd'), dayOfMonth: d.getDate(), label: format(d, 'EEE, MMM d') }
  })
  const dayCategories = days.map(d => String(d.dayOfMonth))
  const dayLabelMap = new Map(days.map(d => [d.dayOfMonth, d.label]))
  const dayList = days.map(d => d.dayOfMonth)

  const countMap = new Map<string, number>()
  filteredAttemptLogs.value.forEach(log => {
    const date = parseISO(log.created_at)
    if (date < cutoff) return
    const key = `${format(date, 'yyyy-MM-dd')}-${date.getHours()}`
    countMap.set(key, (countMap.get(key) ?? 0) + 1)
  })

  const heatData: [number, number, number][] = []
  days.forEach((day, dayIdx) => {
    for (let h = 0; h < 24; h++) {
      heatData.push([dayIdx, h, countMap.get(`${day.dateStr}-${h}`) ?? 0])
    }
  })

  const maxVal = Math.max(...heatData.map(d => d[2]), 1)

  if (chartInstances.studyHeatmap) {
    (chartInstances.studyHeatmap as any).colorAxis[0]?.update({ max: maxVal }, false)
    chartInstances.studyHeatmap.series[0]?.setData(heatData, true, { duration: 300 })
    return
  }

  createChart('studyHeatmap', studyHeatmapChartRef.value, {
    chart: { type: 'heatmap', height: 24 * 16 + 100 },
    title: { text: '' },
    xAxis: {
      categories: dayCategories,
      title: { text: 'Day of Month' },
      labels: {
        useHTML: true,
        formatter: function(this: any) {
          return this.pos === 29
            ? `<span style="color:${c('chartAccent')};font-weight:700">${this.value}</span>`
            : `${this.value}`
        }
      }
    },
    yAxis: { categories: hourCategories, title: { text: 'Hour of Day' }, reversed: true },
    colorAxis: {
      min: 0,
      max: maxVal,
      stops: [
        [0, c('heatMin')],
        [0.01, c('heatLow')],
        [0.4, c('heatMid')],
        [1, c('heatHigh')]
      ]
    },
    series: [{
      name: 'Attempts',
      type: 'heatmap',
      borderWidth: 1,
      borderColor: 'rgba(var(--v-theme-on-surface),0.05)',
      data: heatData,
      dataLabels: { enabled: false }
    }],
    legend: { align: 'right', layout: 'vertical', verticalAlign: 'middle' },
    credits: { enabled: false },
    tooltip: {
      formatter: function(this: any) {
        const day = dayList[this.point.x] ?? -1
        const fullDate = dayLabelMap.get(day) ?? `Day ${day}`
        return `<b>${fullDate}, ${hourCategories[this.point.y]}</b><br/><b>${this.point.value}</b> attempts`
      }
    }
  })
}

const syncAndReload = async () => {
  syncing.value = true
  await syncAll()
  await loadData()
  syncing.value = false
}

const goBack = () => {
  router.push({ name: 'collections' })
}

// Chart colors are baked in at creation and the render functions reuse cached
// instances via setData, so a theme switch has to tear the charts down rather
// than just re-running the renders.
watch(() => theme.global.name.value, () => {
  Object.values(chartInstances).forEach(chart => chart.destroy())
  chartInstances = {}
  renderCharts()
})

onMounted(async () => {
  await loadData()
})

onUnmounted(() => {
  Object.values(chartInstances).forEach(chart => chart.destroy())
  chartInstances = {}
})
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
  background: linear-gradient(135deg, rgb(var(--v-theme-gradientBlueFrom)) 0%, rgb(var(--v-theme-gradientBlueTo)) 100%);
  box-shadow: 0 8px 24px rgba(21, 101, 192, 0.28);
  position: relative;
  overflow: hidden;
  border: none;
  text-align: left;
}

.projection-card--alt {
  background: linear-gradient(135deg, rgb(var(--v-theme-gradientPurpleFrom)) 0%, rgb(var(--v-theme-gradientPurpleTo)) 100%);
  box-shadow: 0 8px 24px rgba(106, 27, 154, 0.28);
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

.projection-unit {
  font-size: 1.1rem;
  font-weight: 600;
  margin-left: 2px;
  opacity: 0.85;
}

.projection-label {
  font-size: 0.85rem;
  margin-top: 6px;
  opacity: 0.9;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 24px;
  padding: 0 20px;
}

.chart-wrapper {
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.chart-wrapper h3 {
  margin: 0 0 4px;
  font-size: 1.1rem;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.chart-subtitle {
  margin: 0 0 16px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.chart-wrapper.full-width {
  grid-column: 1 / -1;
}

.chart {
  min-height: 350px;
}

.chart-heatmap {
  min-height: unset;
}

.chart-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 8px;
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
