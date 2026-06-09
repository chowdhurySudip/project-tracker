import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '@/store'

interface CompletionModalProps {
  frontId: string
  itemId: string
  itemText: string
  onClose: () => void
}

export function CompletionModal({ frontId, itemId, itemText, onClose }: CompletionModalProps) {
  const [remarks, setRemarks] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
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

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'oklch(0.3 0.01 90 / 0.28)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <div
        role="dialog"
        aria-label="Complete item"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 20,
          padding: '24px 24px 20px',
          width: 'min(480px, 100%)',
          boxShadow: 'var(--shadow-3)',
          animation: 'sheetIn .22s cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
            Mark as done
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--ink-3)',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {itemText}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder="Add a closing remark (optional)"
          rows={4}
          style={{
            width: '100%',
            resize: 'vertical',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 13.5,
            fontFamily: 'var(--font)',
            lineHeight: 1.55,
            color: 'var(--ink)',
            background: 'var(--surface-2)',
            outline: 'none',
            boxSizing: 'border-box',
            minHeight: 96,
          }}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink-3)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            style={{
              padding: '7px 18px',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Mark done
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
