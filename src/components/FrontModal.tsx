import { useState } from 'react'
import { useStore } from '@/store'
import { Icon } from './ui/Icon'
import { hsl, tint, getFrontHue } from '@/lib/ui'
import type { Front, FrontType, FrontStatus } from '@/types'

interface FrontModalProps { front?: Front; onClose: () => void }

const HUE_CHOICES = [256, 152, 286, 30, 220, 70, 330, 190]
const TYPES: Array<{ key: FrontType; label: string }> = [
  { key: 'project', label: 'Project' },
  { key: 'learning', label: 'Learning' },
  { key: 'article', label: 'Article' },
]
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const PRESET_CADENCES = [
  { label: 'Daily', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends', days: [0, 6] },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 9,
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  fontSize: 13.5,
  color: 'var(--ink)',
  outline: 'none',
  fontWeight: 500,
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
        <span className="eyebrow" style={{ fontSize: 10 }}>{label}</span>
        {hint && <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function FrontModal({ front, onClose }: FrontModalProps) {
  const existingHue = front ? getFrontHue(front.color) : 256
  const [name, setName] = useState(front?.name ?? '')
  const [type, setType] = useState<FrontType>(front?.type ?? 'project')
  const [hue, setHue] = useState(existingHue)
  const [days, setDays] = useState<number[]>(front?.cadence.days ?? [1, 2, 3, 4, 5])
  const [prereqs, setPrereqs] = useState<string[]>(front?.prerequisites ?? [])
  const [blurb, setBlurb] = useState(front?.blurb ?? '')
  const isEdit = !!front

  const allFronts = useStore((state) => state.fronts)
  const eligible = allFronts.filter((f) => f.id !== front?.id && f.status === 'active')

  function toggleDay(d: number) {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  function togglePrereq(id: string) {
    setPrereqs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function handleSubmit() {
    if (!name.trim()) return
    const data = {
      name: name.trim(),
      type,
      color: String(hue),
      blurb: blurb.trim() || undefined,
      status: (front?.status ?? 'active') as FrontStatus,
      cadence: { days },
      prerequisites: prereqs,
    }
    if (isEdit) {
      useStore.getState().updateFront(front!.id, data)
    } else {
      useStore.getState().addFront(data)
    }
    onClose()
  }

  function handleDelete() {
    if (front) {
      useStore.getState().deleteFront(front.id)
    }
    onClose()
  }

  const initials = name.trim() ? name.trim().slice(0, 2).toUpperCase() : '+'

  return (
    <div
      onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'oklch(0.3 0.01 90 / 0.34)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '7vh', overflowY: 'auto' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: 'min(560px, 94vw)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, boxShadow: 'var(--shadow-3)', overflow: 'hidden', animation: 'sheetIn .22s cubic-bezier(.2,.8,.2,1) both', marginBottom: 40 }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: tint(hue, 94, 4), color: hsl(hue, 42), border: `1px solid ${tint(hue, 88, 5)}`, fontFamily: 'var(--mono)', fontWeight: 600 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.02em' }}>{isEdit ? 'Edit front' : 'New front'}</div>
              <div className="eyebrow" style={{ fontSize: 9.5 }}>{isEdit ? 'name · cadence · prerequisites' : 'project, course, article or goal'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--ink-3)', width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="scroll" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '62vh', overflowY: 'auto' }}>
          <Field label="Name">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rust for systems" style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          </Field>

          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <Field label="Type">
              <div style={{ display: 'flex', gap: 6 }}>
                {TYPES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setType(key)}
                    style={{ padding: '8px 13px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, border: `1px solid ${type === key ? 'var(--accent)' : 'var(--line)'}`, background: type === key ? 'var(--accent-bg)' : 'var(--surface)', color: type === key ? 'var(--accent-ink)' : 'var(--ink-2)' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Color">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {HUE_CHOICES.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHue(h)}
                    style={{ width: 24, height: 24, borderRadius: 7, background: hsl(h, 60), border: hue === h ? '2px solid var(--ink)' : '2px solid transparent', outline: hue === h ? `2px solid ${tint(h, 80, 8)}` : 'none', outlineOffset: 1 }}
                    aria-label={`Color ${h}`}
                  />
                ))}
              </div>
            </Field>
          </div>

          <Field label="Description" hint="one line about this front">
            <input
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="What is this front about?"
              style={inputStyle}
            />
          </Field>

          <Field label="Cadence" hint="which days this belongs to — a nudge, not a lock">
            <div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const on = days.includes(d)
                  return (
                    <button
                      key={d}
                      onClick={() => toggleDay(d)}
                      style={{ width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)', transition: 'all .12s', border: `1px solid ${on ? tint(hue, 80, 7) : 'var(--line)'}`, background: on ? tint(hue, 94, 5) : 'var(--surface)', color: on ? hsl(hue, 42) : 'var(--ink-3)' }}
                    >
                      {DAYS[d][0]}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {PRESET_CADENCES.map((p) => (
                  <button key={p.label} onClick={() => setDays(p.days)} style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', padding: '3px 8px', borderRadius: 99, border: '1px solid var(--line-soft)' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </Field>

          {eligible.length > 0 && (
            <Field label="Prerequisites" hint="stays locked until these finish">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {eligible.map((f) => {
                  const fHue = getFrontHue(f.color)
                  const on = prereqs.includes(f.id)
                  return (
                    <button
                      key={f.id}
                      onClick={() => togglePrereq(f.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)', border: `1px solid ${on ? tint(fHue, 82, 6) : 'var(--line)'}`, background: on ? tint(fHue, 94, 4) : 'var(--surface)', color: on ? hsl(fHue, 42) : 'var(--ink-3)' }}
                    >
                      {on && <Icon name="check" size={11} />}
                      <span className="dot" style={{ background: hsl(fHue, 56) }} />
                      {f.name}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)' }}>
          {isEdit ? (
            <button onClick={handleDelete} style={{ color: hsl(25, 48), fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="x" size={14} /> Delete front
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={onClose} style={{ padding: '9px 15px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)' }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-1)', opacity: name.trim() ? 1 : 0.5 }}
            >
              <Icon name={isEdit ? 'check' : 'plus'} size={15} />
              {isEdit ? 'Save changes' : 'Create front'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
