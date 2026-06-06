import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCapture } from '@/hooks/useCapture'
import { useSession } from '@/hooks/useSession'
import { useStore } from '@/store'

const FRONT_DATA = {
  name: 'F',
  type: 'project' as const,
  color: '256',
  status: 'active' as const,
  cadence: { days: [] as number[] },
  prerequisites: [] as string[],
}

describe('useCapture', () => {
  it('starts with open=false', () => {
    const { result } = renderHook(() => useCapture())
    expect(result.current.open).toBe(false)
  })

  it('openCapture sets open to true', () => {
    const { result } = renderHook(() => useCapture())
    act(() => result.current.openCapture())
    expect(result.current.open).toBe(true)
  })

  it('closeCapture sets open to false', () => {
    const { result } = renderHook(() => useCapture())
    act(() => result.current.openCapture())
    act(() => result.current.closeCapture())
    expect(result.current.open).toBe(false)
  })

  it('pressing c opens the capture modal', () => {
    const { result } = renderHook(() => useCapture())
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }))
    })
    expect(result.current.open).toBe(true)
  })

  it('pressing Escape closes the capture modal', () => {
    const { result } = renderHook(() => useCapture())
    act(() => result.current.openCapture())
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(result.current.open).toBe(false)
  })

  it('pressing c while focused on an input does not open the modal', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    const { result } = renderHook(() => useCapture())
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }))
    })
    expect(result.current.open).toBe(false)
    document.body.removeChild(input)
  })

  it('pressing c while focused on a textarea does not open the modal', () => {
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()
    const { result } = renderHook(() => useCapture())
    act(() => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }))
    })
    expect(result.current.open).toBe(false)
    document.body.removeChild(textarea)
  })
})

describe('useSession (timer tick)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useStore.setState({ fronts: [], captures: [], session: null })
  })

  afterEach(() => {
    vi.useRealTimers()
    useStore.setState({ fronts: [], captures: [], session: null })
  })

  function startSession() {
    useStore.getState().addFront(FRONT_DATA)
    const frontId = useStore.getState().fronts[0].id
    useStore.getState().addItem(frontId, { text: 'T' })
    const itemId = useStore.getState().fronts[0].items[0].id
    useStore.getState().startSession(frontId, itemId)
  }

  it('calls tickSession every second when session is active and not paused', () => {
    startSession()
    renderHook(() => useSession())
    act(() => vi.advanceTimersByTime(3000))
    expect(useStore.getState().session!.elapsed).toBe(3)
  })

  it('does not tick when session is paused', () => {
    startSession()
    useStore.getState().pauseSession()
    renderHook(() => useSession())
    act(() => vi.advanceTimersByTime(3000))
    expect(useStore.getState().session!.elapsed).toBe(0)
  })

  it('stops ticking after session is abandoned', () => {
    startSession()
    const { result } = renderHook(() => useSession())
    act(() => vi.advanceTimersByTime(1000))
    act(() => result.current.abandon())
    act(() => vi.advanceTimersByTime(2000))
    expect(useStore.getState().session).toBeNull()
  })
})
