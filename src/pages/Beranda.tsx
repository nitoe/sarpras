import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useKoleksi } from '../lib/useKoleksi'
import { NAMA_PERAN } from '../lib/peran'
import type { Aset, Ruang } from '../lib/tipe'
import { Badge, Notice, PageHeader, StatStrip } from '../components/ui'

export default function Beranda() {
  const { profil, peran } = useAuth()
  const ruang = useKoleksi<Ruang>('sarpras_ruang')
  const aset = useKoleksi<Aset>('sarpras_aset')

  const total = aset.data.reduce((n, a) => n + a.jumlah, 0)
  const rusak = aset.data.filter((a) => a.kondisi !== 'baik').reduce((n, a) => n + a.jumlah, 0)

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader judul={`Selamat datang, ${profil?.nama ?? ''}`} keterangan="Sarana dan prasarana SD Muhammadiyah 01 Kukusan" />
      {peran ? (
        <>
          <StatStrip
            items={[
              { label: 'Ruang', nilai: ruang.data.length },
              { label: 'Jenis barang', nilai: aset.data.length },
              { label: 'Total unit', nilai: total },
              { label: 'Perlu perbaikan', nilai: rusak },
            ]}
          />
          <div className="card-soft flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-sm text-muted">Peran Anda</div>
              <div className="mt-1"><Badge>{NAMA_PERAN[peran]}</Badge></div>
            </div>
            <div className="flex gap-4 text-sm font-medium text-muh-700">
              <Link to="/aset" className="hover:underline">Lihat aset</Link>
              <Link to="/ruang" className="hover:underline">Lihat ruang</Link>
            </div>
          </div>
        </>
      ) : (
        <Notice tipe="warn">Akun Anda belum memiliki akses ke aplikasi sarpras. Hubungi administrator.</Notice>
      )}
    </div>
  )
}
