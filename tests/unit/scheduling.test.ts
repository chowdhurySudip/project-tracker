import { describe, it, expect } from 'vitest'
import { getScheduledFronts, getGlobalFocusItem } from '@/lib/scheduling'
import type { Front, Item } from '@/types'

function makeFront(overrides: Partial<Front> = {}): Front {
  return {
    id: 'f1',
    name: 'Test Front',
    type: 'project',
    color: '256',
    status: 'active',
    items: [],
    cadence: { days: [] },
    prerequisites: [],
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item1',
    text: 'Do thing',
    status: 'open',
    order: 1,
    logs: [],
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

// 2026-06-01 is a Monday (day 1), 2026-05-31 is a Sunday (day 0)
const MONDAY = new Date('2026-06-01T10:00:00.000Z')
const SUNDAY = new Date('2026-05-31T10:00:00.000Z')
const WEDNESDAY = new Date('2026-06-03T10:00:00.000Z')

describe('getScheduledFronts', () => {
  it('returns empty groups when no fronts', () => {
    expect(getScheduledFronts([], MONDAY)).toEqual({
      hero: null,
      scheduled: [],
      offDay: [],
      locked: [],
    })
  })

  it('puts a cadence.days=[] front in scheduled on any day', () => {
    const f = makeFront({ id: 'f1', cadence: { days: [] } })
    const result = getScheduledFronts([f], MONDAY)
    expect(result.scheduled).toContainEqual(f)
    expect(result.hero).toEqual(f)
  })

  it('puts a weekday-only front in offDay on Sunday', () => {
    const f = makeFront({ id: 'f1', cadence: { days: [1, 2, 3, 4, 5] } })
    const result = getScheduledFronts([f], SUNDAY)
    expect(result.offDay).toContainEqual(f)
    expect(result.scheduled).toHaveLength(0)
    expect(result.hero).toBeNull()
  })

  it('puts an MF (Mon/Fri) front in offDay on Wednesday', () => {
    const f = makeFront({ id: 'f1', cadence: { days: [1, 5] } })
    const result = getScheduledFronts([f], WEDNESDAY)
    expect(result.offDay).toContainEqual(f)
    expect(result.scheduled).toHaveLength(0)
  })

  it('puts an MWF front in scheduled on Monday', () => {
    const f = makeFront({ id: 'f1', cadence: { days: [1, 3, 5] } })
    const result = getScheduledFronts([f], MONDAY)
    expect(result.scheduled).toContainEqual(f)
    expect(result.offDay).toHaveLength(0)
  })

  it('locks a front whose prerequisite is still active', () => {
    const prereq = makeFront({ id: 'prereq', status: 'active' })
    const f = makeFront({ id: 'f1', prerequisites: ['prereq'] })
    const result = getScheduledFronts([prereq, f], MONDAY)
    expect(result.locked).toContainEqual(f)
    expect(result.scheduled).not.toContainEqual(f)
  })

  it('schedules a front whose prerequisites are all done', () => {
    const prereq = makeFront({ id: 'prereq', status: 'done' })
    const f = makeFront({ id: 'f1', prerequisites: ['prereq'] })
    const result = getScheduledFronts([prereq, f], MONDAY)
    expect(result.scheduled).toContainEqual(f)
    expect(result.locked).toHaveLength(0)
  })

  it('excludes parked fronts from all groups', () => {
    const f = makeFront({ id: 'f1', status: 'parked' })
    const result = getScheduledFronts([f], MONDAY)
    expect(result.hero).toBeNull()
    expect(result.scheduled).toHaveLength(0)
    expect(result.offDay).toHaveLength(0)
    expect(result.locked).toHaveLength(0)
  })

  it('excludes done fronts from all groups', () => {
    const f = makeFront({ id: 'f1', status: 'done' })
    const result = getScheduledFronts([f], MONDAY)
    expect(result.hero).toBeNull()
    expect(result.scheduled).toHaveLength(0)
  })

  it('sets hero to the first scheduled front sorted by id (stable)', () => {
    const fa = makeFront({ id: 'aaa' })
    const fb = makeFront({ id: 'bbb' })
    const result = getScheduledFronts([fb, fa], MONDAY)
    expect(result.hero?.id).toBe('aaa')
  })

  it('does not lock a front whose prerequisite does not exist', () => {
    const f = makeFront({ id: 'f1', prerequisites: ['nonexistent'] })
    const result = getScheduledFronts([f], MONDAY)
    expect(result.locked).toHaveLength(0)
    expect(result.scheduled).toContainEqual(f)
  })
})

describe('getGlobalFocusItem', () => {
  it('returns null when no scheduled fronts have open items', () => {
    const f = makeFront({ id: 'f1', items: [] })
    expect(getGlobalFocusItem([f], MONDAY)).toBeNull()
  })

  it('returns null when no fronts at all', () => {
    expect(getGlobalFocusItem([], MONDAY)).toBeNull()
  })

  it('returns the single open item when only one exists', () => {
    const item = makeItem({ id: 'i1' })
    const f = makeFront({ id: 'f1', items: [item] })
    const result = getGlobalFocusItem([f], MONDAY)
    expect(result).not.toBeNull()
    expect(result!.item.id).toBe('i1')
    expect(result!.front.id).toBe('f1')
  })

  it('returns an in_progress item over any open item', () => {
    const open = makeItem({ id: 'open', status: 'open', priority: 'high' })
    const inProg = makeItem({ id: 'inprog', status: 'in_progress' })
    const f = makeFront({ id: 'f1', items: [open, inProg] })
    const result = getGlobalFocusItem([f], MONDAY)
    expect(result!.item.id).toBe('inprog')
  })

  it('picks high priority over normal within the same front', () => {
    const normal = makeItem({ id: 'n', priority: 'normal', createdAt: '2026-01-01T00:00:00.000Z' })
    const high = makeItem({ id: 'h', priority: 'high', createdAt: '2026-06-01T00:00:00.000Z' })
    const f = makeFront({ id: 'f1', items: [normal, high] })
    const result = getGlobalFocusItem([f], MONDAY)
    expect(result!.item.id).toBe('h')
  })

  it('picks normal priority over low', () => {
    const low = makeItem({ id: 'l', priority: 'low', createdAt: '2026-01-01T00:00:00.000Z' })
    const normal = makeItem({ id: 'n', createdAt: '2026-06-01T00:00:00.000Z' })
    const f = makeFront({ id: 'f1', items: [low, normal] })
    const result = getGlobalFocusItem([f], MONDAY)
    expect(result!.item.id).toBe('n')
  })

  it('treats absent priority as normal', () => {
    const low = makeItem({ id: 'l', priority: 'low', createdAt: '2026-01-01T00:00:00.000Z' })
    const implicit = makeItem({ id: 'i', createdAt: '2026-06-01T00:00:00.000Z' })
    const f = makeFront({ id: 'f1', items: [low, implicit] })
    const result = getGlobalFocusItem([f], MONDAY)
    expect(result!.item.id).toBe('i')
  })

  it('prefers time-active front items within same priority tier', () => {
    const itemA = makeItem({ id: 'a', priority: 'normal', createdAt: '2026-01-01T00:00:00.000Z' })
    const itemB = makeItem({ id: 'b', priority: 'normal', createdAt: '2026-06-01T00:00:00.000Z' })
    const allDay = makeFront({ id: 'all', items: [itemA] })
    const morning = makeFront({ id: 'morning', items: [itemB], cadence: { days: [], time: { from: 9, until: 13 } } })
    // MONDAY = 2026-06-01T10:00:00.000Z → UTC hour 10, within morning window
    const result = getGlobalFocusItem([allDay, morning], MONDAY)
    expect(result!.item.id).toBe('b')
  })

  it('falls back to oldest createdAt when tier and timeActive are equal', () => {
    const newer = makeItem({ id: 'new', createdAt: '2026-06-01T00:00:00.000Z' })
    const older = makeItem({ id: 'old', createdAt: '2026-01-01T00:00:00.000Z' })
    const f = makeFront({ id: 'f1', items: [newer, older] })
    const result = getGlobalFocusItem([f], MONDAY)
    expect(result!.item.id).toBe('old')
  })

  it('ignores fronts not scheduled today', () => {
    const item = makeItem({ id: 'i1' })
    const f = makeFront({ id: 'f1', cadence: { days: [1, 2, 3, 4, 5] }, items: [item] })
    expect(getGlobalFocusItem([f], SUNDAY)).toBeNull()
  })

  it('ignores locked fronts', () => {
    const prereq = makeFront({ id: 'prereq', status: 'active', items: [] })
    const locked = makeFront({ id: 'locked', prerequisites: ['prereq'], items: [makeItem()] })
    expect(getGlobalFocusItem([prereq, locked], MONDAY)).toBeNull()
  })

  it('when multiple fronts have in_progress items, returns the one from the first front by id', () => {
    const itemA = makeItem({ id: 'a-item', status: 'in_progress' })
    const itemB = makeItem({ id: 'b-item', status: 'in_progress' })
    const frontA = makeFront({ id: 'aaa', items: [itemA] })
    const frontB = makeFront({ id: 'bbb', items: [itemB] })
    const result = getGlobalFocusItem([frontB, frontA], MONDAY) // intentionally unordered
    expect(result!.item.id).toBe('a-item') // 'aaa' sorts before 'bbb'
  })
})
