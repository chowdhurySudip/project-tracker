import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useStore } from '@/store'
import { formatElapsed } from '@/lib/time'
import { Icon } from './ui/Icon'
import { hsl, getFrontHue } from '@/lib/ui'

function DarkBtn({ icon, label, onClick, active, primary, hue = 256 }: { icon: string; label: string; onClick: () => void; active?: boolean; primary?: boolean; hue?: number }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 11px',
        borderRadius: 9,
        fontSize: 12.5,
        fontWeight: 600,
        transition: 'all .12s',
        background: primary ? hsl(hue, 56) : (active || hover ? 'oklch(1 0 0 / 0.14)' : 'oklch(1 0 0 / 0.07)'),
        color: primary ? '#fff' : 'var(--bg)',
      }}
    >
      <Icon name={icon} size={14} />{label}
    </button>
  )
}

export function SessionBar() {
  const { session, pause, resume, end, abandon } = useSession()
  const fronts = useStore((state) => state.fronts)
  const [logOpen, setLogOpen] = useState(false)
  const [logText, setLogText] = useState('')

  if (!session) return null

  const front = fronts.find((f) => f.id === session.frontId)
  const item = front?.items.find((i) => i.id === session.itemId)
  if (!front || !item) return null

  const hue = getFrontHue(front.color)

  function submitLog() {
    end(logText.trim() || undefined)
    setLogText('')
    setLogOpen(false)
  }

  return (
    <div role="status" style={{ position: 'sticky', top: 0, zIndex: 30, marginBottom: 20 }}>
      <div style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 14, boxShadow: 'var(--shadow-2)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px' }}>
          {/* Pulsing dot */}
          <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 30, height: 30, flex: 'none' }}>
            <span style={{ position: 'absolute', width: 30, height: 30, borderRadius: 99, background: hsl(hue, 60), opacity: session.paused ? 0.15 : 0.25, animation: session.paused ? 'none' : 'pulse 1.8s ease-out infinite' }} />
            <span style={{ width: 11, height: 11, borderRadius: 99, background: hsl(hue, 64) }} />
          </span>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: hsl(hue, 70), fontWeight: 600 }}>
                {session.paused ? 'Paused' : 'In progress'}
              </span>
              <span style={{ fontSize: 11.5, color: 'oklch(0.8 0.01 90)' }}><span aria-hidden>· </span><span>{front.name}</span></span>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.text}
            </div>
          </div>

          {/* Timer */}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums', color: 'var(--bg)', padding: '0 4px' }}>
            {formatElapsed(session.elapsed)}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <DarkBtn icon="task" label="+Log" onClick={() => setLogOpen((o) => !o)} active={logOpen} />
            {session.paused
              ? <DarkBtn icon="play" label="Resume" onClick={resume} />
              : <DarkBtn icon="pause" label="Pause" onClick={pause} />}
            <DarkBtn icon="check" label="Complete" onClick={() => end()} primary hue={hue} />
            <button
              onClick={abandon}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: 'oklch(0.7 0.01 90)' }}
            >
              <Icon name="stop" size={14} />Stop
            </button>
          </div>
        </div>

        {logOpen && (
          <div style={{ display: 'flex', gap: 8, padding: '0 14px 12px', alignItems: 'center' }}>
            <input
              autoFocus
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitLog()
                if (e.key === 'Escape') { setLogOpen(false); setLogText('') }
              }}
              placeholder="Add log…"
              style={{ flex: 1, background: 'oklch(1 0 0 / 0.08)', border: '1px solid oklch(1 0 0 / 0.14)', borderRadius: 9, padding: '9px 12px', color: 'var(--bg)', fontSize: 13, outline: 'none' }}
            />
            <button
              onClick={submitLog}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, background: 'oklch(1 0 0 / 0.12)', color: 'var(--bg)' }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
