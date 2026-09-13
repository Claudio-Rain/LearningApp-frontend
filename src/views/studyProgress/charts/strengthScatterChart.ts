import { SCORED_TIERS, STRENGTH_TIER_FLOORS } from '@/utils/strength'
import { replayCardStrength } from '../aggregation'
import type { ChartContext, ProgressChartData } from './chartRegistry'

// Attempt numbers with fewer cards than this are a noisy tail — excluded from
// the trend line.
const MIN_TREND_SAMPLES = 3

export interface StrengthScatterOptions {
  /**
   * Read live by the tooltip formatter, which is bound once at chart creation —
   * toggling titles must not require rebuilding the chart.
   */
  showCardTitles: () => boolean
}

/**
 * One bubble per (attempt number, strength band): each card's attempts are
 * replayed in order, so x = that card's attempt number and y = its strength
 * after it. Overlapping cards merge into one sized circle (z = how many), and a
 * spline traces the average strength at each attempt number — the real learning
 * curve, steep early and flattening later.
 */
export function renderStrengthScatterChart(
  { registry, palette }: ChartContext,
  el: HTMLElement,
  { logs, items }: ProgressChartData,
  { showCardTitles }: StrengthScatterOptions
): void {
  const titleById = new Map(items.map(i => [i.id!, i.title]))

  // Card titles per bucket, shown as labels when the checkbox is on.
  const bucketTitles = new Map<string, string[]>()
  // Per-attempt totals, for the trend line.
  const sumByAttempt = new Map<number, { sum: number; count: number }>()

  replayCardStrength(logs, (itemId, attempt, strength) => {
    const pct = Math.round(strength * 100)
    const band = Math.min(100, Math.round(pct / 10) * 10) // snap to 0,10,…,100
    const key = `${attempt}:${band}`
    if (!bucketTitles.has(key)) bucketTitles.set(key, [])
    bucketTitles.get(key)!.push(titleById.get(itemId) ?? 'Untitled')

    const agg = sumByAttempt.get(attempt) ?? { sum: 0, count: 0 }
    agg.sum += pct
    agg.count += 1
    sumByAttempt.set(attempt, agg)
  })

  const bubbles = Array.from(bucketTitles.entries()).map(([key, titles]) => {
    const [x, y] = key.split(':').map(Number)
    // Full title list, one per line, no truncation.
    return { x, y, z: titles.length, titleLabel: titles.join('<br/>') }
  })

  const trend: [number, number][] = Array.from(sumByAttempt.entries())
    .filter(([, agg]) => agg.count >= MIN_TREND_SAMPLES)
    .sort((a, b) => a[0] - b[0])
    .map(([x, agg]) => [x, Math.round((agg.sum / agg.count) * 10) / 10])

  const existing = registry.get('strengthScatter')
  if (existing) {
    existing.series[0]?.setData(bubbles, false, { duration: 300 })
    existing.series[1]?.setData(trend, true, { duration: 300 })
    return
  }

  registry.create('strengthScatter', el, {
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
      plotLines: palette.tierPlotLines({ labelY: 14 })
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
        color: palette.color('chartPrimary'),
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
        if (showCardTitles() && this.point.titleLabel) {
          s += `<br/><span style="color:${palette.mutedText()}">${this.point.titleLabel}</span>`
        }
        return s
      }
    }
  })
}
