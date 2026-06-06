import { useState } from 'react'
import type { Item, ItemStatus } from '@/types'
import { useStore } from '@/store'
import { Badge } from './Badge'
import { EditPopover } from './EditPopover'

const STATUS_CYCLE: Record<ItemStatus, ItemStatus> = {
  open: 'in_progress',
  in_progress: 'done',
  done: 'open',
}

interface ItemRowProps {
  item: Item
  frontId: string
  onStartSession: (itemId: string) => void
  sessionActive?: boolean
}

export function ItemRow({ item, frontId, onStartSession, sessionActive = false }: ItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)

  function cycleStatus() {
    useStore.getState().updateItem(frontId, item.id, { status: STATUS_CYCLE[item.status] })
  }

  function commitText(text: string) {
    if (text.trim()) useStore.getState().updateItem(frontId, item.id, { text: text.trim() })
    setEditing(false)
  }

  return (
    <div className={`item-row item-row--${item.status}`}>
      <button className="item-status-btn" onClick={cycleStatus} aria-label="Cycle status">
        <Badge variant={item.status} />
      </button>
      <div className="item-text" onClick={() => !editing && setEditing(true)}>
        {editing ? (
          <EditPopover value={item.text} onCommit={commitText} onCancel={() => setEditing(false)} />
        ) : (
          <span>{item.text}</span>
        )}
      </div>
      {item.focusLevel && <Badge variant={item.focusLevel} />}
      <div className="item-actions">
        <button onClick={() => useStore.getState().reorderItem(frontId, item.id, 'up')} aria-label="Move up">↑</button>
        <button onClick={() => useStore.getState().reorderItem(frontId, item.id, 'down')} aria-label="Move down">↓</button>
        {item.status === 'open' && (
          <button onClick={() => onStartSession(item.id)} disabled={sessionActive}>Start</button>
        )}
        <button onClick={() => setLogsOpen(!logsOpen)} aria-label="Toggle logs">
          {item.logs.length > 0 ? `${item.logs.length} log${item.logs.length > 1 ? 's' : ''}` : 'Logs'}
        </button>
      </div>
      {logsOpen && item.logs.length > 0 && (
        <ul className="item-logs">
          {item.logs.map((log) => <li key={log.id}>{log.text}</li>)}
        </ul>
      )}
    </div>
  )
}
