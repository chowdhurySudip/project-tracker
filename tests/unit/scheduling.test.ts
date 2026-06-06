import { describe, it, expect } from 'vitest'
import { getScheduledFronts } from '@/lib/scheduling'
import type { Front } from '@/types'

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
