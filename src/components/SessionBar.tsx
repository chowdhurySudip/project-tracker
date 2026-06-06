import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useStore } from '@/store'
import { formatElapsed } from '@/lib/time'

export function SessionBar() {
  const { session, pause, resume, end, abandon } = useSession()
  const fronts = useStore((state) => state.fronts)
  const [logOpen, setLogOpen] = useState(false)
  const [logText, setLogText] = useState('')

  if (!session) return null

  const front = fronts.find((f) => f.id === session.frontId)
  const item = front?.items.find((i) => i.id === session.itemId)

  if (!front || !item) return null

  function submitLog(e: React.FormEvent) {
    e.preventDefault()
    end(logText.trim() || undefined)
    setLogText('')
    setLogOpen(false)
  }

  return (
    <div className="session-bar" role="status">
      <div className="session-bar-info">
        <span className="session-bar-front">{front.name}</span>
        <span className="session-bar-separator">·</span>
        <span className="session-bar-item">{item.text}</span>
      </div>
      <div className="session-bar-timer">{formatElapsed(session.elapsed)}</div>
      <div className="session-bar-actions">
        {logOpen ? (
          <form onSubmit={submitLog} className="session-bar-log-form">
            <input
              autoFocus
              placeholder="Add log…"
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setLogOpen(false); setLogText('') } }}
            />
            <button type="submit">Done</button>
          </form>
        ) : (
          <>
            {session.paused
              ? <button onClick={resume}>Resume</button>
              : <button onClick={pause}>Pause</button>
            }
            <button onClick={() => setLogOpen(true)}>+Log</button>
            <button onClick={() => end()}>Complete</button>
            <button onClick={abandon}>Stop</button>
          </>
        )}
      </div>
    </div>
  )
}
