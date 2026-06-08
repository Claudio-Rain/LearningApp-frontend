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
      <v-autocomplete
        v-model="selectedCollectionIds"
        :items="collections"
        item-title="title"
        item-value="id"
        label="Collections"
        multiple
        clearable
        chips
        closable-chips
        hide-details
        density="compact"
        variant="outlined"
        class="collection-select"
        autocomplete="off"
        name="collection-filter-no-autocomplete"
        @update:model-value="saveSelection"
      >
        <template #prepend-item>
          <v-list-item title="All collections" @click="toggleAll">
            <template #prepend>
              <v-checkbox-btn :model-value="isAllSelected" />
            </template>
          </v-list-item>
          <v-divider class="mt-1" />
        </template>
      </v-autocomplete>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ totalAttempts }}</div>
        <div class="stat-label">Total Attempts</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ cardsLearned }}</div>
        <div class="stat-label">Cards Learned</div>
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
        <h3>Study History (Last 30 Days)</h3>
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
        <div ref="collectionOverviewChartRef" class="chart"></div>
      </div>

      <div class="chart-wrapper full-width">
        <h3>Strength Composition Over Time</h3>
        <p class="chart-subtitle">How your card distribution shifted across strength tiers over time</p>
        <div ref="compositionChartRef" class="chart"></div>
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
import { parseISO, subDays, format } from 'date-fns'
import { useRouter } from 'vue-router'
import Highcharts from 'highcharts'
import 'highcharts/modules/heatmap'
import {
  getAllAttemptLogs,
  getAllCardProgress,
  getLearningItems,
  getCollections,
  syncAll
} from '../database'
import type { AttemptLog, CardProgress, LearningItem, Collection } from '../database/types'

const STORAGE_KEY = 'studyProgress_selectedCollections'

const router = useRouter()
const accuracyChartRef = ref<HTMLElement>()
const strengthChartRef = ref<HTMLElement>()
const timelineChartRef = ref<HTMLElement>()
const challengingChartRef = ref<HTMLElement>()
const compositionChartRef = ref<HTMLElement>()
const studyHoursChartRef = ref<HTMLElement>()
const studyDaysChartRef = ref<HTMLElement>()
const studyHeatmapChartRef = ref<HTMLElement>()
const collectionOverviewChartRef = ref<HTMLElement>()
const collectionOverviewSortBy = ref<'name' | 'strength' | 'revisions' | 'revised' | 'notRevised'>('strength')

const availableDates = ref<string[]>([])
const totalAttempts = ref(0)
const cardsLearned = ref(0)
const syncing = ref(false)

const collections = ref<Collection[]>([])
const selectedCollectionIds = ref<string[]>([])

const allAttemptLogs = ref<AttemptLog[]>([])
const allCardProgress = ref<CardProgress[]>([])
const allLearningItems = ref<LearningItem[]>([])

let chartInstances: Record<string, Highcharts.Chart> = {}

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

const toggleAll = () => {
  selectedCollectionIds.value = []
  saveSelection()
}


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
  cardsLearned.value = filteredCardProgress.value.filter(p => p.strength_score >= 0.5).length
}

watch([filteredAttemptLogs, filteredCardProgress], () => {
  updateStats()
  renderCharts()
})

// ── chart helpers ──────────────────────────────────────────────────────────

