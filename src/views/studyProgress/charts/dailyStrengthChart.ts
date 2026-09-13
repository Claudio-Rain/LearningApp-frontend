import { eachDayOfInterval, format, parseISO } from 'date-fns'
import type { AttemptLog } from '@/database/types'
import { clampStrength } from '@/utils/strength'
import { byCreatedAt } from '../aggregation'
import type { ChartContext, ProgressChartData } from './chartRegistry'

// Dates behind the chart's categories; refreshed on each render so the tooltip
// formatter (bound once at chart creation) stays accurate.
let dailyDates: string[] = []

/**
 * Average strength across *all* cards for each day since the first attempt.
 *
 * Logs are grouped by calendar day, then replayed chronologically: each card's
 * strength accumulates via ease_score (clamped 0–1, same as the composition
 * chart). At the end of each day the average counts every card — cards never
 * revised contribute 0.
 */
export function renderDailyStrengthChart(
  { registry, palette }: ChartContext,
  el: HTMLElement,
  { logs, items }: ProgressChartData
): void {
  if (logs.length === 0 || items.length === 0) return

  const sortedLogs = [...logs].sort(byCreatedAt)

  const logsByDay = new Map<string, AttemptLog[]>()
  for (const log of sortedLogs) {
    const day = format(parseISO(log.created_at), 'yyyy-MM-dd')
    if (!logsByDay.has(day)) logsByDay.set(day, [])
    logsByDay.get(day)!.push(log)
  }

  const firstDay = parseISO(format(parseISO(sortedLogs[0]!.created_at), 'yyyy-MM-dd'))
  const days = eachDayOfInterval({ start: firstDay, end: new Date() })

  const runningStrength = new Map<string, number>()
  let strengthSum = 0
  const dates: string[] = []
  const avgStrengths: number[] = []
  for (const day of days) {
    const dayKey = format(day, 'yyyy-MM-dd')
    for (const log of logsByDay.get(dayKey) ?? []) {
      const prev = runningStrength.get(log.learning_item_id) ?? 0
      const next = clampStrength(prev + log.ease_score)
      runningStrength.set(log.learning_item_id, next)
      strengthSum += next - prev
    }
    dates.push(dayKey)
    avgStrengths.push(Math.round((strengthSum / items.length) * 1000) / 10)
  }

  dailyDates = dates
  const dateLabels = dates.map(d => format(parseISO(d), 'MMM d, yy'))
  const tickInterval = Math.max(1, Math.round(dates.length / 8))

  const existing = registry.get('dailyStrength')
  if (existing) {
    existing.xAxis[0]?.update({ categories: dateLabels, tickInterval }, false)
    existing.series[0]?.setData(avgStrengths, true, { duration: 300 })
    return
  }

  registry.create('dailyStrength', el, {
    chart: { type: 'areaspline', zooming: { type: 'x' } },
    title: { text: '' },
    xAxis: { categories: dateLabels, tickInterval },
    yAxis: {
      title: { text: 'Avg Strength (%)' },
      min: 0,
      max: 100,
      gridLineWidth: 1,
      gridLineColor: palette.gridLine(),
      // Starts at 'fair' — the weak tier's floor is the axis baseline.
      plotLines: palette.tierPlotLines({ from: 'fair', labelY: -6 })
    },
    series: [{
      name: 'Avg Strength',
      data: avgStrengths,
      type: 'areaspline',
      color: palette.color('chartPrimary'),
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, 'rgba(21, 101, 192, 0.35)'],
          [1, 'rgba(21, 101, 192, 0.02)']
        ]
      },
      lineWidth: 2.5,
      marker: { enabled: false }
    }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: {
      formatter: function(this: any) {
        const dateStr = dailyDates[this.point?.index ?? 0]
        const label = dateStr ? format(parseISO(dateStr), 'EEEE, MMM d, yyyy') : this.x
        return `<span style="font-size:11px">${label}</span><br/><b>${this.y}%</b> average strength`
      }
    }
  })
}
