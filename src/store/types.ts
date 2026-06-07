import type { Front, Capture, Session, Item } from '@/types'

export type FrontsSlice = {
  fronts: Front[]
  addFront: (data: Omit<Front, 'id' | 'createdAt' | 'items'>) => string
  updateFront: (id: string, updates: Partial<Omit<Front, 'id' | 'createdAt'>>) => void
  deleteFront: (id: string) => void
}

export type ItemsSlice = {
  addItem: (frontId: string, data: Pick<Item, 'text' | 'focusLevel' | 'timeEstimate'>) => void
  updateItem: (frontId: string, itemId: string, updates: Partial<Omit<Item, 'id' | 'createdAt'>>) => void
  reorderItem: (frontId: string, itemId: string, direction: 'up' | 'down') => void
  addLog: (frontId: string, itemId: string, text: string) => void
}

export type CapturesSlice = {
  captures: Capture[]
  addCapture: (data: Pick<Capture, 'text' | 'type'>) => void
  fileCapture: (captureId: string, frontId: string) => void
  deleteCapture: (captureId: string) => void
}

export type SessionSlice = {
  session: Session | null
  startSession: (frontId: string, itemId: string) => void
  pauseSession: () => void
  resumeSession: () => void
  tickSession: (seconds: number) => void
  endSession: (log?: string) => void
  abandonSession: () => void
}

export type AppStore = FrontsSlice & ItemsSlice & CapturesSlice & SessionSlice
