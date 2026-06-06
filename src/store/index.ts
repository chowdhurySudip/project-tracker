import { create } from 'zustand'
import { createFrontsSlice } from './slices/fronts'
import { createItemsSlice } from './slices/items'
import { createCapturesSlice } from './slices/captures'
import { createSessionSlice } from './slices/session'
import type { AppStore } from './types'

export const useStore = create<AppStore>()(
  (...args) => ({
    ...createFrontsSlice(...args),
    ...createItemsSlice(...args),
    ...createCapturesSlice(...args),
    ...createSessionSlice(...args),
  })
)
