import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useStore } from '@/store'
import { FrontModal } from './FrontModal'
import { Icon } from './ui/Icon'
import { Glyph } from './ui/Glyph'
import { hsl, getFrontHue } from '@/lib/ui'
import type { Front } from '@/types'

const CATEGORIES: Array<{ key: 'project' | 'learning' | 'article'; label: string }> = [
  { key: 'project', label: 'Projects' },
  { key: 'learning', label: 'Learning' },
  { key: 'article', label: 'Articles' },
]

function FrontLink({ front, allFronts }: { front: Front; allFronts: Front[] }) {
  const hue = getFrontHue(front.color)
  const isBlocked = front.prerequisites.some((pid) =>
    allFronts.find((f) => f.id === pid && f.status === 'active'),
  )
  const isParked = front.status === 'parked'
  const offDay = front.status === 'active' && !isBlocked && front.cadence.days.length > 0
    && !front.cadence.days.includes(new Date().getUTCDay())

  return (
    <NavLink
      to={`/front/${front.id}`}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '7px 9px',
        borderRadius: 9,
        textAlign: 'left',
        background: isActive ? 'var(--surface)' : 'transparent',
        border: `1px solid ${isActive ? 'var(--line)' : 'transparent'}`,
        boxShadow: isActive ? 'var(--shadow-1)' : 'none',
        opacity: offDay ? 0.6 : 1,
        textDecoration: 'none',
      })}
    >
      <Glyph front={front} size={26} dim={isBlocked || isParked} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: isParked ? 'var(--ink-3)' : 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {front.name}
      </span>
      {isBlocked ? (
        <Icon name="lock" size={12} style={{ color: 'var(--ink-faint)', flex: 'none' }} />
      ) : isParked ? (
        <Icon name="pause" size={12} style={{ color: 'var(--ink-faint)', flex: 'none' }} />
      ) : (
        <span className="dot" style={{ background: hsl(hue, 60), opacity: 0.5, flex: 'none' }} />
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const [showNewFront, setShowNewFront] = useState(false)
  const allFronts = useStore((state) => state.fronts)
  const captures = useStore((state) => state.captures)
  const location = useLocation()
  const inboxCount = captures.filter((c) => !c.frontId).length

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'n' && e.key !== 'N') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      setShowNewFront(true)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navItems = [
    { to: '/', label: 'Today', icon: 'bolt', exact: true, badge: 0 },
    { to: '/review', label: 'Weekly review', icon: 'calendar', exact: false, badge: 0 },
  ]

  return (
    <aside
      className="scroll"
      style={{
        width: 'var(--sidebar-w)',
        flex: 'none',
        height: '100vh',
        overflowY: 'auto',
        borderRight: '1px solid var(--line)',
        background: 'var(--surface-2)',
        padding: '18px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 14px' }}>
        <img src="/logo.png" alt="Command" style={{ width: 30, height: 30, borderRadius: 6, flex: 'none' }} />
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>Command</div>
      </div>

      {/* Nav */}
      {navItems.map((item) => {
        const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '9px 11px',
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 600,
              color: isActive ? 'var(--ink)' : 'var(--ink-2)',
              background: isActive ? 'var(--surface)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--line)' : 'transparent'}`,
              boxShadow: isActive ? 'var(--shadow-1)' : 'none',
              textDecoration: 'none',
              transition: 'all .12s',
            }}
          >
            <span style={{ color: isActive ? 'var(--accent)' : 'var(--ink-3)' }}>
              <Icon name={item.icon} size={17} />
            </span>
            {item.label}
            {item.to === '/' && inboxCount > 0 && (
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center' }}>
                {inboxCount}
              </span>
            )}
          </NavLink>
        )
      })}

      {/* Front categories */}
      {CATEGORIES.map(({ key, label }) => {
        const list = allFronts.filter((f) => f.type === key && f.status !== 'done')
        if (!list.length) return null
        return (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 8px 8px' }}>
              <span className="eyebrow" style={{ fontSize: 9.5 }}>{label}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {list.map((f) => (
                <FrontLink key={f.id} front={f} allFronts={allFronts} />
              ))}
            </div>
          </div>
        )
      })}

      {/* New front */}
      <button
        onClick={() => setShowNewFront(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '9px 11px',
          marginTop: 10,
          borderRadius: 9,
          width: '100%',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--ink-3)',
          border: '1px dashed var(--line)',
          textAlign: 'left',
        }}
      >
        <Icon name="plus" size={15} />
        New front
        <span className="kbd" style={{ marginLeft: 'auto' }}>N</span>
      </button>

      {/* User card */}
      <div style={{ marginTop: 'auto', paddingTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--line-soft)' }}>
          <div style={{ width: 30, height: 30, borderRadius: 99, background: hsl(256, 60), color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13, flex: 'none' }}>
            S
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Sudip</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>5-min daily · 20-min weekly</div>
          </div>
        </div>
      </div>

      {showNewFront && <FrontModal onClose={() => setShowNewFront(false)} />}
    </aside>
  )
}
