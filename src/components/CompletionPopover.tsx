import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/store'

interface CompletionPopoverProps {
  frontId: string
  itemId: string
  onClose: () => void
}

export function CompletionPopover({ frontId, itemId, onClose }: CompletionPopoverProps) {
  const [remarks, setRemarks] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function confirm() {
    const store = useStore.getState()
    store.updateItem(frontId, itemId, { status: 'done', doneAt: new Date().toISOString() })
    if (remarks.trim()) {
      store.addLog(frontId, itemId, remarks.trim())
    }
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-label="Complete item"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 50,
        marginTop: 6,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: 'var(--shadow-3)',
        width: 280,
      }}
    >
      <input
        ref={inputRef}
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirm()
        }}
        placeholder="Remarks (optional)"
        style={{
          width: '100%',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 13,
          background: 'var(--surface-2)',
          color: 'var(--ink)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-3)' }}
        >
          Cancel
        </button>
        <button
          onClick={confirm}
          style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#fff' }}
        >
          Mark done
        </button>
      </div>
    </div>
  )
}
