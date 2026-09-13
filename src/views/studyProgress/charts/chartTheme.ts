import Highcharts from './highcharts'
import type { useTheme } from 'vuetify'
import {
  SCORED_TIERS,
  STRENGTH_TIER_META,
  STRENGTH_TIER_FLOORS,
  strengthTier,
  type ScoredTier,
  type StrengthTier
} from '@/utils/strength'

type VuetifyTheme = ReturnType<typeof useTheme>

/**
 * Highcharts renders SVG presentation attributes, which do not resolve CSS
 * custom properties — passing `var(--v-theme-*)` through to a chart option
 * silently yields no color. So every chart color is read out of the active
 * Vuetify theme as a concrete value at render time instead.
 */
export interface ChartPalette {
  /** Concrete value of a Vuetify theme color token. */
  color(token: string): string
  /** A theme token at a given opacity, as `rgba(...)`. */
  alpha(token: string, a: number): string
  /** Chart color for a strength tier, resolved from the shared tier table. */
  tierColor(tier: StrengthTier): string
  /** Tier color for a 0–100 percentage. */
  tierColorForPct(pct: number): string
  gridLine(): string
  axisLine(): string
  mutedText(): string
  /**
   * Dashed lines marking where each strength tier begins, labelled with the
   * tier name. `from` skips the lower tiers — a y-axis starting at 0 does not
   * need a line drawn on its own baseline.
   */
  tierPlotLines(opts: { from?: ScoredTier; labelY: number }): unknown[]
}

export function createChartPalette(theme: VuetifyTheme): ChartPalette {
  const color = (token: string) => theme.current.value.colors[token] ?? '#000000'

  const alpha = (token: string, a: number) => {
    const hex = color(token).replace('#', '')
    const n = parseInt(hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex, 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
  }

  const tierColor = (tier: StrengthTier) => color(STRENGTH_TIER_META[tier].scale)

  return {
    color,
    alpha,
    tierColor,
    tierColorForPct: (pct: number) => tierColor(strengthTier(pct / 100)),
    gridLine: () => alpha('on-surface', 0.08),
    axisLine: () => alpha('on-surface', 0.2),
    mutedText: () => alpha('on-surface', 0.6),
    tierPlotLines: (opts: { from?: ScoredTier; labelY: number }) => {
      const start = opts.from ? SCORED_TIERS.indexOf(opts.from) : 0
      return SCORED_TIERS.slice(start).map(tier => ({
        value: STRENGTH_TIER_FLOORS[tier],
        color: tierColor(tier),
        width: 1,
        dashStyle: 'Dash',
        zIndex: 3,
        label: {
          text: STRENGTH_TIER_META[tier].label,
          align: 'right',
          x: -6,
          y: opts.labelY,
          style: {
            color: color(STRENGTH_TIER_META[tier].scaleText),
            fontSize: '11px',
            fontWeight: '600'
          }
        }
      }))
    }
  }
}

/**
 * Highcharts' built-in text colors are near-black and unreadable on a dark
 * surface, so axis/legend/title text is pinned to the theme's foreground rather
 * than left to the library default.
 */
export function applyGlobalChartTheme(palette: ChartPalette): void {
  const text = { color: palette.alpha('on-surface', 0.87) }
  const muted = { color: palette.mutedText() }
  Highcharts.setOptions({
    chart: { backgroundColor: 'transparent', style: { color: palette.alpha('on-surface', 0.87) } },
    title: { style: text },
    subtitle: { style: muted },
    xAxis: {
      lineColor: palette.axisLine(),
      tickColor: palette.axisLine(),
      labels: { style: muted },
      title: { style: muted }
    },
    yAxis: {
      lineColor: palette.axisLine(),
      labels: { style: muted },
      title: { style: muted }
    },
    legend: { itemStyle: text, itemHoverStyle: { color: palette.color('primary') } },
    tooltip: {
      backgroundColor: palette.color('surface'),
      style: { color: palette.alpha('on-surface', 0.87) },
      borderColor: palette.alpha('on-surface', 0.2)
    },
    plotOptions: { series: { dataLabels: { style: text } } }
  })
}
