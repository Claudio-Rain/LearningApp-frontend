<template>
  <div class="progress-view">
    <!-- Header -->
    <div class="progress-header">
      <div>
        <h1>Study Progress</h1>
        <p class="subtitle">Track your learning journey</p>
      </div>
      <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ totalAttempts }}</div>
        <div class="stat-label">Total Attempts</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ overallAccuracy }}%</div>
        <div class="stat-label">Overall Accuracy</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ cardsLearned }}</div>
        <div class="stat-label">Cards Learned</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ streakDays }}</div>
        <div class="stat-label">Day Streak</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-container">
      <!-- Accuracy Chart -->
      <div class="chart-wrapper">
        <h3>Accuracy Distribution</h3>
        <div ref="accuracyChartRef" class="chart"></div>
      </div>

      <!-- Strength Distribution -->
      <div class="chart-wrapper">
        <h3>Cards by Strength</h3>
        <div ref="strengthChartRef" class="chart"></div>
      </div>

      <!-- Study Timeline -->
      <div class="chart-wrapper full-width">
        <h3>Study History (Last 30 Days)</h3>
        <div ref="timelineChartRef" class="chart"></div>
      </div>

      <!-- Top Challenging Cards -->
      <div class="chart-wrapper full-width">
        <h3>Most Challenging Cards</h3>
        <div ref="challengingChartRef" class="chart"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Highcharts from 'highcharts'
import {
  getAllAttemptLogs,
  getAllCardProgress,
  getLearningItems,
  getCollections
} from '../database'
import type { AttemptLog, CardProgress, LearningItem, Collection } from '../database/types'

const router = useRouter()
const accuracyChartRef = ref<HTMLElement>()
const strengthChartRef = ref<HTMLElement>()
const timelineChartRef = ref<HTMLElement>()
const challengingChartRef = ref<HTMLElement>()

const totalAttempts = ref(0)
const overallAccuracy = ref(0)
const cardsLearned = ref(0)
const streakDays = ref(0)

let attemptLogs: AttemptLog[] = []
let cardProgress: CardProgress[] = []
let learningItems: LearningItem[] = []
let collections: Collection[] = []

const loadData = async () => {
  attemptLogs = await getAllAttemptLogs()
  cardProgress = await getAllCardProgress()
  collections = await getCollections()

  // Get all learning items across all collections
  const itemsPerCollection = await Promise.all(
    collections
      .filter(c => c.id)
      .map(c => getLearningItems(c.id!))
  )
  learningItems = itemsPerCollection.flat()

  calculateStats()
  renderCharts()
}

const calculateStats = () => {
  totalAttempts.value = attemptLogs.length

  const correctAttempts = attemptLogs.filter(log => log.is_correct).length
  overallAccuracy.value = totalAttempts.value > 0
    ? Math.round((correctAttempts / totalAttempts.value) * 100)
    : 0

  cardsLearned.value = cardProgress.filter(p => p.strength_score >= 0.7).length

  // Calculate streak
  if (attemptLogs.length > 0) {
    const sortedLogs = [...attemptLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    let streak = 0
    let currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    for (const log of sortedLogs) {
      const logDate = new Date(log.created_at)
      logDate.setHours(0, 0, 0, 0)

      const diffTime = currentDate.getTime() - logDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === streak) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }

    streakDays.value = streak
  }
}

const renderCharts = () => {
  renderAccuracyChart()
  renderStrengthChart()
  renderTimelineChart()
  renderChallengingChart()
}

const renderAccuracyChart = () => {
  if (!accuracyChartRef.value) return

  const correctCount = attemptLogs.filter(log => log.is_correct).length
  const incorrectCount = totalAttempts.value - correctCount

  Highcharts.chart(accuracyChartRef.value, {
    chart: { type: 'pie' },
    title: { text: '' },
    series: [
      {
        name: 'Attempts',
        data: [
          { name: 'Correct', y: correctCount, color: '#4CAF50' },
          { name: 'Incorrect', y: incorrectCount, color: '#F44336' }
        ],
        type: 'pie'
      }
    ],
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: {
      pointFormat: '<b>{point.y}</b> ({point.percentage:.1f}%)'
    }
  } as any)
}

const renderStrengthChart = () => {
  if (!strengthChartRef.value) return

  const strengthBuckets = {
    'Weak (0-0.3)': cardProgress.filter(p => p.strength_score < 0.3).length,
    'Fair (0.3-0.6)': cardProgress.filter(p => p.strength_score >= 0.3 && p.strength_score < 0.6).length,
    'Good (0.6-0.8)': cardProgress.filter(p => p.strength_score >= 0.6 && p.strength_score < 0.8).length,
    'Mastered (0.8+)': cardProgress.filter(p => p.strength_score >= 0.8).length
  }

  const colors = ['#FF6B6B', '#FFC107', '#4CAF50', '#2196F3']

  Highcharts.chart(strengthChartRef.value, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: {
      categories: Object.keys(strengthBuckets),
      crosshair: true
    },
    yAxis: {
      title: { text: 'Number of Cards' },
      min: 0
    },
    series: [
      {
        name: 'Cards',
        data: Object.values(strengthBuckets),
        colorByPoint: true,
        colors: colors,
        type: 'column'
      }
    ],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}</b> cards' }
  } as any)
}

const renderTimelineChart = () => {
  if (!timelineChartRef.value) return

  const dateMap = new Map<string, number>()
  const today = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0] as string
    dateMap.set(dateStr, 0)
  }

  attemptLogs.forEach(log => {
    const dateStr = log.created_at.split('T')[0] as string
    const current = dateMap.get(dateStr) ?? 0
    dateMap.set(dateStr, current + 1)
  })

  const dates = Array.from(dateMap.keys())
  const counts = Array.from(dateMap.values())

  Highcharts.chart(timelineChartRef.value, {
    chart: { type: 'line' },
    title: { text: '' },
    xAxis: {
      categories: dates,
      tickInterval: 5
    },
    yAxis: {
      title: { text: 'Attempts' },
      min: 0
    },
    series: [
      {
        name: 'Daily Attempts',
        data: counts,
        color: '#2196F3',
        type: 'line'
      }
    ],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}</b> attempts' }
  } as any)
}

const renderChallengingChart = () => {
  if (!challengingChartRef.value) return

  const sorted = [...cardProgress]
    .sort((a, b) => a.strength_score - b.strength_score)
    .slice(0, 10)

  const labels = sorted.map(p => {
    const item = learningItems.find(i => i.id === p.learning_item_id)
    return item?.title?.substring(0, 30) || 'Unknown'
  })

  const strengths = sorted.map(p => Math.round(p.strength_score * 100))

  Highcharts.chart(challengingChartRef.value, {
    chart: { type: 'bar' },
    title: { text: '' },
    xAxis: {
      categories: labels
    },
    yAxis: {
      title: { text: 'Strength Score (%)' },
      min: 0,
      max: 100
    },
    series: [
      {
        name: 'Strength',
        data: strengths,
        color: '#FF6B6B'
      }
    ],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}%</b> strength' }
  } as any)
}

const goBack = () => {
  router.push({ name: 'collections' })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.progress-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
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

.subtitle {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.5);
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chart-wrapper h3 {
  margin: 0 0 16px;
  font-size: 1.1rem;
  color: rgba(0, 0, 0, 0.87);
}

.chart-wrapper.full-width {
  grid-column: 1 / -1;
}

.chart {
  min-height: 350px;
}

@media (max-width: 1024px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
}
</style>
