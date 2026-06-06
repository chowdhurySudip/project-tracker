import { useStore } from '@/store'
import { Icon } from '@/components/ui/Icon'
import { Glyph } from '@/components/ui/Glyph'
import { Ring } from '@/components/ui/Ring'
import { hsl, tint, getFrontHue, getProgress } from '@/lib/ui'
import type { Front } from '@/types'

function Panel({ title, eyebrow, icon, children, style }: { title: string; eyebrow?: string; icon?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        {icon && <span style={{ color: 'var(--ink-3)' }}><Icon name={icon} size={15} /></span>}
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.015em' }}>{title}</span>
        {eyebrow && <span className="eyebrow" style={{ marginLeft: 'auto', fontSize: 10 }}>{eyebrow}</span>}
      </div>
      {children}
    </section>
  )
}

function MiniFront({ front, note, noteHue }: { front: Front; note?: string; noteHue?: number }) {
  const hue = getFrontHue(front.color)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10 }}>
      <Glyph front={front} size={26} dim={front.status === 'parked'} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{front.name}</div>
        {note && <div style={{ fontSize: 11.5, color: noteHue ? hsl(noteHue, 46) : 'var(--ink-3)', marginTop: 1 }}>{note}</div>}
      </div>
      <Ring value={getProgress(front)} size={24} stroke={2.4} hue={hue} />
    </div>
  )
}

export function ReviewView() {
  const fronts = useStore((state) => state.fronts)

  const activeFronts = fronts.filter((f) => f.status === 'active')
  const parkedFronts = fronts.filter((f) => f.status === 'parked')
  const doneFronts = fronts.filter((f) => f.status === 'done')

  const allItems = fronts.flatMap((f) => f.items)
  const openItemCount = allItems.filter((i) => i.status === 'open').length
  const doneItemCount = allItems.filter((i) => i.status === 'done').length

  const blockedFronts = activeFronts.filter((f) =>
    f.prerequisites.some((pid) => fronts.find((x) => x.id === pid && x.status === 'active')),
  )
  const readyFronts = activeFronts.filter((f) =>
    !f.prerequisites.some((pid) => fronts.find((x) => x.id === pid && x.status === 'active')),
  )

  const stats = [
    { label: 'Active fronts', value: String(activeFronts.length), hue: 152, testId: 'count-active' },
    { label: 'Open items', value: String(openItemCount), hue: 256, testId: 'count-open-items' },
    { label: 'Done items', value: String(doneItemCount), hue: 152, testId: 'count-done-items' },
    { label: 'Parked', value: String(parkedFronts.length), hue: 70, testId: '' },
  ]

  const hadProgress = readyFronts.filter((f) => f.items.some((i) => i.status === 'done'))
  const noProgress = readyFronts.filter((f) => !f.items.some((i) => i.status === 'done'))

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em' }}>Weekly review</h1>
          <div style={{ color: 'var(--ink-3)', fontSize: 13.5, marginTop: 4 }}>
            A 20-minute honest look at active, parked, and done.
          </div>
        </div>
      </div>

      {activeFronts.length === 0 && parkedFronts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)', border: '1px dashed var(--line)', borderRadius: 'var(--radius)', marginBottom: 22 }}>
          No active fronts. Add some on the home screen.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--gap)' }}>
          {stats.map((s) => (
            <div key={s.label} data-testid={s.testId || undefined} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '16px 18px', boxShadow: 'var(--shadow-1)' }}>
              <div className="eyebrow" style={{ fontSize: 10 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', color: hsl(s.hue, 46), marginTop: 6, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Had progress */}
        {hadProgress.length > 0 && (
          <Panel title="Had progress" eyebrow="moving forward" icon="check">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hadProgress.map((f) => {
                const hue = getFrontHue(f.color)
                const prog = getProgress(f)
                return (
                  <div key={f.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10 }}>
                    <Glyph front={f} size={28} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                      <div style={{ height: 4, borderRadius: 3, background: 'var(--sunk)', marginTop: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${prog * 100}%`, borderRadius: 3, background: hsl(hue, 60) }} />
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: hsl(hue, 46) }}>{Math.round(prog * 100)}%</span>
                    <button
                      onClick={() => useStore.getState().updateFront(f.id, { status: 'parked' })}
                      style={{ fontSize: 12, fontWeight: 600, color: hsl(70, 44), padding: '4px 10px', borderRadius: 8, background: tint(70, 94, 4), border: `1px solid ${tint(70, 84, 5)}` }}
                    >
                      Park
                    </button>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}

        {/* No progress */}
        {noProgress.length > 0 && (
          <Panel title="No progress yet — consider parking" eyebrow="stale" icon="pause">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {noProgress.map((f) => (
                <div key={f.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10 }}>
                  <Glyph front={f} size={28} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                  <button
                    onClick={() => useStore.getState().updateFront(f.id, { status: 'parked' })}
                    style={{ fontSize: 12, fontWeight: 600, color: hsl(70, 44), padding: '4px 10px', borderRadius: 8, background: tint(70, 94, 4), border: `1px solid ${tint(70, 84, 5)}` }}
                  >
                    Park
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Blocked */}
        {blockedFronts.length > 0 && (
          <Panel title="Blocked" eyebrow="waiting on prerequisites" icon="lock">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blockedFronts.map((f) => (
                <MiniFront key={f.id} front={f} note="Waiting on prerequisites" noteHue={25} />
              ))}
            </div>
          </Panel>
        )}

        {/* Parked */}
        {parkedFronts.length > 0 && (
          <Panel title="Parked" eyebrow="on hold" icon="pause">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parkedFronts.map((f) => (
                <MiniFront key={f.id} front={f} note={f.parkReason} noteHue={70} />
              ))}
            </div>
          </Panel>
        )}

        {/* Actions */}
        {doneFronts.length === 0 && (
          <Panel title="Worth a look" eyebrow="gentle nudges" icon="idea">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {parkedFronts.map((f) => (
                <div key={f.id} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 13px', background: tint(70, 97, 2), border: `1px solid ${tint(70, 89, 4)}`, borderRadius: 11 }}>
                  <span className="dot" style={{ background: hsl(70, 58), marginTop: 6 }} />
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>
                    <strong>{f.name}</strong> is parked.{f.parkReason ? ` ${f.parkReason}` : ''} Resume a small slice, or formally drop it?
                  </div>
                  <button
                    onClick={() => useStore.getState().updateFront(f.id, { status: 'active' })}
                    style={{ fontSize: 12, fontWeight: 600, color: hsl(70, 44), padding: '4px 10px', borderRadius: 8, background: tint(70, 92, 5), border: `1px solid ${tint(70, 84, 5)}`, whiteSpace: 'nowrap' }}
                  >
                    Resume
                  </button>
                </div>
              ))}
              {parkedFronts.length === 0 && activeFronts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
                  Add fronts to get started.
                </div>
              )}
              {parkedFronts.length === 0 && activeFronts.length > 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-3)', fontSize: 13 }}>
                  Looking good — no nudges needed.
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
