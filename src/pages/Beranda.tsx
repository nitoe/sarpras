import { useAuth } from '../context/AuthContext'
import { NAMA_PERAN } from '../lib/peran'
import { Badge, Notice, PageHeader } from '../components/ui'

export default function Beranda() {
  const { profil, peran } = useAuth()

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader judul={`Selamat datang, ${profil?.nama ?? ''}`} keterangan="Sarana dan prasarana SD Muhammadiyah 01 Kukusan" />
      {peran ? (
        <div className="card-soft flex items-center justify-between p-4">
          <div>
            <div className="text-sm text-muted">Peran Anda</div>
            <div className="mt-1">
              <Badge>{NAMA_PERAN[peran]}</Badge>
            </div>
          </div>
        </div>
      ) : (
        <Notice tipe="warn">Akun Anda belum memiliki akses ke aplikasi sarpras. Hubungi administrator.</Notice>
      )}
    </div>
  )
}
