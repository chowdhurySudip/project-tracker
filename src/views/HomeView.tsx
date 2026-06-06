import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScheduling } from '@/hooks/useScheduling'
import { useStore } from '@/store'
import { Badge } from '@/components/Badge'
import type { Front } from '@/types'

function FrontCard({ front, hero = false }: { front: Front; hero?: boolean }) {
  const navigate = useNavigate()
  const openCount = front.items.filter((i) => i.status === 'open').length
  return (
    <div
      className={`front-card${hero ? ' front-card--hero' : ''}`}
      style={{ '--front-hue': front.color } as React.CSSProperties}
      onClick={() => navigate(`/front/${front.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/front/${front.id}`)}
    >
      <div className="front-card-header">
        <span className="front-card-name">{front.name}</span>
        <Badge variant={front.type} />
      </div>
      <div className="front-card-meta">{openCount} open item{openCount !== 1 ? 's' : ''}</div>
    </div>
  )
}

export function HomeView() {
  const { hero, scheduled, offDay, locked } = useScheduling()
  const captures = useStore((state) => state.captures)
  const allFronts = useStore((state) => state.fronts)
  const [inboxOpen, setInboxOpen] = useState(true)
  const [filingId, setFilingId] = useState<string | null>(null)

  const inbox = captures.filter((c) => !c.frontId)
  const activeFronts = allFronts.filter((f) => f.status === 'active')

  return (
    <main className="home-view">
      <section className="home-hero">
        <h2 className="home-section-label">Focus now</h2>
        {hero
          ? <FrontCard front={hero} hero />
          : <p className="home-empty">Nothing scheduled for today.</p>
        }
      </section>

      {scheduled.length > 1 && (
        <section className="home-scheduled">
          <h2 className="home-section-label">Also today</h2>
          <div className="home-grid">
            {scheduled.slice(1).map((f) => <FrontCard key={f.id} front={f} />)}
          </div>
        </section>
      )}

      {offDay.length > 0 && (
        <section className="home-offday">
          <h2 className="home-section-label">Off today</h2>
          <ul className="home-list">
            {offDay.map((f) => <li key={f.id}><FrontCard front={f} /></li>)}
          </ul>
        </section>
      )}

      {locked.length > 0 && (
        <section className="home-locked">
          <h2 className="home-section-label">Locked</h2>
          <ul className="home-list">
            {locked.map((f) => (
              <li key={f.id} className="home-locked-item">
                <span>{f.name}</span>
                <span className="locked-badge">Locked</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="home-inbox">
        <button className="home-inbox-toggle" onClick={() => setInboxOpen((o) => !o)}>
          Inbox ({inbox.length})
        </button>
        {inboxOpen && (
          <ul className="inbox-list">
            {inbox.length === 0 && <li className="inbox-empty">Inbox is clear.</li>}
            {inbox.map((c) => (
              <li key={c.id} className="inbox-item">
                <span>{c.text}</span>
                {c.type && <Badge variant={c.type} />}
                <div className="inbox-actions">
                  {filingId === c.id ? (
                    <select
                      defaultValue=""
                      aria-label="File to front"
                      onChange={(e) => {
                        useStore.getState().fileCapture(c.id, e.target.value)
                        setFilingId(null)
                      }}
                    >
                      <option value="" disabled>File to…</option>
                      {activeFronts.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  ) : (
                    <button onClick={() => setFilingId(c.id)}>File</button>
                  )}
                  <button onClick={() => useStore.getState().deleteCapture(c.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
