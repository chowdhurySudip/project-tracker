import type { StateCreator } from 'zustand'
import type { AppStore, CapturesSlice } from '../types'
import { generateId } from '@/lib/ids'

export const createCapturesSlice: StateCreator<AppStore, [], [], CapturesSlice> = (set) => ({
  captures: [],
  addCapture: (data) =>
    set((state) => ({
      captures: [
        ...state.captures,
        {
          id: generateId(),
          text: data.text,
          type: data.type,
          createdAt: new Date().toISOString(),
        },
      ],
    })),
  fileCapture: (captureId, frontId) =>
    set((state) => {
      const capture = state.captures.find((c) => c.id === captureId)
      const front = state.fronts.find((f) => f.id === frontId)
      if (!capture || !front) return {}
      return {
        captures: state.captures.map((c) =>
          c.id === captureId ? { ...c, frontId } : c
        ),
      }
    }),
  deleteCapture: (captureId) =>
    set((state) => ({
      captures: state.captures.filter((c) => c.id !== captureId),
    })),
})