const computeStrengthBuckets = () => {
  let critical = 0, struggling = 0, good = 0, mastered = 0
  for (const p of filteredCardProgress.value) {
    const s = p.strength_score
    if (s < 0.25) critical++
    else if (s < 0.5) struggling++
    else if (s < 0.75) good++
    else mastered++
  }
  return { critical, struggling, good, mastered }
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

  const strengthColor = (pct: number) => {
    if (pct < 25) return '#F44336'
    if (pct < 50) return '#FF9800'
    if (pct < 75) return '#8BC34A'
    return '#4CAF50'
  }

  const strengthData: { y: number; color: string }[] = []
  const revisionsData: number[] = []
  const revisedData: number[] = []
  const notRevisedData: number[] = []

  for (const collection of visibleCollections) {
    const m = metricsMap.get(collection.id!)!
    strengthData.push({ y: m.strength, color: strengthColor(m.strength) })
    revisionsData.push(m.revisions)
    revisedData.push(m.revised)
    notRevisedData.push(m.notRevised)
  }

  if (chartInstances.collectionOverview) {
    chartInstances.collectionOverview.destroy()
    delete chartInstances.collectionOverview
  }

  chartInstances.collectionOverview = Highcharts.chart(collectionOverviewChartRef.value, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: { categories, crosshair: true },
    yAxis: [
      {
        title: { text: 'Count' },
        min: 0,
        gridLineWidth: 1,
        gridLineColor: 'rgba(0,0,0,0.08)'
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
      { name: 'Total Revisions', data: revisionsData, color: '#1565C0', type: 'column' },
      { name: 'Cards Revised', data: revisedData, color: '#64B5F6', type: 'column' },
      { name: 'Cards Not Revised', data: notRevisedData, color: '#BDBDBD', type: 'column' }
    ],
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: {
      shared: true,
      formatter: function(this: any) {
        let s = `<b>${this.x}</b><br/>`
        this.points.forEach((p: any) => {
          const suffix = p.series.name === 'Avg Strength (%)' ? '%' : ''
          s += `<span style="color:${p.color}">●</span> ${p.series.name}: <b>${p.y}${suffix}</b><br/>`
        })
        return s
      }
    }
  } as any)
}

const renderCharts = () => {
  Highcharts.setOptions({
    xAxis: { lineColor: 'rgba(0,0,0,0.2)', tickColor: 'rgba(0,0,0,0.2)' },
    yAxis: { lineColor: 'rgba(0,0,0,0.2)' }
  })
  const renders = [
    renderAccuracyChart,
    renderStrengthChart,
    renderTimelineChart,
    renderChallengingChart,
    renderCompositionChart,
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
  const { critical, struggling, good, mastered } = computeStrengthBuckets()
  const newCards = computeNewCardCount()
  const weakCards = critical + struggling
  const strongCards = good + mastered
  const total = filteredCardProgress.value.length + newCards
  const weakPct = total > 0 ? Math.round((weakCards / total) * 100) : 0
  const strongPct = total > 0 ? Math.round((strongCards / total) * 100) : 0
  const newPct = total > 0 ? Math.round((newCards / total) * 100) : 0
  const subtitle = `${weakPct}% weak · ${strongPct}% strong · ${newPct}% new`
  const data = [
    { name: 'Critical', y: critical, color: '#F44336' },
    { name: 'Struggling', y: struggling, color: '#FF9800' },
    { name: 'Good', y: good, color: '#8BC34A' },
    { name: 'Mastered', y: mastered, color: '#4CAF50' },
    { name: 'New', y: newCards, color: '#BDBDBD' }
  ]
  if (chartInstances.accuracy) {
    chartInstances.accuracy.series[0]?.setData(data, true, { duration: 300 })
    chartInstances.accuracy.setTitle(null as any, { text: subtitle })
    return
  }
  chartInstances.accuracy = Highcharts.chart(accuracyChartRef.value, {
    chart: { type: 'pie' },
    title: { text: '' },
    subtitle: { text: subtitle, style: { color: '#666', fontSize: '13px' } },
    series: [{ name: 'Cards', innerSize: '55%', data, type: 'pie' }],
    plotOptions: { pie: { dataLabels: { enabled: true, format: '{point.percentage:.0f}%', style: { fontSize: '13px', fontWeight: '600' } } } },
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y} cards</b> ({point.percentage:.1f}%)' }
  } as any)
}

