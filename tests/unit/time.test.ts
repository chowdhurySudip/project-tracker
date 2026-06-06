import { describe, it, expect } from 'vitest'
import { formatElapsed, formatDate, getTimeNudge, isOnCadenceToday } from '@/lib/time'

describe('formatElapsed', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatElapsed(0)).toBe('00:00')
  })
  it('formats 59 seconds as 00:59', () => {
    expect(formatElapsed(59)).toBe('00:59')
  })
  it('formats 60 seconds as 01:00', () => {
    expect(formatElapsed(60)).toBe('01:00')
  })
  it('formats 3599 seconds as 59:59', () => {
    expect(formatElapsed(3599)).toBe('59:59')
  })
  it('formats 3600 seconds as 1:00:00', () => {
    expect(formatElapsed(3600)).toBe('1:00:00')
  })
  it('formats 7261 seconds as 2:01:01', () => {
    expect(formatElapsed(7261)).toBe('2:01:01')
  })
})

describe('formatDate', () => {
  it('formats a known ISO date to include the month abbreviation', () => {
    expect(formatDate('2026-06-05T12:00:00.000Z')).toMatch(/Jun/)
  })
  it('formats another ISO date', () => {
    expect(formatDate('2026-01-15T00:00:00.000Z')).toMatch(/Jan/)
  })
})

describe('getTimeNudge', () => {
  // now = 08:00 local
  const before = new Date(2026, 5, 5, 8, 0, 0)   // 08:00
  const within = new Date(2026, 5, 5, 12, 0, 0)   // 12:00
  const after  = new Date(2026, 5, 5, 18, 0, 0)   // 18:00

  it('returns null when timeWindow is undefined', () => {
    expect(getTimeNudge(undefined, within)).toBeNull()
  })
  it('returns "later" when now is before the window start', () => {
    expect(getTimeNudge({ start: '09:00', end: '17:00' }, before)).toBe('later')
  })
  it('returns "active" when now equals the window start', () => {
    expect(getTimeNudge({ start: '08:00', end: '17:00' }, before)).toBe('active')
  })
  it('returns "active" when now is inside the window', () => {
    expect(getTimeNudge({ start: '09:00', end: '17:00' }, within)).toBe('active')
  })
  it('returns "passed" when now equals the window end', () => {
    expect(getTimeNudge({ start: '09:00', end: '18:00' }, after)).toBe('passed')
  })
  it('returns "passed" when now is after the window end', () => {
    expect(getTimeNudge({ start: '09:00', end: '17:00' }, after)).toBe('passed')
  })
})

describe('isOnCadenceToday', () => {
  // 2026-06-01 UTC is a Monday (getUTCDay() === 1)
  const MONDAY = new Date('2026-06-01T10:00:00.000Z')
  const SUNDAY = new Date('2026-05-31T10:00:00.000Z')

  it('returns true when days is empty (every day)', () => {
    expect(isOnCadenceToday({ days: [] }, MONDAY)).toBe(true)
  })
  it('returns true when today is in the days array', () => {
    expect(isOnCadenceToday({ days: [1, 2, 3, 4, 5] }, MONDAY)).toBe(true)
  })
  it('returns false when today is not in the days array', () => {
    expect(isOnCadenceToday({ days: [1, 2, 3, 4, 5] }, SUNDAY)).toBe(false)
  })
  it('handles Sunday (day 0) correctly', () => {
    expect(isOnCadenceToday({ days: [0] }, SUNDAY)).toBe(true)
  })
})
