import type { Collection } from '@/database/types'
import type { ChartContext, ProgressChartData } from './chartRegistry'

export type CollectionOverviewSort = 'name' | 'strength' | 'revisions' | 'revised' | 'notRevised'

// Each collection gets ~120px of plot; the chart fills its container when that
// fits and grows past it (scrolling horizontally) when there are many.
const PX_PER_COLLECTION = 120

const MAX_LABEL_CHARS = 20

interface CollectionMetrics {
  strength: number
  revisions: number
  revised: number
  notRevised: number
}

export interface CollectionOverviewOptions {
  collections: Collection[]
  sortBy: CollectionOverviewSort
}

/**
 * Strength, revisions and card coverage per collection.
 *
 * Returns the CSS width the scroll container should give the chart, or `null`
 * when there was nothing to draw. Unlike the other charts this one is rebuilt
 * on every render: the x-axis categories, the per-point colors and the plot
 * width all change together when the sort order does.
 */
export function renderCollectionOverviewChart(
  { registry, palette }: ChartContext,
  el: HTMLElement,
  data: ProgressChartData,
  { collections, sortBy }: CollectionOverviewOptions
): string | null {
  // Metrics first, so the collections can be sorted by computed values.
  const metricsMap = new Map<string, CollectionMetrics>()
  for (const collection of collections) {
    const items = data.items.filter(i => i.collectionId === collection.id)
    const itemIds = new Set(items.map(i => i.id!))
    const logs = data.logs.filter(l => itemIds.has(l.learning_item_id))
    const progress = data.progress.filter(p => itemIds.has(p.learning_item_id))
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

  const visible = [...collections].sort((a, b) => {
    if (sortBy === 'name') return a.title.localeCompare(b.title)
    return metricsMap.get(b.id!)![sortBy] - metricsMap.get(a.id!)![sortBy]
  })
  if (visible.length === 0) return null

  const categories = visible.map(c =>
    c.title.length > MAX_LABEL_CHARS ? c.title.substring(0, MAX_LABEL_CHARS) + '…' : c.title
  )
  // Full (untruncated) titles for the tooltip, indexed by point position.
  const fullTitles = visible.map(c => c.title)
  const metrics = visible.map(c => metricsMap.get(c.id!)!)

  registry.destroy('collectionOverview')
  registry.create('collectionOverview', el, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: { categories, crosshair: true },
    yAxis: [
      {
        title: { text: 'Count' },
        min: 0,
        gridLineWidth: 1,
        gridLineColor: palette.gridLine()
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
      {
        name: 'Avg Strength (%)',
        data: metrics.map(m => ({ y: m.strength, color: palette.tierColorForPct(m.strength) })),
        colorByPoint: true,
        type: 'column',
        yAxis: 1
      },
      {
        name: 'Total Revisions',
        data: metrics.map(m => m.revisions),
        color: palette.color('chartPrimary'),
        type: 'column'
      },
      {
        name: 'Cards Revised',
        data: metrics.map(m => m.revised),
        color: palette.color('chartSecondary'),
        type: 'column'
      },
      {
        name: 'Cards Not Revised',
        data: metrics.map(m => m.notRevised),
        color: palette.color('chartNeutral'),
        type: 'column'
      }
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

  return `max(100%, ${visible.length * PX_PER_COLLECTION}px)`
}
