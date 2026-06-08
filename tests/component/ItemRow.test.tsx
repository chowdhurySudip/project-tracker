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
    render(<ItemRow item={item} frontId={frontId} />)
    expect(screen.getByText('Do something')).toBeInTheDocument()
  })

  it('renders the Open status badge for open items', () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} isFirst isLast />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('renders In progress badge for in_progress items', () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const itemId = useStore.getState().fronts[0].items[0].id
    useStore.getState().startItem(frontId, itemId)
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  it('clicking checkbox on open item opens CompletionPopover', async () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    await userEvent.click(screen.getByLabelText('Complete item'))
    expect(screen.getByRole('dialog', { name: 'Complete item' })).toBeInTheDocument()
  })

  it('clicking checkbox on in_progress item opens CompletionPopover', async () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const itemId = useStore.getState().fronts[0].items[0].id
    useStore.getState().startItem(frontId, itemId)
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    await userEvent.click(screen.getByLabelText('Complete item'))
    expect(screen.getByRole('dialog', { name: 'Complete item' })).toBeInTheDocument()
  })

  it('clicking ↑ reorders the item upward', async () => {
    useStore.getState().addItem(frontId, { text: 'First' })
    useStore.getState().addItem(frontId, { text: 'Second' })
    const sorted = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    const secondItem = sorted[1]
    render(<ItemRow item={secondItem} frontId={frontId} />)
    await userEvent.click(screen.getByLabelText('Move up'))
    const reordered = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    expect(reordered[0].id).toBe(secondItem.id)
  })

  it('clicking ↓ reorders the item downward', async () => {
    useStore.getState().addItem(frontId, { text: 'First' })
    useStore.getState().addItem(frontId, { text: 'Second' })
    const sorted = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    const firstItem = sorted[0]
    render(<ItemRow item={firstItem} frontId={frontId} />)
    await userEvent.click(screen.getByLabelText('Move down'))
    const reordered = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    expect(reordered[1].id).toBe(firstItem.id)
  })

  it('clicking item text shows edit input', async () => {
    useStore.getState().addItem(frontId, { text: 'Original' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    await userEvent.click(screen.getByText('Original'))
    expect(screen.getByDisplayValue('Original')).toBeInTheDocument()
  })

  it('committing edit updates item text in the store', async () => {
    useStore.getState().addItem(frontId, { text: 'Original' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    await userEvent.click(screen.getByText('Original'))
    const input = screen.getByDisplayValue('Original')
    await userEvent.clear(input)
    await userEvent.type(input, 'Updated{Enter}')
    expect(useStore.getState().fronts[0].items[0].text).toBe('Updated')
  })

  it('Start button calls startItem on the store', async () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    await userEvent.click(screen.getByText('Start'))
    const updated = useStore.getState().fronts[0].items[0]
    expect(updated.status).toBe('in_progress')
    expect(updated.startedAt).toBeDefined()
  })

  it('Start button is not shown for in_progress items', () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const itemId = useStore.getState().fronts[0].items[0].id
    useStore.getState().startItem(frontId, itemId)
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    expect(screen.queryByText('Start')).not.toBeInTheDocument()
  })
})
