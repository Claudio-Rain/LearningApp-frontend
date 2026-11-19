// Mermaid theme built from the app's Vuetify palette, so a diagram looks like
// part of the card in light and dark mode instead of Mermaid's stock colours.
// Mermaid works out the remaining shades from these on its own ('base' theme).

type Colors = Record<string, string | undefined>

const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map(c => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** `amount` of `color` over `base` (both hex), as hex. */
export const mixHex = (color: string, base: string, amount: number): string => {
  const a = hexToRgb(color)
  const b = hexToRgb(base)
  return (
    '#' +
    a
      .map((v, i) => Math.round(v * amount + b[i]! * (1 - amount)))
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
  )
}

const ACCENTS = ['inkBlue', 'inkPurple', 'inkTeal', 'inkOrange', 'inkGreen', 'inkRed']

export const diagramThemeVariables = (colors: Colors, dark: boolean, fontFamily: string) => {
  const surface = colors.surface ?? (dark ? '#1E1E1E' : '#FFFFFF')
  const text = colors['on-surface'] ?? (dark ? '#FFFFFF' : '#000000')
  const accents = ACCENTS.map(name => colors[name] ?? colors.primary ?? '#1565C0')
  // A tinted fill under each accent: enough to group, light enough to read on.
  const fill = (c: string) => mixHex(c, surface, dark ? 0.22 : 0.14)
  const [blue, purple, teal] = accents as [string, string, string]

  const scale: Record<string, string> = {}
  accents.forEach((c, i) => {
    // Mind maps, timelines and journeys colour their branches from cScale;
    // pie slices from pie1…
    scale[`cScale${i}`] = fill(c)
    scale[`cScaleLabel${i}`] = text
    scale[`cScalePeer${i}`] = c
    scale[`pie${i + 1}`] = mixHex(c, surface, dark ? 0.75 : 0.6)
  })

  return {
    darkMode: dark,
    fontFamily,
    fontSize: '15px',
    background: surface,
    mainBkg: fill(blue),
    primaryColor: fill(blue),
    primaryBorderColor: blue,
    primaryTextColor: text,
    secondaryColor: fill(purple),
    secondaryBorderColor: purple,
    secondaryTextColor: text,
    tertiaryColor: fill(teal),
    tertiaryBorderColor: teal,
    tertiaryTextColor: text,
    textColor: text,
    titleColor: text,
    lineColor: mixHex(text, surface, 0.55),
    edgeLabelBackground: surface,
    clusterBkg: mixHex(text, surface, 0.04),
    clusterBorder: mixHex(text, surface, 0.25),
    noteBkgColor: mixHex(colors.markYellow ?? '#FFE45C', surface, dark ? 0.3 : 0.45),
    noteTextColor: text,
    noteBorderColor: mixHex(colors.markYellow ?? '#FFE45C', text, 0.6),
    actorBkg: fill(blue),
    actorBorder: blue,
    actorTextColor: text,
    signalColor: text,
    signalTextColor: text,
    labelBoxBkgColor: fill(purple),
    labelBoxBorderColor: purple,
    labelTextColor: text,
    pieStrokeColor: surface,
    pieOuterStrokeColor: surface,
    pieTitleTextColor: text,
    pieSectionTextColor: text,
    pieLegendTextColor: text,
    ...scale,
  }
}
