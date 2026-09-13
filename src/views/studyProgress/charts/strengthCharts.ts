import { STRENGTH_TIER_META } from '@/utils/strength'
import {
  CHART_TIER_ORDER,
  newCardCount,
  strengthBuckets,
  tierCountsWithNew
} from '../aggregation'
import type { ChartContext, ProgressChartData } from './chartRegistry'

/** Donut of weak vs strong vs never-studied cards. */
export function renderAccuracyChart(
  { registry, palette }: ChartContext,
  el: HTMLElement,
  data: ProgressChartData
): void {
  const buckets = strengthBuckets(data.progress)
  const newCards = newCardCount(data)
  const weakCards = buckets.weak + buckets.fair
  const strongCards = buckets.good + buckets.mastered
  const total = data.progress.length + newCards
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const subtitle = `${pct(weakCards)}% weak · ${pct(strongCards)}% strong · ${pct(newCards)}% new`

  const counts = tierCountsWithNew(buckets, newCards)
  const series = CHART_TIER_ORDER.map(tier => ({
    name: STRENGTH_TIER_META[tier].label,
    y: counts[tier],
    color: palette.tierColor(tier)
  }))

  const existing = registry.get('accuracy')
  if (existing) {
    existing.series[0]?.setData(series, true, { duration: 300 })
    existing.setTitle(null as never, { text: subtitle })
    return
  }

  registry.create('accuracy', el, {
    chart: { type: 'pie' },
    title: { text: '' },
    subtitle: { text: subtitle, style: { color: palette.mutedText(), fontSize: '13px' } },
    series: [{ name: 'Cards', innerSize: '55%', data: series, type: 'pie' }],
    plotOptions: {
      pie: {
        dataLabels: {
          enabled: true,
          format: '{point.percentage:.0f}%',
          style: { fontSize: '13px', fontWeight: '600' }
        }
      }
    },
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y} cards</b> ({point.percentage:.1f}%)' }
  })
}

/** Card count per strength tier. */
export function renderStrengthChart(
  { registry, palette }: ChartContext,
  el: HTMLElement,
  data: ProgressChartData
): void {
  const counts = tierCountsWithNew(strengthBuckets(data.progress), newCardCount(data))
  const series = CHART_TIER_ORDER.map(tier => counts[tier])

  const existing = registry.get('strength')
  if (existing) {
    existing.series[0]?.setData(series, true, { duration: 300 })
    return
  }

  registry.create('strength', el, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: {
      categories: CHART_TIER_ORDER.map(t => STRENGTH_TIER_META[t].label),
      crosshair: true
    },
    yAxis: {
      title: { text: 'Number of Cards' },
      min: 0,
      gridLineWidth: 1,
      gridLineColor: palette.gridLine()
    },
    series: [{
      name: 'Cards',
      data: series,
      colorByPoint: true,
      colors: CHART_TIER_ORDER.map(palette.tierColor),
      type: 'column'
    }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}</b> cards' }
  })
}
