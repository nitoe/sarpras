import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Beranda from './pages/Beranda'
import RuangPage from './pages/Ruang'
import AsetPage from './pages/Aset'
import KerusakanPage from './pages/Kerusakan'
import PeminjamanPage from './pages/Peminjaman'
import PengembalianPage from './pages/Pengembalian'
import PengaturanPage from './pages/Pengaturan'
import MasterDataPage from './pages/MasterData'
import PemeliharaanPage from './pages/Pemeliharaan'
import UsulanPage from './pages/Usulan'

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
        <Route path="peminjaman" element={<PeminjamanPage />} />
        <Route path="pengembalian" element={<PengembalianPage />} />
        <Route path="pemeliharaan" element={<PemeliharaanPage />} />
        <Route path="usulan" element={<UsulanPage />} />
        <Route path="master" element={<MasterDataPage />} />
        <Route path="pengaturan" element={<PengaturanPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
