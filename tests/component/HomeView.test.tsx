import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeView } from '@/views/HomeView'
import { useStore } from '@/store'
import { renderWithRouter, resetStore } from './utils'

const FRONT_DATA = {
  name: 'Alpha', type: 'project' as const, color: '256', status: 'active' as const,
  cadence: { days: [] as number[] }, prerequisites: [] as string[],
}

describe('HomeView', () => {
  beforeEach(resetStore)

  it('renders hero front when scheduling returns one', () => {
    useStore.getState().addFront(FRONT_DATA)
    renderWithRouter(<HomeView />)
    expect(screen.getByText('Focus now')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })

  it('shows empty state when no active fronts', () => {
    renderWithRouter(<HomeView />)
    expect(screen.getByText('Nothing scheduled for today.')).toBeInTheDocument()
  })

  it('renders unlinked captures in the inbox', () => {
    useStore.getState().addCapture({ text: 'Unlinked idea', type: 'idea' })
    renderWithRouter(<HomeView />)
    expect(screen.getByText('Unlinked idea')).toBeInTheDocument()
  })

  it('shows "Inbox is clear" when no unlinked captures', () => {
    renderWithRouter(<HomeView />)
    expect(screen.getByText('Inbox is clear.')).toBeInTheDocument()
  })

  it('filed captures do not appear in inbox', () => {
    useStore.getState().addFront(FRONT_DATA)
    const frontId = useStore.getState().fronts[0].id
    useStore.getState().addCapture({ text: 'Filed idea' })
    const captureId = useStore.getState().captures[0].id
    useStore.getState().fileCapture(captureId, frontId)
    renderWithRouter(<HomeView />)
    expect(screen.getByText('Inbox is clear.')).toBeInTheDocument()
  })

  it('Delete button removes the capture', async () => {
    useStore.getState().addCapture({ text: 'To delete' })
    renderWithRouter(<HomeView />)
    await userEvent.click(screen.getByText('Delete'))
    expect(useStore.getState().captures).toHaveLength(0)
  })

  it('File button shows a front picker', async () => {
    useStore.getState().addFront(FRONT_DATA)
    useStore.getState().addCapture({ text: 'Idea to file' })
    renderWithRouter(<HomeView />)
    await userEvent.click(screen.getByText('File'))
    expect(screen.getByRole('combobox', { name: 'File to front' })).toBeInTheDocument()
  })

  it('selecting a front in the picker calls fileCapture', async () => {
    useStore.getState().addFront(FRONT_DATA)
    const frontId = useStore.getState().fronts[0].id
    useStore.getState().addCapture({ text: 'Idea' })
    renderWithRouter(<HomeView />)
    await userEvent.click(screen.getByText('File'))
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'File to front' }),
      frontId
    )
    expect(useStore.getState().captures[0].frontId).toBe(frontId)
  })
})
