import type { Front, Item } from '@/types'

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

export interface FocusResult {
  item: Item
  front: Front
}

export function getGlobalFocusItem(fronts: Front[], now: Date): FocusResult | null {
  const { scheduled } = getScheduledFronts(fronts, now)

  for (const front of scheduled) {
    const ip = front.items.find((i) => i.status === 'in_progress')
    if (ip) return { item: ip, front }
  }

  const candidates: FocusResult[] = []
  for (const front of scheduled) {
    for (const item of front.items) {
      if (item.status === 'open') candidates.push({ item, front })
    }
  }

  if (candidates.length === 0) return null

  const hour = now.getUTCHours()

  const tierOf = (priority?: string): number =>
    priority === 'high' ? 0 : priority === 'low' ? 2 : 1

  const timeActiveOf = (f: Front): number => {
    const t = f.cadence.time
    if (!t || t.from == null || t.until == null) return 1
    return hour >= t.from && hour < t.until ? 0 : 1
  }

  candidates.sort((a, b) => {
    const tierDiff = tierOf(a.item.priority) - tierOf(b.item.priority)
    if (tierDiff !== 0) return tierDiff
    const timeDiff = timeActiveOf(a.front) - timeActiveOf(b.front)
    if (timeDiff !== 0) return timeDiff
    return a.item.createdAt.localeCompare(b.item.createdAt)
  })

  return candidates[0]
}
