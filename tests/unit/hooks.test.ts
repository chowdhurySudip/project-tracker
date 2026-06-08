import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCapture } from '@/hooks/useCapture'

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