const renderStrengthChart = () => {
  if (!strengthChartRef.value) return
  const { critical, struggling, good, mastered } = computeStrengthBuckets()
  const newCards = computeNewCardCount()
  const data = [critical, struggling, good, mastered, newCards]
  if (chartInstances.strength) {
    chartInstances.strength.series[0]?.setData(data, true, { duration: 300 })
    return
  }
  chartInstances.strength = Highcharts.chart(strengthChartRef.value, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: { categories: ['Critical', 'Struggling', 'Good', 'Mastered', 'New'], crosshair: true },
    yAxis: { title: { text: 'Number of Cards' }, min: 0, gridLineWidth: 1, gridLineColor: 'rgba(0,0,0,0.08)' },
    series: [{ name: 'Cards', data, colorByPoint: true, colors: ['#F44336', '#FF9800', '#8BC34A', '#4CAF50', '#BDBDBD'], type: 'column' }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}</b> cards' }
  } as any)
}

const renderTimelineChart = () => {
  if (!timelineChartRef.value) return
  
  const dateMap = new Map<string, number>()
  
  const today = new Date()
  
  for (let i = 29; i >= 0; i--) dateMap.set(format(subDays(today, i), 
  'yyyy-MM-dd'), 0)

  console.log(filteredAttemptLogs)

  filteredAttemptLogs.value.forEach(log => {
    const d = format(parseISO(log.created_at), 'yyyy-MM-dd')
    dateMap.set(d, (dateMap.get(d) ?? 0) + 1)
  })
  
  const dates = Array.from(dateMap.keys())
  const counts = Array.from(dateMap.values())

  const movingAvg = counts.map((_, i) => {
    const window = counts.slice(Math.max(0, i - 4), i + 1)
    return Math.round((window.reduce((s, v) => s + v, 0) / window.length) * 10) / 10
  })

  const dateLabels = dates.map(d => format(parseISO(d), 'MMM d, yy'))
  if (chartInstances.timeline) {
    chartInstances.timeline.xAxis[0]?.setCategories(dateLabels, false)
    chartInstances.timeline.series[0]?.setData(counts, false, { duration: 300 })
    chartInstances.timeline.series[1]?.setData(movingAvg, true, { duration: 300 })
    return
  }
  chartInstances.timeline = Highcharts.chart(timelineChartRef.value, {
    chart: { type: 'spline' },
    title: { text: '' },
    xAxis: { categories: dateLabels, tickInterval: 5 },
    yAxis: { title: { text: 'Attempts' }, min: 0, gridLineWidth: 1, gridLineColor: 'rgba(0,0,0,0.08)' },
    series: [
      { name: 'Daily Attempts', data: counts, color: '#2196F3', type: 'spline', lineWidth: 2, marker: { enabled: false } },
      { name: '5-Day Avg', data: movingAvg, color: '#90CAF9', type: 'spline', lineWidth: 2.5, marker: { enabled: false }, dashStyle: 'ShortDash' }
    ],
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: {
      shared: true,
      formatter: function(this: any) {
        const dateStr = dates[this.points?.[0]?.point?.index ?? 0]
        const label = dateStr ? format(parseISO(dateStr), 'EEEE, MMM d') : this.x
        let s = `<span style="font-size:11px">${label}</span><br/>`
        this.points?.forEach((p: any) => {
          s += `<span style="color:${p.color}">●</span> ${p.series.name}: <b>${p.y}</b><br/>`
        })
        return s
      }
    }
  } as any)
}

const renderChallengingChart = () => {
  if (!challengingChartRef.value) return
  const sorted = [...filteredCardProgress.value]
    .filter(p => p.strength_score < 0.5 && filteredLearningItems.value.some(i => i.id === p.learning_item_id))
    .sort((a, b) => a.strength_score - b.strength_score)
  const labels = sorted.map(p => {
    const item = filteredLearningItems.value.find(i => i.id === p.learning_item_id)
    return item!.title.substring(0, 30)
  })
  const strengths = sorted.map(p => ({
    y: Math.round(p.strength_score * 100),
    color: p.strength_score < 0.25 ? '#F44336' : '#FF9800'
  }))
  const rowHeight = 35
  const chartHeight = Math.max(300, sorted.length * rowHeight)
  if (chartInstances.challenging) {
    chartInstances.challenging.xAxis[0]?.setCategories(labels, false)
    chartInstances.challenging.setSize(undefined, chartHeight, false)
    chartInstances.challenging.series[0]?.setData(strengths, true, { duration: 300 })
    return
  }
  chartInstances.challenging = Highcharts.chart(challengingChartRef.value, {
    chart: { type: 'bar', height: chartHeight },
    title: { text: '' },
    xAxis: { categories: labels },
    yAxis: { title: { text: 'Strength Score (%)' }, min: 0, max: 100, gridLineWidth: 1, gridLineColor: 'rgba(0,0,0,0.08)' },
    series: [{ name: 'Strength', data: strengths, colorByPoint: true }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}%</b> strength' }
  } as any)
}


