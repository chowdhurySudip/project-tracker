import type { StateCreator } from 'zustand'
import type { AppStore, ItemsSlice } from '../types'
import type { Item } from '@/types'
import { generateId } from '@/lib/ids'

export const createItemsSlice: StateCreator<AppStore, [], [], ItemsSlice> = (set) => ({
  addItem: (frontId, data) =>
    set((state) => ({
      fronts: state.fronts.map((f) => {
        if (f.id !== frontId) return f
        const maxOrder = f.items.reduce((max, item) => Math.max(max, item.order), 0)
        const newItem: Item = {
          id: generateId(),
          text: data.text,
          status: 'open',
          order: maxOrder + 1,
          focusLevel: data.focusLevel,
          priority: data.priority,
          timeEstimate: data.timeEstimate,
          logs: [],
          createdAt: new Date().toISOString(),
        }
        return { ...f, items: [...f.items, newItem] }
      }),
    })),
  updateItem: (frontId, itemId, updates) =>
    set((state) => ({
      fronts: state.fronts.map((f) => {
        if (f.id !== frontId) return f
        return {
          ...f,
          items: f.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        }
      }),
    })),
  reorderItem: (frontId, itemId, direction) =>
    set((state) => ({
      fronts: state.fronts.map((f) => {
        if (f.id !== frontId) return f
        const sorted = [...f.items].sort((a, b) => a.order - b.order)
        const idx = sorted.findIndex((i) => i.id === itemId)
        if (idx === -1) return f
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= sorted.length) return f
        const updatedItems = f.items.map((item) => {
          if (item.id === sorted[idx].id) return { ...item, order: sorted[swapIdx].order }
          if (item.id === sorted[swapIdx].id) return { ...item, order: sorted[idx].order }
          return item
        })
        return { ...f, items: updatedItems }
      }),
    })),
  addLog: (frontId, itemId, text) =>
    set((state) => ({
      fronts: state.fronts.map((f) => {
        if (f.id !== frontId) return f
        return {
          ...f,
          items: f.items.map((item) => {
            if (item.id !== itemId) return item
            return {
              ...item,
              logs: [
                ...item.logs,
                { id: generateId(), text, createdAt: new Date().toISOString() },
              ],
            }
          }),
        }
      }),
    })),
  startItem: (frontId, itemId) =>
    set((state) => ({
      fronts: state.fronts.map((f) => {
        if (f.id !== frontId) return f
        return {
          ...f,
          items: f.items.map((item) =>
            item.id === itemId
              ? { ...item, status: 'in_progress' as const, startedAt: new Date().toISOString() }
              : item
          ),
        }
      }),
    })),
})
