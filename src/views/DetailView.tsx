import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useStore } from '@/store'
import { ItemRow } from '@/components/ItemRow'
import { EditPopover } from '@/components/EditPopover'
import { Badge } from '@/components/Badge'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DetailView() {
  const { id } = useParams<{ id: string }>()
  const [editingName, setEditingName] = useState(false)
  const [doneOpen, setDoneOpen] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [newItemText, setNewItemText] = useState('')

  const front = useStore((state) => state.fronts.find((f) => f.id === id))
  const session = useStore((state) => state.session)

  if (!front) return <Navigate to="/" replace />

  const openItems = [...front.items].filter((i) => i.status === 'open').sort((a, b) => a.order - b.order)
  const inProgressItems = front.items.filter((i) => i.status === 'in_progress')
  const doneItems = front.items.filter((i) => i.status === 'done')

  function commitName(name: string) {
    if (name.trim()) useStore.getState().updateFront(front!.id, { name: name.trim() })
    setEditingName(false)
  }

  function handleStartSession(itemId: string) {
    useStore.getState().startSession(front!.id, itemId)
  }

  function addItem() {
    if (!newItemText.trim()) return
    useStore.getState().addItem(front!.id, { text: newItemText.trim() })
    setNewItemText('')
    setAddingItem(false)
  }

  const cadenceLabel = front.cadence.days.length === 0
    ? 'Every day'
    : front.cadence.days.map((d) => DAY_NAMES[d]).join(', ')

  return (
    <main className="detail-view">
      <header className="detail-header" style={{ '--front-hue': front.color } as React.CSSProperties}>
        <div className="detail-name" onClick={() => setEditingName(true)}>
          {editingName
            ? <EditPopover value={front.name} onCommit={commitName} onCancel={() => setEditingName(false)} />
            : <h1>{front.name}</h1>
          }
        </div>
        <div className="detail-meta">
          <Badge variant={front.type} />
          <Badge variant={front.status} />
          <span className="detail-cadence">{cadenceLabel}</span>
        </div>
      </header>

      {inProgressItems.length > 0 && (
        <section className="detail-section">
          <h2>In progress</h2>
          {inProgressItems.map((item) => (
            <ItemRow key={item.id} item={item} frontId={front.id} onStartSession={handleStartSession} />
          ))}
        </section>
      )}

      <section className="detail-section">
        <h2>Open</h2>
        {openItems.map((item) => (
          <ItemRow key={item.id} item={item} frontId={front.id} onStartSession={handleStartSession} sessionActive={!!session} />
        ))}
        {addingItem ? (
          <div className="detail-add-item">
            <input
              autoFocus
              placeholder="New item…"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addItem()
                if (e.key === 'Escape') { setAddingItem(false); setNewItemText('') }
              }}
            />
            <button onClick={addItem}>Add</button>
          </div>
        ) : (
          <button className="detail-add-btn" onClick={() => setAddingItem(true)}>+ Add item</button>
        )}
      </section>

      {doneItems.length > 0 && (
        <section className="detail-section">
          <button onClick={() => setDoneOpen((o) => !o)}>
            Done ({doneItems.length})
          </button>
          {doneOpen && doneItems.map((item) => (
            <ItemRow key={item.id} item={item} frontId={front.id} onStartSession={handleStartSession} />
          ))}
        </section>
      )}
    </main>
  )
}