const renderCompositionChart = () => {
  if (!compositionChartRef.value || filteredAttemptLogs.value.length === 0) return
  const sortedLogs = [...filteredAttemptLogs.value].sort(
    (a, b) => parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime()
  )
  console.log("Card Progress: "+ filteredCardProgress.value.length)
  console.log(filteredCardProgress)
  console.log("Attempt Logs: " + filteredAttemptLogs.value.length)
  console.log(filteredAttemptLogs)

  const runningStrength = new Map<string, number>()
  const compositionSnapshots: Array<{ Critical: number; Struggling: number; Good: number; Mastered: number }> = []
  const labels: string[] = []
  const seenCards = new Set<string>()

  sortedLogs.forEach((log, index) => {
    seenCards.add(log.learning_item_id)
    const prev = runningStrength.get(log.learning_item_id) ?? 0
    runningStrength.set(log.learning_item_id, Math.min(1, Math.max(0, prev + log.ease_score)))
    if ((index + 1) % 5 === 0) {
      const buckets = { Critical: 0, Struggling: 0, Good: 0, Mastered: 0 }
      seenCards.forEach(id => {
        const s = runningStrength.get(id) ?? 0
        if (s < 0.25) buckets.Critical++
        else if (s < 0.5) buckets.Struggling++
        else if (s < 0.75) buckets.Good++
        else buckets.Mastered++
      })
      compositionSnapshots.push(buckets)
      labels.push(`After ${index + 1} attempts`)
    }
  })

  const pct = (snapshot: { Critical: number; Struggling: number; Good: number; Mastered: number }, key: keyof { Critical: number; Struggling: number; Good: number; Mastered: number }) => {
    const total = snapshot.Critical + snapshot.Struggling + snapshot.Good + snapshot.Mastered
    return total > 0 ? Math.round((snapshot[key] / total) * 100) : 0
  }
  const critical = compositionSnapshots.map(s => pct(s, 'Critical'))
  const struggling = compositionSnapshots.map(s => pct(s, 'Struggling'))
  const good = compositionSnapshots.map(s => pct(s, 'Good'))
  const mastered = compositionSnapshots.map(s => pct(s, 'Mastered'))
  if (chartInstances.composition) {
    chartInstances.composition.xAxis[0]?.setCategories(labels, false)
    chartInstances.composition.series[0]?.setData(critical, false)
    chartInstances.composition.series[1]?.setData(struggling, false)
    chartInstances.composition.series[2]?.setData(good, false)
    chartInstances.composition.series[3]?.setData(mastered, true, { duration: 300 })
    return
  }
  chartInstances.composition = Highcharts.chart(compositionChartRef.value, {
    chart: { type: 'areaspline' },
    title: { text: '' },
    xAxis: { categories: labels, tickInterval: Math.max(1, Math.floor(labels.length / 8)) },
    yAxis: { title: { text: 'Composition (%)' }, min: 0, max: 100, stackLabels: { enabled: false }, gridLineWidth: 1, gridLineColor: 'rgba(0,0,0,0.08)' },
    plotOptions: { areaspline: { stacking: 'percent', lineWidth: 0, marker: { enabled: false }, dataLabels: { enabled: false } } },
    series: [
      { name: 'Critical', data: critical, color: '#F44336', type: 'areaspline' },
      { name: 'Struggling', data: struggling, color: '#FF9800', type: 'areaspline' },
      { name: 'Good', data: good, color: '#8BC34A', type: 'areaspline' },
      { name: 'Mastered', data: mastered, color: '#4CAF50', type: 'areaspline' }
    ],
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.percentage:.0f}%</b> {series.name}' }
  } as any)
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
    color: count === peak && peak > 0 ? '#2196F3' : '#90CAF9'
  }))
  const categories = Array.from({ length: 24 }, (_, h) => {
    if (h === 0) return '12am'
    if (h === 12) return '12pm'
    return h < 12 ? `${h}am` : `${h - 12}pm`
  })
  if (chartInstances.studyHours) {
    chartInstances.studyHours.series[0]?.setData(data, true, { duration: 300 })
    return
  }
  chartInstances.studyHours = Highcharts.chart(studyHoursChartRef.value, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: { categories, title: { text: 'Hour of Day' } },
    yAxis: { title: { text: 'Attempts' }, min: 0, gridLineWidth: 1, gridLineColor: 'rgba(0,0,0,0.08)' },
    series: [{ name: 'Attempts', data, colorByPoint: true, type: 'column' }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: {
      formatter: function(this: any) {
        return `<b>${categories[this.point.index]}</b><br/><b>${this.y}</b> attempts`
      }
    }
  } as any)
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
    color: count === peak && peak > 0 ? '#4CAF50' : '#A5D6A7',
    name: dayNames[i]
  }))
  if (chartInstances.studyDays) {
    chartInstances.studyDays.series[0]?.setData(data, true, { duration: 300 })
    return
  }
  chartInstances.studyDays = Highcharts.chart(studyDaysChartRef.value, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: { categories: dayNames, title: { text: 'Day of Week' } },
    yAxis: { title: { text: 'Attempts' }, min: 0, gridLineWidth: 1, gridLineColor: 'rgba(0,0,0,0.08)' },
    series: [{ name: 'Attempts', data, colorByPoint: true, type: 'column' }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}</b> attempts' }
  } as any)
}

