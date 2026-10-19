import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useKoleksi } from '../lib/useKoleksi'
import { NAMA_PERAN } from '../lib/peran'
import type { Aset, Kerusakan, Peminjaman } from '../lib/tipe'
import { jenisPinjam } from '../lib/tipe'
import { Badge, Notice, PageHeader, PageShell, StatStrip } from '../components/ui'

const pintasan: { to: string; judul: string; ket: string; peran?: Array<'admin' | 'pimpinan' | 'guru' | 'petugas'> }[] = [
  { to: '/aset', judul: 'Aset', ket: 'Daftar barang dan kondisi' },
  { to: '/ruang', judul: 'Ruang', ket: 'Ruang dan isi asetnya' },
  { to: '/kerusakan', judul: 'Kerusakan', ket: 'Lapor dan pantau perbaikan' },
  { to: '/peminjaman', judul: 'Peminjaman', ket: 'Pinjam ruang atau alat', peran: ['admin', 'pimpinan', 'guru'] },
  { to: '/pengembalian', judul: 'Pengembalian', ket: 'Kembalikan alat yang dipinjam', peran: ['admin', 'pimpinan', 'guru'] },
  { to: '/pengaturan', judul: 'Pengaturan', ket: 'Kelola peran pengguna', peran: ['admin'] },
]

export default function Beranda() {
  const { profil, peran } = useAuth()
  const laporan = useKoleksi<Kerusakan>('sarpras_kerusakan')
  const aset = useKoleksi<Aset>('sarpras_aset')
  const pinjam = useKoleksi<Peminjaman>('sarpras_peminjaman')

  const total = aset.data.reduce((n, a) => n + a.jumlah, 0)
  const rusak = aset.data.filter((a) => a.kondisi !== 'baik').reduce((n, a) => n + a.jumlah, 0)
  const laporanAktif = laporan.data.filter((k) => k.status !== 'selesai').length
  const pinjamAktif = pinjam.data.filter(
    (p) => p.status === 'diajukan' || p.status === 'disetujui' || p.status === 'pengembalian',
  ).length
  const menungguKembali = pinjam.data.filter(
    (p) => jenisPinjam(p) === 'alat' && p.status === 'pengembalian',
  ).length

  const menu = pintasan.filter((p) => !p.peran || (peran && p.peran.includes(peran)))

  return (
    <PageShell>
      <PageHeader judul={`Selamat datang, ${profil?.nama ?? ''}`} keterangan="Sarana dan prasarana SD Muhammadiyah 01 Kukusan" />
      {peran ? (
        <>
          <StatStrip
            items={[
              { label: 'Jenis barang', nilai: aset.data.length },
              { label: 'Total unit', nilai: total },
              { label: 'Perlu perbaikan', nilai: rusak },
              { label: 'Laporan aktif', nilai: laporanAktif },
              { label: 'Peminjaman aktif', nilai: pinjamAktif },
              { label: 'Menunggu pengembalian', nilai: menungguKembali },
            ]}
          />

          <div className="card-soft mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">Peran Anda</span>
              <Badge>{NAMA_PERAN[peran]}</Badge>
            </div>
          </div>

          <div className="mb-2 text-sm font-medium text-[#1a1d33]">Menu cepat</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {menu.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className="card-soft block p-4 transition hover:border-muh-300 hover:bg-muh-50/40"
              >
                <div className="font-medium text-muh-800">{m.judul}</div>
                <div className="mt-0.5 text-sm text-muted">{m.ket}</div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <Notice tipe="warn">Akun Anda belum memiliki akses ke aplikasi sarpras. Hubungi administrator.</Notice>
      )}
    </PageShell>
  )
}
