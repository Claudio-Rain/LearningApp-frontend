import { format, parseISO, subDays } from 'date-fns'
import { HOUR_LABELS, recentLogs } from '../aggregation'
import type { ChartContext, ProgressChartData } from './chartRegistry'

// All three activity charts look at the same trailing window.
const WINDOW_DAYS = 30
const windowStart = () => subDays(new Date(), WINDOW_DAYS - 1)

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Attempts per hour of day, peak hour highlighted. */
export function renderStudyHoursChart(
  { registry, palette }: ChartContext,
  el: HTMLElement,
  { logs }: ProgressChartData
): void {
  const hourCounts = Array(24).fill(0)
  recentLogs(logs, windowStart()).forEach(log => {
    hourCounts[parseISO(log.created_at).getHours()]++
  })
  const peak = Math.max(...hourCounts)
  const data = hourCounts.map(count => ({
    y: count,
    color: count === peak && peak > 0 ? palette.color('chartAccent') : palette.color('chartAccentMuted')
  }))

  const existing = registry.get('studyHours')
  if (existing) {
    existing.series[0]?.setData(data, true, { duration: 300 })
    return
  }

  registry.create('studyHours', el, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: { categories: HOUR_LABELS, title: { text: 'Hour of Day' } },
    yAxis: {
      title: { text: 'Attempts' },
      min: 0,
      gridLineWidth: 1,
      gridLineColor: palette.gridLine()
    },
    series: [{ name: 'Attempts', data, colorByPoint: true, type: 'column' }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: {
      formatter: function(this: any) {
        return `<b>${HOUR_LABELS[this.point.index]}</b><br/><b>${this.y}</b> attempts`
      }
    }
  })
}

/** Attempts per weekday (Monday first), peak day highlighted. */
export function renderStudyDaysChart(
  { registry, palette }: ChartContext,
  el: HTMLElement,
  { logs }: ProgressChartData
): void {
  const dayCounts = Array(7).fill(0)
  recentLogs(logs, windowStart()).forEach(log => {
    const jsDay = parseISO(log.created_at).getDay() // 0=Sun, 1=Mon, ..., 6=Sat
    dayCounts[jsDay === 0 ? 6 : jsDay - 1]++
  })
  const peak = Math.max(...dayCounts)
  const data = dayCounts.map((count, i) => ({
    y: count,
    color: count === peak && peak > 0 ? palette.color('chartPositive') : palette.color('chartPositiveMuted'),
    name: DAY_NAMES[i]
  }))

  const existing = registry.get('studyDays')
  if (existing) {
    existing.series[0]?.setData(data, true, { duration: 300 })
    return
  }

  registry.create('studyDays', el, {
    chart: { type: 'column' },
    title: { text: '' },
    xAxis: { categories: DAY_NAMES, title: { text: 'Day of Week' } },
    yAxis: {
      title: { text: 'Attempts' },
      min: 0,
      gridLineWidth: 1,
      gridLineColor: palette.gridLine()
    },
    series: [{ name: 'Attempts', data, colorByPoint: true, type: 'column' }],
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { pointFormat: '<b>{point.y}</b> attempts' }
  })
}

// Day-of-month labels behind the heatmap's x-axis; refreshed on each render so
// the tooltip formatter (bound once at chart creation) stays accurate as the
// trailing window rolls forward.
let heatmapDayLabels: string[] = []

/** Day-of-month × hour-of-day attempt density over the trailing window. */
export function renderStudyHeatmapChart(
  { registry, palette }: ChartContext,
  el: HTMLElement,
  { logs }: ProgressChartData
): void {
  const today = new Date()

  // days[0] = 30 days ago, days[29] = today — today renders at the right (last X index)
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const d = subDays(today, WINDOW_DAYS - 1 - i)
    return { dateStr: format(d, 'yyyy-MM-dd'), dayOfMonth: d.getDate(), label: format(d, 'EEE, MMM d') }
  })
  heatmapDayLabels = days.map(d => d.label)

  const countMap = new Map<string, number>()
  recentLogs(logs, windowStart()).forEach(log => {
    const date = parseISO(log.created_at)
    const key = `${format(date, 'yyyy-MM-dd')}-${date.getHours()}`
    countMap.set(key, (countMap.get(key) ?? 0) + 1)
  })

  const heatData: [number, number, number][] = []
  days.forEach((day, dayIdx) => {
    for (let h = 0; h < 24; h++) {
      heatData.push([dayIdx, h, countMap.get(`${day.dateStr}-${h}`) ?? 0])
    }
  })

  const maxVal = Math.max(...heatData.map(d => d[2]), 1)
  const lastIndex = WINDOW_DAYS - 1

  const existing = registry.get('studyHeatmap')
  if (existing) {
    existing.xAxis[0]?.setCategories(days.map(d => String(d.dayOfMonth)), false)
    ;(existing as any).colorAxis[0]?.update({ max: maxVal }, false)
    existing.series[0]?.setData(heatData, true, { duration: 300 })
    return
  }

  registry.create('studyHeatmap', el, {
    chart: { type: 'heatmap', height: 24 * 16 + 100 },
    title: { text: '' },
    xAxis: {
      categories: days.map(d => String(d.dayOfMonth)),
      title: { text: 'Day of Month' },
      labels: {
        useHTML: true,
        formatter: function(this: any) {
          return this.pos === lastIndex
            ? `<span style="color:${palette.color('chartAccent')};font-weight:700">${this.value}</span>`
            : `${this.value}`
        }
      }
    },
    yAxis: { categories: HOUR_LABELS, title: { text: 'Hour of Day' }, reversed: true },
    colorAxis: {
      min: 0,
      max: maxVal,
      stops: [
        [0, palette.color('heatMin')],
        [0.01, palette.color('heatLow')],
        [0.4, palette.color('heatMid')],
        [1, palette.color('heatHigh')]
      ]
    },
    series: [{
      name: 'Attempts',
      type: 'heatmap',
      borderWidth: 1,
      borderColor: palette.alpha('on-surface', 0.05),
      data: heatData,
      dataLabels: { enabled: false }
    }],
    legend: { align: 'right', layout: 'vertical', verticalAlign: 'middle' },
    credits: { enabled: false },
    tooltip: {
      formatter: function(this: any) {
        const label = heatmapDayLabels[this.point.x] ?? `Day ${this.point.x + 1}`
        return `<b>${label}, ${HOUR_LABELS[this.point.y]}</b><br/><b>${this.point.value}</b> attempts`
      }
    }
  })
}
