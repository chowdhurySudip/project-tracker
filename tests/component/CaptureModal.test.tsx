import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CaptureModal } from '@/components/CaptureModal'
import { useStore } from '@/store'
import { resetStore } from './utils'

describe('CaptureModal', () => {
  beforeEach(resetStore)

  it('renders nothing when open=false', () => {
    render(<CaptureModal open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the input when open=true', () => {
    render(<CaptureModal open onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Capture anything…')).toBeInTheDocument()
  })

  it('submitting with text calls addCapture and closes', async () => {
    const onClose = vi.fn()
    render(<CaptureModal open onClose={onClose} />)
    await userEvent.type(screen.getByPlaceholderText('Capture anything…'), 'My idea')
    await userEvent.click(screen.getByText('Save'))
    expect(useStore.getState().captures).toHaveLength(1)
    expect(useStore.getState().captures[0].text).toBe('My idea')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('selecting a type sets it on the capture', async () => {
    render(<CaptureModal open onClose={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('Capture anything…'), 'A link')
    await userEvent.click(screen.getByText('link'))
    await userEvent.click(screen.getByText('Save'))
    expect(useStore.getState().captures[0].type).toBe('link')
  })

  it('empty submit is a no-op', async () => {
    const onClose = vi.fn()
    render(<CaptureModal open onClose={onClose} />)
    await userEvent.click(screen.getByText('Save'))
    expect(useStore.getState().captures).toHaveLength(0)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('pressing Escape calls onClose', async () => {
    const onClose = vi.fn()
    render(<CaptureModal open onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('selecting a front destination files the capture directly to that front', async () => {
    const onClose = vi.fn()
    useStore.getState().addFront({
      name: 'My Front', type: 'project', color: '256', status: 'active',
      cadence: { days: [] }, prerequisites: [],
    })
    render(<CaptureModal open onClose={onClose} />)
    await userEvent.type(screen.getByPlaceholderText('Capture anything…'), 'Quick note')
    await userEvent.click(screen.getByText('My Front'))
    await userEvent.click(screen.getByText('Save'))
    const capture = useStore.getState().captures[0]
    expect(capture.frontId).toBe(useStore.getState().fronts[0].id)
  })
})
