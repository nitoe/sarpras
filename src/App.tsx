import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Beranda from './pages/Beranda'
import RuangPage from './pages/Ruang'
import AsetPage from './pages/Aset'
import KerusakanPage from './pages/Kerusakan'

function Wajib({ children }: { children: ReactNode }) {
  const { user, profil, loading } = useAuth()
  if (loading) return <div className="p-8 text-sm text-muted">Memuat…</div>
  if (!user || !profil) return <Navigate to="/masuk" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/masuk" element={<Login />} />
      <Route
        element={
          <Wajib>
            <Layout />
          </Wajib>
        }
      >
        <Route index element={<Beranda />} />
        <Route path="ruang" element={<RuangPage />} />
        <Route path="aset" element={<AsetPage />} />
        <Route path="kerusakan" element={<KerusakanPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
