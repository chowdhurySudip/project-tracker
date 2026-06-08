import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DetailView } from '@/views/DetailView'
import { useStore } from '@/store'
import { renderAtPath, resetStore } from './utils'

const FRONT_DATA = {
  name: 'My Front', type: 'project' as const, color: '256', status: 'active' as const,
  cadence: { days: [] as number[] }, prerequisites: [] as string[],
}

function setup() {
  useStore.getState().addFront(FRONT_DATA)
  const frontId = useStore.getState().fronts[0].id
  return frontId
}

describe('DetailView', () => {
  beforeEach(resetStore)

  it('redirects to / when front ID is not found', () => {
    renderAtPath(<DetailView />, '/front/:id', '/front/nonexistent')
    expect(screen.getByTestId('redirected')).toBeInTheDocument()
  })

  it('renders front name and type badge', () => {
    const frontId = setup()
    renderAtPath(<DetailView />, '/front/:id', `/front/${frontId}`)
    expect(screen.getByText('My Front')).toBeInTheDocument()
    expect(screen.getByText('Project')).toBeInTheDocument()
  })

  it('renders open items using ItemRow', () => {
    const frontId = setup()
    useStore.getState().addItem(frontId, { text: 'First task' })
    renderAtPath(<DetailView />, '/front/:id', `/front/${frontId}`)
    expect(screen.getByText('First task')).toBeInTheDocument()
  })

  it('clicking front name shows EditPopover', async () => {
    const frontId = setup()
    renderAtPath(<DetailView />, '/front/:id', `/front/${frontId}`)
    await userEvent.click(screen.getByText('My Front'))
    expect(screen.getByDisplayValue('My Front')).toBeInTheDocument()
  })

  it('committing EditPopover updates front name in store', async () => {
    const frontId = setup()
    renderAtPath(<DetailView />, '/front/:id', `/front/${frontId}`)
    await userEvent.click(screen.getByText('My Front'))
    const input = screen.getByDisplayValue('My Front')
    await userEvent.clear(input)
    await userEvent.type(input, 'Renamed{Enter}')
    expect(useStore.getState().fronts[0].name).toBe('Renamed')
  })

  it('Add item button adds a new item to the store on Enter', async () => {
    const frontId = setup()
    renderAtPath(<DetailView />, '/front/:id', `/front/${frontId}`)
    await userEvent.click(screen.getByText('+ Add item'))
    await userEvent.type(screen.getByPlaceholderText('New item…'), 'Fresh task{Enter}')
    expect(useStore.getState().fronts[0].items).toHaveLength(1)
    expect(useStore.getState().fronts[0].items[0].text).toBe('Fresh task')
  })

  it('reorder ↑ button changes item order in store', async () => {
    const frontId = setup()
    useStore.getState().addItem(frontId, { text: 'First' })
    useStore.getState().addItem(frontId, { text: 'Second' })
    const sorted = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    const secondId = sorted[1].id
    renderAtPath(<DetailView />, '/front/:id', `/front/${frontId}`)
    const upButtons = screen.getAllByLabelText('Move up')
    await userEvent.click(upButtons[1])
    const reordered = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    expect(reordered[0].id).toBe(secondId)
  })
})
