import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { SessionBar } from '@/components/SessionBar'
import { CaptureModal } from '@/components/CaptureModal'
import { HomeView } from '@/views/HomeView'
import { DetailView } from '@/views/DetailView'
import { ReviewView } from '@/views/ReviewView'
import { useCapture } from '@/hooks/useCapture'

function AppLayout() {
  const { open, closeCapture } = useCapture()
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/front/:id" element={<DetailView />} />
          <Route path="/review" element={<ReviewView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <SessionBar />
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
