import { useState } from 'react'
import { useStore } from '@/store'
import { Icon } from './ui/Icon'
import { hsl, tint, getFrontHue } from '@/lib/ui'
import type { CaptureType } from '@/types'

interface CaptureModalProps { open: boolean; onClose: () => void }

function detectType(text: string): CaptureType {
  if (/^https?:\/\/|\b\w+\.(com|io|org|ai|dev|xyz|net)\b/i.test(text)) return 'link'
  if (/^(buy|call|email|fix|send|book|pay|renew|order|ship|reply|schedule)\b/i.test(text.trim())) return 'task'
  return 'idea'
}

const TYPE_ICON: Record<CaptureType, string> = { idea: 'idea', link: 'link', task: 'task' }

function DestChip({ active, onClick, icon, label, hue = 256 }: { active: boolean; onClick: () => void; icon?: string; label: string; hue?: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'var(--mono)',
        letterSpacing: '-0.01em',
        border: `1px solid ${active ? tint(hue, 84, 6) : 'var(--line)'}`,
        background: active ? tint(hue, 95, 4) : 'var(--surface)',
        color: active ? hsl(hue, 42) : 'var(--ink-2)',
        transition: 'all .12s',
      }}
    >
      {icon ? <Icon name={icon} size={12} /> : <span className="dot" style={{ background: hsl(hue, 56) }} />}
      {label}
    </button>
  )
}

export function CaptureModal({ open, onClose }: CaptureModalProps) {
  const [text, setText] = useState('')
  const [dest, setDest] = useState('inbox')
  const [manualType, setManualType] = useState<CaptureType | null>(null)
  const allFronts = useStore((state) => state.fronts)
  const fronts = allFronts.filter((f) => f.status !== 'parked')

  if (!open) return null

  const type = text ? detectType(text) : 'idea'

  function submit() {
    if (!text.trim()) return
    const finalType = manualType ?? type
    useStore.getState().addCapture({ text: text.trim(), type: finalType })
    if (dest !== 'inbox') {
      const captures = useStore.getState().captures
      const captureId = captures[captures.length - 1].id
      useStore.getState().fileCapture(captureId, dest)
    }
    setText('')
    setDest('inbox')
    setManualType(null)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); setText('') }
    if (e.key === 'Enter') submit()
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Capture"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: 'min(640px, 94vw)',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-3)',
          paddingBottom: 10,
          animation: 'sheetIn .22s cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
          <span className="eyebrow" style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>
            <Icon name="cmd" size={13} /> Quick capture
          </span>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="kbd">Enter</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>to save</span>
            <span className="kbd" style={{ marginLeft: 6 }}>Esc</span>
          </span>
        </div>

        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 6px 4px 18px' }}>
          <Icon name="bolt" size={20} style={{ color: 'var(--accent)' }} />
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Capture anything…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 19, fontWeight: 500, color: 'var(--ink)', padding: '14px 0', letterSpacing: '-0.01em' }}
          />
          {text && (
            <div style={{ display: 'flex', gap: 4 }}>
              {(['idea', 'link', 'task'] as CaptureType[]).map((t) => {
                const active = (manualType ?? type) === t
                return (
                  <button
                    key={t}
                    onClick={() => setManualType(t)}
                    className="chip"
                    style={{ textTransform: 'capitalize', opacity: active ? 1 : 0.45, fontWeight: active ? 700 : 500, cursor: 'pointer' }}
                  >
                    <Icon name={TYPE_ICON[t]} size={12} />{t}
                  </button>
                )
              })}
            </div>
          )}
          <button
            onClick={submit}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-1)', opacity: text ? 1 : 0.45, marginRight: 6 }}
          >
            <Icon name="check" size={15} /> Save
          </button>
        </div>

        {/* Destination */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', padding: '12px 18px 4px', borderTop: '1px solid var(--line-soft)', marginTop: 6 }}>
          <span className="eyebrow" style={{ fontSize: 10, marginRight: 2 }}>Send to</span>
          <DestChip active={dest === 'inbox'} onClick={() => setDest('inbox')} icon="inbox" label="Inbox" />
          {fronts.map((f) => (
            <DestChip
              key={f.id}
              active={dest === f.id}
              onClick={() => setDest(f.id)}
              hue={getFrontHue(f.color)}
              label={f.name}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
