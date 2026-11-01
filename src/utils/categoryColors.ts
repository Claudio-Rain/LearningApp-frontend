// Colors offered for categories. Shared by the collections view (picked by
// hand) and bulk insert (assigned by position, so new ones don't all match).
export const CATEGORY_SWATCHES = ['#1976D2', '#388E3C', '#D32F2F', '#F57C00', '#7B1FA2', '#0097A7', '#C2185B', '#5D4037']

export const DEFAULT_CATEGORY_COLOR = CATEGORY_SWATCHES[0]!

/** The swatch for the next category, cycling through the palette. */
export const swatchFor = (index: number): string =>
  CATEGORY_SWATCHES[index % CATEGORY_SWATCHES.length]!

/** "#RRGGBB" to an rgba() string at the given opacity. */
export const hexToRgba = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
