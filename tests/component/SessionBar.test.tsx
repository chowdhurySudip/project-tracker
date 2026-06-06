import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionBar } from '@/components/SessionBar'
import { useStore } from '@/store'
import { resetStore } from './utils'

const FRONT_DATA = {
  name: 'My Front', type: 'project' as const, color: '256', status: 'active' as const,
  cadence: { days: [] as number[] }, prerequisites: [] as string[],
}

function startSession() {
  useStore.getState().addFront(FRONT_DATA)
  const frontId = useStore.getState().fronts[0].id
  useStore.getState().addItem(frontId, { text: 'Build the feature' })
  const itemId = useStore.getState().fronts[0].items[0].id
  useStore.getState().startSession(frontId, itemId)
  return { frontId, itemId }
}

describe('SessionBar', () => {
  beforeEach(resetStore)

  it('renders nothing when session is null', () => {
    render(<SessionBar />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders front name and item text when session is active', () => {
    startSession()
    render(<SessionBar />)
    expect(screen.getByText('My Front')).toBeInTheDocument()
    expect(screen.getByText('Build the feature')).toBeInTheDocument()
  })

  it('displays formatted elapsed time', () => {
    startSession()
    useStore.getState().tickSession(65)
    render(<SessionBar />)
    expect(screen.getByText('01:05')).toBeInTheDocument()
  })

  it('Pause button calls pauseSession', async () => {
    startSession()
    render(<SessionBar />)
    await userEvent.click(screen.getByText('Pause'))
    expect(useStore.getState().session!.paused).toBe(true)
  })

  it('Resume button appears when paused and calls resumeSession', async () => {
    startSession()
    useStore.getState().pauseSession()
    render(<SessionBar />)
    await userEvent.click(screen.getByText('Resume'))
    expect(useStore.getState().session!.paused).toBe(false)
  })

  it('Complete button calls endSession and marks item done', async () => {
    startSession()
    render(<SessionBar />)
    await userEvent.click(screen.getByText('Complete'))
    expect(useStore.getState().session).toBeNull()
    expect(useStore.getState().fronts[0].items[0].status).toBe('done')
  })

  it('Stop button calls abandonSession — item stays open', async () => {
    startSession()
    render(<SessionBar />)
    await userEvent.click(screen.getByText('Stop'))
    expect(useStore.getState().session).toBeNull()
    expect(useStore.getState().fronts[0].items[0].status).toBe('open')
  })

  it('+Log button opens inline text input', async () => {
    startSession()
    render(<SessionBar />)
    await userEvent.click(screen.getByText('+Log'))
    expect(screen.getByPlaceholderText('Add log…')).toBeInTheDocument()
  })

  it('submitting log text calls endSession with log and marks item done', async () => {
    startSession()
    render(<SessionBar />)
    await userEvent.click(screen.getByText('+Log'))
    await userEvent.type(screen.getByPlaceholderText('Add log…'), 'Finished the feature')
    await userEvent.click(screen.getByText('Done'))
    expect(useStore.getState().session).toBeNull()
    expect(useStore.getState().fronts[0].items[0].status).toBe('done')
    expect(useStore.getState().fronts[0].items[0].logs[0].text).toBe('Finished the feature')
  })
})
