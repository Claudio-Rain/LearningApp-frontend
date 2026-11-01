// Collections can live inside other collections. The rule the whole app
// follows: choosing a collection — to study, for the widget, in Progress, in a
// study set — also includes everything inside it. What gets saved is what the
// user chose, never the expanded list, so a sub-collection added later is
// picked up without choosing again.
//
// Pure on purpose (no database), so it can be tested like studySet.ts.
//
// Two sync edge cases are absorbed here rather than surfacing anywhere else: a
// collection whose parent no longer exists (deleted on another device) is
// treated as top level, and a loop (two devices moving A into B and B into A
// at the same time) can never make anything spin forever.

export interface NestedCollection {
  id?: string
  title: string
  parentId?: string | null
}

/**
 * The parent of each collection, keeping only parents that actually exist. In
 * a loop, the link that closes it is dropped (in id order, so every device
 * agrees), which leaves that collection at the top level. Collections missing
 * from the map are top level.
 */
export function parentsOf(collections: NestedCollection[]): Map<string, string> {
  const ids = new Set(collections.map(c => c.id).filter(Boolean))
  const parents = new Map<string, string>()
  for (const c of collections) {
    if (c.id && c.parentId && c.parentId !== c.id && ids.has(c.parentId)) parents.set(c.id, c.parentId)
  }
  for (const id of [...parents.keys()].sort()) {
    const seen = new Set([id])
    let parent = parents.get(id)
    while (parent && !seen.has(parent)) {
      seen.add(parent)
      parent = parents.get(parent)
    }
    if (parent === id) parents.delete(id)
  }
  return parents
}

/** From the top-level collection down to the parent; [] for a top-level one. */
function ancestorsOf(id: string, parents: Map<string, string>): string[] {
  const chain: string[] = []
  const seen = new Set([id])
  let parent = parents.get(id)
  while (parent && !seen.has(parent)) {
    chain.unshift(parent)
    seen.add(parent)
    parent = parents.get(parent)
  }
  return chain
}

/** The chosen collections plus every collection inside them, at any depth. */
export function withSubCollections(chosenIds: Iterable<string>, collections: NestedCollection[]): Set<string> {
  const children = new Map<string, string[]>()
  for (const [id, parent] of parentsOf(collections)) {
    children.set(parent, [...(children.get(parent) ?? []), id])
  }

  const result = new Set<string>()
  const pending = [...chosenIds]
  while (pending.length) {
    const id = pending.pop()!
    if (result.has(id)) continue
    result.add(id)
    pending.push(...(children.get(id) ?? []))
  }
  return result
}

/** The top-level collection a collection lives under; itself when it is top level. */
export function topLevelOf(id: string, collections: NestedCollection[]): string {
  return ancestorsOf(id, parentsOf(collections))[0] ?? id
}

/** The sub-collections inside a collection, at any depth — not the collection itself. */
export function subCollectionsOf(id: string, collections: NestedCollection[]): string[] {
  return [...withSubCollections([id], collections)].filter(sub => sub !== id)
}

/**
 * Whether `id` may be dropped into `targetId` (null = top level). A collection
 * can't go inside itself or inside one of its own sub-collections.
 */
export function canMoveInto(id: string, targetId: string | null, collections: NestedCollection[]): boolean {
  if (targetId === null) return true
  return !withSubCollections([id], collections).has(targetId)
}

/** "Junior › DB concepts": tells apart collections that share a name. */
export function collectionPath(id: string, collections: NestedCollection[], separator = ' › '): string {
  const byId = new Map(collections.map(c => [c.id, c]))
  return [...ancestorsOf(id, parentsOf(collections)), id]
    .map(i => byId.get(i)?.title ?? '')
    .join(separator)
}

/**
 * Files each item under the chosen collection it belongs to, for anything that
 * divides cards per chosen collection (study sets). When both a collection and
 * one of its sub-collections are chosen, the sub-collection keeps its own items
 * — so "at most 5 from DB concepts" still holds — and the parent gets the rest.
 * Items outside every chosen collection are left out.
 */
export function fileUnderChosen<T extends { collectionId: string }>(
  items: T[],
  chosenIds: string[],
  collections: NestedCollection[]
): T[] {
  const chosen = new Set(chosenIds)
  const parents = parentsOf(collections)
  const owner = new Map<string, string | undefined>()
  const ownerOf = (collectionId: string) => {
    if (!owner.has(collectionId)) {
      const chain = [...ancestorsOf(collectionId, parents), collectionId]
      owner.set(collectionId, chain.reverse().find(id => chosen.has(id)))
    }
    return owner.get(collectionId)
  }

  return items.flatMap(item => {
    const collectionId = ownerOf(item.collectionId)
    if (!collectionId) return []
    return [collectionId === item.collectionId ? item : { ...item, collectionId }]
  })
}
