import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { catat, hapusDoc, simpanDoc } from '../lib/data'
import { useDaftarKategori } from '../lib/kategori'
import { useDaftarSumber } from '../lib/sumber'
import { KATEGORI_BAWAAN, SUMBER_BAWAAN, type Kategori, type SumberDana } from '../lib/tipe'
import { Field, Notice, PageHeader, btnDanger, btnGhost, btnPrimary, inputCls } from '../components/ui'

type Tab = 'kategori' | 'sumber'

export default function MasterDataPage() {
  const { profil, peran } = useAuth()
  const admin = peran === 'admin'
  const [tab, setTab] = useState<Tab>('kategori')

  if (!admin) {
    return (
      <div className="w-full max-w-3xl">
        <PageHeader judul="Data master" keterangan="Kategori aset, sumber dana, dan master data lain" />
        <Notice tipe="warn">Hanya Admin Sarpras yang dapat membuka halaman ini.</Notice>
      </div>
    )
  }

  return (
    <div className="w-full">
      <PageHeader
        judul="Data master"
        keterangan="Kelola kategori aset, sumber dana, dan daftar dinamis lain yang dipakai form"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={tab === 'kategori' ? btnPrimary : btnGhost}
          onClick={() => setTab('kategori')}
        >
          Kategori aset
        </button>
        <button
          type="button"
          className={tab === 'sumber' ? btnPrimary : btnGhost}
          onClick={() => setTab('sumber')}
        >
          Sumber dana
        </button>
      </div>

      {tab === 'kategori' && <PanelKategori profil={profil} />}
      {tab === 'sumber' && <PanelSumber profil={profil} />}
    </div>
  )
}

