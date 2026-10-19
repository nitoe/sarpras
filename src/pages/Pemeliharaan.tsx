import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useKoleksi } from '../lib/useKoleksi'
import { catat, hapusDoc, simpanDoc } from '../lib/data'
import {
  PERIODE_PEMELIHARAAN, formatTanggal, namaPeriode,
  type Aset, type JenisPemeliharaan, type Pemeliharaan, type Ruang,
} from '../lib/tipe'
import { Field, Modal, Notice, PageHeader, StatStrip, btnDanger, btnGhost, btnPrimary, inputCls } from '../components/ui'

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

/** Majukan jatuh tempo sesuai periode, dari tanggal acuan (biasanya hari ini). */
function majukanTempo(dari: string, periode: string) {
  const d = new Date(dari + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return dari
  if (periode === 'mingguan') d.setDate(d.getDate() + 7)
  else if (periode === 'bulanan') d.setMonth(d.getMonth() + 1)
  else if (periode === 'triwulan') d.setMonth(d.getMonth() + 3)
  else if (periode === 'semester') d.setMonth(d.getMonth() + 6)
  else if (periode === 'tahunan') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatTglPendek(s?: string | null) {
  if (!s) return '—'
  const d = new Date(s + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isAktif(p: Pemeliharaan) {
  return p.aktif !== false
}

function isTerlambat(p: Pemeliharaan, hari: string) {
  return isAktif(p) && p.jatuhTempo < hari
}

function isJatuhTempoDekat(p: Pemeliharaan, hari: string, batas: string) {
  return isAktif(p) && p.jatuhTempo >= hari && p.jatuhTempo <= batas
}

interface FormJadwal {
  jenis: JenisPemeliharaan
  ruangId: string
  asetId: string
  kegiatan: string
  periode: string
  jatuhTempo: string
  catatan: string
  aktif: boolean
}

const formKosong = (): FormJadwal => ({
  jenis: 'ruang',
  ruangId: '',
  asetId: '',
  kegiatan: '',
  periode: 'bulanan',
  jatuhTempo: hariIni(),
  catatan: '',
  aktif: true,
})

export default function PemeliharaanPage() {
  const { user, profil, peran } = useAuth()
  const admin = peran === 'admin'
  const petugas = peran === 'petugas' || admin
  const jadwal = useKoleksi<Pemeliharaan>('sarpras_pemeliharaan')
  const ruang = useKoleksi<Ruang>('sarpras_ruang')
  const aset = useKoleksi<Aset>('sarpras_aset')

  const [fStatus, setFStatus] = useState<'aktif' | 'terlambat' | 'dekat' | 'nonaktif' | 'semua'>('aktif')
  const [fJenis, setFJenis] = useState('')
  const [fRuang, setFRuang] = useState('')
  const [baru, setBaru] = useState(false)
  const [edit, setEdit] = useState<{ id: string | null; f: FormJadwal } | null>(null)
  const [pilih, setPilih] = useState<Pemeliharaan | null>(null)

  const hari = hariIni()
  const batasMinggu = plusHari(hari, 7)

  const petaRuang = useMemo(() => new Map(ruang.data.map((r) => [r.id, r])), [ruang.data])
  const petaAset = useMemo(() => new Map(aset.data.map((a) => [a.id, a])), [aset.data])
  const ruangUrut = useMemo(
    () => [...ruang.data].sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true })),
    [ruang.data],
  )
  const asetUrut = useMemo(
    () => [...aset.data].sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    [aset.data],
  )

  const ringkas = useMemo(() => {
    const aktif = jadwal.data.filter(isAktif)
    return {
      total: aktif.length,
      terlambat: aktif.filter((p) => isTerlambat(p, hari)).length,
      dekat: aktif.filter((p) => isJatuhTempoDekat(p, hari, batasMinggu)).length,
      nonaktif: jadwal.data.filter((p) => !isAktif(p)).length,
    }
  }, [jadwal.data, hari, batasMinggu])

  const tampil = useMemo(() => {
    return jadwal.data
      .filter((p) => {
        if (fStatus === 'aktif') return isAktif(p)
        if (fStatus === 'terlambat') return isTerlambat(p, hari)
        if (fStatus === 'dekat') return isJatuhTempoDekat(p, hari, batasMinggu) || isTerlambat(p, hari)
        if (fStatus === 'nonaktif') return !isAktif(p)
        return true
      })
      .filter((p) => !fJenis || p.jenis === fJenis)
      .filter((p) => {
        if (!fRuang) return true
        if (p.jenis === 'ruang') return p.ruangId === fRuang
        const a = p.asetId ? petaAset.get(p.asetId) : undefined
        return a?.ruangId === fRuang
      })
      .sort((a, b) => a.jatuhTempo.localeCompare(b.jatuhTempo))
  }, [jadwal.data, fStatus, fJenis, fRuang, hari, batasMinggu, petaAset])

  function labelSasaran(p: Pemeliharaan) {
    if (p.jenis === 'aset') {
      const a = p.asetId ? petaAset.get(p.asetId) : undefined
      return a ? `${a.nama} (${a.kode})` : 'Aset dihapus'
    }
    const r = p.ruangId ? petaRuang.get(p.ruangId) : undefined
    return r ? `${r.kode} — ${r.nama}` : 'Ruang dihapus'
  }

  function bukaTambah() {
    setEdit({
      id: null,
      f: {
        ...formKosong(),
        ruangId: ruangUrut[0]?.id ?? '',
        asetId: asetUrut[0]?.id ?? '',
      },
    })
    setBaru(true)
    setPilih(null)
  }

  function bukaUbah(p: Pemeliharaan) {
    setEdit({
      id: p.id,
      f: {
        jenis: p.jenis,
        ruangId: p.ruangId ?? '',
        asetId: p.asetId ?? '',
        kegiatan: p.kegiatan,
        periode: p.periode,
        jatuhTempo: p.jatuhTempo,
        catatan: p.catatan ?? '',
        aktif: p.aktif !== false,
      },
    })
    setBaru(true)
    setPilih(null)
  }

  const terpilih = pilih ? (jadwal.data.find((x) => x.id === pilih.id) ?? pilih) : null

  return (
    <div className="w-full">
      <PageHeader
        judul="Pemeliharaan"
        keterangan="Jadwal perawatan rutin ruang dan aset"
        aksi={admin ? <button className={btnPrimary} onClick={bukaTambah}>Tambah jadwal</button> : undefined}
      />
      {(jadwal.galat || ruang.galat || aset.galat) && (
        <Notice tipe="error">{jadwal.galat || ruang.galat || aset.galat}</Notice>
      )}

      <StatStrip
        items={[
          { label: 'Jadwal aktif', nilai: ringkas.total },
          { label: 'Terlambat', nilai: ringkas.terlambat },
          { label: '7 hari ke depan', nilai: ringkas.dekat },
          { label: 'Nonaktif', nilai: ringkas.nonaktif },
        ]}
      />

      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <select className={inputCls} value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)}>
          <option value="aktif">Aktif saja</option>
          <option value="terlambat">Terlambat</option>
          <option value="dekat">Jatuh tempo ≤ 7 hari</option>
          <option value="nonaktif">Nonaktif</option>
          <option value="semua">Semua</option>
        </select>
        <select className={inputCls} value={fJenis} onChange={(e) => setFJenis(e.target.value)}>
          <option value="">Semua jenis</option>
          <option value="ruang">Ruangan</option>
          <option value="aset">Aset</option>
        </select>
        <select className={inputCls} value={fRuang} onChange={(e) => setFRuang(e.target.value)}>
          <option value="">Semua ruang</option>
          {ruangUrut.map((r) => (
            <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>
          ))}
        </select>
      </div>

      {jadwal.loading ? (
        <p className="text-sm text-muted">Memuat…</p>
      ) : tampil.length === 0 ? (
        <div className="card-soft p-6 text-sm text-muted">
          {jadwal.data.length === 0
            ? admin
              ? 'Belum ada jadwal pemeliharaan. Tambah jadwal pertama untuk ruang atau aset.'
              : 'Belum ada jadwal pemeliharaan.'
            : 'Tidak ada jadwal yang cocok dengan filter.'}
        </div>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Jatuh tempo</th>
                <th className="px-4 py-2.5 font-medium">Kegiatan</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Sasaran</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Periode</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((p) => {
                const terlambat = isTerlambat(p, hari)
                const dekat = isJatuhTempoDekat(p, hari, batasMinggu)
                return (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2"
                    onClick={() => setPilih(p)}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className={terlambat ? 'font-medium text-red-700' : dekat ? 'font-medium text-amber-800' : 'text-muted'}>
                        {formatTglPendek(p.jatuhTempo)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{p.kegiatan}</td>
                    <td className="hidden px-4 py-2.5 text-muted md:table-cell">{labelSasaran(p)}</td>
                    <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{namaPeriode(p.periode)}</td>
                    <td className="px-4 py-2.5">
                      {!isAktif(p) ? (
                        <span className="inline-flex rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">Nonaktif</span>
                      ) : terlambat ? (
                        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">Terlambat</span>
                      ) : dekat ? (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">Segera</span>
                      ) : (
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Aktif</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {baru && edit && (
        <Modal judul={edit.id ? 'Ubah jadwal' : 'Tambah jadwal'} onTutup={() => { setBaru(false); setEdit(null) }}>
          <FormJadwalModal
            f={edit.f}
            id={edit.id}
            ruang={ruangUrut}
            aset={asetUrut}
            profil={profil}
            onTutup={() => { setBaru(false); setEdit(null) }}
          />
        </Modal>
      )}

      {terpilih && (
        <Modal judul="Detail pemeliharaan" onTutup={() => setPilih(null)}>
          <DetailJadwal
            p={terpilih}
            labelSasaran={labelSasaran(terpilih)}
            admin={admin}
            petugas={petugas}
            uid={user?.uid}
            nama={profil?.nama ?? ''}
            profil={profil}
            onTutup={() => setPilih(null)}
            onUbah={() => bukaUbah(terpilih)}
          />
        </Modal>
      )}
    </div>
  )
}

function FormJadwalModal(props: {
  f: FormJadwal
  id: string | null
  ruang: Ruang[]
  aset: Aset[]
  profil: ReturnType<typeof useAuth>['profil']
  onTutup: () => void
}) {
  const { id, ruang, aset, profil, onTutup } = props
  const [f, setF] = useState(props.f)
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)

  const set = (p: Partial<FormJadwal>) => setF((prev) => ({ ...prev, ...p }))

  async function simpan(e: FormEvent) {
    e.preventDefault()
    const kegiatan = f.kegiatan.trim()
    if (!kegiatan) return setGalat('Kegiatan wajib diisi.')
    if (!f.jatuhTempo) return setGalat('Jatuh tempo wajib diisi.')
    if (f.jenis === 'ruang' && !f.ruangId) return setGalat('Pilih ruang.')
    if (f.jenis === 'aset' && !f.asetId) return setGalat('Pilih aset.')

    setProses(true)
    setGalat('')
    try {
      const data: Record<string, unknown> = {
        jenis: f.jenis,
        kegiatan,
        periode: f.periode,
        jatuhTempo: f.jatuhTempo,
        catatan: f.catatan.trim(),
        aktif: f.aktif,
        ruangId: f.jenis === 'ruang' ? f.ruangId : null,
        asetId: f.jenis === 'aset' ? f.asetId : null,
      }
      if (!id) data.createdBy = profil?.uid ?? null
      const docId = await simpanDoc('sarpras_pemeliharaan', id, data)
      await catat(profil, id ? 'ubah' : 'tambah', 'sarpras_pemeliharaan', docId)
      onTutup()
    } catch {
      setGalat('Gagal menyimpan. Periksa koneksi atau hak akses Anda.')
    } finally {
      setProses(false)
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-3.5">
      {galat && <Notice tipe="error">{galat}</Notice>}
      <Field label="Jenis sasaran">
        <div className="flex gap-2">
          <button type="button" className={f.jenis === 'ruang' ? btnPrimary : btnGhost} onClick={() => set({ jenis: 'ruang' })}>
            Ruangan
          </button>
          <button type="button" className={f.jenis === 'aset' ? btnPrimary : btnGhost} onClick={() => set({ jenis: 'aset' })}>
            Aset
          </button>
        </div>
      </Field>
      {f.jenis === 'ruang' ? (
        <Field label="Ruang">
          <select className={inputCls} value={f.ruangId} onChange={(e) => set({ ruangId: e.target.value })}>
            {ruang.length === 0 && <option value="">— belum ada ruang —</option>}
            {ruang.map((r) => (
              <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="Aset">
          <select className={inputCls} value={f.asetId} onChange={(e) => set({ asetId: e.target.value })}>
            {aset.length === 0 && <option value="">— belum ada aset —</option>}
            {aset.map((a) => (
              <option key={a.id} value={a.id}>{a.nama} ({a.kode})</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Kegiatan">
        <input className={inputCls} value={f.kegiatan} onChange={(e) => set({ kegiatan: e.target.value })} placeholder="Mis. cek AC, bersihkan talang, servis printer" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Periode">
          <select className={inputCls} value={f.periode} onChange={(e) => set({ periode: e.target.value })}>
            {PERIODE_PEMELIHARAAN.map((p) => (
              <option key={p.v} value={p.v}>{p.l}</option>
            ))}
          </select>
        </Field>
        <Field label="Jatuh tempo berikutnya">
          <input className={inputCls} type="date" value={f.jatuhTempo} onChange={(e) => set({ jatuhTempo: e.target.value })} />
        </Field>
      </div>
      <Field label="Catatan (opsional)">
        <textarea className={inputCls} rows={2} value={f.catatan} onChange={(e) => set({ catatan: e.target.value })} />
      </Field>
      {id && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.aktif} onChange={(e) => set({ aktif: e.target.checked })} />
          Jadwal aktif
        </label>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" className={btnPrimary} disabled={proses}>
          {proses ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button type="button" className={btnGhost} onClick={onTutup}>Batal</button>
      </div>
    </form>
  )
}

function DetailJadwal(props: {
  p: Pemeliharaan
  labelSasaran: string
  admin: boolean
  petugas: boolean
  uid?: string
  nama: string
  profil: ReturnType<typeof useAuth>['profil']
  onTutup: () => void
  onUbah: () => void
}) {
  const { p, labelSasaran, admin, petugas, uid, nama, profil, onTutup, onUbah } = props
  const [catatan, setCatatan] = useState(p.catatan ?? '')
  const [majuOtomatis, setMajuOtomatis] = useState(true)
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false)

  const hari = hariIni()
  const terlambat = isTerlambat(p, hari)

  async function tandaiSelesai(e: FormEvent) {
    e.preventDefault()
    setGalat('')
    setProses(true)
    try {
      const data: Record<string, unknown> = {
        terakhirDilakukan: hari,
        catatan: catatan.trim(),
        petugasUid: uid ?? null,
        petugasNama: nama,
      }
      if (majuOtomatis) {
        data.jatuhTempo = majukanTempo(hari, p.periode)
      }
      await simpanDoc('sarpras_pemeliharaan', p.id, data)
      await catat(profil, 'selesai', 'sarpras_pemeliharaan', p.id)
      onTutup()
    } catch {
      setGalat('Gagal menyimpan. Periksa koneksi atau hak akses Anda.')
    } finally {
      setProses(false)
    }
  }

  async function hapus() {
    setProses(true)
    try {
      await hapusDoc('sarpras_pemeliharaan', p.id)
      await catat(profil, 'hapus', 'sarpras_pemeliharaan', p.id)
      onTutup()
    } catch {
      setGalat('Gagal menghapus.')
    } finally {
      setProses(false)
    }
  }

  const baris: [string, string][] = [
    ['Sasaran', `${p.jenis === 'aset' ? 'Aset' : 'Ruang'}: ${labelSasaran}`],
    ['Periode', namaPeriode(p.periode)],
    ['Jatuh tempo', formatTglPendek(p.jatuhTempo)],
    ['Terakhir dilakukan', formatTglPendek(p.terakhirDilakukan)],
    ['Oleh', p.petugasNama || '—'],
    ['Dibuat', formatTanggal(p.createdAt)],
  ]

  return (
    <div className="space-y-3">
      <div>
        {!isAktif(p) ? (
          <span className="inline-flex rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">Nonaktif</span>
        ) : terlambat ? (
          <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">Terlambat</span>
        ) : (
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Aktif</span>
        )}
      </div>
      <p className="text-base font-medium text-[#1a1d33]">{p.kegiatan}</p>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        {baris.map(([a, b]) => (
          <div key={a} className="contents">
            <dt className="text-muted">{a}</dt>
            <dd>{b}</dd>
          </div>
        ))}
      </dl>
      {p.catatan && <p className="rounded-lg bg-surface-2 p-3 text-sm">{p.catatan}</p>}

      {galat && <Notice tipe="error">{galat}</Notice>}

      {petugas && isAktif(p) && (
        <form onSubmit={tandaiSelesai} className="space-y-3 border-t border-border pt-3">
          <div className="text-sm font-medium text-[#1a1d33]">Tandai sudah dikerjakan</div>
          <Field label="Catatan (opsional)">
            <textarea
              className={inputCls}
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Kondisi setelah dikerjakan…"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={majuOtomatis} onChange={(e) => setMajuOtomatis(e.target.checked)} />
            Majukan jatuh tempo otomatis (+{namaPeriode(p.periode).toLowerCase()})
          </label>
          {majuOtomatis && (
            <p className="text-xs text-muted">
              Jatuh tempo berikutnya: <span className="font-medium text-[#1a1d33]">{formatTglPendek(majukanTempo(hari, p.periode))}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={btnPrimary} disabled={proses}>
              {proses ? 'Menyimpan…' : 'Tandai selesai'}
            </button>
            <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
          </div>
        </form>
      )}

      {admin && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <button type="button" className={btnGhost} onClick={onUbah}>Ubah jadwal</button>
          {konfirmasiHapus ? (
            <>
              <span className="text-sm">Hapus jadwal ini?</span>
              <button type="button" className={btnDanger} disabled={proses} onClick={() => void hapus()}>Ya, hapus</button>
              <button type="button" className={btnGhost} onClick={() => setKonfirmasiHapus(false)}>Batal</button>
            </>
          ) : (
            <button type="button" className={btnDanger} onClick={() => setKonfirmasiHapus(true)}>Hapus</button>
          )}
          {!petugas && (
            <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
          )}
        </div>
      )}

      {!petugas && !admin && (
        <div className="pt-1">
          <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
        </div>
      )}
    </div>
  )
}
