import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useKoleksi } from '../lib/useKoleksi'
import { ambilFoto, catat, simpanDoc, simpanFoto } from '../lib/data'
import { kecilkanFoto } from '../lib/foto'
import {
  KONDISI, STATUS_KERUSAKAN, formatTanggal, namaStatus,
  type Aset, type Kerusakan, type Kondisi, type Ruang, type StatusKerusakan,
} from '../lib/tipe'
import { Field, Modal, Notice, PageHeader, StatStrip, btnGhost, btnPrimary, inputCls } from '../components/ui'

const gayaStatus: Record<string, string> = {
  baru: 'border-amber-200 bg-amber-50 text-amber-800',
  dicek: 'border-muh-200 bg-muh-50 text-muh-700',
  dalam_perbaikan: 'border-muh-200 bg-muh-50 text-muh-700',
  selesai: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

function LencanaStatus({ v }: { v: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${gayaStatus[v] ?? ''}`}>
      {namaStatus(v)}
    </span>
  )
}

const rupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID')
const detik = (k: Kerusakan) => k.createdAt?.toDate().getTime() ?? Number.MAX_SAFE_INTEGER

export default function KerusakanPage() {
  const { user, peran } = useAuth()
  const kelola = peran === 'admin' || peran === 'petugas'
  const laporan = useKoleksi<Kerusakan>('sarpras_kerusakan')
  const ruang = useKoleksi<Ruang>('sarpras_ruang')
  const aset = useKoleksi<Aset>('sarpras_aset')

  const [fStatus, setFStatus] = useState('aktif')
  const [fRuang, setFRuang] = useState('')
  const [saya, setSaya] = useState(false)
  const [baru, setBaru] = useState(false)
  const [pilih, setPilih] = useState<Kerusakan | null>(null)

  const petaRuang = useMemo(() => new Map(ruang.data.map((r) => [r.id, r])), [ruang.data])
  const petaAset = useMemo(() => new Map(aset.data.map((a) => [a.id, a])), [aset.data])
  const ruangUrut = useMemo(() => [...ruang.data].sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true })), [ruang.data])

  const hitung = (s: StatusKerusakan) => laporan.data.filter((k) => k.status === s).length

  const tampil = useMemo(
    () =>
      laporan.data
        .filter((k) => (fStatus === 'aktif' ? k.status !== 'selesai' : fStatus === 'semua' ? true : k.status === fStatus))
        .filter((k) => !fRuang || k.ruangId === fRuang)
        .filter((k) => !saya || k.pelaporUid === user?.uid)
        .sort((a, b) => detik(b) - detik(a)),
    [laporan.data, fStatus, fRuang, saya, user?.uid],
  )

  // Pilihan yang sedang dibuka ikut diperbarui bila datanya berubah.
  const terpilih = pilih ? (laporan.data.find((k) => k.id === pilih.id) ?? pilih) : null

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        judul="Kerusakan"
        keterangan="Laporan kerusakan sarana dan prasarana"
        aksi={<button className={btnPrimary} onClick={() => setBaru(true)}>Lapor kerusakan</button>}
      />
      {(laporan.galat || ruang.galat || aset.galat) && <Notice tipe="error">{laporan.galat || ruang.galat || aset.galat}</Notice>}

      <StatStrip
        items={STATUS_KERUSAKAN.map((s) => ({ label: s.l, nilai: hitung(s.v) }))}
      />

      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <select className={inputCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="aktif">Belum selesai</option>
          <option value="semua">Semua status</option>
          {STATUS_KERUSAKAN.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <select className={inputCls} value={fRuang} onChange={(e) => setFRuang(e.target.value)}>
          <option value="">Semua ruang</option>
          {ruangUrut.map((r) => <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={saya} onChange={(e) => setSaya(e.target.checked)} />
          Laporan saya saja
        </label>
      </div>

      {laporan.loading ? (
        <p className="text-sm text-muted">Memuat…</p>
      ) : tampil.length === 0 ? (
        <div className="card-soft p-6 text-sm text-muted">
          {laporan.data.length === 0 ? 'Belum ada laporan kerusakan.' : 'Tidak ada laporan yang cocok dengan filter.'}
        </div>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Tanggal</th>
                <th className="px-4 py-2.5 font-medium">Ruang / barang</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Keterangan</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Pelapor</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((k) => (
                <tr key={k.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2" onClick={() => setPilih(k)}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatTanggal(k.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{petaRuang.get(k.ruangId)?.nama ?? '—'}</div>
                    <div className="text-xs text-muted">{k.asetId ? (petaAset.get(k.asetId)?.nama ?? 'Barang dihapus') : 'Ruangan / lainnya'}</div>
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-2.5 text-muted md:table-cell">{k.deskripsi}</td>
                  <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{k.pelaporNama}</td>
                  <td className="px-4 py-2.5"><LencanaStatus v={k.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {baru && (
        <Modal judul="Lapor kerusakan" onTutup={() => setBaru(false)}>
          <FormLapor ruang={ruangUrut} aset={aset.data} onSelesai={() => setBaru(false)} />
        </Modal>
      )}

      {terpilih && (
        <Modal judul="Detail laporan" onTutup={() => setPilih(null)}>
          <DetailLapor
            k={terpilih}
            ruang={petaRuang.get(terpilih.ruangId)}
            aset={terpilih.asetId ? petaAset.get(terpilih.asetId) : undefined}
            kelola={kelola}
            admin={peran === 'admin'}
            lihatBiaya={peran === 'admin' || peran === 'pimpinan' || peran === 'petugas'}
            onTutup={() => setPilih(null)}
          />
        </Modal>
      )}
    </div>
  )
}

function FormLapor({ ruang, aset, onSelesai }: { ruang: Ruang[]; aset: Aset[]; onSelesai: () => void }) {
  const { user, profil } = useAuth()
  const [ruangId, setRuangId] = useState(ruang[0]?.id ?? '')
  const [asetId, setAsetId] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [berkas, setBerkas] = useState<File | null>(null)
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)

  const asetRuang = useMemo(
    () => aset.filter((a) => a.ruangId === ruangId).sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    [aset, ruangId],
  )

  async function kirim(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!ruangId) return setGalat('Pilih ruang.')
    if (deskripsi.trim().length < 5) return setGalat('Jelaskan kerusakannya (minimal 5 huruf).')
    setProses(true)
    setGalat('')
    try {
      const fotoId = berkas ? await simpanFoto(await kecilkanFoto(berkas)) : null
      const id = await simpanDoc('sarpras_kerusakan', null, {
        ruangId,
        asetId: asetId || null,
        deskripsi: deskripsi.trim(),
        fotoId,
        status: 'baru',
        pelaporUid: user.uid,
        pelaporNama: profil?.nama ?? '',
        createdBy: user.uid,
      })
      await catat(profil, 'lapor', 'sarpras_kerusakan', id)
      onSelesai()
    } catch (err) {
      setGalat(err instanceof Error && err.message.includes('Foto') ? err.message : 'Gagal mengirim laporan. Periksa koneksi Anda.')
    } finally {
      setProses(false)
    }
  }

  return (
    <form onSubmit={kirim} className="space-y-3.5">
      {galat && <Notice tipe="error">{galat}</Notice>}
      {ruang.length === 0 && <Notice tipe="warn">Belum ada ruang yang terdaftar. Hubungi admin sarpras.</Notice>}
      <Field label="Ruang">
        <select className={inputCls} value={ruangId} onChange={(e) => { setRuangId(e.target.value); setAsetId('') }}>
          {ruang.map((r) => <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>)}
        </select>
      </Field>
      <Field label="Barang yang rusak" hint="Pilih “Ruangan / lainnya” bila yang rusak bukan barang yang tercatat (mis. atap bocor, keran).">
        <select className={inputCls} value={asetId} onChange={(e) => setAsetId(e.target.value)}>
          <option value="">Ruangan / lainnya</option>
          {asetRuang.map((a) => <option key={a.id} value={a.id}>{a.nama} ({a.kode})</option>)}
        </select>
      </Field>
      <Field label="Apa yang rusak?">
        <textarea className={inputCls} rows={3} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} />
      </Field>
      <Field label="Foto (opsional)">
        <input className={inputCls} type="file" accept="image/*" onChange={(e) => setBerkas(e.target.files?.[0] ?? null)} />
      </Field>
      <div className="flex gap-2 pt-1">
        <button type="submit" className={btnPrimary} disabled={proses || ruang.length === 0}>{proses ? 'Mengirim…' : 'Kirim laporan'}</button>
        <button type="button" className={btnGhost} onClick={onSelesai}>Batal</button>
      </div>
    </form>
  )
}

function DetailLapor(props: {
  k: Kerusakan
  ruang?: Ruang
  aset?: Aset
  kelola: boolean
  admin: boolean
  lihatBiaya: boolean
  onTutup: () => void
}) {
  const { k, ruang, aset, kelola, admin, lihatBiaya, onTutup } = props
  const { profil } = useAuth()
  const [foto, setFoto] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(Boolean(k.fotoId))
  const [status, setStatus] = useState<StatusKerusakan>(k.status)
  const [penanganan, setPenanganan] = useState(k.penanganan ?? '')
  const [biaya, setBiaya] = useState(k.biaya ? String(k.biaya) : '')
  const [kondisiAset, setKondisiAset] = useState<'' | Kondisi>('')
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)

  useEffect(() => {
    let batal = false
    if (!k.fotoId) return
    ambilFoto(k.fotoId)
      .then((d) => !batal && setFoto(d))
      .catch(() => undefined)
      .finally(() => !batal && setMemuat(false))
    return () => {
      batal = true
    }
  }, [k.fotoId])

  // Petugas hanya boleh memakai status selain "baru" (sesuai aturan Firestore).
  const pilihanStatus = admin ? STATUS_KERUSAKAN : STATUS_KERUSAKAN.filter((s) => s.v !== 'baru')

  async function simpan(e: FormEvent) {
    e.preventDefault()
    setGalat('')
    setProses(true)
    try {
      const nilaiBiaya = biaya ? parseInt(biaya.replace(/\D/g, ''), 10) : null
      const data: Record<string, unknown> = { status, penanganan: penanganan.trim(), biaya: nilaiBiaya }
      if (status === 'selesai' && k.status !== 'selesai') data.tanggalSelesai = serverTimestamp()
      if (status !== 'selesai' && k.status === 'selesai') data.tanggalSelesai = null
      await simpanDoc('sarpras_kerusakan', k.id, data)
      if (admin && kondisiAset && aset) {
        await simpanDoc('sarpras_aset', aset.id, { kondisi: kondisiAset })
      }
      await catat(profil, `status:${status}`, 'sarpras_kerusakan', k.id)
      onTutup()
    } catch {
      setGalat('Gagal menyimpan. Periksa koneksi atau hak akses Anda.')
    } finally {
      setProses(false)
    }
  }

  const baris: [string, string][] = [
    ['Tanggal lapor', formatTanggal(k.createdAt)],
    ['Pelapor', k.pelaporNama || '—'],
    ['Ruang', ruang ? `${ruang.kode} — ${ruang.nama}` : '—'],
    ['Barang', k.asetId ? (aset ? `${aset.nama} (${aset.kode})` : 'Barang sudah dihapus') : 'Ruangan / lainnya'],
  ]
  if (k.status === 'selesai') baris.push(['Selesai pada', formatTanggal(k.tanggalSelesai)])

  return (
    <div className="space-y-3">
      <div><LencanaStatus v={k.status} /></div>
      {memuat && <p className="text-xs text-muted">Memuat foto…</p>}
      {foto && <img src={foto} alt="Foto kerusakan" className="max-h-64 w-full rounded-lg border border-border object-contain" />}
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        {baris.map(([a, b]) => (
          <div key={a} className="contents">
            <dt className="text-muted">{a}</dt>
            <dd>{b}</dd>
          </div>
        ))}
      </dl>
      <p className="rounded-lg bg-surface-2 p-3 text-sm">{k.deskripsi}</p>

      {!kelola && (k.penanganan || (lihatBiaya && k.biaya)) && (
        <div className="space-y-1 text-sm">
          {k.penanganan && <div><span className="text-muted">Penanganan: </span>{k.penanganan}</div>}
          {lihatBiaya && k.biaya ? <div><span className="text-muted">Biaya: </span>{rupiah(k.biaya)}</div> : null}
        </div>
      )}

      {kelola && (
        <form onSubmit={simpan} className="space-y-3 border-t border-border pt-3">
          {galat && <Notice tipe="error">{galat}</Notice>}
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as StatusKerusakan)}>
              {pilihanStatus.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </Field>
          <Field label="Penanganan / catatan">
            <textarea className={inputCls} rows={2} value={penanganan} onChange={(e) => setPenanganan(e.target.value)} />
          </Field>
          <Field label="Biaya perbaikan, Rp (opsional)">
            <input className={inputCls} inputMode="numeric" value={biaya} onChange={(e) => setBiaya(e.target.value)} />
          </Field>
          {admin && aset && (
            <Field label={`Kondisi barang “${aset.nama}” setelah ini`} hint="Pilih bila kondisi barang di daftar aset perlu diperbarui.">
              <select className={inputCls} value={kondisiAset} onChange={(e) => setKondisiAset(e.target.value as '' | Kondisi)}>
                <option value="">Tidak diubah</option>
                {KONDISI.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </Field>
          )}
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary} disabled={proses}>{proses ? 'Menyimpan…' : 'Simpan'}</button>
            <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
          </div>
        </form>
      )}
    </div>
  )
}
