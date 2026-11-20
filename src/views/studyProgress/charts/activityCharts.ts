import { format, parseISO, startOfDay, subDays } from 'date-fns'
import { HOUR_LABELS, recentLogs } from '../aggregation'
import type { ChartContext, ProgressChartData } from './chartRegistry'

// The heatmap looks at a trailing window that starts at midnight, so it holds
// exactly WINDOW_DAYS whole days.
const WINDOW_DAYS = 30
const windowStart = () => startOfDay(subDays(new Date(), WINDOW_DAYS - 1))

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
