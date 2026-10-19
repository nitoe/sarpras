import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useKoleksi } from '../lib/useKoleksi'
import { catat, simpanDoc } from '../lib/data'
import {
  formatRentang, formatTanggal, jenisPinjam, namaKategori, namaStatusPeminjaman,
  type Aset, type Peminjaman,
} from '../lib/tipe'
import { Field, Modal, Notice, PageHeader, StatStrip, btnGhost, btnPrimary, inputCls } from '../components/ui'

const gayaStatus: Record<string, string> = {
  disetujui: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pengembalian: 'border-amber-200 bg-amber-50 text-amber-800',
  selesai: 'border-muh-200 bg-muh-50 text-muh-700',
}

function LencanaStatus({ v }: { v: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${gayaStatus[v] ?? 'border-border bg-surface-2 text-muted'}`}>
      {namaStatusPeminjaman(v)}
    </span>
  )
}

const detik = (p: Peminjaman) => {
  const t = new Date(p.selesai).getTime()
  return Number.isNaN(t) ? 0 : t
}

export default function PengembalianPage() {
  const { user, peran } = useAuth()
  const admin = peran === 'admin'
  const pinjam = useKoleksi<Peminjaman>('sarpras_peminjaman')
  const aset = useKoleksi<Aset>('sarpras_aset')

  const [tab, setTab] = useState<'aktif' | 'menunggu' | 'riwayat'>('aktif')
  const [pilih, setPilih] = useState<Peminjaman | null>(null)

  const petaAset = useMemo(() => new Map(aset.data.map((a) => [a.id, a])), [aset.data])

  /** Alat yang sedang dipinjam (disetujui) — milik saya, atau semua bila admin. */
  const aktif = useMemo(
    () =>
      pinjam.data
        .filter((p) => jenisPinjam(p) === 'alat' && p.status === 'disetujui')
        .filter((p) => admin || p.peminjamUid === user?.uid)
        .sort((a, b) => detik(a) - detik(b)),
    [pinjam.data, admin, user?.uid],
  )

  /** Pengajuan pengembalian yang menunggu konfirmasi admin. */
  const menunggu = useMemo(
    () =>
      pinjam.data
        .filter((p) => jenisPinjam(p) === 'alat' && p.status === 'pengembalian')
        .filter((p) => admin || p.peminjamUid === user?.uid)
        .sort((a, b) => (b.updatedAt?.toDate().getTime() ?? 0) - (a.updatedAt?.toDate().getTime() ?? 0)),
    [pinjam.data, admin, user?.uid],
  )

  const riwayat = useMemo(
    () =>
      pinjam.data
        .filter((p) => jenisPinjam(p) === 'alat' && p.status === 'selesai')
        .filter((p) => admin || p.peminjamUid === user?.uid)
        .sort((a, b) => (b.updatedAt?.toDate().getTime() ?? 0) - (a.updatedAt?.toDate().getTime() ?? 0))
        .slice(0, 50),
    [pinjam.data, admin, user?.uid],
  )

  const daftar = tab === 'aktif' ? aktif : tab === 'menunggu' ? menunggu : riwayat
  const terpilih = pilih ? (pinjam.data.find((p) => p.id === pilih.id) ?? pilih) : null

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        judul="Pengembalian alat"
        keterangan={
          admin
            ? 'Konfirmasi pengembalian alat yang diajukan peminjam'
            : 'Ajukan pengembalian alat yang sedang Anda pinjam'
        }
      />
      {(pinjam.galat || aset.galat) && <Notice tipe="error">{pinjam.galat || aset.galat}</Notice>}

      <StatStrip
        items={[
          { label: 'Sedang dipinjam', nilai: aktif.length },
          { label: 'Menunggu konfirmasi', nilai: menunggu.length },
          { label: 'Sudah dikembalikan', nilai: riwayat.length },
          { label: '', nilai: '' },
        ]}
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            { id: 'aktif' as const, label: 'Sedang dipinjam', n: aktif.length },
            { id: 'menunggu' as const, label: 'Menunggu konfirmasi', n: menunggu.length },
            { id: 'riwayat' as const, label: 'Riwayat', n: riwayat.length },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? btnPrimary : btnGhost}
            onClick={() => setTab(t.id)}
          >
            {t.label}{t.n > 0 ? ` (${t.n})` : ''}
          </button>
        ))}
      </div>

      {pinjam.loading ? (
        <p className="text-sm text-muted">Memuat…</p>
      ) : daftar.length === 0 ? (
        <div className="card-soft space-y-2 p-6 text-sm text-muted">
          {tab === 'aktif' && (
            <>
              <p>Tidak ada alat yang sedang dipinjam{admin ? '' : ' atas nama Anda'}.</p>
              <p>
                <Link to="/peminjaman" className="font-medium text-muh-700 hover:underline">
                  Ajukan peminjaman alat
                </Link>{' '}
                dulu, lalu setelah disetujui Anda dapat mengajukan pengembalian di sini.
              </p>
            </>
          )}
          {tab === 'menunggu' && <p>Tidak ada pengajuan pengembalian yang menunggu konfirmasi.</p>}
          {tab === 'riwayat' && <p>Belum ada riwayat pengembalian alat.</p>}
        </div>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Alat</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Waktu pinjam</th>
                {admin && <th className="hidden px-4 py-2.5 font-medium md:table-cell">Peminjam</th>}
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="w-px px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => {
                const a = p.asetId ? petaAset.get(p.asetId) : undefined
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{a?.nama ?? 'Alat dihapus'}</div>
                      <div className="text-xs text-muted">
                        {a ? `${a.kode} · ${namaKategori(a.kategori)}` : '—'}
                        {p.jumlahPinjam && p.jumlahPinjam > 1 ? ` · ${p.jumlahPinjam} unit` : ''}
                      </div>
                    </td>
                    <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{formatRentang(p.mulai, p.selesai)}</td>
                    {admin && <td className="hidden px-4 py-2.5 text-muted md:table-cell">{p.peminjamNama}</td>}
                    <td className="px-4 py-2.5"><LencanaStatus v={p.status} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        className="text-xs font-medium text-muh-700 hover:underline"
                        onClick={() => setPilih(p)}
                      >
                        {p.status === 'disetujui' && (admin || p.peminjamUid === user?.uid)
                          ? 'Ajukan pengembalian'
                          : p.status === 'pengembalian' && admin
                            ? 'Konfirmasi'
                            : 'Detail'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {terpilih && (
        <Modal
          judul={
            terpilih.status === 'disetujui'
              ? 'Ajukan pengembalian alat'
              : terpilih.status === 'pengembalian'
                ? 'Konfirmasi pengembalian'
                : 'Detail pengembalian'
          }
          onTutup={() => setPilih(null)}
        >
          <DetailPengembalian
            p={terpilih}
            aset={terpilih.asetId ? petaAset.get(terpilih.asetId) : undefined}
            admin={admin}
            uid={user?.uid}
            onTutup={() => setPilih(null)}
          />
        </Modal>
      )}
    </div>
  )
}

function DetailPengembalian(props: {
  p: Peminjaman
  aset?: Aset
  admin: boolean
  uid?: string
  onTutup: () => void
}) {
  const { p, aset, admin, uid, onTutup } = props
  const { profil } = useAuth()
  const [catatan, setCatatan] = useState(p.catatanPengembalian ?? '')
  const [catatanAdmin, setCatatanAdmin] = useState(p.catatanAdmin ?? '')
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)

  const milikSaya = p.peminjamUid === uid
  const bisaAjukan = milikSaya && p.status === 'disetujui' && jenisPinjam(p) === 'alat'
  const bisaKonfirmasi = admin && p.status === 'pengembalian'

  async function ajukan(e: FormEvent) {
    e.preventDefault()
    setGalat('')
    setProses(true)
    try {
      // Hanya status + catatanPengembalian (+ updatedAt dari simpanDoc) — sesuai rules.
      await simpanDoc('sarpras_peminjaman', p.id, {
        status: 'pengembalian',
        catatanPengembalian: catatan.trim(),
      })
      await catat(profil, 'ajukan_pengembalian', 'sarpras_peminjaman', p.id)
      onTutup()
    } catch {
      setGalat('Gagal mengajukan pengembalian. Periksa koneksi atau hak akses Anda.')
    } finally {
      setProses(false)
    }
  }

  async function konfirmasi(aksi: 'selesai' | 'disetujui') {
    setGalat('')
    setProses(true)
    try {
      await simpanDoc('sarpras_peminjaman', p.id, {
        status: aksi,
        catatanAdmin: catatanAdmin.trim(),
      })
      await catat(profil, aksi === 'selesai' ? 'konfirmasi_pengembalian' : 'tolak_pengembalian', 'sarpras_peminjaman', p.id)
      onTutup()
    } catch {
      setGalat('Gagal menyimpan. Periksa koneksi atau hak akses Anda.')
    } finally {
      setProses(false)
    }
  }

  const baris: [string, string][] = [
    ['Alat', aset ? `${aset.nama} (${aset.kode})` : 'Alat sudah dihapus'],
    ['Jumlah', String(p.jumlahPinjam ?? 1)],
    ['Peminjam', p.peminjamNama || '—'],
    ['Waktu pinjam', formatRentang(p.mulai, p.selesai)],
    ['Diajukan', formatTanggal(p.createdAt)],
  ]
  if (aset) baris.splice(1, 0, ['Kategori', namaKategori(aset.kategori)])

  return (
    <div className="space-y-3">
      <div><LencanaStatus v={p.status} /></div>
      <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        {baris.map(([a, b]) => (
          <div key={a} className="contents">
            <dt className="text-muted">{a}</dt>
            <dd>{b}</dd>
          </div>
        ))}
      </dl>
      <p className="rounded-lg bg-surface-2 p-3 text-sm">
        <span className="text-muted">Keperluan: </span>{p.keperluan}
      </p>
      {p.catatanPengembalian && p.status !== 'disetujui' && (
        <p className="text-sm">
          <span className="text-muted">Catatan pengembalian: </span>{p.catatanPengembalian}
        </p>
      )}
      {p.catatanAdmin && (
        <p className="text-sm">
          <span className="text-muted">Catatan admin: </span>{p.catatanAdmin}
        </p>
      )}

      {galat && <Notice tipe="error">{galat}</Notice>}

      {bisaAjukan && (
        <form onSubmit={ajukan} className="space-y-3 border-t border-border pt-3">
          <Notice tipe="info">
            Setelah diajukan, admin akan memeriksa dan mengonfirmasi bahwa alat sudah dikembalikan.
          </Notice>
          <Field label="Catatan pengembalian (opsional)" hint="Mis. kondisi alat, kelengkapan, lokasi penyerahan.">
            <textarea
              className={inputCls}
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Alat lengkap dan berfungsi baik…"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={btnPrimary} disabled={proses}>
              {proses ? 'Mengirim…' : 'Ajukan pengembalian'}
            </button>
            <button type="button" className={btnGhost} onClick={onTutup}>Batal</button>
          </div>
        </form>
      )}

      {bisaKonfirmasi && (
        <div className="space-y-3 border-t border-border pt-3">
          <Field label="Catatan admin (opsional)">
            <textarea
              className={inputCls}
              rows={2}
              value={catatanAdmin}
              onChange={(e) => setCatatanAdmin(e.target.value)}
              placeholder="Diterima lengkap / ada kekurangan…"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={proses}
              onClick={() => void konfirmasi('selesai')}
            >
              {proses ? '…' : 'Konfirmasi diterima'}
            </button>
            <button
              type="button"
              className={btnGhost}
              disabled={proses}
              onClick={() => void konfirmasi('disetujui')}
            >
              Tolak (masih dipinjam)
            </button>
            <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
          </div>
        </div>
      )}

      {!bisaAjukan && !bisaKonfirmasi && (
        <div className="pt-1">
          <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
        </div>
      )}
    </div>
  )
}
