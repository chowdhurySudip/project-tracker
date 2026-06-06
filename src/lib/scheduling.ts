import type { Front } from '@/types'

export interface ScheduleGroups {
  hero: Front | null
  scheduled: Front[]
  offDay: Front[]
  locked: Front[]
}

export function getScheduledFronts(fronts: Front[], now: Date): ScheduleGroups {
  const dayOfWeek = now.getUTCDay()

  // IDs of fronts that are still active (can block prerequisites)
  const activeIds = new Set(
    fronts.filter(f => f.status === 'active').map(f => f.id)
  )

  const activeFronts = fronts.filter(f => f.status === 'active')

  const scheduled: Front[] = []
  const offDay: Front[] = []
  const locked: Front[] = []

  for (const front of activeFronts) {
    const isLocked = front.prerequisites.some(pid => activeIds.has(pid))
    if (isLocked) {
      locked.push(front)
      continue
    }

    const scheduledToday =
      front.cadence.days.length === 0 ||
      front.cadence.days.includes(dayOfWeek)

    if (scheduledToday) {
      scheduled.push(front)
    } else {
      offDay.push(front)
    }
  }

  scheduled.sort((a, b) => a.id.localeCompare(b.id))

  return {
    hero: scheduled[0] ?? null,
    scheduled,
    offDay,
    locked,
  }
}
