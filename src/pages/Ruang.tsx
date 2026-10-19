import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useKoleksi } from '../lib/useKoleksi'
import { catat, hapusDoc, simpanDoc } from '../lib/data'
import { JENIS_RUANG, type Aset, type Ruang } from '../lib/tipe'
import { Badge, Field, Modal, Notice, PageHeader, btnDanger, btnGhost, btnPrimary, inputCls } from '../components/ui'

interface FormRuang {
  kode: string
  nama: string
  jenis: string
  gedung: string
  penanggungJawab: string
}
const KOSONG: FormRuang = { kode: '', nama: '', jenis: 'Kelas', gedung: '', penanggungJawab: '' }

export default function RuangPage() {
  const { profil, peran } = useAuth()
  const admin = peran === 'admin'
  const ruang = useKoleksi<Ruang>('sarpras_ruang')
  const aset = useKoleksi<Aset>('sarpras_aset')

  const [edit, setEdit] = useState<{ id: string | null; f: FormRuang } | null>(null)
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false)

  const daftar = useMemo(() => [...ruang.data].sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true })), [ruang.data])
  const jumlahAset = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of aset.data) m.set(a.ruangId, (m.get(a.ruangId) ?? 0) + 1)
    return m
  }, [aset.data])

  function buka(r?: Ruang) {
    setGalat('')
    setKonfirmasiHapus(false)
    setEdit(
      r
        ? { id: r.id, f: { kode: r.kode, nama: r.nama, jenis: r.jenis, gedung: r.gedung ?? '', penanggungJawab: r.penanggungJawab ?? '' } }
        : { id: null, f: { ...KOSONG } },
    )
  }

  async function simpan(e: FormEvent) {
    e.preventDefault()
    if (!edit) return
    const kode = edit.f.kode.trim().toUpperCase().replace(/\s+/g, '')
    const nama = edit.f.nama.trim()
    if (!kode || !nama) return setGalat('Kode dan nama ruang wajib diisi.')
    if (!/^[A-Z0-9-]+$/.test(kode)) return setGalat('Kode hanya boleh huruf, angka, dan tanda hubung (-).')
    if (daftar.some((r) => r.kode === kode && r.id !== edit.id)) return setGalat('Kode ruang sudah dipakai.')
    setProses(true)
    try {
      const id = await simpanDoc('sarpras_ruang', edit.id, {
        kode,
        nama,
        jenis: edit.f.jenis,
        gedung: edit.f.gedung.trim(),
        penanggungJawab: edit.f.penanggungJawab.trim(),
      })
      await catat(profil, edit.id ? 'ubah' : 'tambah', 'sarpras_ruang', id)
      setEdit(null)
    } catch {
      setGalat('Gagal menyimpan. Periksa koneksi atau hak akses Anda.')
    } finally {
      setProses(false)
    }
  }

  async function hapus() {
    if (!edit?.id) return
    setProses(true)
    try {
      await hapusDoc('sarpras_ruang', edit.id)
      await catat(profil, 'hapus', 'sarpras_ruang', edit.id)
      setEdit(null)
    } catch {
      setGalat('Gagal menghapus.')
    } finally {
      setProses(false)
    }
  }

  const adaAset = edit?.id ? (jumlahAset.get(edit.id) ?? 0) : 0

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        judul="Ruang"
        keterangan="Daftar ruang dan jumlah jenis aset di dalamnya"
        aksi={admin ? <button className={btnPrimary} onClick={() => buka()}>Tambah ruang</button> : undefined}
      />
      {ruang.galat && <Notice tipe="error">{ruang.galat}</Notice>}
      {ruang.loading ? (
        <p className="text-sm text-muted">Memuat…</p>
      ) : daftar.length === 0 ? (
        <div className="card-soft p-6 text-sm text-muted">
          Belum ada ruang. {admin ? 'Mulai dengan menambah ruang, misalnya Kelas 5A.' : 'Admin sarpras akan mengisinya.'}
        </div>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Kode</th>
                <th className="px-4 py-2.5 font-medium">Nama</th>
                <th className="px-4 py-2.5 font-medium">Jenis</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Penanggung jawab</th>
                <th className="px-4 py-2.5 text-right font-medium">Jenis aset</th>
                <th className="w-px px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {daftar.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{r.kode}</td>
                  <td className="px-4 py-2.5">{r.nama}</td>
                  <td className="px-4 py-2.5"><Badge>{r.jenis}</Badge></td>
                  <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{r.penanggungJawab || '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to={`/aset?ruang=${r.id}`} className="font-medium text-muh-700 hover:underline">
                      {jumlahAset.get(r.id) ?? 0}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {admin && (
                      <button className="text-xs font-medium text-muh-700 hover:underline" onClick={() => buka(r)}>
                        Ubah
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <Modal judul={edit.id ? 'Ubah ruang' : 'Tambah ruang'} onTutup={() => setEdit(null)}>
          <form onSubmit={simpan} className="space-y-3.5">
            {galat && <Notice tipe="error">{galat}</Notice>}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Kode" hint="Mis. K5A">
                <input className={inputCls} value={edit.f.kode} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, kode: e.target.value } })} />
              </Field>
              <div className="col-span-2">
                <Field label="Nama ruang">
                  <input className={inputCls} value={edit.f.nama} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, nama: e.target.value } })} />
                </Field>
              </div>
            </div>
            <Field label="Jenis">
              <select className={inputCls} value={edit.f.jenis} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, jenis: e.target.value } })}>
                {JENIS_RUANG.map((j) => <option key={j}>{j}</option>)}
              </select>
            </Field>
            <Field label="Gedung / lantai (opsional)">
              <input className={inputCls} value={edit.f.gedung} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, gedung: e.target.value } })} />
            </Field>
            <Field label="Penanggung jawab (opsional)">
              <input className={inputCls} value={edit.f.penanggungJawab} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, penanggungJawab: e.target.value } })} />
            </Field>
            {edit.id && (
              <p className="text-xs text-muted">
                Mengubah kode tidak mengubah kode aset yang sudah tercetak.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button type="submit" className={btnPrimary} disabled={proses}>{proses ? 'Menyimpan…' : 'Simpan'}</button>
              <button type="button" className={btnGhost} onClick={() => setEdit(null)}>Batal</button>
            </div>
            {edit.id && (
              <div className="border-t border-border pt-3">
                <div className="mb-2 text-xs font-medium text-muted">Tindakan lain</div>
                {adaAset > 0 ? (
                  <p className="text-xs text-muted">Ruang ini masih berisi {adaAset} jenis aset. Pindahkan atau hapus asetnya dulu sebelum menghapus ruang.</p>
                ) : konfirmasiHapus ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Hapus ruang ini?</span>
                    <button type="button" className={btnDanger} onClick={() => void hapus()} disabled={proses}>Ya, hapus</button>
                    <button type="button" className={btnGhost} onClick={() => setKonfirmasiHapus(false)}>Batal</button>
                  </div>
                ) : (
                  <button type="button" className={btnDanger} onClick={() => setKonfirmasiHapus(true)}>Hapus ruang</button>
                )}
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}
