import { create } from 'zustand'
import { createFrontsSlice } from './slices/fronts'
import type { AppStore } from './types'

const noop = () => {}

export const useStore = create<AppStore>()(
  (...args) => ({
    // Stubs — replaced task by task through Task 9
    captures: [],
    addCapture: noop,
    fileCapture: noop,
    deleteCapture: noop,
    addItem: noop,
    updateItem: noop,
    reorderItem: noop,
    addLog: noop,
    session: null,
    startSession: noop,
    pauseSession: noop,
    resumeSession: noop,
    tickSession: noop,
    endSession: noop,
    abandonSession: noop,
    ...createFrontsSlice(...args),
  })
)
