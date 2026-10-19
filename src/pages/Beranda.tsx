import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useKoleksi } from '../lib/useKoleksi'
import { NAMA_PERAN } from '../lib/peran'
import type { Aset, Kerusakan, Peminjaman, Pemeliharaan, Usulan } from '../lib/tipe'
import { jenisPinjam } from '../lib/tipe'
import { Badge, Notice, PageHeader, PageShell, StatStrip } from '../components/ui'

const pintasan: {
  to: string
  judul: string
  ket: string
  peran?: Array<'admin' | 'pimpinan' | 'guru' | 'petugas'>
}[] = [
  { to: '/aset', judul: 'Aset', ket: 'Daftar barang dan kondisi' },
  { to: '/ruang', judul: 'Ruang', ket: 'Ruang dan isi asetnya' },
  { to: '/kerusakan', judul: 'Kerusakan', ket: 'Lapor dan pantau perbaikan' },
  { to: '/peminjaman', judul: 'Peminjaman', ket: 'Pinjam ruang atau alat', peran: ['admin', 'pimpinan', 'guru'] },
  { to: '/pengembalian', judul: 'Pengembalian', ket: 'Kembalikan alat yang dipinjam', peran: ['admin', 'pimpinan', 'guru'] },
  { to: '/pemeliharaan', judul: 'Pemeliharaan', ket: 'Jadwal perawatan rutin' },
  { to: '/usulan', judul: 'Usulan', ket: 'Pengadaan dan perbaikan', peran: ['admin', 'pimpinan', 'guru'] },
  { to: '/pengaturan', judul: 'Pengaturan', ket: 'Kelola peran pengguna', peran: ['admin'] },
]

function hariIni() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function plusHari(yyyyMmDd: string, n: number) {
  const d = new Date(yyyyMmDd + 'T12:00:00')
  d.setDate(d.getDate() + n)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function Beranda() {
  const { profil, peran } = useAuth()
  const laporan = useKoleksi<Kerusakan>('sarpras_kerusakan')
  const aset = useKoleksi<Aset>('sarpras_aset')
  const pinjam = useKoleksi<Peminjaman>('sarpras_peminjaman')
  const rawat = useKoleksi<Pemeliharaan>('sarpras_pemeliharaan')
  const usulan = useKoleksi<Usulan>('sarpras_usulan')

  const hari = hariIni()
  const batasMinggu = plusHari(hari, 7)

  const total = aset.data.reduce((n, a) => n + a.jumlah, 0)
  const rusak = aset.data.filter((a) => a.kondisi !== 'baik').reduce((n, a) => n + a.jumlah, 0)
  const laporanAktif = laporan.data.filter((k) => k.status !== 'selesai').length
  const pinjamAktif = pinjam.data.filter(
    (p) => p.status === 'diajukan' || p.status === 'disetujui' || p.status === 'pengembalian',
  ).length
  const menungguKembali = pinjam.data.filter(
    (p) => jenisPinjam(p) === 'alat' && p.status === 'pengembalian',
  ).length

  const jadwalAktif = rawat.data.filter((p) => p.aktif !== false)
  const rawatTerlambat = jadwalAktif.filter((p) => p.jatuhTempo < hari).length
  const rawatDekat = jadwalAktif.filter((p) => p.jatuhTempo >= hari && p.jatuhTempo <= batasMinggu).length
  const usulanMenunggu = usulan.data.filter((u) => u.status === 'diajukan').length
  const usulanDisetujui = usulan.data.filter((u) => u.status === 'disetujui').length

  const menu = pintasan.filter((p) => !p.peran || (peran && p.peran.includes(peran)))

  const adaPerhatian =
    rawatTerlambat > 0 || rawatDekat > 0 || usulanMenunggu > 0 || laporanAktif > 0 || menungguKembali > 0

  return (
    <PageShell>
      <PageHeader
        judul={`Selamat datang, ${profil?.nama ?? ''}`}
        keterangan="Sarana dan prasarana SD Muhammadiyah 01 Kukusan"
      />
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

          <StatStrip
            items={[
              { label: 'Pemeliharaan terlambat', nilai: rawatTerlambat },
              { label: 'Jatuh tempo 7 hari', nilai: rawatDekat },
              { label: 'Usulan menunggu', nilai: usulanMenunggu },
              { label: 'Usulan disetujui', nilai: usulanDisetujui },
            ]}
          />

          {adaPerhatian && (
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {rawatTerlambat > 0 && (
                <Link
                  to="/pemeliharaan"
                  className="card-soft flex items-center justify-between gap-3 border-red-200 bg-red-50/60 p-3.5 transition hover:border-red-300"
                >
                  <div>
                    <div className="text-sm font-medium text-red-800">Pemeliharaan terlambat</div>
                    <div className="text-xs text-red-700/80">{rawatTerlambat} jadwal lewat jatuh tempo</div>
                  </div>
                  <span className="text-xs font-medium text-red-700">Lihat →</span>
                </Link>
              )}
              {rawatDekat > 0 && rawatTerlambat === 0 && (
                <Link
                  to="/pemeliharaan"
                  className="card-soft flex items-center justify-between gap-3 border-amber-200 bg-amber-50/60 p-3.5 transition hover:border-amber-300"
                >
                  <div>
                    <div className="text-sm font-medium text-amber-900">Jatuh tempo minggu ini</div>
                    <div className="text-xs text-amber-800/80">{rawatDekat} jadwal dalam 7 hari</div>
                  </div>
                  <span className="text-xs font-medium text-amber-800">Lihat →</span>
                </Link>
              )}
              {usulanMenunggu > 0 && (peran === 'admin' || peran === 'pimpinan') && (
                <Link
                  to="/usulan"
                  className="card-soft flex items-center justify-between gap-3 border-amber-200 bg-amber-50/60 p-3.5 transition hover:border-amber-300"
                >
                  <div>
                    <div className="text-sm font-medium text-amber-900">Usulan menunggu keputusan</div>
                    <div className="text-xs text-amber-800/80">{usulanMenunggu} usulan diajukan</div>
                  </div>
                  <span className="text-xs font-medium text-amber-800">Lihat →</span>
                </Link>
              )}
              {menungguKembali > 0 && (peran === 'admin' || peran === 'pimpinan' || peran === 'guru') && (
                <Link
                  to="/pengembalian"
                  className="card-soft flex items-center justify-between gap-3 border-muh-200 bg-muh-50/50 p-3.5 transition hover:border-muh-300"
                >
                  <div>
                    <div className="text-sm font-medium text-muh-900">Menunggu pengembalian alat</div>
                    <div className="text-xs text-muh-800/80">{menungguKembali} pengajuan pengembalian</div>
                  </div>
                  <span className="text-xs font-medium text-muh-800">Lihat →</span>
                </Link>
              )}
              {laporanAktif > 0 && (
                <Link
                  to="/kerusakan"
                  className="card-soft flex items-center justify-between gap-3 border-border p-3.5 transition hover:border-muh-300"
                >
                  <div>
                    <div className="text-sm font-medium text-[#1a1d33]">Laporan kerusakan aktif</div>
                    <div className="text-xs text-muted">{laporanAktif} belum selesai</div>
                  </div>
                  <span className="text-xs font-medium text-muh-700">Lihat →</span>
                </Link>
              )}
            </div>
          )}

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
