// The order of learning items in a collection's list, set by dragging.
//
// Each placed item has a numeric `position`; a move gives the moved item a
// position between its new neighbours, so it's one write however long the
// list is. Items that were never placed (every item before reordering
// existed, and new ones) sort after the placed ones, alphabetically — which is
// exactly the list as it looked before. The first drag in such a collection
// numbers every item once, freezing that order.

type Orderable = { id?: string; title: string; position?: number }

export type PositionWrite = { id: string; position: number }

const byTitle = (a: Orderable, b: Orderable) =>
  a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })

/** The items in list order. Returns a new array. */
export const sortByPosition = <T extends Orderable>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => {
    const pa = a.position
    const pb = b.position
    if (pa !== undefined && pb !== undefined) return pa - pb || byTitle(a, b)
    if (pa !== undefined) return -1
    if (pb !== undefined) return 1
    return byTitle(a, b)
  })

// Below this the midpoint of two doubles stops being reliably between them.
const MIN_GAP = 1e-9

/**
 * The full new order when some items are placed at the start (or end) of the
 * list in a given sequence; everything not listed keeps its relative order.
 * Unknown and repeated ids are ignored.
 */
export const mergeOrder = (currentIds: readonly string[], listedIds: readonly string[], place: 'start' | 'end' = 'start'): string[] => {
  const known = new Set(currentIds)
  const listed = [...new Set(listedIds)].filter(id => known.has(id))
  const picked = new Set(listed)
  const rest = currentIds.filter(id => !picked.has(id))
  return place === 'end' ? [...rest, ...listed] : [...listed, ...rest]
}

/**
 * The position writes that put the list in exactly `orderedIds` order
 * (numbered 1, 2, 3…), skipping items that already hold their number.
 */
export const planOrder = (sorted: readonly Orderable[], orderedIds: readonly string[]): PositionWrite[] => {
  const byId = new Map(sorted.map(i => [i.id, i]))
  return orderedIds.flatMap((id, i) => {
    const item = byId.get(id)
    return item && item.position !== i + 1 ? [{ id, position: i + 1 }] : []
  })
}

/**
 * The position writes that move `id` to `toIndex` in the sorted list (the
 * index it should end up at). Usually one write; every item gets numbered
 * when some aren't placed yet or the gaps have worn too thin.
 */
export const planMove = (sorted: readonly Orderable[], id: string, toIndex: number): PositionWrite[] => {
  const from = sorted.findIndex(i => i.id === id)
  if (from < 0) return []
  const rest = sorted.filter(i => i.id !== id)
  const to = Math.max(0, Math.min(toIndex, rest.length))
  if (to === from) return []

  const allPlaced = sorted.every(i => i.position !== undefined)
  if (allPlaced) {
    const before = rest[to - 1]?.position
    const after = rest[to]?.position
    let position: number | undefined
    if (before === undefined && after !== undefined) position = after - 1
    else if (after === undefined && before !== undefined) position = before + 1
    else if (before !== undefined && after !== undefined && after - before > MIN_GAP) position = (before + after) / 2
    if (position !== undefined) return [{ id, position }]
  }

  // Number the whole list in its new order, writing only what changes.
  const next = [...rest]
  next.splice(to, 0, sorted[from]!)
  return next.flatMap((item, i) =>
    item.id && item.position !== i + 1 ? [{ id: item.id, position: i + 1 }] : []
  )
}
