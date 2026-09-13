import { isAtLeastTier, strengthTier } from '@/utils/strength'
import type { ChartContext, ProgressChartData } from './chartRegistry'

const ROW_HEIGHT = 35

/** The lowest-strength cards that are not yet learned, weakest first. */
export function renderChallengingChart(
  { registry, palette }: ChartContext,
  el: HTMLElement,
  { progress, items }: ProgressChartData
): void {
  const titleById = new Map(items.map(i => [i.id!, i.title]))
  const sorted = progress
    // Challenging = not yet learned, i.e. still below the 'good' tier.
    .filter(p => !isAtLeastTier(p.strength_score, 'good') && titleById.has(p.learning_item_id))
    .sort((a, b) => a.strength_score - b.strength_score)

  const labels = sorted.map(p => titleById.get(p.learning_item_id)!.substring(0, 30))
  const strengths = sorted.map(p => ({
    y: Math.round(p.strength_score * 100),
    color: palette.tierColor(strengthTier(p.strength_score))
  }))
  const chartHeight = Math.max(300, sorted.length * ROW_HEIGHT)

  const existing = registry.get('challenging')
  if (existing) {
    existing.xAxis[0]?.setCategories(labels, false)
    existing.setSize(undefined, chartHeight, false)
    existing.series[0]?.setData(strengths, true, { duration: 300 })
    return
  }

  registry.create('challenging', el, {
    chart: { type: 'bar', height: chartHeight },
    title: { text: '' },
    xAxis: { categories: labels },
    yAxis: {
      title: { text: 'Strength Score (%)' },
      min: 0,
      max: 100,
      gridLineWidth: 1,
      gridLineColor: palette.gridLine()
    },
    series: [{ name: 'Strength', data: strengths, colorByPoint: true }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}%</b> strength' }
  })
}
