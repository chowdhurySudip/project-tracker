import { useEffect } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="overlay">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="confirm-dialog">
        <h2 id="confirm-title">{title}</h2>
        {description && <p>{description}</p>}
        <div className="confirm-dialog-actions">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm} autoFocus>Confirm</button>
        </div>
      </div>
    </div>
  )
}
