import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FrontModal } from '@/components/FrontModal'
import { useStore } from '@/store'
import { resetStore } from './utils'
import type { Front } from '@/types'

const EXISTING_FRONT: Front = {
  id: 'f1', name: 'Existing', type: 'learning', color: '152', status: 'active',
  items: [], cadence: { days: [1, 2, 3, 4, 5] }, prerequisites: [],
  createdAt: '2026-06-01T00:00:00.000Z',
}

describe('FrontModal', () => {
  beforeEach(resetStore)

  it('create mode: submitting calls addFront with name and default type', async () => {
    render(<FrontModal onClose={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('e.g. Rust for systems'), 'New Project')
    await userEvent.click(screen.getByText('Create front'))
    expect(useStore.getState().fronts).toHaveLength(1)
    expect(useStore.getState().fronts[0].name).toBe('New Project')
    expect(useStore.getState().fronts[0].type).toBe('project')
  })

  it('create mode: empty name is a no-op', async () => {
    render(<FrontModal onClose={vi.fn()} />)
    await userEvent.click(screen.getByText('Create front'))
    expect(useStore.getState().fronts).toHaveLength(0)
  })

  it('edit mode: fields are pre-populated with front data', () => {
    useStore.setState({ fronts: [EXISTING_FRONT], captures: [], session: null })
    render(<FrontModal front={EXISTING_FRONT} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('Existing')).toBeInTheDocument()
  })

  it('edit mode: submitting calls updateFront with changed name', async () => {
    useStore.setState({ fronts: [EXISTING_FRONT], captures: [], session: null })
    render(<FrontModal front={EXISTING_FRONT} onClose={vi.fn()} />)
    const nameInput = screen.getByDisplayValue('Existing')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Renamed')
    await userEvent.click(screen.getByText('Save changes'))
    expect(useStore.getState().fronts[0].name).toBe('Renamed')
  })

  it('Cancel button calls onClose without saving', async () => {
    const onClose = vi.fn()
    render(<FrontModal onClose={onClose} />)
    await userEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledOnce()
    expect(useStore.getState().fronts).toHaveLength(0)
  })

  it('successful create calls onClose', async () => {
    const onClose = vi.fn()
    render(<FrontModal onClose={onClose} />)
    await userEvent.type(screen.getByPlaceholderText('e.g. Rust for systems'), 'My Project')
    await userEvent.click(screen.getByText('Create front'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('create mode: submitting with description persists blurb on the front', async () => {
    render(<FrontModal onClose={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('e.g. Rust for systems'), 'My Project')
    await userEvent.type(screen.getByPlaceholderText('What is this front about?'), 'A learning project')
    await userEvent.click(screen.getByText('Create front'))
    expect(useStore.getState().fronts[0].blurb).toBe('A learning project')
  })

  it('edit mode: description is pre-populated from front.blurb', () => {
    const front = { ...EXISTING_FRONT, blurb: 'Old description' }
    useStore.setState({ fronts: [front], captures: [], session: null })
    render(<FrontModal front={front} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('Old description')).toBeInTheDocument()
  })
})
