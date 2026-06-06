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
