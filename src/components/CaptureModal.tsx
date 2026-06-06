import { useState } from 'react'
import { useStore } from '@/store'
import type { CaptureType } from '@/types'

interface CaptureModalProps { open: boolean; onClose: () => void }

const TYPES: CaptureType[] = ['idea', 'link', 'task']

export function CaptureModal({ open, onClose }: CaptureModalProps) {
  const [text, setText] = useState('')
  const [type, setType] = useState<CaptureType | undefined>()
  const [frontId, setFrontId] = useState('')
  const allFronts = useStore((state) => state.fronts)
  const fronts = allFronts.filter((f) => f.status === 'active')

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    useStore.getState().addCapture({ text: text.trim(), type })
    if (frontId) {
      const captures = useStore.getState().captures
      const captureId = captures[captures.length - 1].id
      useStore.getState().fileCapture(captureId, frontId)
    }
    setText('')
    setType(undefined)
    setFrontId('')
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="overlay" onKeyDown={handleKeyDown}>
      <div role="dialog" aria-modal="true" aria-label="Capture" className="capture-modal">
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            placeholder="Capture anything…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="capture-input"
          />
          <div className="capture-types">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={type === t ? 'active' : ''}
                onClick={() => setType(type === t ? undefined : t)}
              >
                {t}
              </button>
            ))}
          </div>
          {fronts.length > 0 && (
            <select
              value={frontId}
              onChange={(e) => setFrontId(e.target.value)}
              aria-label="File to front"
            >
              <option value="">Inbox (default)</option>
              {fronts.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          <button type="submit">Save</button>
        </form>
      </div>
    </div>
  )
}
