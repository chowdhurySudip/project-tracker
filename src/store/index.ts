import { create } from 'zustand'
import { createFrontsSlice } from './slices/fronts'
import { createItemsSlice } from './slices/items'
import type { AppStore } from './types'

const noop = () => {}

export const useStore = create<AppStore>()(
  (...args) => ({
    captures: [],
    addCapture: noop,
    fileCapture: noop,
    deleteCapture: noop,
    session: null,
    startSession: noop,
    pauseSession: noop,
    resumeSession: noop,
    tickSession: noop,
    endSession: noop,
    abandonSession: noop,
    ...createFrontsSlice(...args),
    ...createItemsSlice(...args),
  })
)
