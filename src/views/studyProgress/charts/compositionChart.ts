import { STRENGTH_TIER_META, type StrengthTier } from '@/utils/strength'
import { cardsOverTime, type DaySnapshot } from '../aggregation'
import type { ChartContext, ProgressChartData } from './chartRegistry'

// Bottom to top, so the stack fills up like the overview bar: mastered at the
// base, then good, fair, weak, and the cards not studied yet on top — which
// brings the stack exactly up to the total line.
const STACK_ORDER: StrengthTier[] = ['mastered', 'good', 'fair', 'weak', 'new']

const notStudied = (s: DaySnapshot) => Math.max(0, s.total - (s.weak + s.fair + s.good + s.mastered))
const levelOf = (s: DaySnapshot, tier: StrengthTier) => (tier === 'new' ? notStudied(s) : s[tier])

/** Midnight UTC of a local `yyyy-MM-dd`, which Highcharts' datetime axis shows as that date. */
const dayToUtc = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y!, m! - 1, d!)
}

// The snapshots behind the chart, for the shared tooltip (bound once at creation).
let snapshotsByX = new Map<number, DaySnapshot>()

/**
 * Cards over time, in absolute numbers: a line for how many cards existed each
 * day (it climbs as cards are added), and under it the cards stacked by how
 * well they were known that day.
 */
export function renderCompositionChart(
  { registry, palette }: ChartContext,
  el: HTMLElement,
  { items, logs }: ProgressChartData
): void {
  const snapshots = cardsOverTime(items, logs)
  if (!snapshots.length) return
  snapshotsByX = new Map(snapshots.map(s => [dayToUtc(s.day), s]))

  const levelData = STACK_ORDER.map(tier => snapshots.map(s => [dayToUtc(s.day), levelOf(s, tier)] as [number, number]))
  const totalData = snapshots.map(s => [dayToUtc(s.day), s.total] as [number, number])

  const existing = registry.get('composition')
  if (existing) {
    levelData.forEach((data, i) => existing.series[i]?.setData(data, false))
    existing.series[STACK_ORDER.length]?.setData(totalData, true, { duration: 300 })
    return
  }

  registry.create('composition', el, {
    chart: { zooming: { type: 'x' } },
    title: { text: '' },
    xAxis: { type: 'datetime', crosshair: { color: palette.axisLine() } },
    yAxis: {
      title: { text: 'Cards' },
      min: 0,
      allowDecimals: false,
      // First series at the bottom of the stack.
      reversedStacks: false,
      gridLineWidth: 1,
      gridLineColor: palette.gridLine()
    },
    plotOptions: {
      area: {
        stacking: 'normal',
        lineWidth: 0,
        fillOpacity: 0.85,
        marker: { enabled: false },
        states: { hover: { lineWidth: 0 } }
      },
      series: { animation: { duration: 300 } }
    },
    series: [
      ...STACK_ORDER.map((tier, i) => ({
        name: tier === 'new' ? 'Not studied yet' : STRENGTH_TIER_META[tier].label,
        type: 'area',
        data: levelData[i],
        color: palette.tierColor(tier)
      })),
      {
        name: 'All cards',
        type: 'line',
        data: totalData,
        color: palette.alpha('on-surface', 0.85),
        lineWidth: 2,
        marker: { enabled: false },
        zIndex: 5
      }
    ],
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: {
      shared: true,
      formatter: function(this: { x: number }) {
        const s = snapshotsByX.get(this.x)
        if (!s) return false
        const date = new Date(this.x).toLocaleDateString(undefined, { timeZone: 'UTC', dateStyle: 'medium' })
        const row = (label: string, value: number, color?: string) =>
          `<br/>${color ? `<span style="color:${color}">●</span> ` : ''}${label}: <b>${value}</b>`
        // Strongest first, matching the legend under the overview bar.
        return (
          `<span style="font-size:11px">${date}</span>` +
          row('All cards', s.total) +
          STACK_ORDER.map(t =>
            row(t === 'new' ? 'Not studied yet' : STRENGTH_TIER_META[t].label, levelOf(s, t), palette.tierColor(t))
          ).join('')
        )
      }
    }
  })
}
