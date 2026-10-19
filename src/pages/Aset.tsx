import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useKoleksi } from '../lib/useKoleksi'
import { ambilFoto, catat, hapusDoc, simpanDoc, simpanFoto } from '../lib/data'
import { kecilkanFoto } from '../lib/foto'
import {
  KATEGORI, KONDISI, SUMBER, namaKategori, namaKondisi,
  type Aset, type Kondisi, type Ruang,
} from '../lib/tipe'
import { Field, Modal, Notice, PageHeader, StatStrip, btnDanger, btnGhost, btnPrimary, inputCls } from '../components/ui'
import { stempelTanggal, unduhCsv } from '../lib/unduh'

interface FormAset {
  nama: string
  kategori: string
  ruangId: string
  jumlah: string
  kondisi: Kondisi
  tahun: string
  sumber: string
  nilai: string
  catatan: string
}

const gayaKondisi: Record<string, string> = {
  baik: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rusak_ringan: 'border-amber-200 bg-amber-50 text-amber-800',
  rusak_berat: 'border-red-200 bg-red-50 text-red-700',
}

function LencanaKondisi({ v }: { v: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${gayaKondisi[v] ?? ''}`}>
      {namaKondisi(v)}
    </span>
  )
}

function kodeBaru(kategori: string, kodeRuang: string, semua: Aset[]) {
  const awal = `SDM01-${kategori}-${kodeRuang}-`
  const maks = semua
    .filter((a) => a.kode.startsWith(awal))
    .reduce((m, a) => Math.max(m, parseInt(a.kode.slice(awal.length), 10) || 0), 0)
  return awal + String(maks + 1).padStart(3, '0')
}

const rupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID')

export default function AsetPage() {
  const { profil, peran } = useAuth()
  const admin = peran === 'admin'
  const lihatNilai = peran === 'admin' || peran === 'pimpinan'
  const aset = useKoleksi<Aset>('sarpras_aset')
  const ruang = useKoleksi<Ruang>('sarpras_ruang')
  const [params, setParams] = useSearchParams()

  const [q, setQ] = useState('')
  const [fKategori, setFKategori] = useState('')
  const [fKondisi, setFKondisi] = useState('')
  const fRuang = params.get('ruang') ?? ''

  const [detail, setDetail] = useState<Aset | null>(null)
  const [edit, setEdit] = useState<{ id: string | null; f: FormAset; fotoLama?: string } | null>(null)
  const [berkasFoto, setBerkasFoto] = useState<File | null>(null)
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false)

  const petaRuang = useMemo(() => new Map(ruang.data.map((r) => [r.id, r])), [ruang.data])
  const ruangUrut = useMemo(() => [...ruang.data].sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true })), [ruang.data])

  const tampil = useMemo(() => {
    const kata = q.trim().toLowerCase()
    return aset.data
      .filter((a) => (!fRuang || a.ruangId === fRuang) && (!fKategori || a.kategori === fKategori) && (!fKondisi || a.kondisi === fKondisi))
      .filter((a) => !kata || a.nama.toLowerCase().includes(kata) || a.kode.toLowerCase().includes(kata))
      .sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true }))
  }, [aset.data, q, fRuang, fKategori, fKondisi])

  const ringkas = useMemo(() => {
    const s = (fn: (a: Aset) => boolean) => tampil.filter(fn).reduce((n, a) => n + a.jumlah, 0)
    return {
      jenis: tampil.length,
      total: s(() => true),
      baik: s((a) => a.kondisi === 'baik'),
      rusak: s((a) => a.kondisi !== 'baik'),
    }
  }, [tampil])

  function buka(a?: Aset) {
    setGalat('')
    setBerkasFoto(null)
    setKonfirmasiHapus(false)
    setEdit(
      a
        ? {
            id: a.id,
            fotoLama: a.fotoId,
            f: {
              nama: a.nama, kategori: a.kategori, ruangId: a.ruangId, jumlah: String(a.jumlah), kondisi: a.kondisi,
              tahun: a.tahun ? String(a.tahun) : '', sumber: a.sumber ?? '', nilai: a.nilai ? String(a.nilai) : '', catatan: a.catatan ?? '',
            },
          }
        : {
            id: null,
            f: {
              nama: '', kategori: 'MBL', ruangId: fRuang || ruangUrut[0]?.id || '', jumlah: '1', kondisi: 'baik',
              tahun: '', sumber: '', nilai: '', catatan: '',
            },
          },
    )
    setDetail(null)
  }

  const pratinjauKode = edit && !edit.id
    ? (() => {
        const r = petaRuang.get(edit.f.ruangId)
        return r ? kodeBaru(edit.f.kategori, r.kode, aset.data) : ''
      })()
    : ''

  async function simpan(e: FormEvent) {
    e.preventDefault()
    if (!edit) return
    const { f } = edit
    const nama = f.nama.trim()
    const jumlah = parseInt(f.jumlah, 10)
    if (!nama) return setGalat('Nama barang wajib diisi.')
    if (!petaRuang.has(f.ruangId)) return setGalat('Pilih ruang. Tambahkan ruang dulu bila belum ada.')
    if (!Number.isFinite(jumlah) || jumlah < 1) return setGalat('Jumlah minimal 1.')
    const tahun = f.tahun ? parseInt(f.tahun, 10) : undefined
    if (tahun !== undefined && (tahun < 1950 || tahun > new Date().getFullYear() + 1)) return setGalat('Tahun perolehan tidak wajar.')
    const nilai = f.nilai ? parseInt(f.nilai.replace(/\D/g, ''), 10) : undefined

    setProses(true)
    try {
      let fotoId = edit.fotoLama
      if (berkasFoto) {
        fotoId = await simpanFoto(await kecilkanFoto(berkasFoto))
      }
      const data: Record<string, unknown> = {
        nama, kategori: f.kategori, ruangId: f.ruangId, jumlah, kondisi: f.kondisi,
        tahun: tahun ?? null, sumber: f.sumber, nilai: nilai ?? null, catatan: f.catatan.trim(), fotoId: fotoId ?? null,
      }
      if (!edit.id) data.kode = pratinjauKode
      const id = await simpanDoc('sarpras_aset', edit.id, data)
      if (berkasFoto && edit.fotoLama) {
        try { await hapusDoc('sarpras_foto', edit.fotoLama) } catch { /* foto lama yatim, tidak fatal */ }
      }
      await catat(profil, edit.id ? 'ubah' : 'tambah', 'sarpras_aset', id)
      setEdit(null)
    } catch (err) {
      setGalat(err instanceof Error && err.message.includes('Foto') ? err.message : 'Gagal menyimpan. Periksa koneksi atau hak akses Anda.')
    } finally {
      setProses(false)
    }
  }

  async function hapus() {
    if (!edit?.id) return
    setProses(true)
    try {
      await hapusDoc('sarpras_aset', edit.id)
      if (edit.fotoLama) {
        try { await hapusDoc('sarpras_foto', edit.fotoLama) } catch { /* abaikan */ }
      }
      await catat(profil, 'hapus', 'sarpras_aset', edit.id)
      setEdit(null)
    } catch {
      setGalat('Gagal menghapus.')
    } finally {
      setProses(false)
    }
  }

  const setF = (p: Partial<FormAset>) => edit && setEdit({ ...edit, f: { ...edit.f, ...p } })
  const judulRuang = fRuang ? petaRuang.get(fRuang)?.nama : undefined

  function unduhDaftar() {
    unduhCsv(
      `aset-sarpras-${stempelTanggal()}.csv`,
      ['Kode', 'Nama', 'Kategori', 'Ruang', 'Jumlah', 'Kondisi', 'Tahun', 'Sumber', 'Nilai', 'Catatan'],
      tampil.map((x) => [
        x.kode,
        x.nama,
        namaKategori(x.kategori),
        petaRuang.get(x.ruangId)?.nama ?? '',
        x.jumlah,
        namaKondisi(x.kondisi),
        x.tahun ?? '',
        x.sumber ?? '',
        lihatNilai && x.nilai != null ? x.nilai : '',
        x.catatan ?? '',
      ]),
    )
  }

  return (
    <div className="w-full">
      <PageHeader
        judul={judulRuang ? `Aset — ${judulRuang}` : 'Aset'}
        keterangan="Daftar barang, jumlah, dan kondisinya"
        aksi={
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" className={btnGhost} onClick={() => window.print()}>Cetak</button>
            <button type="button" className={btnGhost} onClick={unduhDaftar} disabled={tampil.length === 0}>
              Unduh Excel
            </button>
            {admin && <button type="button" className={btnPrimary} onClick={() => buka()}>Tambah aset</button>}
          </div>
        }
      />
      {(aset.galat || ruang.galat) && <Notice tipe="error">{aset.galat || ruang.galat}</Notice>}

      <StatStrip
        items={[
          { label: 'Jenis barang', nilai: ringkas.jenis },
          { label: 'Total unit', nilai: ringkas.total },
          { label: 'Kondisi baik', nilai: ringkas.baik },
          { label: 'Perlu perbaikan', nilai: ringkas.rusak },
        ]}
      />

      <div className="mb-3 grid gap-2 sm:grid-cols-4 print:hidden">
        <input className={inputCls} placeholder="Cari nama atau kode…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select
          className={inputCls}
          value={fRuang}
          onChange={(e) => {
            const p = new URLSearchParams(params)
            if (e.target.value) p.set('ruang', e.target.value)
            else p.delete('ruang')
            setParams(p, { replace: true })
          }}
        >
          <option value="">Semua ruang</option>
          {ruangUrut.map((r) => <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>)}
        </select>
        <select className={inputCls} value={fKategori} onChange={(e) => setFKategori(e.target.value)}>
          <option value="">Semua kategori</option>
          {KATEGORI.map((k) => <option key={k.kode} value={k.kode}>{k.nama}</option>)}
        </select>
        <select className={inputCls} value={fKondisi} onChange={(e) => setFKondisi(e.target.value)}>
          <option value="">Semua kondisi</option>
          {KONDISI.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
        </select>
      </div>

      {aset.loading ? (
        <p className="text-sm text-muted">Memuat…</p>
      ) : tampil.length === 0 ? (
        <div className="card-soft p-6 text-sm text-muted">
          {aset.data.length === 0
            ? admin ? 'Belum ada aset. Pastikan ruang sudah ditambahkan, lalu tambah aset pertama.' : 'Belum ada aset yang dicatat.'
            : 'Tidak ada aset yang cocok dengan pencarian atau filter.'}
        </div>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Kode</th>
                <th className="px-4 py-2.5 font-medium">Nama</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Ruang</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Kategori</th>
                <th className="px-4 py-2.5 text-right font-medium">Jml</th>
                <th className="px-4 py-2.5 font-medium">Kondisi</th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((a) => (
                <tr key={a.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2" onClick={() => setDetail(a)}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-muted">{a.kode}</td>
                  <td className="px-4 py-2.5">{a.nama}</td>
                  <td className="hidden px-4 py-2.5 text-muted md:table-cell">{petaRuang.get(a.ruangId)?.nama ?? '—'}</td>
                  <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{namaKategori(a.kategori)}</td>
                  <td className="px-4 py-2.5 text-right">{a.jumlah}</td>
                  <td className="px-4 py-2.5"><LencanaKondisi v={a.kondisi} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <Modal judul={detail.nama} onTutup={() => setDetail(null)}>
          <Detail a={detail} ruang={petaRuang.get(detail.ruangId)} lihatNilai={lihatNilai} />
          {admin && (
            <div className="mt-4">
              <button className={btnGhost} onClick={() => buka(detail)}>Ubah</button>
            </div>
          )}
        </Modal>
      )}

      {edit && (
        <Modal judul={edit.id ? 'Ubah aset' : 'Tambah aset'} onTutup={() => setEdit(null)}>
          <form onSubmit={simpan} className="space-y-3.5">
            {galat && <Notice tipe="error">{galat}</Notice>}
            {ruang.data.length === 0 && <Notice tipe="warn">Belum ada ruang. Tambahkan ruang di menu Ruang terlebih dahulu.</Notice>}
            <Field label="Nama barang">
              <input className={inputCls} value={edit.f.nama} onChange={(e) => setF({ nama: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kategori">
                <select className={inputCls} value={edit.f.kategori} onChange={(e) => setF({ kategori: e.target.value })}>
                  {KATEGORI.map((k) => <option key={k.kode} value={k.kode}>{k.nama}</option>)}
                </select>
              </Field>
              <Field label="Ruang">
                <select className={inputCls} value={edit.f.ruangId} onChange={(e) => setF({ ruangId: e.target.value })}>
                  {ruangUrut.map((r) => <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jumlah">
                <input className={inputCls} type="number" min={1} value={edit.f.jumlah} onChange={(e) => setF({ jumlah: e.target.value })} />
              </Field>
              <Field label="Kondisi">
                <select className={inputCls} value={edit.f.kondisi} onChange={(e) => setF({ kondisi: e.target.value as Kondisi })}>
                  {KONDISI.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tahun perolehan (opsional)">
                <input className={inputCls} type="number" value={edit.f.tahun} onChange={(e) => setF({ tahun: e.target.value })} />
              </Field>
              <Field label="Sumber dana (opsional)">
                <select className={inputCls} value={edit.f.sumber} onChange={(e) => setF({ sumber: e.target.value })}>
                  <option value="">—</option>
                  {SUMBER.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Nilai perolehan, Rp (opsional)" hint="Hanya terlihat oleh admin dan pimpinan.">
              <input className={inputCls} inputMode="numeric" value={edit.f.nilai} onChange={(e) => setF({ nilai: e.target.value })} />
            </Field>
            <Field label="Catatan (opsional)">
              <textarea className={inputCls} rows={2} value={edit.f.catatan} onChange={(e) => setF({ catatan: e.target.value })} />
            </Field>
            <Field label="Foto (opsional)" hint={edit.fotoLama ? 'Memilih foto baru akan mengganti foto lama.' : 'Foto dikecilkan otomatis sebelum disimpan.'}>
              <input className={inputCls} type="file" accept="image/*" onChange={(e) => setBerkasFoto(e.target.files?.[0] ?? null)} />
            </Field>
            {pratinjauKode && (
              <p className="text-xs text-muted">Kode aset yang akan dibuat: <span className="font-medium text-[#1a1d33]">{pratinjauKode}</span></p>
            )}
            {edit.id && <p className="text-xs text-muted">Kode aset tidak berubah saat ruang atau kategori dipindah, agar sesuai stiker yang sudah ditempel.</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" className={btnPrimary} disabled={proses || ruang.data.length === 0}>{proses ? 'Menyimpan…' : 'Simpan'}</button>
              <button type="button" className={btnGhost} onClick={() => setEdit(null)}>Batal</button>
            </div>
            {edit.id && (
              <div className="border-t border-border pt-3">
                <div className="mb-2 text-xs font-medium text-muted">Tindakan lain</div>
                {konfirmasiHapus ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Hapus aset ini?</span>
                    <button type="button" className={btnDanger} onClick={() => void hapus()} disabled={proses}>Ya, hapus</button>
                    <button type="button" className={btnGhost} onClick={() => setKonfirmasiHapus(false)}>Batal</button>
                  </div>
                ) : (
                  <button type="button" className={btnDanger} onClick={() => setKonfirmasiHapus(true)}>Hapus aset</button>
                )}
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}

function Detail({ a, ruang, lihatNilai }: { a: Aset; ruang?: Ruang; lihatNilai: boolean }) {
  const [foto, setFoto] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(Boolean(a.fotoId))

  useEffect(() => {
    let batal = false
    if (!a.fotoId) return
    ambilFoto(a.fotoId)
      .then((d) => !batal && setFoto(d))
      .catch(() => undefined)
      .finally(() => !batal && setMemuat(false))
    return () => {
      batal = true
    }
  }, [a.fotoId])

  const baris: [string, string][] = [
    ['Kode', a.kode],
    ['Kategori', namaKategori(a.kategori)],
    ['Ruang', ruang ? `${ruang.kode} — ${ruang.nama}` : '—'],
    ['Jumlah', String(a.jumlah)],
    ['Tahun', a.tahun ? String(a.tahun) : '—'],
    ['Sumber dana', a.sumber || '—'],
  ]
  if (lihatNilai) baris.push(['Nilai perolehan', a.nilai ? rupiah(a.nilai) : '—'])

  return (
    <div className="space-y-3">
      {memuat && <p className="text-xs text-muted">Memuat foto…</p>}
      {foto && <img src={foto} alt={a.nama} className="max-h-64 w-full rounded-lg border border-border object-contain" />}
      <div><LencanaKondisi v={a.kondisi} /></div>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        {baris.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {a.catatan && <p className="rounded-lg bg-surface-2 p-3 text-sm">{a.catatan}</p>}
    </div>
  )
}
