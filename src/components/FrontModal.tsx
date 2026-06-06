import { useState } from 'react'
import { useStore } from '@/store'
import type { Front, FrontType, FrontStatus } from '@/types'

interface FrontModalProps { front?: Front; onClose: () => void }

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const TYPES: FrontType[] = ['project', 'learning', 'article']
const PRESET_HUES = ['256', '152', '70', '25', '300', '200']

export function FrontModal({ front, onClose }: FrontModalProps) {
  const [name, setName] = useState(front?.name ?? '')
  const [type, setType] = useState<FrontType>(front?.type ?? 'project')
  const [color, setColor] = useState(front?.color ?? '256')
  const [days, setDays] = useState<number[]>(front?.cadence.days ?? [])
  const [prereqs, setPrereqs] = useState<string[]>(front?.prerequisites ?? [])
  const isEdit = !!front

  const allFronts = useStore((state) => state.fronts)
  const eligible = allFronts.filter((f) => f.id !== front?.id && f.status === 'active')

  function toggleDay(d: number) {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  function togglePrereq(id: string) {
    setPrereqs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const data = {
      name: name.trim(), type, color,
      status: (front?.status ?? 'active') as FrontStatus,
      cadence: { days }, prerequisites: prereqs,
    }
    if (isEdit) {
      useStore.getState().updateFront(front.id, data)
    } else {
      useStore.getState().addFront(data)
    }
    onClose()
  }

  return (
    <div className="overlay">
      <div role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit front' : 'New front'} className="front-modal">
        <form onSubmit={handleSubmit}>
          <input autoFocus placeholder="Front name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="front-modal-types">
            {TYPES.map((t) => (
              <button key={t} type="button" className={type === t ? 'active' : ''} onClick={() => setType(t)}>{t}</button>
            ))}
          </div>
          <div className="front-modal-days">
            {DAYS.map((label, i) => (
              <button key={i} type="button" className={days.includes(i) ? 'active' : ''} onClick={() => toggleDay(i)} aria-label={`Toggle ${label}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="front-modal-hues">
            {PRESET_HUES.map((h) => (
              <button key={h} type="button" className={color === h ? 'active' : ''} style={{ background: `oklch(0.7 0.12 ${h})` }} onClick={() => setColor(h)} aria-label={`Color ${h}`} />
            ))}
          </div>
          {eligible.length > 0 && (
            <div className="front-modal-prereqs">
              <p>Requires</p>
              {eligible.map((f) => (
                <label key={f.id}>
                  <input type="checkbox" checked={prereqs.includes(f.id)} onChange={() => togglePrereq(f.id)} />
                  {f.name}
                </label>
              ))}
            </div>
          )}
          <div className="front-modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">{isEdit ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
