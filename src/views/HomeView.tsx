import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScheduling } from '@/hooks/useScheduling'
import { getGlobalFocusItem } from '@/lib/scheduling'
import type { FocusResult } from '@/lib/scheduling'
import { useStore } from '@/store'
import { Icon } from '@/components/ui/Icon'
import { Glyph } from '@/components/ui/Glyph'
import { Ring } from '@/components/ui/Ring'
import { hsl, tint, getFrontHue, getProgress, getKindLabel, cadenceLabel } from '@/lib/ui'
import type { Front, Item } from '@/types'

function getNextItem(front: Front): Item | undefined {
  return front.items.find((i) => i.status === 'open')
}

function CadenceDots({ days, hue }: { days: number[]; hue: number }) {
  const today = new Date().getUTCDay()
  const active = days.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : days
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
        const on = active.includes(d)
        const isToday = d === today
        return (
          <span
            key={d}
            style={{
              width: isToday ? 7 : 5,
              height: isToday ? 7 : 5,
              borderRadius: 99,
              background: on ? hsl(hue, 58) : 'var(--line)',
              outline: isToday ? `1.5px solid ${hsl(hue, 58)}` : 'none',
              outlineOffset: 1.5,
            }}
          />
        )
      })}
    </span>
  )
}

function InProgressTag({ hue }: { hue: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: hsl(hue, 42), background: tint(hue, 95, 4), border: `1px solid ${tint(hue, 86, 5)}`, padding: '2px 7px', borderRadius: 99, marginLeft: 8 }}>
      <span style={{ position: 'relative', width: 6, height: 6 }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: 99, background: hsl(hue, 58), animation: 'pulse 1.8s ease-out infinite' }} />
        <span style={{ position: 'absolute', inset: 1, borderRadius: 99, background: hsl(hue, 58) }} />
      </span>
      Live
    </span>
  )
}

function HeroCard({ focus }: { focus: FocusResult }) {
  const { item: nextItem, front } = focus
  const navigate = useNavigate()
  const hue = getFrontHue(front.color)
  const progress = getProgress(front)
  const isInProgress = nextItem.status === 'in_progress'

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: `linear-gradient(135deg, ${tint(hue, 97, 2)}, ${tint(hue, 94, 4)})`, border: `1px solid ${tint(hue, 87, 5)}`, padding: '26px 28px', marginBottom: 22 }}>
      <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: tint(hue, 92, 5), opacity: 0.5, filter: 'blur(8px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 360px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16, flexWrap: 'wrap' }}>
            <span className="eyebrow" style={{ color: hsl(hue, 44), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="dot" style={{ background: hsl(hue, 56) }} />
              Focus now
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>from</span>
            <Glyph front={front} size={16} />
            <span style={{ fontSize: 13, color: hsl(hue, 44), fontWeight: 600 }}>{front.name}</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.18, maxWidth: 560 }}>
            {nextItem.text}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            {!isInProgress && (
              <button
                onClick={() => useStore.getState().startItem(front.id, nextItem.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-1)' }}
              >
                <Icon name="play" size={17} /> Start
              </button>
            )}
            {isInProgress && (
              <button onClick={() => navigate(`/front/${front.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
                <Icon name="timer" size={17} /> In progress…
              </button>
            )}
            <button
              onClick={() => navigate(`/front/${front.id}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, color: 'var(--ink-2)' }}
            >
              Open front
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 6 }}>
          <Ring value={progress} size={88} stroke={6} hue={hue} track={tint(hue, 90, 4)} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: hsl(hue, 42), fontWeight: 600 }}>
            {Math.round(progress * 100)}% there
          </div>
        </div>
      </div>
    </div>
  )
}

