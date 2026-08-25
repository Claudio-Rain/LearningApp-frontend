// src/plugins/vuetify.ts
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'
import { initialThemeName } from '@/shared/composables/useAppTheme'

// Code blocks stay light-ink-on-dark-paper in BOTH themes, so this pair is
// absolute rather than semantic: `darkColor` is always the dark ink, and
// `lightColor` always the light paper. Consumers use them in both directions
// (the editor's <pre> is light-on-dark, CodeBlock's language chip is
// dark-on-light on top of it), which is why they must resolve to the same
// values under either theme.
const inkPaper = {
  darkColor: '#2e2b29',
  lightColor: '#ffffff',
}

// The mastery scale is one concept rendered three ways — as badge text, as
// muted distribution-bar fills, and as chart series — and each rendering needs
// its own lightness ramp. Hence parallel token families rather than one set
// reused at different opacities.
const light = {
  ...inkPaper,

  // Badge text, read against a 15%-tinted background of the same hue.
  masteryNew: '#1976D2',
  masteryWeak: '#D32F2F',
  masteryFair: '#E65100',
  masteryGood: '#2E7D32',
  masteryMastered: '#6A1B9A',

  // Distribution-bar fills, muted so a full-width bar is not overbearing.
  barNew: '#b6c2c9',
  barWeak: '#ef8380',
  barFair: '#f5b266',
  barGood: '#83c588',
  barMastered: '#b98cc9',

  // Score scale shared by the Highcharts plot lines and Study Options chips.
  scaleNew: '#BDBDBD',
  scaleCritical: '#F44336',
  scaleStruggling: '#FF9800',
  scaleGood: '#8BC34A',
  scaleMastered: '#4CAF50',

  // Plot-line label text, a notch darker than the line it annotates.
  scaleCriticalText: '#F44336',
  scaleStrugglingText: '#EF6C00',
  scaleGoodText: '#689F38',
  scaleMasteredText: '#388E3C',

  // Chart series accents.
  chartPrimary: '#1565C0',
  chartSecondary: '#64B5F6',
  chartAccent: '#2196F3',
  chartAccentMuted: '#90CAF9',
  chartNeutral: '#BDBDBD',
  chartPositive: '#4CAF50',
  chartPositiveMuted: '#A5D6A7',

  // Heatmap ramp, cold to hot.
  heatMin: '#FFFFFF',
  heatLow: '#BBDEFB',
  heatMid: '#42A5F5',
  heatHigh: '#1565C0',

  // Gradient panel headers.
  gradientBlueFrom: '#1565C0',
  gradientBlueTo: '#42A5F5',
  gradientPurpleFrom: '#6A1B9A',
  gradientPurpleTo: '#AB47BC',
}

// Dark counterparts. Text-bearing tokens lighten, since dark ink is unreadable
// on a dark surface; fills deepen instead so they do not glare. The five
// mastery steps are kept distinguishable from each other by hue and lightness,
// which is why these are hand-picked rather than mechanically inverted.
const dark = {
  ...inkPaper,

  masteryNew: '#90CAF9',
  masteryWeak: '#EF9A9A',
  masteryFair: '#FFB74D',
  masteryGood: '#A5D6A7',
  masteryMastered: '#CE93D8',

  barNew: '#5b666d',
  barWeak: '#b85c5a',
  barFair: '#bd854a',
  barGood: '#5f9463',
  barMastered: '#8a6896',

  scaleNew: '#757575',
  scaleCritical: '#E57373',
  scaleStruggling: '#FFB74D',
  scaleGood: '#AED581',
  scaleMastered: '#81C784',

  scaleCriticalText: '#EF9A9A',
  scaleStrugglingText: '#FFB74D',
  scaleGoodText: '#C5E1A5',
  scaleMasteredText: '#A5D6A7',

  chartPrimary: '#64B5F6',
  chartSecondary: '#1E88E5',
  chartAccent: '#64B5F6',
  chartAccentMuted: '#1E88E5',
  chartNeutral: '#616161',
  chartPositive: '#81C784',
  chartPositiveMuted: '#4C7A4F',

  heatMin: '#1E1E1E',
  heatLow: '#1A3A5C',
  heatMid: '#1E88E5',
  heatHigh: '#90CAF9',

  gradientBlueFrom: '#0D47A1',
  gradientBlueTo: '#1976D2',
  gradientPurpleFrom: '#4A148C',
  gradientPurpleTo: '#7B1FA2',
}

export const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: initialThemeName(),
    themes: {
      light: {
        dark: false,
        colors: light,
      },
      dark: {
        dark: true,
        colors: {
          background: '#212121',
          surface: '#1E1E1E',
          primary: '#BB86FC',
          secondary: '#03DAC6',
          error: '#CF6679',
          ...dark,
        },
      },
    },
  },
})
