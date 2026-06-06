import { useEffect } from 'react'
import { useStore } from '@/store'
import type { Session } from '@/types'

export interface UseSessionReturn {
  session: Session | null
  pause: () => void
  resume: () => void
  end: (log?: string) => void
  abandon: () => void
}

export function useSession(): UseSessionReturn {
  const session = useStore((state) => state.session)

  useEffect(() => {
    if (!session || session.paused) return
    const intervalId = setInterval(() => {
      useStore.getState().tickSession(1)
    }, 1000)
    return () => clearInterval(intervalId)
  }, [session?.paused, session?.frontId, session?.itemId])

  return {
    session,
    pause: () => useStore.getState().pauseSession(),
    resume: () => useStore.getState().resumeSession(),
    end: (log?: string) => useStore.getState().endSession(log),
    abandon: () => useStore.getState().abandonSession(),
  }
}
