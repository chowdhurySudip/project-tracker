import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '@/components/Sidebar'
import { useStore } from '@/store'
import { renderWithRouter, resetStore } from './utils'

describe('Sidebar', () => {
  beforeEach(resetStore)

  it('renders Home and Review nav links', () => {
    renderWithRouter(<Sidebar />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
  })

  it('renders one entry per active front', () => {
    useStore.getState().addFront({ name: 'Alpha', type: 'project', color: '256', status: 'active', cadence: { days: [] }, prerequisites: [] })
    useStore.getState().addFront({ name: 'Beta', type: 'learning', color: '152', status: 'active', cadence: { days: [] }, prerequisites: [] })
    renderWithRouter(<Sidebar />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('does not render parked or done fronts in the list', () => {
    useStore.getState().addFront({ name: 'Parked', type: 'project', color: '256', status: 'parked', cadence: { days: [] }, prerequisites: [] })
    useStore.getState().addFront({ name: 'Done', type: 'project', color: '256', status: 'done', cadence: { days: [] }, prerequisites: [] })
    renderWithRouter(<Sidebar />)
    expect(screen.queryByText('Parked')).not.toBeInTheDocument()
    expect(screen.queryByText('Done')).not.toBeInTheDocument()
  })

  it('New Front button opens FrontModal', async () => {
    renderWithRouter(<Sidebar />)
    await userEvent.click(screen.getByText('+ New Front'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('creating a front from the modal adds it to the sidebar list', async () => {
    renderWithRouter(<Sidebar />)
    await userEvent.click(screen.getByText('+ New Front'))
    await userEvent.type(screen.getByPlaceholderText('Front name'), 'New Thing')
    await userEvent.click(screen.getByText('Create'))
    expect(screen.getByText('New Thing')).toBeInTheDocument()
  })
})
