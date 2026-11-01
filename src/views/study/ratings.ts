// How far each rating moves a card's 0–1 strength score. The nudges shift it a
// little; RESET and LEARNED are large enough that the clamp in recordAttempt
// turns them into an absolute 0 or 1.
export const EASE = {
  veryHard: -0.15,
  hard: -0.1,
  good: 0.1,
  easy: 0.15,
  reset: -1,
  learned: 1
} as const

export interface RatingButton {
  ease: number
  label: string
  icon: string
  color: string
}

export const RATING_BUTTONS: RatingButton[] = [
  { ease: EASE.veryHard, label: 'Very Hard', icon: 'mdi-close', color: 'error' },
  { ease: EASE.hard, label: 'Hard', icon: 'mdi-minus', color: 'warning' },
  { ease: EASE.good, label: 'Good', icon: 'mdi-check', color: 'info' },
  { ease: EASE.easy, label: 'Easy', icon: 'mdi-star', color: 'success' }
]

// Number-key ratings on a flipped card. 1-4 mirror the rating buttons; 0 and 9
// are the all-the-way jumps (start over / learned).
//
// They sit at the two ends of the number row on purpose: neighbours on the
// keyboard, opposites in effect, and far enough from 1-4 that a slipped finger
// costs a nudge rather than a whole card's history.
export const RATING_KEYS: Record<string, number> = {
  '1': EASE.veryHard,
  '2': EASE.hard,
  '3': EASE.good,
  '4': EASE.easy,
  '0': EASE.reset,
  '9': EASE.learned
}
