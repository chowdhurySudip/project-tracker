import type { StateCreator } from 'zustand'
import type { AppStore, SessionSlice } from '../types'
import { generateId } from '@/lib/ids'

export const createSessionSlice: StateCreator<AppStore, [], [], SessionSlice> = (set) => ({
  session: null,
  startSession: (frontId, itemId) =>
    set({
      session: {
        frontId,
        itemId,
        startedAt: new Date().toISOString(),
        elapsed: 0,
        paused: false,
      },
    }),
  pauseSession: () =>
    set((state) => {
      if (!state.session) return {}
      return { session: { ...state.session, paused: true } }
    }),
  resumeSession: () =>
    set((state) => {
      if (!state.session) return {}
      return { session: { ...state.session, paused: false } }
    }),
  tickSession: (seconds) =>
    set((state) => {
      if (!state.session || state.session.paused) return {}
      return { session: { ...state.session, elapsed: state.session.elapsed + seconds } }
    }),
  endSession: (log) =>
    set((state) => {
      if (!state.session) return {}
      const { frontId, itemId } = state.session
      const now = new Date().toISOString()
      return {
        session: null,
        fronts: state.fronts.map((f) => {
          if (f.id !== frontId) return f
          return {
            ...f,
            items: f.items.map((item) => {
              if (item.id !== itemId) return item
              const done = { ...item, status: 'done' as const, doneAt: now }
              if (!log) return done
              return {
                ...done,
                logs: [...done.logs, { id: generateId(), text: log, createdAt: now }],
              }
            }),
          }
        }),
      }
    }),
  abandonSession: () =>
    set((state) => {
      if (!state.session) return {}
      return { session: null }
    }),
})