const renderStudyHeatmapChart = () => {
  if (!studyHeatmapChartRef.value) return
  const cutoff = subDays(new Date(), 29)
  const today = new Date()

  const hourCategories = Array.from({ length: 24 }, (_, h) => {
    if (h === 0) return '12am'
    if (h === 12) return '12pm'
    return h < 12 ? `${h}am` : `${h - 12}pm`
  })

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

  chartInstances.studyHeatmap = Highcharts.chart(studyHeatmapChartRef.value, {
    chart: { type: 'heatmap', height: 24 * 16 + 100 },
    title: { text: '' },
    xAxis: {
      categories: dayCategories,
      title: { text: 'Day of Month' },
      labels: {
        useHTML: true,
        formatter: function(this: any) {
          return this.pos === 29
            ? `<span style="color:#2196F3;font-weight:700">${this.value}</span>`
            : `${this.value}`
        }
      }
    },
    yAxis: { categories: hourCategories, title: { text: 'Hour of Day' }, reversed: true },
    colorAxis: {
      min: 0,
      max: maxVal,
      stops: [
        [0, '#FFFFFF'],
        [0.01, '#BBDEFB'],
        [0.4, '#42A5F5'],
        [1, '#1565C0']
      ]
    },
    series: [{
      name: 'Attempts',
      type: 'heatmap',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
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
  } as any)
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

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let progressChannel: BroadcastChannel | null = null

onMounted(async () => {
  await loadData()
  progressChannel = new BroadcastChannel('study-progress')
  progressChannel.onmessage = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(loadData, 1000)
  }
})

onUnmounted(() => {
  progressChannel?.close()
  if (debounceTimer) clearTimeout(debounceTimer)
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
  background-color: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
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
  color: rgba(0, 0, 0, 0.5);
}

.collection-filter-bar {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
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
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #2196F3;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 24px;
  padding: 0 20px;
}

.chart-wrapper {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.chart-wrapper h3 {
  margin: 0 0 4px;
  font-size: 1.1rem;
  color: rgba(0, 0, 0, 0.87);
}

.chart-subtitle {
  margin: 0 0 16px;
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.45);
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

.chart-scroll-container {
  max-height: 500px;
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
}
</style>
