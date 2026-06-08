import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompletionPopover } from '@/components/CompletionPopover'
import { useStore } from '@/store'
import { resetStore } from './utils'

const FRONT_DATA = {
  name: 'F', type: 'project' as const, color: '256', status: 'active' as const,
  cadence: { days: [] as number[] }, prerequisites: [] as string[],
}

describe('CompletionPopover', () => {
  let frontId: string
  let itemId: string

  beforeEach(() => {
    resetStore()
    useStore.getState().addFront(FRONT_DATA)
    frontId = useStore.getState().fronts[0].id
    useStore.getState().addItem(frontId, { text: 'Task' })
    itemId = useStore.getState().fronts[0].items[0].id
  })

  it('renders a dialog with Remarks input and Mark done button', () => {
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Complete item' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Complete item' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByPlaceholderText('Remarks (optional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark done' })).toBeInTheDocument()
  })

  it('Mark done marks item as done with doneAt', async () => {
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mark done' }))
    const item = useStore.getState().fronts[0].items[0]
    expect(item.status).toBe('done')
    expect(item.doneAt).toBeDefined()
  })

  it('Mark done with remarks creates a log entry', async () => {
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('Remarks (optional)'), 'Shipped it')
    await userEvent.click(screen.getByRole('button', { name: 'Mark done' }))
    const item = useStore.getState().fronts[0].items[0]
    expect(item.logs).toHaveLength(1)
    expect(item.logs[0].text).toBe('Shipped it')
  })

  it('Mark done without remarks creates no log entry', async () => {
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mark done' }))
    expect(useStore.getState().fronts[0].items[0].logs).toHaveLength(0)
  })

  it('Enter key submits and marks item done', async () => {
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('Remarks (optional)'), 'Done{Enter}')
    expect(useStore.getState().fronts[0].items[0].status).toBe('done')
  })

  it('Cancel button calls onClose without changing item status', async () => {
    const onClose = vi.fn()
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(useStore.getState().fronts[0].items[0].status).toBe('open')
  })

  it('Escape key calls onClose without changing item status', async () => {
    const onClose = vi.fn()
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
    expect(useStore.getState().fronts[0].items[0].status).toBe('open')
  })

  it('Mark done calls onClose', async () => {
    const onClose = vi.fn()
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mark done' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('whitespace-only remarks create no log entry', async () => {
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('Remarks (optional)'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Mark done' }))
    expect(useStore.getState().fronts[0].items[0].logs).toHaveLength(0)
  })
})
