import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewView } from '@/views/ReviewView'
import { useStore } from '@/store'
import { renderWithRouter, resetStore } from './utils'

const FRONT_DATA = {
  name: 'My Front', type: 'project' as const, color: '256', status: 'active' as const,
  cadence: { days: [] as number[] }, prerequisites: [] as string[],
}

describe('ReviewView', () => {
  beforeEach(resetStore)

  it('shows empty state when no active fronts', () => {
    renderWithRouter(<ReviewView />)
    expect(screen.getByText('No active fronts. Add some on the home screen.')).toBeInTheDocument()
  })

  it('shows correct active front count', () => {
    useStore.getState().addFront(FRONT_DATA)
    useStore.getState().addFront({ ...FRONT_DATA, name: 'B' })
    renderWithRouter(<ReviewView />)
    const card = screen.getByTestId('count-active')
    expect(within(card).getByText('2')).toBeInTheDocument()
  })

  it('shows correct open item count', () => {
    useStore.getState().addFront(FRONT_DATA)
    const frontId = useStore.getState().fronts[0].id
    useStore.getState().addItem(frontId, { text: 'T1' })
    useStore.getState().addItem(frontId, { text: 'T2' })
    renderWithRouter(<ReviewView />)
    const card = screen.getByTestId('count-open-items')
    expect(within(card).getByText('2')).toBeInTheDocument()
  })

  it('shows correct done item count after completing items', () => {
    useStore.getState().addFront(FRONT_DATA)
    const frontId = useStore.getState().fronts[0].id
    useStore.getState().addItem(frontId, { text: 'T' })
    const itemId = useStore.getState().fronts[0].items[0].id
    useStore.getState().updateItem(frontId, itemId, { status: 'done' })
    renderWithRouter(<ReviewView />)
    const card = screen.getByTestId('count-done-items')
    expect(within(card).getByText('1')).toBeInTheDocument()
  })

  it('Park button calls updateFront with parked status', async () => {
    useStore.getState().addFront(FRONT_DATA)
    renderWithRouter(<ReviewView />)
    await userEvent.click(screen.getByText('Park'))
    expect(useStore.getState().fronts[0].status).toBe('parked')
  })

  it('shows fronts with done items in Had progress section', () => {
    useStore.getState().addFront(FRONT_DATA)
    const frontId = useStore.getState().fronts[0].id
    useStore.getState().addItem(frontId, { text: 'T' })
    const itemId = useStore.getState().fronts[0].items[0].id
    useStore.getState().updateItem(frontId, itemId, { status: 'done' })
    renderWithRouter(<ReviewView />)
    expect(screen.getByText('Had progress')).toBeInTheDocument()
    expect(screen.getByText('My Front')).toBeInTheDocument()
  })

  it('fronts with no done items appear in the stale section', () => {
    useStore.getState().addFront(FRONT_DATA)
    renderWithRouter(<ReviewView />)
    expect(screen.getByText('No progress yet — consider parking')).toBeInTheDocument()
    expect(screen.getByText('My Front')).toBeInTheDocument()
  })
})
