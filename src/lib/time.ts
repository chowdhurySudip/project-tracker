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
  timeWindow: { start: string; end: string } | undefined,
  now: Date
): TimeNudge | null {
  if (!timeWindow) return null
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = timeWindow.start.split(':').map(Number)
  const [endH, endM] = timeWindow.end.split(':').map(Number)
  const startMins = startH * 60 + startM
  const endMins = endH * 60 + endM
  if (nowMins < startMins) return 'later'
  if (nowMins >= endMins) return 'passed'
  return 'active'
}

export function isOnCadenceToday(cadence: { days: number[] }, now: Date): boolean {
  if (cadence.days.length === 0) return true
  return cadence.days.includes(now.getUTCDay())
}
