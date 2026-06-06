import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { SessionBar } from '@/components/SessionBar'
import { CaptureModal } from '@/components/CaptureModal'
import { HomeView } from '@/views/HomeView'
import { DetailView } from '@/views/DetailView'
import { ReviewView } from '@/views/ReviewView'
import { useCapture } from '@/hooks/useCapture'
import { Icon } from '@/components/ui/Icon'

function AppLayout() {
  const { open, openCapture, closeCapture } = useCapture()
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main scroll">
        <SessionBar />
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/front/:id" element={<DetailView />} />
          <Route path="/review" element={<ReviewView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!open && (
        <button
          onClick={openCapture}
          title="Capture (C)"
          style={{
            position: 'fixed',
            right: 26,
            bottom: 26,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '13px 18px',
            borderRadius: 14,
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 650,
            fontSize: 14,
            boxShadow: 'var(--shadow-3)',
          }}
        >
          <Icon name="bolt" size={17} />
          Capture
          <span
            className="kbd"
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', boxShadow: 'none' }}
          >
            C
          </span>
        </button>
      )}

      <CaptureModal open={open} onClose={closeCapture} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
