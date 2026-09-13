import { SCORED_TIERS, STRENGTH_TIER_META, clampStrength, strengthTier, type ScoredTier } from '@/utils/strength'
import { byCreatedAt, emptyTierCounts } from '../aggregation'
import type { ChartContext, ProgressChartData } from './chartRegistry'

// One snapshot of the tier distribution every N attempts.
const SNAPSHOT_EVERY = 5

/** Stacked bands showing how the tier mix shifted as attempts accumulated. */
export function renderCompositionChart(
  { registry, palette }: ChartContext,
  el: HTMLElement,
  { logs }: ProgressChartData
): void {
  if (logs.length === 0) return

  const sortedLogs = [...logs].sort(byCreatedAt)
  const runningStrength = new Map<string, number>()
  const snapshots: Array<Record<ScoredTier, number>> = []
  const labels: string[] = []
  const seenCards = new Set<string>()

  sortedLogs.forEach((log, index) => {
    seenCards.add(log.learning_item_id)
    const prev = runningStrength.get(log.learning_item_id) ?? 0
    runningStrength.set(log.learning_item_id, clampStrength(prev + log.ease_score))
    if ((index + 1) % SNAPSHOT_EVERY === 0) {
      const buckets = emptyTierCounts()
      // Every seen card has been revised at least once, so none is 'new'.
      seenCards.forEach(id => buckets[strengthTier(runningStrength.get(id) ?? 0) as ScoredTier]++)
      snapshots.push(buckets)
      labels.push(`After ${index + 1} attempts`)
    }
  })

  const pct = (snapshot: Record<ScoredTier, number>, key: ScoredTier) => {
    const total = SCORED_TIERS.reduce((sum, t) => sum + snapshot[t], 0)
    return total > 0 ? Math.round((snapshot[key] / total) * 100) : 0
  }
  // One stacked band per scored tier, low→high.
  const tierSeries = SCORED_TIERS.map(tier => snapshots.map(s => pct(s, tier)))

  const existing = registry.get('composition')
  if (existing) {
    existing.xAxis[0]?.setCategories(labels, false)
    tierSeries.forEach((data, i) => {
      const isLast = i === tierSeries.length - 1
      existing.series[i]?.setData(data, isLast, isLast ? { duration: 300 } : undefined)
    })
    return
  }

  registry.create('composition', el, {
    chart: { type: 'areaspline' },
    title: { text: '' },
    xAxis: { categories: labels, tickInterval: Math.max(1, Math.floor(labels.length / 8)) },
    yAxis: {
      title: { text: 'Composition (%)' },
      min: 0,
      max: 100,
      stackLabels: { enabled: false },
      gridLineWidth: 1,
      gridLineColor: palette.gridLine()
    },
    plotOptions: {
      areaspline: {
        stacking: 'percent',
        lineWidth: 0,
        marker: { enabled: false },
        dataLabels: { enabled: false }
      }
    },
    series: SCORED_TIERS.map((tier, i) => ({
      name: STRENGTH_TIER_META[tier].label,
      data: tierSeries[i],
      color: palette.tierColor(tier),
      type: 'areaspline'
    })),
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.percentage:.0f}%</b> {series.name}' }
  })
}