function FrontCard({ front, allFronts }: { front: Front; allFronts: Front[] }) {
  const [hover, setHover] = useState(false)
  const navigate = useNavigate()
  const hue = getFrontHue(front.color)
  const progress = getProgress(front)
  const nextItem = getNextItem(front)
  const isInProgress = front.items.some((i) => i.status === 'in_progress')
  const isBlocked = front.prerequisites.some((pid) =>
    allFronts.find((f) => f.id === pid && f.status === 'active'),
  )
  const isParked = front.status === 'parked'
  const isDim = isBlocked || isParked
  const energyHue: Record<string, number> = { deep: 256, medium: 220, light: 152 }
  const eHue = energyHue[nextItem?.focusLevel ?? 'medium'] ?? 220

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => navigate(`/front/${front.id}`)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        border: `1px solid ${isInProgress ? hsl(hue, 70) : 'var(--line)'}`,
        borderRadius: 'var(--radius)',
        padding: 'var(--card-pad)',
        boxShadow: hover && !isDim ? 'var(--shadow-2)' : 'var(--shadow-1)',
        transform: hover && !isDim ? 'translateY(-2px)' : 'none',
        transition: 'transform .16s, box-shadow .16s, border-color .2s',
        opacity: isParked ? 0.74 : 1,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Left color stripe */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: isDim ? 'var(--line)' : hsl(hue, 60) }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
        <Glyph front={front} size={38} dim={isDim} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 650, fontSize: 15, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {front.name}
            {isInProgress && <InProgressTag hue={hue} />}
          </div>
          <div className="eyebrow" style={{ marginTop: 4 }}>
            {getKindLabel(front.type)} · {Math.round(progress * 100)}%
          </div>
        </div>
        {!isDim && <Ring value={progress} size={34} stroke={3.2} hue={hue} />}
      </div>

      {/* Body */}
      {isBlocked ? (
        <div style={{ flex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--block)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <Icon name="lock" size={13} /> Locked
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Waiting on prerequisites.
          </div>
        </div>
      ) : isParked ? (
        <div style={{ flex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--park)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <Icon name="pause" size={12} /> Parked
          </div>
          {front.parkReason && <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{front.parkReason}</div>}
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 7 }}>Next move</div>
          <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.32, letterSpacing: '-0.01em' }}>
            {nextItem?.text || 'No open items'}
          </div>
          {nextItem && (
            <div style={{ display: 'flex', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
              {nextItem.timeEstimate && (
                <span className="chip"><Icon name="clock" size={12} />{nextItem.timeEstimate}m</span>
              )}
              {nextItem.focusLevel && (
                <span className="chip" style={{ background: tint(eHue, 95, 3), borderColor: tint(eHue, 88, 5), color: hsl(eHue, 44) }}>
                  <span className="dot" style={{ background: hsl(eHue, 58) }} />
                  {nextItem.focusLevel}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cadence footer */}
      {!isDim && (
        <div style={{ marginTop: 13, paddingTop: 12, borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="chip" style={{ gap: 7 }}>
            <CadenceDots days={front.cadence.days} hue={hue} />
            {cadenceLabel(front.cadence.days)}
          </span>
        </div>
      )}

      {/* Actions */}
      {!isDim && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          {isInProgress ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, color: hsl(hue, 42), background: tint(hue, 96, 3), border: `1px solid ${tint(hue, 84, 6)}` }}>
              <Icon name="timer" size={15} /> In progress…
            </span>
          ) : nextItem ? (
            <button
              onClick={() => useStore.getState().startItem(front.id, nextItem.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-1)' }}
            >
              <Icon name="play" size={15} /> Start
            </button>
          ) : null}
          <button
            onClick={() => navigate(`/front/${front.id}`)}
            title="Open front"
            style={{ marginLeft: 'auto', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8 }}
          >
            <Icon name="arrow" size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ label, right }: { label: string; right?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 2px 14px' }}>
      <span className="eyebrow">{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
      {right && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{right}</span>}
    </div>
  )
}

function Stat({ label, value, hue }: { label: string; value: string; hue?: number }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: hue ? hsl(hue, 46) : 'var(--ink)' }}>
        {value}
      </div>
      <div className="eyebrow" style={{ fontSize: 10 }}>{label}</div>
    </div>
  )
}

export function HomeView() {
  const { scheduled, offDay, locked } = useScheduling()
  const captures = useStore((state) => state.captures)
  const allFronts = useStore((state) => state.fronts)
  const globalFocus = getGlobalFocusItem(allFronts, new Date())
  const [inboxOpen, setInboxOpen] = useState(true)
  const [filingId, setFilingId] = useState<string | null>(null)

  const inbox = captures.filter((c) => !c.frontId)
  const activeFronts = allFronts.filter((f) => f.status === 'active')
  const parkedFronts = allFronts.filter((f) => f.status === 'parked')

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const allItems = allFronts.flatMap((f) => f.items)
  const doneCount = allItems.filter((i) => i.status === 'done').length

  const onDeck = scheduled

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em' }}>{greeting}, Sudip</h1>
          <div style={{ color: 'var(--ink-3)', fontSize: 13.5, marginTop: 4 }}>
            {dateLabel} · {scheduled.length} front{scheduled.length !== 1 ? 's' : ''} on deck · don't decide, just start.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Stat label="Active fronts" value={String(activeFronts.length)} />
          <Stat label="Done items" value={String(doneCount)} hue={152} />
        </div>
      </div>

      {/* Hero */}
      {scheduled.length > 0 && (
        globalFocus
          ? <HeroCard focus={globalFocus} />
          : <div style={{ padding: '26px 28px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line-soft)', marginBottom: 22, color: 'var(--ink-3)', fontSize: 15 }}>
              All items complete!
            </div>
      )}

      {/* On deck */}
      {(onDeck.length > 0 || locked.length > 0) && (
        <>
          <SectionHeader
            label="On deck today · one move each"
            right={`${scheduled.length} scheduled · ${locked.length} locked`}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(296px, 1fr))', gap: 'var(--gap)', marginBottom: 26 }}>
            {[...onDeck, ...locked].map((f) => (
              <FrontCard key={f.id} front={f} allFronts={allFronts} />
            ))}
          </div>
        </>
      )}

      {/* Not scheduled */}
      {offDay.length > 0 && (
        <>
          <SectionHeader label="Not scheduled today" right="soft — start anyway if you want" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(296px, 1fr))', gap: 'var(--gap)', marginBottom: 26 }}>
            {offDay.map((f) => (
              <FrontCard key={f.id} front={f} allFronts={allFronts} />
            ))}
          </div>
        </>
      )}

      {/* Parked */}
      {parkedFronts.length > 0 && (
        <>
          <SectionHeader label="Parked" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(296px, 1fr))', gap: 'var(--gap)', marginBottom: 26 }}>
            {parkedFronts.map((f) => (
              <FrontCard key={f.id} front={f} allFronts={allFronts} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {scheduled.length === 0 && offDay.length === 0 && locked.length === 0 && parkedFronts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--ink-3)', border: '1px dashed var(--line)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 6 }}>Nothing scheduled for today.</div>
          <div style={{ fontSize: 13.5 }}>Add a front to get started — press <span className="kbd">N</span> or click "New front" in the sidebar.</div>
        </div>
      )}

      {/* Inbox */}
      <div style={{ marginTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button
            onClick={() => setInboxOpen((o) => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}
          >
            <Icon name="inbox" size={13} />
            Inbox ({inbox.length})
            <Icon name="arrow" size={11} style={{ transform: inboxOpen ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .15s' }} />
          </button>
          <div style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
        </div>

        {inboxOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inbox.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)', border: '1px dashed var(--line)', borderRadius: 'var(--radius)' }}>
                <Icon name="check" size={22} style={{ color: 'var(--done)', marginBottom: 8 }} />
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Inbox is clear.</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Capture freely — it'll land here.</div>
              </div>
            ) : (
              inbox.map((c) => (
                <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{c.text}</div>
                      {c.type && <div className="eyebrow" style={{ fontSize: 10, marginTop: 3 }}>{c.type}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {filingId === c.id ? (
                        <select
                          autoFocus
                          defaultValue=""
                          aria-label="File to front"
                          style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 12 }}
                          onChange={(e) => {
                            if (e.target.value) {
                              useStore.getState().fileCapture(c.id, e.target.value)
                              setFilingId(null)
                            }
                          }}
                        >
                          <option value="" disabled>File to…</option>
                          {activeFronts.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setFilingId(c.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', color: 'var(--ink-2)' }}
                        >
                          <Icon name="arrow" size={13} style={{ transform: 'rotate(-90deg)' }} /> File
                        </button>
                      )}
                      <button
                        onClick={() => useStore.getState().deleteCapture(c.id)}
                        aria-label="Delete"
                        style={{ width: 30, height: 30, borderRadius: 8, color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}
                      >
                        <Icon name="x" size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
