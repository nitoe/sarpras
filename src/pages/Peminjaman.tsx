import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useKoleksi } from '../lib/useKoleksi'
import { catat, simpanDoc } from '../lib/data'
import {
  STATUS_PEMINJAMAN, bentrokJadwal, formatRentang, formatTanggal, namaStatusPeminjaman,
  type Peminjaman, type Ruang, type StatusPeminjaman,
} from '../lib/tipe'
import { Field, Modal, Notice, PageHeader, StatStrip, btnDanger, btnGhost, btnPrimary, inputCls } from '../components/ui'

const gayaStatus: Record<string, string> = {
  diajukan: 'border-amber-200 bg-amber-50 text-amber-800',
  disetujui: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ditolak: 'border-red-200 bg-red-50 text-red-700',
  selesai: 'border-muh-200 bg-muh-50 text-muh-700',
  dibatalkan: 'border-border bg-surface-2 text-muted',
}

function LencanaStatus({ v }: { v: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${gayaStatus[v] ?? ''}`}>
      {namaStatusPeminjaman(v)}
    </span>
  )
}

const detik = (p: Peminjaman) => {
  const t = new Date(p.mulai).getTime()
  return Number.isNaN(t) ? (p.createdAt?.toDate().getTime() ?? 0) : t
}

/** Nilai default datetime-local: sekarang dibulatkan ke jam berikutnya. */
function defaultMulai() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return keLokal(d)
}

function defaultSelesai(mulai: string) {
  const d = new Date(mulai)
  if (Number.isNaN(d.getTime())) return mulai
  d.setHours(d.getHours() + 2)
  return keLokal(d)
}

function keLokal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function PeminjamanPage() {
  const { user, peran } = useAuth()
  const admin = peran === 'admin'
  const pinjam = useKoleksi<Peminjaman>('sarpras_peminjaman')
  const ruang = useKoleksi<Ruang>('sarpras_ruang')

  const [fStatus, setFStatus] = useState('aktif')
  const [fRuang, setFRuang] = useState('')
  const [saya, setSaya] = useState(false)
  const [baru, setBaru] = useState(false)
  const [pilih, setPilih] = useState<Peminjaman | null>(null)

  const petaRuang = useMemo(() => new Map(ruang.data.map((r) => [r.id, r])), [ruang.data])
  const ruangUrut = useMemo(() => [...ruang.data].sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true })), [ruang.data])

  const hitung = (s: StatusPeminjaman) => pinjam.data.filter((p) => p.status === s).length

  const tampil = useMemo(
    () =>
      pinjam.data
        .filter((p) => {
          if (fStatus === 'aktif') return p.status === 'diajukan' || p.status === 'disetujui'
          if (fStatus === 'semua') return true
          return p.status === fStatus
        })
        .filter((p) => !fRuang || p.ruangId === fRuang)
        .filter((p) => !saya || p.peminjamUid === user?.uid)
        .sort((a, b) => detik(b) - detik(a)),
    [pinjam.data, fStatus, fRuang, saya, user?.uid],
  )

  const terpilih = pilih ? (pinjam.data.find((p) => p.id === pilih.id) ?? pilih) : null

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        judul="Peminjaman"
        keterangan="Ajukan dan kelola peminjaman ruangan"
        aksi={<button className={btnPrimary} onClick={() => setBaru(true)}>Ajukan peminjaman</button>}
      />
      {(pinjam.galat || ruang.galat) && <Notice tipe="error">{pinjam.galat || ruang.galat}</Notice>}

      <StatStrip
        items={[
          { label: 'Diajukan', nilai: hitung('diajukan') },
          { label: 'Disetujui', nilai: hitung('disetujui') },
          { label: 'Selesai', nilai: hitung('selesai') },
          { label: 'Ditolak / batal', nilai: hitung('ditolak') + hitung('dibatalkan') },
        ]}
      />

      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <select className={inputCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="aktif">Aktif (diajukan & disetujui)</option>
          <option value="semua">Semua status</option>
          {STATUS_PEMINJAMAN.map((s) => (
            <option key={s.v} value={s.v}>{s.l}</option>
          ))}
        </select>
        <select className={inputCls} value={fRuang} onChange={(e) => setFRuang(e.target.value)}>
          <option value="">Semua ruang</option>
          {ruangUrut.map((r) => (
            <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={saya} onChange={(e) => setSaya(e.target.checked)} />
          Peminjaman saya saja
        </label>
      </div>

      {pinjam.loading ? (
        <p className="text-sm text-muted">Memuat…</p>
      ) : tampil.length === 0 ? (
        <div className="card-soft p-6 text-sm text-muted">
          {pinjam.data.length === 0
            ? 'Belum ada peminjaman. Ajukan peminjaman ruangan untuk kegiatan sekolah.'
            : 'Tidak ada peminjaman yang cocok dengan filter.'}
        </div>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Waktu</th>
                <th className="px-4 py-2.5 font-medium">Ruang</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Keperluan</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Peminjam</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2"
                  onClick={() => setPilih(p)}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatRentang(p.mulai, p.selesai)}</td>
                  <td className="px-4 py-2.5 font-medium">{petaRuang.get(p.ruangId)?.nama ?? '—'}</td>
                  <td className="hidden max-w-xs truncate px-4 py-2.5 text-muted md:table-cell">{p.keperluan}</td>
                  <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{p.peminjamNama}</td>
                  <td className="px-4 py-2.5"><LencanaStatus v={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {baru && (
        <Modal judul="Ajukan peminjaman ruangan" onTutup={() => setBaru(false)}>
          <FormAjukan
            ruang={ruangUrut}
            semua={pinjam.data}
            onSelesai={() => setBaru(false)}
          />
        </Modal>
      )}

      {terpilih && (
        <Modal judul="Detail peminjaman" onTutup={() => setPilih(null)}>
          <DetailPinjam
            p={terpilih}
            ruang={petaRuang.get(terpilih.ruangId)}
            semua={pinjam.data}
            admin={admin}
            uid={user?.uid}
            onTutup={() => setPilih(null)}
          />
        </Modal>
      )}
    </div>
  )
}

function FormAjukan({
  ruang,
  semua,
  onSelesai,
}: {
  ruang: Ruang[]
  semua: Peminjaman[]
  onSelesai: () => void
}) {
  const { user, profil } = useAuth()
  const [ruangId, setRuangId] = useState(ruang[0]?.id ?? '')
  const [mulai, setMulai] = useState(defaultMulai)
  const [selesai, setSelesai] = useState(() => defaultSelesai(defaultMulai()))
  const [keperluan, setKeperluan] = useState('')
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)

  const bentrok = useMemo(() => {
    if (!ruangId || !mulai || !selesai) return [] as Peminjaman[]
    return semua.filter(
      (p) =>
        p.ruangId === ruangId &&
        (p.status === 'diajukan' || p.status === 'disetujui') &&
        bentrokJadwal(mulai, selesai, p.mulai, p.selesai),
    )
  }, [semua, ruangId, mulai, selesai])

  async function kirim(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!ruangId) return setGalat('Pilih ruang.')
    const t0 = new Date(mulai).getTime()
    const t1 = new Date(selesai).getTime()
    if (Number.isNaN(t0) || Number.isNaN(t1)) return setGalat('Waktu mulai dan selesai tidak valid.')
    if (t1 <= t0) return setGalat('Waktu selesai harus setelah waktu mulai.')
    if (t0 < Date.now() - 5 * 60 * 1000) return setGalat('Waktu mulai tidak boleh di masa lalu.')
    if (keperluan.trim().length < 5) return setGalat('Jelaskan keperluan (minimal 5 huruf).')
    if (bentrok.some((p) => p.status === 'disetujui')) {
      return setGalat('Ruang sudah dipesan pada waktu tersebut (ada peminjaman yang disetujui). Pilih waktu lain.')
    }

    setProses(true)
    setGalat('')
    try {
      const id = await simpanDoc('sarpras_peminjaman', null, {
        ruangId,
        keperluan: keperluan.trim(),
        mulai,
        selesai,
        status: 'diajukan',
        peminjamUid: user.uid,
        peminjamNama: profil?.nama ?? '',
      })
      await catat(profil, 'ajukan', 'sarpras_peminjaman', id)
      onSelesai()
    } catch {
      setGalat('Gagal mengajukan. Periksa koneksi atau hak akses Anda.')
    } finally {
      setProses(false)
    }
  }

  return (
    <form onSubmit={kirim} className="space-y-3.5">
      {galat && <Notice tipe="error">{galat}</Notice>}
      {ruang.length === 0 && (
        <Notice tipe="warn">Belum ada ruang yang terdaftar. Hubungi admin sarpras.</Notice>
      )}
      <Field label="Ruang">
        <select className={inputCls} value={ruangId} onChange={(e) => setRuangId(e.target.value)}>
          {ruang.map((r) => (
            <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Mulai">
          <input
            className={inputCls}
            type="datetime-local"
            value={mulai}
            onChange={(e) => {
              setMulai(e.target.value)
              if (new Date(selesai) <= new Date(e.target.value)) setSelesai(defaultSelesai(e.target.value))
            }}
          />
        </Field>
        <Field label="Selesai">
          <input
            className={inputCls}
            type="datetime-local"
            value={selesai}
            onChange={(e) => setSelesai(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Keperluan">
        <textarea
          className={inputCls}
          rows={3}
          value={keperluan}
          onChange={(e) => setKeperluan(e.target.value)}
          placeholder="Mis. Rapat wali kelas, latihan paduan suara…"
        />
      </Field>
      {bentrok.length > 0 && (
        <Notice tipe={bentrok.some((p) => p.status === 'disetujui') ? 'error' : 'warn'}>
          Ada {bentrok.length} pengajuan lain pada waktu yang sama untuk ruang ini
          {bentrok.some((p) => p.status === 'disetujui')
            ? ' (termasuk yang sudah disetujui — tidak bisa diajukan).'
            : ' (masih diajukan — admin akan memutuskan).'}
        </Notice>
      )}
      <div className="flex gap-2 pt-1">
        <button type="submit" className={btnPrimary} disabled={proses || ruang.length === 0}>
          {proses ? 'Mengirim…' : 'Ajukan'}
        </button>
        <button type="button" className={btnGhost} onClick={onSelesai}>Batal</button>
      </div>
    </form>
  )
}

function DetailPinjam(props: {
  p: Peminjaman
  ruang?: Ruang
  semua: Peminjaman[]
  admin: boolean
  uid?: string
  onTutup: () => void
}) {
  const { p, ruang, semua, admin, uid, onTutup } = props
  const { profil } = useAuth()
  const [catatanAdmin, setCatatanAdmin] = useState(p.catatanAdmin ?? '')
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)
  const [konfirmasiBatal, setKonfirmasiBatal] = useState(false)

  const milikSaya = p.peminjamUid === uid
  const bisaBatalkan = milikSaya && p.status === 'diajukan'
  const bisaKelola = admin && (p.status === 'diajukan' || p.status === 'disetujui')

  const bentrokDisetujui = useMemo(() => {
    if (p.status !== 'diajukan') return [] as Peminjaman[]
    return semua.filter(
      (x) =>
        x.id !== p.id &&
        x.ruangId === p.ruangId &&
        x.status === 'disetujui' &&
        bentrokJadwal(p.mulai, p.selesai, x.mulai, x.selesai),
    )
  }, [semua, p])

  async function ubahStatus(status: StatusPeminjaman) {
    setGalat('')
    setProses(true)
    try {
      if (status === 'dibatalkan') {
        // Aturan Firestore: peminjam hanya boleh mengubah status (+ updatedAt dari simpanDoc).
        await simpanDoc('sarpras_peminjaman', p.id, { status: 'dibatalkan' })
      } else {
        await simpanDoc('sarpras_peminjaman', p.id, {
          status,
          catatanAdmin: catatanAdmin.trim(),
        })
      }
      await catat(profil, `status:${status}`, 'sarpras_peminjaman', p.id)
      onTutup()
    } catch {
      setGalat('Gagal menyimpan. Periksa koneksi atau hak akses Anda.')
    } finally {
      setProses(false)
    }
  }

  const baris: [string, string][] = [
    ['Diajukan', formatTanggal(p.createdAt)],
    ['Peminjam', p.peminjamNama || '—'],
    ['Ruang', ruang ? `${ruang.kode} — ${ruang.nama}` : '—'],
    ['Waktu', formatRentang(p.mulai, p.selesai)],
  ]

  return (
    <div className="space-y-3">
      <div><LencanaStatus v={p.status} /></div>
      <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        {baris.map(([a, b]) => (
          <div key={a} className="contents">
            <dt className="text-muted">{a}</dt>
            <dd>{b}</dd>
          </div>
        ))}
      </dl>
      <p className="rounded-lg bg-surface-2 p-3 text-sm">{p.keperluan}</p>
      {p.catatanAdmin && (
        <p className="text-sm"><span className="text-muted">Catatan admin: </span>{p.catatanAdmin}</p>
      )}

      {galat && <Notice tipe="error">{galat}</Notice>}

      {bisaKelola && p.status === 'diajukan' && bentrokDisetujui.length > 0 && (
        <Notice tipe="warn">
          Ada {bentrokDisetujui.length} peminjaman yang sudah disetujui pada waktu yang sama.
          Menyetujui ini akan membuat jadwal bentrok.
        </Notice>
      )}

      {bisaKelola && (
        <div className="space-y-3 border-t border-border pt-3">
          <Field label="Catatan admin (opsional)">
            <textarea
              className={inputCls}
              rows={2}
              value={catatanAdmin}
              onChange={(e) => setCatatanAdmin(e.target.value)}
              placeholder="Alasan penolakan atau catatan lain…"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {p.status === 'diajukan' && (
              <>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={proses}
                  onClick={() => void ubahStatus('disetujui')}
                >
                  {proses ? '…' : 'Setujui'}
                </button>
                <button
                  type="button"
                  className={btnDanger}
                  disabled={proses}
                  onClick={() => void ubahStatus('ditolak')}
                >
                  Tolak
                </button>
              </>
            )}
            {p.status === 'disetujui' && (
              <button
                type="button"
                className={btnPrimary}
                disabled={proses}
                onClick={() => void ubahStatus('selesai')}
              >
                {proses ? '…' : 'Tandai selesai'}
              </button>
            )}
            <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
          </div>
        </div>
      )}

      {bisaBatalkan && !bisaKelola && (
        <div className="border-t border-border pt-3">
          {konfirmasiBatal ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">Batalkan pengajuan ini?</span>
              <button
                type="button"
                className={btnDanger}
                disabled={proses}
                onClick={() => void ubahStatus('dibatalkan')}
              >
                Ya, batalkan
              </button>
              <button type="button" className={btnGhost} onClick={() => setKonfirmasiBatal(false)}>Tidak</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnDanger} onClick={() => setKonfirmasiBatal(true)}>
                Batalkan pengajuan
              </button>
              <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
            </div>
          )}
        </div>
      )}

      {!bisaKelola && !bisaBatalkan && (
        <div className="pt-1">
          <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
        </div>
      )}
    </div>
  )
}
