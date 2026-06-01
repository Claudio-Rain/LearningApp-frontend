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

      <div class="chart-wrapper full-width">
        <h3>Study History (Last 30 Days)</h3>
        <div ref="timelineChartRef" class="chart"></div>
      </div>

      <div class="chart-wrapper full-width">
        <h3>Learning Curve</h3>
        <p class="chart-subtitle">Your daily accuracy rate over time — where you started vs. where you are now</p>
        <div ref="learningCurveChartRef" class="chart"></div>
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
const learningCurveChartRef = ref<HTMLElement>()
const compositionChartRef = ref<HTMLElement>()

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
    renderLearningCurveChart,
    renderCompositionChart,
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
  const weakCards = critical + struggling
  const strongCards = good + mastered
  const total = filteredCardProgress.value.length
  const weakPct = total > 0 ? Math.round((weakCards / total) * 100) : 0
  const strongPct = total > 0 ? Math.round((strongCards / total) * 100) : 0
  const subtitle = `${weakPct}% weak · ${strongPct}% strong`
  const data = [
    { name: 'Critical', y: critical, color: '#F44336' },
    { name: 'Struggling', y: struggling, color: '#FF9800' },
    { name: 'Good', y: good, color: '#8BC34A' },
    { name: 'Mastered', y: mastered, color: '#4CAF50' }
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
  const data = [critical, struggling, good, mastered]
  if (chartInstances.strength) {
    chartInstances.strength.series[0]?.setData(data, true, { duration: 300 })
    return
  }
  chartInstances.strength = Highcharts.chart(strengthChartRef.value, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: { categories: ['Critical', 'Struggling', 'Good', 'Mastered'], crosshair: true },
    yAxis: { title: { text: 'Number of Cards' }, min: 0, gridLineWidth: 1, gridLineColor: 'rgba(0,0,0,0.08)' },
    series: [{ name: 'Cards', data, colorByPoint: true, colors: ['#F44336', '#FF9800', '#8BC34A', '#4CAF50'], type: 'column' }],
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
  
  const dateLabels = dates.map(d => format(parseISO(d), 'MMM d, yy'))
  if (chartInstances.timeline) {
    chartInstances.timeline.xAxis[0]?.setCategories(dateLabels, false)
    chartInstances.timeline.series[0]?.setData(counts, true, { duration: 300 })
    return
  }
  chartInstances.timeline = Highcharts.chart(timelineChartRef.value, {
    chart: { type: 'spline' },
    title: { text: '' },
    xAxis: { categories: dateLabels, tickInterval: 5 },
    yAxis: { title: { text: 'Attempts' }, min: 0, gridLineWidth: 1, gridLineColor: 'rgba(0,0,0,0.08)' },
    series: [{ name: 'Daily Attempts', data: counts, color: '#2196F3', type: 'spline', lineWidth: 2, marker: { enabled: false } }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}</b> attempts' }
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

const renderLearningCurveChart = () => {
  if (!learningCurveChartRef.value) return
  const sortedLogs = [...filteredAttemptLogs.value].sort(
    (a, b) => parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime()
  )
  const cardState = new Map<string, { total: number; weighted: number }>()
  const dailyAvg = new Map<string, number>()
  sortedLogs.forEach(log => {
    const dateStr = format(parseISO(log.created_at), 'yyyy-MM-dd')
    const s = cardState.get(log.learning_item_id) ?? { total: 0, weighted: 0 }
    s.total += 1
    s.weighted += log.ease_score
    cardState.set(log.learning_item_id, s)
    let learned = 0
    cardState.forEach(v => { if (v.weighted / v.total >= 0.5) learned++ })
    dailyAvg.set(dateStr, learned / cardState.size)
  })
  const sorted = Array.from(dailyAvg.entries()).sort(([a], [b]) => a.localeCompare(b))
  const dates = sorted.map(([d]) => d)
  const dateLabels = dates.map(d => format(parseISO(d), 'MMM d, yy'))
  const mastery = sorted.map(([, v]) => Math.round(v * 100))
  availableDates.value = dates
  const cardCounts: number[] = []
  const seen = new Set<string>()
  let cursor = 0
  dates.forEach(d => {
    while (cursor < sortedLogs.length) {
      const log = sortedLogs[cursor]
      if (!log || format(parseISO(log.created_at), 'yyyy-MM-dd') > d) break
      seen.add(log.learning_item_id)
      cursor++
    }
    cardCounts.push(seen.size)
  })
  const seriesData = mastery.map((y, i) => ({ y, cards: cardCounts[i] }))
  if (chartInstances.learningCurve) {
    chartInstances.learningCurve.xAxis[0]?.setCategories(dateLabels, false)
    chartInstances.learningCurve.series[0]?.setData(seriesData, true, { duration: 300 })
    return
  }
  chartInstances.learningCurve = Highcharts.chart(learningCurveChartRef.value, {
    chart: { type: 'areaspline' },
    title: { text: '' },
    xAxis: { categories: dateLabels, tickInterval: Math.max(1, Math.floor(dateLabels.length / 8)) },
    yAxis: { title: { text: 'Cards Learned (%)' }, min: 0, max: 100, labels: { format: '{value}%' }, gridLineWidth: 1, gridLineColor: 'rgba(0,0,0,0.08)' },
    series: [{ name: 'Cards Learned', data: seriesData, color: '#4CAF50', fillOpacity: 0.2, lineWidth: 2, type: 'areaspline', marker: { enabled: false } }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}%</b> learned<br/>across {point.cards} cards seen' }
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
