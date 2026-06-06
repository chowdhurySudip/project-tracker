import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '@/store'

const FRONT_DATA = {
  name: 'My Project',
  type: 'project' as const,
  color: '256',
  status: 'active' as const,
  cadence: { days: [] as number[] },
  prerequisites: [] as string[],
}

// Zustand 5: omit replace=true (requires full T); merge is sufficient for data reset
function resetStore() {
  useStore.setState({ fronts: [], captures: [], session: null })
}

describe('fronts', () => {
  beforeEach(resetStore)

  it('addFront creates a front with generated id, createdAt, and empty items', () => {
    useStore.getState().addFront(FRONT_DATA)
    const { fronts } = useStore.getState()
    expect(fronts).toHaveLength(1)
    expect(fronts[0].id).toBeDefined()
    expect(fronts[0].createdAt).toBeDefined()
    expect(fronts[0].items).toEqual([])
    expect(fronts[0].name).toBe('My Project')
  })

  it('updateFront patches only specified fields, leaves others unchanged', () => {
    useStore.getState().addFront(FRONT_DATA)
    const id = useStore.getState().fronts[0].id
    useStore.getState().updateFront(id, { name: 'Updated' })
    const front = useStore.getState().fronts[0]
    expect(front.name).toBe('Updated')
    expect(front.type).toBe('project')
    expect(front.status).toBe('active')
  })

  it('updateFront stores parkReason when parking a front', () => {
    useStore.getState().addFront(FRONT_DATA)
    const id = useStore.getState().fronts[0].id
    useStore.getState().updateFront(id, { status: 'parked', parkReason: 'On hold until Q3' })
    const front = useStore.getState().fronts[0]
    expect(front.status).toBe('parked')
    expect(front.parkReason).toBe('On hold until Q3')
  })

  it('deleteFront removes the front', () => {
    useStore.getState().addFront(FRONT_DATA)
    const id = useStore.getState().fronts[0].id
    useStore.getState().deleteFront(id)
    expect(useStore.getState().fronts).toHaveLength(0)
  })

  it('deleteFront on nonexistent id is a no-op', () => {
    useStore.getState().addFront(FRONT_DATA)
    useStore.getState().deleteFront('nonexistent')
    expect(useStore.getState().fronts).toHaveLength(1)
  })

  it('deleteFront removes the deleted front ID from other fronts prerequisites', () => {
    useStore.getState().addFront({ ...FRONT_DATA, name: 'Prereq' })
    const prereqId = useStore.getState().fronts[0].id
    useStore.getState().addFront({ ...FRONT_DATA, name: 'Dependent', prerequisites: [prereqId] })
    useStore.getState().deleteFront(prereqId)
    const remaining = useStore.getState().fronts[0]
    expect(remaining.prerequisites).toHaveLength(0)
  })
})

describe('items', () => {
  let frontId: string

  beforeEach(() => {
    resetStore()
    useStore.getState().addFront(FRONT_DATA)
    frontId = useStore.getState().fronts[0].id
  })

  it('addItem creates an item with status open, order 1, and empty logs', () => {
    useStore.getState().addItem(frontId, { text: 'Do something' })
    const item = useStore.getState().fronts[0].items[0]
    expect(item.text).toBe('Do something')
    expect(item.status).toBe('open')
    expect(item.order).toBe(1)
    expect(item.logs).toEqual([])
    expect(item.id).toBeDefined()
    expect(item.createdAt).toBeDefined()
  })

  it('addItem sets order to max existing order + 1', () => {
    useStore.getState().addItem(frontId, { text: 'First' })
    useStore.getState().addItem(frontId, { text: 'Second' })
    const orders = useStore.getState().fronts[0].items.map((i) => i.order).sort((a, b) => a - b)
    expect(orders).toEqual([1, 2])
  })

  it('updateItem patches only specified fields', () => {
    useStore.getState().addItem(frontId, { text: 'Original' })
    const itemId = useStore.getState().fronts[0].items[0].id
    useStore.getState().updateItem(frontId, itemId, { text: 'Updated', status: 'in_progress' })
    const item = useStore.getState().fronts[0].items[0]
    expect(item.text).toBe('Updated')
    expect(item.status).toBe('in_progress')
    expect(item.order).toBe(1)
  })

  it('reorderItem up swaps order with the item above', () => {
    useStore.getState().addItem(frontId, { text: 'First' })
    useStore.getState().addItem(frontId, { text: 'Second' })
    const sorted = () =>
      [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    const secondId = sorted()[1].id
    useStore.getState().reorderItem(frontId, secondId, 'up')
    expect(sorted()[0].id).toBe(secondId)
    expect(sorted()[1].text).toBe('First')
  })

  it('reorderItem up is a no-op when item is already first', () => {
    useStore.getState().addItem(frontId, { text: 'First' })
    useStore.getState().addItem(frontId, { text: 'Second' })
    const sorted = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    const firstId = sorted[0].id
    const orderBefore = sorted[0].order
    useStore.getState().reorderItem(frontId, firstId, 'up')
    const orderAfter = useStore.getState().fronts[0].items.find((i) => i.id === firstId)!.order
    expect(orderAfter).toBe(orderBefore)
  })

  it('reorderItem down swaps order with the item below', () => {
    useStore.getState().addItem(frontId, { text: 'First' })
    useStore.getState().addItem(frontId, { text: 'Second' })
    const sorted = () =>
      [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    const firstId = sorted()[0].id
    useStore.getState().reorderItem(frontId, firstId, 'down')
    expect(sorted()[0].text).toBe('Second')
    expect(sorted()[1].id).toBe(firstId)
  })

  it('reorderItem down is a no-op when item is already last', () => {
    useStore.getState().addItem(frontId, { text: 'First' })
    useStore.getState().addItem(frontId, { text: 'Second' })
    const sorted = [...useStore.getState().fronts[0].items].sort((a, b) => b.order - a.order)
    const lastId = sorted[0].id
    const orderBefore = sorted[0].order
    useStore.getState().reorderItem(frontId, lastId, 'down')
    const orderAfter = useStore.getState().fronts[0].items.find((i) => i.id === lastId)!.order
    expect(orderAfter).toBe(orderBefore)
  })

  it('addLog appends a log entry with id and createdAt', () => {
    useStore.getState().addItem(frontId, { text: 'Task' })
    const itemId = useStore.getState().fronts[0].items[0].id
    useStore.getState().addLog(frontId, itemId, 'Did some work')
    const item = useStore.getState().fronts[0].items[0]
    expect(item.logs).toHaveLength(1)
    expect(item.logs[0].text).toBe('Did some work')
    expect(item.logs[0].id).toBeDefined()
    expect(item.logs[0].createdAt).toBeDefined()
  })
})
