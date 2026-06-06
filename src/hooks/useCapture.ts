import { useState, useEffect, useCallback } from 'react'

export interface UseCaptureReturn {
  open: boolean
  openCapture: () => void
  closeCapture: () => void
}

export function useCapture(): UseCaptureReturn {
  const [open, setOpen] = useState(false)

  const openCapture = useCallback(() => setOpen(true), [])
  const closeCapture = useCallback(() => setOpen(false), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeCapture()
        return
      }
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        openCapture()
        return
      }
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        openCapture()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [openCapture, closeCapture])

  return { open, openCapture, closeCapture }
}
