// Strength tiers shared by the study surfaces. Colors are theme tokens from the
// score scale so the tiers stay distinguishable under both light and dark.

export type StrengthLabel = 'New' | 'Critical' | 'Struggling' | 'Good' | 'Mastered'

export interface StrengthInfo {
  label: StrengthLabel
  color: string
}

// A score below 0 means "no progress recorded yet".
export function strengthInfo(score: number): StrengthInfo {
  if (score < 0) return { label: 'New', color: 'scaleNew' }
  if (score < 0.25) return { label: 'Critical', color: 'scaleCritical' }
  if (score < 0.5) return { label: 'Struggling', color: 'scaleStruggling' }
  if (score < 0.75) return { label: 'Good', color: 'scaleGood' }
  return { label: 'Mastered', color: 'scaleMastered' }
}
