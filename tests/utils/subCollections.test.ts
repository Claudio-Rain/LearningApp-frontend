import { describe, it, expect } from 'vitest'
import {
  withSubCollections,
  subCollectionsOf,
  canMoveInto,
  collectionPath,
  fileUnderChosen,
  type NestedCollection
} from '@/utils/subCollections'

const col = (id: string, parentId?: string | null, title = id): NestedCollection => ({ id, title, parentId })

// .NET
// ├─ Junior
// │  ├─ C#
// │  └─ DB (junior-db)
// └─ Middle
//    └─ DB (middle-db)
const tree = [
  col('net', null, '.NET'),
  col('junior', 'net', 'Junior'),
  col('csharp', 'junior', 'C#'),
  col('junior-db', 'junior', 'DB concepts'),
  col('middle', 'net', 'Middle'),
  col('middle-db', 'middle', 'DB concepts'),
  col('english', undefined, 'English')
]

describe('withSubCollections', () => {
  it('returns exactly the chosen ids when nothing is nested', () => {
    const flat = [col('a'), col('b'), col('c')]
    expect(withSubCollections(['a', 'c'], flat)).toEqual(new Set(['a', 'c']))
  })

  it('includes sub-collections at any depth', () => {
    expect(withSubCollections(['net'], tree)).toEqual(
      new Set(['net', 'junior', 'csharp', 'junior-db', 'middle', 'middle-db'])
    )
  })

  it('takes just the chosen branches', () => {
    expect(withSubCollections(['junior-db', 'middle-db'], tree)).toEqual(new Set(['junior-db', 'middle-db']))
  })

  it('never repeats a collection when a parent and its child are both chosen', () => {
    expect([...withSubCollections(['junior', 'junior-db'], tree)].sort()).toEqual(['csharp', 'junior', 'junior-db'])
  })

  it('treats a collection whose parent is gone as top level', () => {
    const orphaned = [col('a', 'deleted-elsewhere'), col('b', 'a')]
    expect(withSubCollections(['a'], orphaned)).toEqual(new Set(['a', 'b']))
  })

  it('terminates on a loop left behind by two devices', () => {
    const loop = [col('a', 'b'), col('b', 'a')]
    expect(withSubCollections(['a'], loop)).toEqual(new Set(['a', 'b']))
  })
})

describe('subCollectionsOf', () => {
  it('lists everything inside, but not the collection itself', () => {
    expect(subCollectionsOf('junior', tree).sort()).toEqual(['csharp', 'junior-db'])
    expect(subCollectionsOf('english', tree)).toEqual([])
  })
})

describe('canMoveInto', () => {
  it('allows another branch and the top level', () => {
    expect(canMoveInto('junior-db', 'middle', tree)).toBe(true)
    expect(canMoveInto('junior', null, tree)).toBe(true)
  })

  it('refuses the collection itself and its own sub-collections', () => {
    expect(canMoveInto('junior', 'junior', tree)).toBe(false)
    expect(canMoveInto('net', 'junior-db', tree)).toBe(false)
  })
})

describe('collectionPath', () => {
  it('tells apart collections with the same name', () => {
    expect(collectionPath('junior-db', tree)).toBe('.NET › Junior › DB concepts')
    expect(collectionPath('middle-db', tree)).toBe('.NET › Middle › DB concepts')
  })

  it('is just the title at the top level', () => {
    expect(collectionPath('english', tree)).toBe('English')
  })

  it('stays finite on a loop', () => {
    const loop = [col('a', 'b'), col('b', 'a')]
    expect(collectionPath('a', loop)).toMatch(/^(a|b › a)$/)
  })
})

describe('fileUnderChosen', () => {
  const items = [
    { id: '1', collectionId: 'csharp' },
    { id: '2', collectionId: 'junior-db' },
    { id: '3', collectionId: 'junior' },
    { id: '4', collectionId: 'middle-db' },
    { id: '5', collectionId: 'english' }
  ]

  it('leaves items as they are when nothing is nested', () => {
    const flat = [col('a'), col('b')]
    const flatItems = [{ id: '1', collectionId: 'a' }, { id: '2', collectionId: 'b' }]
    expect(fileUnderChosen(flatItems, ['a', 'b'], flat)).toEqual(flatItems)
  })

  it('files sub-collection items under the chosen parent', () => {
    expect(fileUnderChosen(items, ['junior'], tree)).toEqual([
      { id: '1', collectionId: 'junior' },
      { id: '2', collectionId: 'junior' },
      { id: '3', collectionId: 'junior' }
    ])
  })

  it('lets a chosen sub-collection keep its own items', () => {
    expect(fileUnderChosen(items, ['junior', 'junior-db'], tree)).toEqual([
      { id: '1', collectionId: 'junior' },
      { id: '2', collectionId: 'junior-db' },
      { id: '3', collectionId: 'junior' }
    ])
  })

  it('leaves out items outside every chosen collection', () => {
    expect(fileUnderChosen(items, ['junior-db', 'middle-db'], tree).map(i => i.id)).toEqual(['2', '4'])
  })
})
