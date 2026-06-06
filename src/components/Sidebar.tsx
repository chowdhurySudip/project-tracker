import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useStore } from '@/store'
import { FrontModal } from './FrontModal'

export function Sidebar() {
  const [showNewFront, setShowNewFront] = useState(false)
  const allFronts = useStore((state) => state.fronts)
  const fronts = allFronts.filter((f) => f.status === 'active')

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Command</div>
      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/review" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          Review
        </NavLink>
      </nav>
      <ul className="sidebar-fronts">
        {fronts.map((f) => (
          <li key={f.id}>
            <NavLink
              to={`/front/${f.id}`}
              className={({ isActive }) => `sidebar-front-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-front-dot" style={{ background: `oklch(0.6 0.12 ${f.color})` }} />
              {f.name}
            </NavLink>
          </li>
        ))}
      </ul>
      <button className="sidebar-new-btn" onClick={() => setShowNewFront(true)}>
        + New Front
      </button>
      {showNewFront && <FrontModal onClose={() => setShowNewFront(false)} />}
    </aside>
  )
}
