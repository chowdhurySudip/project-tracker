import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/store'
import type { Item, FocusLevel } from '@/types'

interface ItemEditModalProps {
  item: Item
  frontId: string
  onClose: () => void
}

export function ItemEditModal({ item, frontId, onClose }: ItemEditModalProps) {
  const [text, setText] = useState(item.text)
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>(item.priority ?? 'normal')
  const [focusLevel, setFocusLevel] = useState<FocusLevel | ''>(item.focusLevel ?? '')
  const [timeEstimate, setTimeEstimate] = useState<string>(
    item.timeEstimate != null ? String(item.timeEstimate) : ''
  )
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  function handleSave() {
    if (!text.trim()) return
    useStore.getState().updateItem(frontId, item.id, {
      text: text.trim(),
      priority,
      focusLevel: focusLevel || undefined,
      timeEstimate: timeEstimate ? Number(timeEstimate) : undefined,
    })
    onClose()
  }

  const segBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '7px 0',
    borderRadius: 8,
    border: '1px solid var(--line)',
    fontSize: 13,
    fontWeight: 600,
    background: active ? 'var(--accent)' : 'var(--surface-2)',
    color: active ? '#fff' : 'var(--ink-2)',
    cursor: 'pointer',
  })

  const fieldLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--ink-3)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: 6,
    display: 'block',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'oklch(0.3 0.01 90 / 0.34)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit item"
        style={{
          width: 'min(480px, 94vw)',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 18,
          boxShadow: 'var(--shadow-3)',
          padding: 24,
          animation: 'sheetIn .22s cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 20 }}>
          Edit item
        </div>

        {/* Text */}
        <div style={{ marginBottom: 16 }}>
          <span style={fieldLabel}>Task</span>
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '1px solid var(--line)', background: 'var(--surface-2)', fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Priority */}
        <div style={{ marginBottom: 16 }}>
          <span style={fieldLabel}>Priority</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['low', 'normal', 'high'] as const).map((p) => (
              <button key={p} onClick={() => setPriority(p)} style={segBtn(priority === p)}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Focus level */}
        <div style={{ marginBottom: 16 }}>
          <span style={fieldLabel}>Focus level</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['light', 'medium', 'deep'] as const).map((fl) => (
              <button
                key={fl}
                onClick={() => setFocusLevel(focusLevel === fl ? '' : fl)}
                style={segBtn(focusLevel === fl)}
              >
                {fl}
              </button>
            ))}
          </div>
        </div>

        {/* Time estimate */}
        <div style={{ marginBottom: 24 }}>
          <span style={fieldLabel}>Time estimate (minutes)</span>
          <input
            type="number"
            min={1}
            value={timeEstimate}
            onChange={(e) => setTimeEstimate(e.target.value)}
            placeholder="e.g. 30"
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '1px solid var(--line)', background: 'var(--surface-2)', fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
