import { useState } from 'react'
import type { Item } from '@/types'
import { useStore } from '@/store'
import { Icon } from './ui/Icon'
import { hsl, tint } from '@/lib/ui'

interface ItemRowProps {
  item: Item
  frontId: string
  onStartSession: (itemId: string) => void
  frontHue?: number
  isFirst?: boolean
  isLast?: boolean
  isNextMove?: boolean
  inProgress?: boolean
  sessionActive?: boolean
}

export function ItemRow({
  item,
  frontId,
  frontHue = 256,
  isFirst = false,
  isLast = false,
  isNextMove = false,
  inProgress = false,
  sessionActive = false,
  onStartSession,
}: ItemRowProps) {
  const [hover, setHover] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(item.text)
  const energyHue: Record<string, number> = { deep: 256, medium: 220, light: 152 }
  const eHue = energyHue[item.focusLevel ?? 'medium'] ?? 220

  function commitEdit() {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== item.text) {
      useStore.getState().updateItem(frontId, item.id, { text: trimmed })
    }
    setEditing(false)
  }

  function cycleStatus() {
    if (item.status === 'open') {
      useStore.getState().updateItem(frontId, item.id, { status: 'in_progress' })
    } else if (item.status === 'in_progress') {
      useStore.getState().updateItem(frontId, item.id, { status: 'done', doneAt: new Date().toISOString() })
    }
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderTop: isFirst ? 'none' : '1px solid var(--line-soft)',
        background: inProgress
          ? tint(frontHue, 96, 3)
          : isNextMove
            ? tint(frontHue, 97, 2)
            : hover
              ? 'var(--surface-2)'
              : 'transparent',
      }}
    >
      {/* Reorder arrows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, opacity: hover ? 1 : 0.32, transition: 'opacity .12s', flex: 'none' }}>
        <button
          onClick={() => useStore.getState().reorderItem(frontId, item.id, 'up')}
          disabled={isFirst}
          style={{ width: 20, height: 16, borderRadius: 4, color: isFirst ? 'var(--line)' : 'var(--ink-3)', display: 'grid', placeItems: 'center' }}
          aria-label="Move up"
        >
          <Icon name="arrow" size={12} style={{ transform: 'rotate(-90deg)' }} />
        </button>
        <button
          onClick={() => useStore.getState().reorderItem(frontId, item.id, 'down')}
          disabled={isLast}
          style={{ width: 20, height: 16, borderRadius: 4, color: isLast ? 'var(--line)' : 'var(--ink-3)', display: 'grid', placeItems: 'center' }}
          aria-label="Move down"
        >
          <Icon name="arrow" size={12} style={{ transform: 'rotate(90deg)' }} />
        </button>
      </div>

      {/* Toggle checkbox */}
      <button
        onClick={cycleStatus}
        style={{ width: 20, height: 20, borderRadius: 6, flex: 'none', border: `1.8px solid ${hover ? hsl(frontHue, 56) : 'var(--line)'}`, background: 'var(--surface)', display: 'grid', placeItems: 'center', transition: 'all .12s' }}
        aria-label="Cycle status"
      >
        {(hover || item.status !== 'open') && (
          <Icon name="check" size={13} style={{ color: hsl(frontHue, 56) }} stroke={2.4} />
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: isNextMove || inProgress ? 650 : 500, letterSpacing: '-0.01em', lineHeight: 1.35 }}>
          {inProgress && (
            <span style={{ background: hsl(frontHue, 56), color: '#fff', padding: '2px 8px', borderRadius: 99, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, marginRight: 8, verticalAlign: '2px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="timer" size={11} />In progress
            </span>
          )}
          {isNextMove && !inProgress && (
            <span style={{ background: hsl(frontHue, 56), color: '#fff', padding: '2px 8px', borderRadius: 99, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, marginRight: 8, verticalAlign: '2px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="bolt" size={11} fill="#fff" stroke={0} />Next move
            </span>
          )}
          {!inProgress && !isNextMove && item.status === 'open' && (
            <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, marginRight: 8 }}>Open</span>
          )}
          {editing ? (
            <input
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') { setEditText(item.text); setEditing(false) }
              }}
              onBlur={commitEdit}
              style={{ border: 'none', outline: '1px solid var(--accent)', borderRadius: 4, padding: '1px 4px', fontSize: 14, fontWeight: 500, background: 'var(--surface-2)', width: '100%' }}
            />
          ) : (
            <span onClick={() => { setEditText(item.text); setEditing(true) }} style={{ cursor: 'text' }}>{item.text}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 6, flexWrap: 'wrap' }}>
          {item.timeEstimate && (
            <span className="chip" style={{ padding: '1px 8px', fontSize: 10.5 }}>
              <Icon name="clock" size={11} />{item.timeEstimate}m
            </span>
          )}
          {item.focusLevel && (
            <span className="chip" style={{ padding: '1px 8px', fontSize: 10.5, color: hsl(eHue, 44), background: tint(eHue, 96, 3), borderColor: tint(eHue, 89, 4) }}>
              {item.focusLevel}
            </span>
          )}
          {item.logs.length > 0 && (
            <span className="chip" style={{ padding: '1px 8px', fontSize: 10.5, color: hsl(frontHue, 44), background: tint(frontHue, 96, 3), borderColor: tint(frontHue, 89, 4) }}>
              <Icon name="task" size={10} />{item.logs.length} log{item.logs.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {item.logs.length > 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.4 }}>
            {item.logs[item.logs.length - 1].text}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', opacity: hover ? 1 : 0, transition: 'opacity .12s' }}>
        {item.status === 'open' && !inProgress && (
          <button
            onClick={() => onStartSession(item.id)}
            disabled={sessionActive}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', opacity: sessionActive ? 0.4 : 1 }}
          >
            <Icon name="play" size={14} /> Start
          </button>
        )}
      </div>
    </div>
  )
}
