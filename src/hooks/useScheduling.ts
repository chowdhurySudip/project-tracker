import { useStore } from '@/store'
import { getScheduledFronts } from '@/lib/scheduling'
import type { ScheduleGroups } from '@/lib/scheduling'

export function useScheduling(): ScheduleGroups {
  const fronts = useStore((state) => state.fronts)
  return getScheduledFronts(fronts, new Date())
}
