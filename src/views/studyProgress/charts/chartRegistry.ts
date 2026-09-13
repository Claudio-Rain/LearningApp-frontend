import Highcharts from './highcharts'
import type { AttemptLog, CardProgress, LearningItem } from '@/database/types'
import type { ChartPalette } from './chartTheme'

/**
 * The live chart instances, keyed by chart name. Renders reuse an existing
 * instance via `setData` (keeping the animation) and only build a new one when
 * there is none — so every render function looks up its key here first.
 */
export interface ChartRegistry {
  get(key: string): Highcharts.Chart | undefined
  /**
   * Create a chart and stash it under `key`. Centralizes the loose options cast
   * the chart configs rely on (formatter `this`, dashStyle strings,
   * colorByPoint, etc.) so the individual render functions stay cast-free.
   */
  create(key: string, el: HTMLElement, options: unknown): Highcharts.Chart
  destroy(key: string): void
  destroyAll(): void
}

export function createChartRegistry(): ChartRegistry {
  let charts: Record<string, Highcharts.Chart> = {}

  return {
    get: key => charts[key],
    create(key, el, options) {
      const chart = Highcharts.chart(el, options as Highcharts.Options)
      charts[key] = chart
      return chart
    },
    destroy(key) {
      charts[key]?.destroy()
      delete charts[key]
    },
    destroyAll() {
      Object.values(charts).forEach(chart => chart.destroy())
      charts = {}
    }
  }
}

/** What every render function needs on top of its data. */
export interface ChartContext {
  registry: ChartRegistry
  palette: ChartPalette
}

/** The filtered dataset the charts are drawn from. */
export interface ProgressChartData {
  logs: AttemptLog[]
  progress: CardProgress[]
  items: LearningItem[]
}
