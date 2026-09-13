import { differenceInCalendarDays, eachDayOfInterval, format, parseISO } from 'date-fns'
import type { AttemptLog } from '@/database/types'
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

/**
 * Attempts per day averaged over every day since the very first attempt ever
 * logged — including days before the selected range, so the line is unaffected
 * by which window is on screen. `null` before the first attempt, where there is
 * no history to average yet.
 */
function cumulativeAverage(logs: AttemptLog[], dates: string[]): (number | null)[] {
  const perDay = new Map<string, number>()
  logs.forEach(log => {
    const d = format(parseISO(log.created_at), 'yyyy-MM-dd')
    perDay.set(d, (perDay.get(d) ?? 0) + 1)
  })

  const logDates = Array.from(perDay.keys()).sort()
  if (!logDates.length) return dates.map(() => null)
  const firstDate = parseISO(logDates[0])

  // Both lists are ascending, so one pass over the log days keeps the running
  // total in step with the range days.
  let next = 0
  let total = 0
  return dates.map(date => {
    while (next < logDates.length && logDates[next] <= date) total += perDay.get(logDates[next++])!
    const days = differenceInCalendarDays(parseISO(date), firstDate) + 1
    if (days < 1) return null // before any attempt was ever logged
    return Math.round((total / days) * 10) / 10
  })
}

/**
 * Attempts per day over the selected range, with a 5-day moving average and an
 * all-time cumulative average — every attempt since the very first one divided
 * by the days elapsed since then. Attempts before the range start still count
 * towards the cumulative line, so it reads the same whatever window is shown.
 */
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

  const cumulativeAvg = cumulativeAverage(data.logs, dates)

  timelineDates = dates
  const dateLabels = dates.map(d => format(parseISO(d), 'MMM d, yy'))
  const tickInterval = Math.max(1, Math.round(dates.length / 6))

  const existing = registry.get('timeline')
  if (existing) {
    existing.zoomOut()
    existing.xAxis[0]?.update({ categories: dateLabels, tickInterval }, false)
    existing.series[0]?.setData(counts, false, { duration: 300 })
    existing.series[1]?.setData(movingAvg, false, { duration: 300 })
    existing.series[2]?.setData(cumulativeAvg, true, { duration: 300 })
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
      },
      {
        name: 'All-Time Avg',
        data: cumulativeAvg,
        color: palette.color('chartRed'),
        type: 'spline',
        lineWidth: 2,
        marker: { enabled: false },
        dashStyle: 'Dot'
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
