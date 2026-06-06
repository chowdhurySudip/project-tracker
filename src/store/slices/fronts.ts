import type { StateCreator } from 'zustand'
import type { AppStore, FrontsSlice } from '../types'
import { generateId } from '@/lib/ids'

export const createFrontsSlice: StateCreator<AppStore, [], [], FrontsSlice> = (set) => ({
  fronts: [],
  addFront: (data) =>
    set((state) => ({
      fronts: [
        ...state.fronts,
        { ...data, id: generateId(), createdAt: new Date().toISOString(), items: [] },
      ],
    })),
  updateFront: (id, updates) =>
    set((state) => ({
      fronts: state.fronts.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),
  deleteFront: (id) =>
    set((state) => ({
      fronts: state.fronts
        .filter((f) => f.id !== id)
        .map((f) => ({
          ...f,
          prerequisites: f.prerequisites.filter((pid) => pid !== id),
        })),
      captures: state.captures.filter((c) => c.frontId !== id),
      session: state.session?.frontId === id ? null : state.session,
    })),
})
