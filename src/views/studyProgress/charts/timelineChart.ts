import { eachDayOfInterval, format, parseISO } from 'date-fns'
import type { ChartContext, ProgressChartData } from './chartRegistry'

export interface TimelineRange {
  /** `yyyy-MM-dd` */
  start: string
  /** `yyyy-MM-dd` */
  end: string
}

// Dates behind the chart's categories; refreshed on each render so the tooltip
// formatter (bound once at chart creation) stays accurate.
let timelineDates: string[] = []

/** Attempts per day over the selected range, with a 5-day moving average. */
export function renderTimelineChart(
  { registry, palette }: ChartContext,
  el: HTMLElement,
  data: ProgressChartData,
  range: TimelineRange
): void {
  const start = parseISO(range.start)
  const end = parseISO(range.end)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return

  const dateMap = new Map<string, number>()
  eachDayOfInterval({ start, end }).forEach(d => dateMap.set(format(d, 'yyyy-MM-dd'), 0))

  data.logs.forEach(log => {
    const d = format(parseISO(log.created_at), 'yyyy-MM-dd')
    if (!dateMap.has(d)) return // outside the selected range
    dateMap.set(d, dateMap.get(d)! + 1)
  })

  const dates = Array.from(dateMap.keys())
  const counts = Array.from(dateMap.values())

  const movingAvg = counts.map((_, i) => {
    const window = counts.slice(Math.max(0, i - 4), i + 1)
    return Math.round((window.reduce((s, v) => s + v, 0) / window.length) * 10) / 10
  })

  timelineDates = dates
  const dateLabels = dates.map(d => format(parseISO(d), 'MMM d, yy'))
  const tickInterval = Math.max(1, Math.round(dates.length / 6))

  const existing = registry.get('timeline')
  if (existing) {
    existing.zoomOut()
    existing.xAxis[0]?.update({ categories: dateLabels, tickInterval }, false)
    existing.series[0]?.setData(counts, false, { duration: 300 })
    existing.series[1]?.setData(movingAvg, true, { duration: 300 })
    return
  }

  registry.create('timeline', el, {
    chart: { type: 'spline', zooming: { type: 'x' } },
    title: { text: '' },
    xAxis: { categories: dateLabels, tickInterval },
    yAxis: {
      title: { text: 'Attempts' },
      min: 0,
      gridLineWidth: 1,
      gridLineColor: palette.gridLine()
    },
    series: [
      {
        name: 'Daily Attempts',
        data: counts,
        color: palette.color('chartAccent'),
        type: 'spline',
        lineWidth: 2,
        marker: { enabled: false }
      },
      {
        name: '5-Day Avg',
        data: movingAvg,
        color: palette.color('chartAccentMuted'),
        type: 'spline',
        lineWidth: 2.5,
        marker: { enabled: false },
        dashStyle: 'ShortDash'
      }
    ],
    legend: { enabled: true },
    credits: { enabled: false },
    tooltip: {
      shared: true,
      formatter: function(this: any) {
        const dateStr = timelineDates[this.points?.[0]?.point?.index ?? 0]
        const label = dateStr ? format(parseISO(dateStr), 'EEEE, MMM d') : this.x
        let s = `<span style="font-size:11px">${label}</span><br/>`
        this.points?.forEach((p: any) => {
          s += `<span style="color:${p.color}">●</span> ${p.series.name}: <b>${p.y}</b><br/>`
        })
        return s
      }
    }
  })
}
