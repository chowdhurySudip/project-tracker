import { useState } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { ItemRow } from '@/components/ItemRow'
import { FrontModal } from '@/components/FrontModal'
import { Icon } from '@/components/ui/Icon'
import { Glyph } from '@/components/ui/Glyph'
import { Ring } from '@/components/ui/Ring'
import { hsl, tint, getFrontHue, getProgress, getKindLabel, cadenceLabel } from '@/lib/ui'

export function DetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editingFront, setEditingFront] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameText, setNameText] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [newItemText, setNewItemText] = useState('')

  const front = useStore((state) => state.fronts.find((f) => f.id === id))
  const allFronts = useStore((state) => state.fronts)

  if (!front) return <Navigate to="/" replace />

  const hue = getFrontHue(front.color)
  const progress = getProgress(front)

  const openItems = [...front.items]
    .filter((i) => i.status !== 'done')
    .sort((a, b) => a.order - b.order)
  const doneItems = [...front.items]
    .filter((i) => i.status === 'done')
    .sort((a, b) => a.order - b.order)

  const isBlocked = front.prerequisites.some((pid) =>
    allFronts.find((f) => f.id === pid && f.status === 'active'),
  )
  const blockers = front.prerequisites
    .map((pid) => allFronts.find((f) => f.id === pid && f.status === 'active'))
    .filter(Boolean)

  function addItem() {
    if (!newItemText.trim()) return
    useStore.getState().addItem(front!.id, { text: newItemText.trim() })
    setNewItemText('')
    setAddingItem(false)
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--ink-3)', fontSize: 13, fontWeight: 600, marginBottom: 18 }}
      >
        <Icon name="arrow" size={15} style={{ transform: 'rotate(180deg)' }} />
        Today
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <Glyph front={front} size={54} dim={isBlocked} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {editingName ? (
              <input
                autoFocus
                value={nameText}
                onChange={(e) => setNameText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = nameText.trim()
                    if (trimmed) useStore.getState().updateFront(front.id, { name: trimmed })
                    setEditingName(false)
                  }
                  if (e.key === 'Escape') setEditingName(false)
                }}
                onBlur={() => setEditingName(false)}
                style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.025em', border: 'none', outline: '1px solid var(--accent)', borderRadius: 6, padding: '2px 6px', background: 'var(--surface-2)' }}
              />
            ) : (
              <h1
                onClick={() => { setNameText(front.name); setEditingName(true) }}
                style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.025em', cursor: 'text' }}
              >{front.name}</h1>
            )}
            <span className="eyebrow">{getKindLabel(front.type)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="chip" style={{ gap: 7 }}>
              {cadenceLabel(front.cadence.days)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Ring value={progress} size={56} stroke={4.5} hue={hue} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: hsl(hue, 44) }}>
            {Math.round(progress * 100)}%
          </span>
        </div>
        <button
          onClick={() => setEditingFront(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', color: 'var(--ink-2)' }}
        >
          <Icon name="pencil" size={13} /> Edit
        </button>
      </div>

      {/* Blocked banner */}
      {isBlocked && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 16, marginBottom: 22, padding: '13px 15px', background: tint(25, 97, 2), border: `1px solid ${tint(25, 89, 4)}`, borderRadius: 'var(--radius)' }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, flex: 'none', display: 'grid', placeItems: 'center', background: tint(25, 93, 5), color: hsl(25, 44) }}>
            <Icon name="lock" size={15} />
          </span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: hsl(25, 38) }}>Blocked — prerequisites first</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 3, lineHeight: 1.45 }}>
              Waiting on <strong>{blockers.map((b) => b!.name).join(', ')}</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Open items */}
      <div style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span className="eyebrow">
            Active · {openItems.length}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>reorder with ↑ ↓ · Start to begin · ✓ to complete</span>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
          {openItems.map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              frontId={front.id}
              frontHue={hue}
              isFirst={i === 0}
              isLast={i === openItems.length - 1}
              isNextMove={i === 0}
            />
          ))}
          {openItems.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              All clear here 🎉
            </div>
          )}
        </div>

        {/* Add item */}
        <div style={{ marginTop: 10 }}>
          {addingItem ? (
            <div style={{ display: 'flex', gap: 8, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-1)' }}>
              <input
                autoFocus
                placeholder="New item…"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem()
                  if (e.key === 'Escape') { setAddingItem(false); setNewItemText('') }
                }}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}
              />
              <button
                onClick={addItem}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#fff' }}
              >
                Add
              </button>
              <button
                onClick={() => { setAddingItem(false); setNewItemText('') }}
                style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 7, color: 'var(--ink-3)' }}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingItem(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', border: '1px dashed var(--line)', width: '100%' }}
            >
              + Add item
            </button>
          )}
        </div>
      </div>

      {/* Done items */}
      {doneItems.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Done · {doneItems.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {doneItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 14px' }}>
                <span style={{ width: 18, height: 18, borderRadius: 6, background: hsl(hue, 56), display: 'grid', placeItems: 'center', flex: 'none', marginTop: 1, opacity: 0.85 }}>
                  <Icon name="check" size={12} style={{ color: '#fff' }} stroke={2.4} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, textDecoration: 'line-through', color: 'var(--ink-3)' }}>{item.text}</span>
                  {item.logs.length > 0 && (
                    <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3, lineHeight: 1.4, display: 'flex', gap: 6 }}>
                      <Icon name="task" size={12} style={{ color: hsl(hue, 52), flex: 'none', marginTop: 2 }} />
                      <span>{item.logs[item.logs.length - 1].text}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingFront && (
        <FrontModal front={front} onClose={() => setEditingFront(false)} />
      )}
    </div>
  )
}
