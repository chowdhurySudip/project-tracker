import type { CadenceTime } from '@/types'

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export type TimeNudge = 'later' | 'active' | 'passed'

export function getTimeNudge(
  time: CadenceTime | undefined,
  now: Date
): TimeNudge | null {
  if (!time) return null
  const nowHour = now.getHours()
  if (time.until != null) return nowHour < time.until ? 'active' : 'passed'
  if (time.from != null) return nowHour >= time.from ? 'active' : 'later'
  return null
}

export function isOnCadenceToday(cadence: { days: number[] }, now: Date): boolean {
  if (cadence.days.length === 0) return true
  return cadence.days.includes(now.getUTCDay())
}

export function fmtHour(h: number): string {
  const period = h < 12 ? 'am' : 'pm'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}${period}`
}
