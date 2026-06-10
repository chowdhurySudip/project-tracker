import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemEditModal } from '@/components/ItemEditModal'
import { useStore } from '@/store'
import { resetStore } from './utils'

const FRONT_DATA = {
  name: 'F', type: 'project' as const, color: '256', status: 'active' as const,
  cadence: { days: [] as number[] }, prerequisites: [] as string[],
}

describe('ItemEditModal', () => {
  let frontId: string

  beforeEach(() => {
    resetStore()
    useStore.getState().addFront(FRONT_DATA)
    frontId = useStore.getState().fronts[0].id
  })

  function openModal(overrides = {}) {
    useStore.getState().addItem(frontId, { text: 'Original task' })
    const item = useStore.getState().fronts[0].items[0]
    const onClose = vi.fn()
    render(<ItemEditModal item={{ ...item, ...overrides }} frontId={frontId} onClose={onClose} />)
    return { item, onClose }
  }

  it('renders a dialog with the item text pre-filled', () => {
    openModal()
    expect(screen.getByRole('dialog', { name: 'Edit item' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Original task')).toBeInTheDocument()
  })

  it('shows priority buttons with normal selected by default', () => {
    openModal()
    expect(screen.getByRole('button', { name: 'normal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'low' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'high' })).toBeInTheDocument()
  })

  it('shows pre-existing priority pre-selected', () => {
    useStore.getState().addItem(frontId, { text: 'Hi priority', priority: 'high' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemEditModal item={item} frontId={frontId} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'high' })).toBeInTheDocument()
  })

  it('Save button calls updateItem with new text', async () => {
    const { item } = openModal()
    const input = screen.getByDisplayValue('Original task')
    await userEvent.clear(input)
    await userEvent.type(input, 'Updated task')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useStore.getState().fronts[0].items[0].text).toBe('Updated task')
  })

  it('Save button persists selected priority', async () => {
    openModal()
    await userEvent.click(screen.getByRole('button', { name: 'high' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useStore.getState().fronts[0].items[0].priority).toBe('high')
  })

  it('Save button persists selected focusLevel', async () => {
    openModal()
    await userEvent.click(screen.getByRole('button', { name: 'deep' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useStore.getState().fronts[0].items[0].focusLevel).toBe('deep')
  })

  it('toggling the same focusLevel twice clears it', async () => {
    useStore.getState().addItem(frontId, { text: 'T', focusLevel: 'deep' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemEditModal item={item} frontId={frontId} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'deep' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useStore.getState().fronts[0].items[0].focusLevel).toBeUndefined()
  })

  it('Save button persists timeEstimate as a number', async () => {
    openModal()
    const timeInput = screen.getByPlaceholderText('e.g. 30')
    await userEvent.type(timeInput, '45')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useStore.getState().fronts[0].items[0].timeEstimate).toBe(45)
  })

  it('Enter key in text field saves', async () => {
    openModal()
    const input = screen.getByDisplayValue('Original task')
    await userEvent.clear(input)
    await userEvent.type(input, 'Via Enter{Enter}')
    expect(useStore.getState().fronts[0].items[0].text).toBe('Via Enter')
  })

  it('Cancel button calls onClose without saving', async () => {
    const { onClose } = openModal()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(useStore.getState().fronts[0].items[0].text).toBe('Original task')
  })

  it('Escape key calls onClose', async () => {
    const { onClose } = openModal()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clicking backdrop calls onClose', async () => {
    const { onClose } = openModal()
    await userEvent.click(document.body)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
