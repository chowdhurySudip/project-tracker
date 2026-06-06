import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createFrontsSlice } from './slices/fronts'
import { createItemsSlice } from './slices/items'
import { createCapturesSlice } from './slices/captures'
import { createSessionSlice } from './slices/session'
import type { AppStore } from './types'

export const useStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createFrontsSlice(...args),
      ...createItemsSlice(...args),
      ...createCapturesSlice(...args),
      ...createSessionSlice(...args),
    }),
    {
      name: 'command-v1',
      partialize: (state) => ({
        fronts: state.fronts,
        captures: state.captures,
      }),
    }
  )
)
