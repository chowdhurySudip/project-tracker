import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemRow } from '@/components/ItemRow'
import { useStore } from '@/store'
import { resetStore } from './utils'

const FRONT_DATA = {
  name: 'F', type: 'project' as const, color: '256', status: 'active' as const,
  cadence: { days: [] as number[] }, prerequisites: [] as string[],
}

describe('ItemRow', () => {
  let frontId: string

  beforeEach(() => {
    resetStore()
    useStore.getState().addFront(FRONT_DATA)
    frontId = useStore.getState().fronts[0].id
  })

  it('renders item text', () => {
    useStore.getState().addItem(frontId, { text: 'Do something' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} onStartSession={vi.fn()} />)
    expect(screen.getByText('Do something')).toBeInTheDocument()
  })

  it('renders the status badge', () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} onStartSession={vi.fn()} />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('clicking status badge cycles status to in_progress', async () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} onStartSession={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('Cycle status'))
    expect(useStore.getState().fronts[0].items[0].status).toBe('in_progress')
  })

  it('clicking ↑ reorders the item upward', async () => {
    useStore.getState().addItem(frontId, { text: 'First' })
    useStore.getState().addItem(frontId, { text: 'Second' })
    const sorted = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    const secondItem = sorted[1]
    render(<ItemRow item={secondItem} frontId={frontId} onStartSession={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('Move up'))
    const reordered = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    expect(reordered[0].id).toBe(secondItem.id)
  })

  it('clicking ↓ reorders the item downward', async () => {
    useStore.getState().addItem(frontId, { text: 'First' })
    useStore.getState().addItem(frontId, { text: 'Second' })
    const sorted = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    const firstItem = sorted[0]
    render(<ItemRow item={firstItem} frontId={frontId} onStartSession={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('Move down'))
    const reordered = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    expect(reordered[1].id).toBe(firstItem.id)
  })

  it('clicking item text shows EditPopover', async () => {
    useStore.getState().addItem(frontId, { text: 'Original' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} onStartSession={vi.fn()} />)
    await userEvent.click(screen.getByText('Original'))
    expect(screen.getByDisplayValue('Original')).toBeInTheDocument()
  })

  it('committing EditPopover updates item text in the store', async () => {
    useStore.getState().addItem(frontId, { text: 'Original' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} onStartSession={vi.fn()} />)
    await userEvent.click(screen.getByText('Original'))
    const input = screen.getByDisplayValue('Original')
    await userEvent.clear(input)
    await userEvent.type(input, 'Updated{Enter}')
    expect(useStore.getState().fronts[0].items[0].text).toBe('Updated')
  })

  it('Start button calls onStartSession with item id', async () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const item = useStore.getState().fronts[0].items[0]
    const onStartSession = vi.fn()
    render(<ItemRow item={item} frontId={frontId} onStartSession={onStartSession} />)
    await userEvent.click(screen.getByText('Start'))
    expect(onStartSession).toHaveBeenCalledWith(item.id)
  })

  it('Start button is disabled when sessionActive=true', () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} onStartSession={vi.fn()} sessionActive />)
    expect(screen.getByText('Start')).toBeDisabled()
  })
})
