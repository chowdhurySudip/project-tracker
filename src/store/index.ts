import { create } from 'zustand'
import { createFrontsSlice } from './slices/fronts'
import { createItemsSlice } from './slices/items'
import { createCapturesSlice } from './slices/captures'
import type { AppStore } from './types'

const noop = () => {}

export const useStore = create<AppStore>()(
  (...args) => ({
    session: null,
    startSession: noop,
    pauseSession: noop,
    resumeSession: noop,
    tickSession: noop,
    endSession: noop,
    abandonSession: noop,
    ...createFrontsSlice(...args),
    ...createItemsSlice(...args),
    ...createCapturesSlice(...args),
  })
)
