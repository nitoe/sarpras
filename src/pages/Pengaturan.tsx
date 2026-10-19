import { useMemo, useState, type FormEvent } from 'react'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useKoleksi } from '../lib/useKoleksi'
import { db } from '../lib/firebase'
import { catat, hapusDoc, simpanDoc } from '../lib/data'
import { NAMA_PERAN } from '../lib/peran'
import type { PeranSarpras } from '../types/user'
import { KATEGORI_BAWAAN, type Kategori } from '../lib/tipe'
import { useDaftarKategori } from '../lib/kategori'
import { Badge, Field, Modal, Notice, PageHeader, btnGhost, btnPrimary, inputCls } from '../components/ui'

/** Profil ringkas dari koleksi users (field yang dipakai halaman ini). */
interface UserRow {
  id: string
  email: string
  nama: string
  role?: string
  peranSarpras?: PeranSarpras
  aktif?: boolean
}

const ROLE_GURU = ['admin', 'guru', 'guru_tahsin_tahfizh', 'guru_akademik']

/** Pilihan peran yang bisa diset admin (bukan admin Penilaian). */
const PILIHAN_PERAN: { v: '' | PeranSarpras; l: string; ket: string }[] = [
  { v: '', l: 'Otomatis (dari role Penilaian)', ket: 'Guru → Guru/Karyawan; tanpa role → tidak punya akses' },
  { v: 'pimpinan', l: 'Pimpinan', ket: 'Kepala sekolah / wakasek — lihat laporan, setujui usulan' },
  { v: 'guru', l: 'Guru / Karyawan', ket: 'Lapor kerusakan, ajukan peminjaman' },
  { v: 'petugas', l: 'Petugas', ket: 'Petugas kebersihan / penjaga — ubah status perbaikan' },
]

function labelRole(role?: string) {
  if (!role) return '—'
  if (role === 'admin') return 'Admin'
  if (role === 'guru') return 'Guru'
  if (role === 'guru_tahsin_tahfizh') return 'Guru Tahsin'
  if (role === 'guru_akademik') return 'Guru Akademik'
  if (role === 'orangtua') return 'Orang tua'
  return role
}

function peranEfektif(u: UserRow): string {
  if (u.aktif === false) return 'Dinonaktifkan'
  if (u.role === 'admin') return NAMA_PERAN.admin
  if (u.peranSarpras && u.peranSarpras in NAMA_PERAN) return NAMA_PERAN[u.peranSarpras]
  if (u.role && ROLE_GURU.includes(u.role)) return NAMA_PERAN.guru
  return 'Tidak ada akses'
}