function PanelKategori({ profil }: { profil: ReturnType<typeof useAuth>['profil'] }) {
  const kategori = useDaftarKategori()
  const [kode, setKode] = useState('')
  const [nama, setNama] = useState('')
  const [galat, setGalat] = useState('')
  const [ok, setOk] = useState('')
  const [proses, setProses] = useState(false)
  const [hapusId, setHapusId] = useState<string | null>(null)

  async function pastikanSeed() {
    if (kategori.dariFirestore) return
    for (const k of KATEGORI_BAWAAN) {
      await simpanDoc('sarpras_kategori', null, { kode: k.kode, nama: k.nama })
    }
  }

  async function simpan(e: FormEvent) {
    e.preventDefault()
    const kodeU = kode.trim().toUpperCase()
    const namaU = nama.trim()
    if (!/^[A-Z0-9]{2,8}$/.test(kodeU)) return setGalat('Kode 2–8 huruf/angka (contoh: MBL, LAB).')
    if (namaU.length < 2) return setGalat('Nama minimal 2 huruf.')
    if (kategori.dariFirestore && kategori.daftar.some((k) => k.kode === kodeU)) {
      return setGalat('Kode sudah dipakai.')
    }
    setProses(true)
    setGalat('')
    setOk('')
    try {
      await pastikanSeed()
      const id = await simpanDoc('sarpras_kategori', null, { kode: kodeU, nama: namaU })
      await catat(profil, 'tambah', 'sarpras_kategori', id)
      setKode('')
      setNama('')
      setOk('Kategori disimpan.')
    } catch {
      setGalat('Gagal menyimpan. Periksa koneksi atau rules Firestore.')
    } finally {
      setProses(false)
    }
  }

  async function seed() {
    setProses(true)
    setGalat('')
    setOk('')
    try {
      await pastikanSeed()
      await catat(profil, 'seed', 'sarpras_kategori', 'bawaan')
      setOk('Kategori bawaan disalin ke database.')
    } catch {
      setGalat('Gagal menyalin kategori bawaan.')
    } finally {
      setProses(false)
    }
  }

  async function hapus(k: Kategori) {
    if (!kategori.dariFirestore) return
    setProses(true)
    setGalat('')
    try {
      await hapusDoc('sarpras_kategori', k.id)
      await catat(profil, 'hapus', 'sarpras_kategori', k.id)
      setOk(`Kategori ${k.kode} dihapus.`)
      setHapusId(null)
    } catch {
      setGalat('Gagal menghapus.')
    } finally {
      setProses(false)
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Dipakai di form dan filter aset. Kode ikut masuk ke kode inventaris (contoh:{' '}
        <span className="font-medium text-[#1a1d33]">SDM01-MBL-R01-001</span>).
        {!kategori.dariFirestore && ' Saat ini masih memakai daftar bawaan di aplikasi.'}
      </p>
      {ok && <div className="mb-3"><Notice tipe="info">{ok}</Notice></div>}
      {galat && <div className="mb-3"><Notice tipe="error">{galat}</Notice></div>}
      {kategori.galat && <Notice tipe="error">{kategori.galat}</Notice>}

      <div className="card-soft mb-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-xs text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Kode</th>
              <th className="px-4 py-2.5 font-medium">Nama</th>
              <th className="px-4 py-2.5 font-medium">Sumber data</th>
              <th className="w-px px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {kategori.daftar.map((k) => (
              <tr key={k.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-medium">{k.kode}</td>
                <td className="px-4 py-2.5">{k.nama}</td>
                <td className="px-4 py-2.5 text-muted">
                  {kategori.dariFirestore ? 'Database' : 'Bawaan aplikasi'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {kategori.dariFirestore ? (
                    hapusId === k.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs">Hapus?</span>
                        <button type="button" className={btnDanger} disabled={proses} onClick={() => void hapus(k)}>
                          Ya
                        </button>
                        <button type="button" className={btnGhost} onClick={() => setHapusId(null)}>Batal</button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600 hover:underline"
                        onClick={() => setHapusId(k.id)}
                      >
                        Hapus
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!kategori.dariFirestore && (
        <div className="mb-4">
          <button type="button" className={btnGhost} disabled={proses} onClick={() => void seed()}>
            {proses ? 'Menyalin…' : 'Salin kategori bawaan ke database'}
          </button>
        </div>
      )}

      <form onSubmit={(e) => void simpan(e)} className="card-soft grid gap-3 p-4 sm:grid-cols-[8rem_1fr_auto]">
        <Field label="Kode" hint="2–8 karakter">
          <input
            className={inputCls}
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            placeholder="LAB"
            maxLength={8}
          />
        </Field>
        <Field label="Nama kategori">
          <input className={inputCls} value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Laboratorium" />
        </Field>
        <div className="flex items-end">
          <button type="submit" className={btnPrimary} disabled={proses}>
            {proses ? '…' : 'Tambah'}
          </button>
        </div>
      </form>
    </div>
  )
}

function PanelSumber({ profil }: { profil: ReturnType<typeof useAuth>['profil'] }) {
  const sumber = useDaftarSumber()
  const [kode, setKode] = useState('')
  const [nama, setNama] = useState('')
  const [ket, setKet] = useState('')
  const [galat, setGalat] = useState('')
  const [ok, setOk] = useState('')
  const [proses, setProses] = useState(false)
  const [hapusId, setHapusId] = useState<string | null>(null)

  async function pastikanSeed() {
    if (sumber.dariFirestore) return
    for (const s of SUMBER_BAWAAN) {
      await simpanDoc('sarpras_sumber', null, { kode: s, nama: s, keterangan: '' })
    }
  }

  async function simpan(e: FormEvent) {
    e.preventDefault()
    const kodeU = kode.trim().toUpperCase()
    const namaU = nama.trim()
    if (!/^[A-Z0-9][A-Z0-9 \-]{0,15}$/.test(kodeU)) {
      return setGalat('Kode 1–16 huruf/angka (contoh: BOS, HIBAH).')
    }
    if (namaU.length < 2) return setGalat('Nama minimal 2 huruf.')
    if (sumber.dariFirestore && sumber.daftar.some((s) => s.kode === kodeU)) {
      return setGalat('Kode sudah dipakai.')
    }
    setProses(true)
    setGalat('')
    setOk('')
    try {
      await pastikanSeed()
      const id = await simpanDoc('sarpras_sumber', null, {
        kode: kodeU,
        nama: namaU,
        keterangan: ket.trim(),
      })
      await catat(profil, 'tambah', 'sarpras_sumber', id)
      setKode('')
      setNama('')
      setKet('')
      setOk('Sumber dana disimpan.')
    } catch {
      setGalat('Gagal menyimpan. Periksa koneksi atau rules Firestore.')
    } finally {
      setProses(false)
    }
  }

  async function seed() {
    setProses(true)
    setGalat('')
    setOk('')
    try {
      await pastikanSeed()
      await catat(profil, 'seed', 'sarpras_sumber', 'bawaan')
      setOk('Sumber dana bawaan disalin ke database.')
    } catch {
      setGalat('Gagal menyalin sumber dana bawaan.')
    } finally {
      setProses(false)
    }
  }

  async function hapus(s: SumberDana) {
    if (!sumber.dariFirestore) return
    setProses(true)
    setGalat('')
    try {
      await hapusDoc('sarpras_sumber', s.id)
      await catat(profil, 'hapus', 'sarpras_sumber', s.id)
      setOk(`Sumber ${s.kode} dihapus.`)
      setHapusId(null)
    } catch {
      setGalat('Gagal menghapus.')
    } finally {
      setProses(false)
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Dipakai di form aset (sumber dana). Ditampilkan juga pada label QR aset.
        {!sumber.dariFirestore && ' Saat ini masih memakai daftar bawaan di aplikasi.'}
      </p>
      {ok && <div className="mb-3"><Notice tipe="info">{ok}</Notice></div>}
      {galat && <div className="mb-3"><Notice tipe="error">{galat}</Notice></div>}
      {sumber.galat && <Notice tipe="error">{sumber.galat}</Notice>}

      <div className="card-soft mb-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-xs text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Kode</th>
              <th className="px-4 py-2.5 font-medium">Nama</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Keterangan</th>
              <th className="px-4 py-2.5 font-medium">Sumber data</th>
              <th className="w-px px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sumber.daftar.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-medium">{s.kode}</td>
                <td className="px-4 py-2.5">{s.nama}</td>
                <td className="hidden px-4 py-2.5 text-muted md:table-cell">{s.keterangan || '—'}</td>
                <td className="px-4 py-2.5 text-muted">
                  {sumber.dariFirestore ? 'Database' : 'Bawaan aplikasi'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {sumber.dariFirestore ? (
                    hapusId === s.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs">Hapus?</span>
                        <button type="button" className={btnDanger} disabled={proses} onClick={() => void hapus(s)}>
                          Ya
                        </button>
                        <button type="button" className={btnGhost} onClick={() => setHapusId(null)}>Batal</button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600 hover:underline"
                        onClick={() => setHapusId(s.id)}
                      >
                        Hapus
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!sumber.dariFirestore && (
        <div className="mb-4">
          <button type="button" className={btnGhost} disabled={proses} onClick={() => void seed()}>
            {proses ? 'Menyalin…' : 'Salin sumber dana bawaan ke database'}
          </button>
        </div>
      )}

      <form onSubmit={(e) => void simpan(e)} className="card-soft space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kode" hint="Contoh: BOS, YAYASAN">
            <input
              className={inputCls}
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              placeholder="BOS"
              maxLength={16}
            />
          </Field>
          <Field label="Nama tampilan">
            <input className={inputCls} value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Bantuan Operasional Sekolah" />
          </Field>
        </div>
        <Field label="Keterangan (opsional)">
          <input className={inputCls} value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Mis. dana pusat tahun berjalan" />
        </Field>
        <div>
          <button type="submit" className={btnPrimary} disabled={proses}>
            {proses ? '…' : 'Tambah sumber dana'}
          </button>
        </div>
      </form>
    </div>
  )
}