export default function PengaturanPage() {
  const { profil, peran } = useAuth()
  const admin = peran === 'admin'
  const users = useKoleksi<UserRow>('users')
  const kategori = useDaftarKategori()

  const [kodeBaru, setKodeBaru] = useState('')
  const [namaKat, setNamaKat] = useState('')
  const [galatKat, setGalatKat] = useState('')
  const [okKat, setOkKat] = useState('')
  const [prosesKat, setProsesKat] = useState(false)

  const [cari, setCari] = useState('')
  const [edit, setEdit] = useState<UserRow | null>(null)
  const [peranBaru, setPeranBaru] = useState<'' | PeranSarpras>('')
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)
  const [ok, setOk] = useState('')

  const staf = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return users.data
      .filter((u) => {
        const relevan =
          (u.role && ROLE_GURU.includes(u.role)) ||
          Boolean(u.peranSarpras)
        if (!relevan) return false
        if (!q) return true
        return (
          u.nama.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.role ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  }, [users.data, cari])

  function buka(u: UserRow) {
    setGalat('')
    setOk('')
    setEdit(u)
    if (u.role === 'admin') setPeranBaru('')
    else setPeranBaru(u.peranSarpras ?? '')
  }

  async function simpan() {
    if (!edit || edit.role === 'admin') return
    setProses(true)
    setGalat('')
    setOk('')
    try {
      const ref = doc(db, 'users', edit.id)
      if (peranBaru === '') {
        await updateDoc(ref, { peranSarpras: null, updatedAt: serverTimestamp() })
      } else {
        await updateDoc(ref, { peranSarpras: peranBaru, updatedAt: serverTimestamp() })
      }
      await catat(profil, 'ubah-peran', 'users', edit.id)
      setOk('Peran disimpan. Pengguna perlu masuk ulang agar menu ikut berubah.')
      setEdit(null)
    } catch {
      setGalat('Gagal menyimpan. Pastikan Anda admin dan koneksi stabil.')
    } finally {
      setProses(false)
    }
  }

  async function simpanKategori(e: FormEvent) {
    e.preventDefault()
    const kode = kodeBaru.trim().toUpperCase()
    const nama = namaKat.trim()
    if (!/^[A-Z0-9]{2,8}$/.test(kode)) {
      return setGalatKat('Kode 2–8 huruf/angka (contoh: MBL, ELK).')
    }
    if (nama.length < 2) return setGalatKat('Nama kategori minimal 2 huruf.')
    if (kategori.daftar.some((k) => k.kode === kode && kategori.dariFirestore)) {
      return setGalatKat('Kode sudah dipakai.')
    }
    setProsesKat(true)
    setGalatKat('')
    setOkKat('')
    try {
      if (!kategori.dariFirestore) {
        for (const k of KATEGORI_BAWAAN) {
          await simpanDoc('sarpras_kategori', null, { kode: k.kode, nama: k.nama })
        }
      }
      const id = await simpanDoc('sarpras_kategori', null, { kode, nama })
      await catat(profil, 'tambah', 'sarpras_kategori', id)
      setKodeBaru('')
      setNamaKat('')
      setOkKat('Kategori disimpan.')
    } catch {
      setGalatKat('Gagal menyimpan kategori.')
    } finally {
      setProsesKat(false)
    }
  }

  async function seedBawaan() {
    setProsesKat(true)
    setGalatKat('')
    setOkKat('')
    try {
      for (const k of KATEGORI_BAWAAN) {
        await simpanDoc('sarpras_kategori', null, { kode: k.kode, nama: k.nama })
      }
      await catat(profil, 'seed', 'sarpras_kategori', 'bawaan')
      setOkKat('8 kategori bawaan disalin ke database.')
    } catch {
      setGalatKat('Gagal menyalin kategori bawaan.')
    } finally {
      setProsesKat(false)
    }
  }

  async function hapusKategori(k: Kategori) {
    if (!kategori.dariFirestore) return
    setProsesKat(true)
    setGalatKat('')
    try {
      await hapusDoc('sarpras_kategori', k.id)
      await catat(profil, 'hapus', 'sarpras_kategori', k.id)
      setOkKat(`Kategori ${k.kode} dihapus.`)
    } catch {
      setGalatKat('Gagal menghapus.')
    } finally {
      setProsesKat(false)
    }
  }

  if (!admin) {
    return (
      <div className="w-full max-w-3xl">
        <PageHeader judul="Pengaturan" keterangan="Kelola akses pengguna aplikasi Sarpras" />
        <Notice tipe="warn">Hanya Admin Sarpras yang dapat membuka halaman ini.</Notice>
      </div>
    )
  }

  return (
    <div className="w-full">
      <PageHeader
        judul="Pengaturan"
        keterangan="Peran pengguna di aplikasi Sarpras (terpisah dari role Penilaian)"
      />

      <div className="card-soft mb-4 space-y-3 p-4 text-sm">
        <div className="font-medium text-[#1a1d33]">Cara menambah petugas (bukan guru)</div>
        <ol className="list-decimal space-y-1.5 pl-5 text-muted">
          <li>
            Buka{' '}
            <a
              className="font-medium text-muh-700 hover:underline"
              href="https://console.firebase.google.com/project/sdm01kukusan-2e735/authentication/users"
              target="_blank"
              rel="noreferrer"
            >
              Firebase Console → Authentication → Users
            </a>
            , klik <strong>Add user</strong>, isi email & kata sandi sementara.
          </li>
          <li>
            Catat <strong>User UID</strong> yang muncul.
          </li>
          <li>
            Buka{' '}
            <a
              className="font-medium text-muh-700 hover:underline"
              href="https://console.firebase.google.com/project/sdm01kukusan-2e735/firestore/data/~2Fusers"
              target="_blank"
              rel="noreferrer"
            >
              Firestore → users
            </a>
            → <strong>Add document</strong>, ID dokumen = UID tersebut.
          </li>
          <li>
            Isi field: <code className="rounded bg-surface-2 px-1">email</code> (string),{' '}
            <code className="rounded bg-surface-2 px-1">nama</code> (string),{' '}
            <code className="rounded bg-surface-2 px-1">peranSarpras</code> ={' '}
            <code className="rounded bg-surface-2 px-1">petugas</code>,{' '}
            <code className="rounded bg-surface-2 px-1">aktif</code> = true (boolean).
            Tidak perlu field <code className="rounded bg-surface-2 px-1">role</code>.
          </li>
          <li>Petugas login di aplikasi Sarpras dengan email & kata sandi itu. Minta ganti sandi setelah masuk pertama.</li>
        </ol>
        <p className="text-xs text-muted">
          Admin Penilaian otomatis menjadi Admin Sarpras. Semua jenis guru otomatis berperan Guru/Karyawan
          kecuali diubah di tabel bawah.
        </p>
      </div>

      <div className="mb-3">
        <input
          className={inputCls}
          placeholder="Cari nama atau email…"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
      </div>

      {ok && (
        <div className="mb-3">
          <Notice tipe="info">{ok}</Notice>
        </div>
      )}
      {users.galat && <Notice tipe="error">{users.galat}</Notice>}

      {users.loading ? (
        <p className="text-sm text-muted">Memuat…</p>
      ) : staf.length === 0 ? (
        <div className="card-soft p-6 text-sm text-muted">
          Tidak ada pengguna staf yang cocok. Pastikan data users sudah ada (dari Penilaian) atau
          tambahkan petugas lewat langkah di atas.
        </div>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nama</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Email</th>
                <th className="px-4 py-2.5 font-medium">Role Penilaian</th>
                <th className="px-4 py-2.5 font-medium">Peran Sarpras</th>
                <th className="w-px px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {staf.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">
                    {u.nama || '—'}
                    {u.aktif === false && (
                      <span className="ml-2 text-xs font-normal text-red-600">nonaktif</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{u.email || '—'}</td>
                  <td className="px-4 py-2.5">
                    <Badge>{labelRole(u.role)}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{peranEfektif(u)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {u.role === 'admin' ? (
                      <span className="text-xs text-muted">otomatis</span>
                    ) : (
                      <button className="text-xs font-medium text-muh-700 hover:underline" onClick={() => buka(u)}>
                        Ubah peran
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 mb-2 text-sm font-medium text-[#1a1d33]">Kategori aset</div>
      <p className="mb-3 text-sm text-muted">
        Dipakai di form aset. Jika belum ada data di database, aplikasi memakai daftar bawaan
        (Mebel, Elektronik, …).
      </p>
      {okKat && (
        <div className="mb-3">
          <Notice tipe="info">{okKat}</Notice>
        </div>
      )}
      {galatKat && (
        <div className="mb-3">
          <Notice tipe="error">{galatKat}</Notice>
        </div>
      )}

      <div className="card-soft mb-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-xs text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Kode</th>
              <th className="px-4 py-2.5 font-medium">Nama</th>
              <th className="w-px px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {kategori.daftar.map((k) => (
              <tr key={k.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-medium">{k.kode}</td>
                <td className="px-4 py-2.5">{k.nama}</td>
                <td className="px-4 py-2.5 text-right">
                  {kategori.dariFirestore ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-red-600 hover:underline"
                      disabled={prosesKat}
                      onClick={() => void hapusKategori(k)}
                    >
                      Hapus
                    </button>
                  ) : (
                    <span className="text-xs text-muted">bawaan</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!kategori.dariFirestore && (
        <div className="mb-4">
          <button type="button" className={btnGhost} disabled={prosesKat} onClick={() => void seedBawaan()}>
            {prosesKat ? 'Menyalin…' : 'Salin kategori bawaan ke database'}
          </button>
        </div>
      )}

      <form onSubmit={(e) => void simpanKategori(e)} className="card-soft mb-6 grid gap-3 p-4 sm:grid-cols-[8rem_1fr_auto]">
        <Field label="Kode">
          <input
            className={inputCls}
            value={kodeBaru}
            onChange={(e) => setKodeBaru(e.target.value.toUpperCase())}
            placeholder="MBL"
            maxLength={8}
          />
        </Field>
        <Field label="Nama">
          <input
            className={inputCls}
            value={namaKat}
            onChange={(e) => setNamaKat(e.target.value)}
            placeholder="Mebel"
          />
        </Field>
        <div className="flex items-end">
          <button type="submit" className={btnPrimary} disabled={prosesKat}>
            {prosesKat ? '…' : 'Tambah'}
          </button>
        </div>
      </form>

      {edit && (
        <Modal judul={`Peran: ${edit.nama || edit.email}`} onTutup={() => setEdit(null)}>
          <div className="space-y-3.5">
            {galat && <Notice tipe="error">{galat}</Notice>}
            <p className="text-sm text-muted">
              Email: <span className="font-medium text-[#1a1d33]">{edit.email || '—'}</span>
              <br />
              Role Penilaian: <span className="font-medium text-[#1a1d33]">{labelRole(edit.role)}</span>
            </p>
            <Field label="Peran di aplikasi Sarpras">
              <select
                className={inputCls}
                value={peranBaru}
                onChange={(e) => setPeranBaru(e.target.value as '' | PeranSarpras)}
              >
                {PILIHAN_PERAN.map((p) => (
                  <option key={p.v || 'auto'} value={p.v}>
                    {p.l}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-xs text-muted">
              {PILIHAN_PERAN.find((p) => p.v === peranBaru)?.ket}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className={btnPrimary} disabled={proses} onClick={() => void simpan()}>
                {proses ? 'Menyimpan…' : 'Simpan'}
              </button>
              <button type="button" className={btnGhost} onClick={() => setEdit(null)}>
                Batal
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
