import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useKoleksi } from '../lib/useKoleksi'
import { catat, simpanDoc } from '../lib/data'
import {
  STATUS_PEMINJAMAN, bentrokJadwal, formatRentang, formatTanggal, jenisPinjam,
  namaKategori, namaStatusPeminjaman, stokTerpakai,
  type Aset, type JenisPeminjaman, type Peminjaman, type Ruang, type StatusPeminjaman,
} from '../lib/tipe'
import { Field, Modal, Notice, PageHeader, StatStrip, btnDanger, btnGhost, btnPrimary, inputCls } from '../components/ui'

const gayaStatus: Record<string, string> = {
  diajukan: 'border-amber-200 bg-amber-50 text-amber-800',
  disetujui: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pengembalian: 'border-amber-200 bg-amber-50 text-amber-800',
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

function asetBisaDipinjam(a: Aset) {
  return a.kategori !== 'BGN' && a.kondisi !== 'rusak_berat' && a.jumlah > 0
}

function labelSasaran(p: Peminjaman, petaRuang: Map<string, Ruang>, petaAset: Map<string, Aset>) {
  if (jenisPinjam(p) === 'alat') {
    const a = p.asetId ? petaAset.get(p.asetId) : undefined
    if (!a) return 'Alat (sudah dihapus)'
    const jml = p.jumlahPinjam && p.jumlahPinjam > 1 ? ` ×${p.jumlahPinjam}` : ''
    return `${a.nama}${jml}`
  }
  const r = p.ruangId ? petaRuang.get(p.ruangId) : undefined
  return r?.nama ?? 'Ruang (sudah dihapus)'
}

export default function PeminjamanPage() {
  const { user, peran } = useAuth()
  const admin = peran === 'admin'
  const pinjam = useKoleksi<Peminjaman>('sarpras_peminjaman')
  const ruang = useKoleksi<Ruang>('sarpras_ruang')
  const aset = useKoleksi<Aset>('sarpras_aset')

  const [fStatus, setFStatus] = useState('aktif')
  const [fJenis, setFJenis] = useState('')
  const [fRuang, setFRuang] = useState('')
  const [saya, setSaya] = useState(false)
  const [baru, setBaru] = useState(false)
  const [pilih, setPilih] = useState<Peminjaman | null>(null)

  const petaRuang = useMemo(() => new Map(ruang.data.map((r) => [r.id, r])), [ruang.data])
  const petaAset = useMemo(() => new Map(aset.data.map((a) => [a.id, a])), [aset.data])
  const ruangUrut = useMemo(() => [...ruang.data].sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true })), [ruang.data])
  const asetUrut = useMemo(
    () => [...aset.data].filter(asetBisaDipinjam).sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    [aset.data],
  )

  const hitung = (s: StatusPeminjaman) => pinjam.data.filter((p) => p.status === s).length

  const tampil = useMemo(
    () =>
      pinjam.data
        .filter((p) => {
          if (fStatus === 'aktif') return p.status === 'diajukan' || p.status === 'disetujui' || p.status === 'pengembalian'
          if (fStatus === 'semua') return true
          return p.status === fStatus
        })
        .filter((p) => !fJenis || jenisPinjam(p) === fJenis)
        .filter((p) => {
          if (!fRuang) return true
          if (jenisPinjam(p) === 'ruang') return p.ruangId === fRuang
          const a = p.asetId ? petaAset.get(p.asetId) : undefined
          return a?.ruangId === fRuang
        })
        .filter((p) => !saya || p.peminjamUid === user?.uid)
        .sort((a, b) => detik(b) - detik(a)),
    [pinjam.data, fStatus, fJenis, fRuang, saya, user?.uid, petaAset],
  )

  const terpilih = pilih ? (pinjam.data.find((p) => p.id === pilih.id) ?? pilih) : null

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        judul="Peminjaman"
        keterangan="Ajukan dan kelola peminjaman ruangan atau alat"
        aksi={<button className={btnPrimary} onClick={() => setBaru(true)}>Ajukan peminjaman</button>}
      />
      {(pinjam.galat || ruang.galat || aset.galat) && (
        <Notice tipe="error">{pinjam.galat || ruang.galat || aset.galat}</Notice>
      )}
      <StatStrip
        items={[
          { label: 'Diajukan', nilai: hitung('diajukan') },
          { label: 'Disetujui', nilai: hitung('disetujui') },
          { label: 'Selesai', nilai: hitung('selesai') },
          { label: 'Ditolak / batal', nilai: hitung('ditolak') + hitung('dibatalkan') },
        ]}
      />
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select className={inputCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="aktif">Aktif</option>
          <option value="semua">Semua status</option>
          {STATUS_PEMINJAMAN.map((s) => (
            <option key={s.v} value={s.v}>{s.l}</option>
          ))}
        </select>
        <select className={inputCls} value={fJenis} onChange={(e) => setFJenis(e.target.value)}>
          <option value="">Semua jenis</option>
          <option value="ruang">Ruangan</option>
          <option value="alat">Alat</option>
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
            ? 'Belum ada peminjaman. Ajukan peminjaman ruangan atau alat untuk kegiatan sekolah.'
            : 'Tidak ada peminjaman yang cocok dengan filter.'}
        </div>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Waktu</th>
                <th className="px-4 py-2.5 font-medium">Yang dipinjam</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Keperluan</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Peminjam</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((p) => (
                <tr key={p.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2" onClick={() => setPilih(p)}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatRentang(p.mulai, p.selesai)}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{labelSasaran(p, petaRuang, petaAset)}</div>
                    <div className="text-xs text-muted">{jenisPinjam(p) === 'alat' ? 'Alat' : 'Ruangan'}</div>
                  </td>
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
        <Modal judul="Ajukan peminjaman" onTutup={() => setBaru(false)}>
          <FormAjukan ruang={ruangUrut} aset={asetUrut} semua={pinjam.data} onSelesai={() => setBaru(false)} />
        </Modal>
      )}
      {terpilih && (
        <Modal judul="Detail peminjaman" onTutup={() => setPilih(null)}>
          <DetailPinjam
            p={terpilih}
            ruang={terpilih.ruangId ? petaRuang.get(terpilih.ruangId) : undefined}
            aset={terpilih.asetId ? petaAset.get(terpilih.asetId) : undefined}
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

function FormAjukan({ ruang, aset, semua, onSelesai }: { ruang: Ruang[]; aset: Aset[]; semua: Peminjaman[]; onSelesai: () => void }) {
  const { user, profil } = useAuth()
  const [jenis, setJenis] = useState<JenisPeminjaman>('ruang')
  const [ruangId, setRuangId] = useState(ruang[0]?.id ?? '')
  const [asetId, setAsetId] = useState(aset[0]?.id ?? '')
  const [jumlahPinjam, setJumlahPinjam] = useState('1')
  const [mulai, setMulai] = useState(defaultMulai)
  const [selesai, setSelesai] = useState(() => defaultSelesai(defaultMulai()))
  const [keperluan, setKeperluan] = useState('')
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)
  const asetTerpilih = aset.find((a) => a.id === asetId)

  const bentrokRuang = useMemo(() => {
    if (jenis !== 'ruang' || !ruangId || !mulai || !selesai) return [] as Peminjaman[]
    return semua.filter(
      (p) =>
        jenisPinjam(p) === 'ruang' &&
        p.ruangId === ruangId &&
        (p.status === 'diajukan' || p.status === 'disetujui') &&
        bentrokJadwal(mulai, selesai, p.mulai, p.selesai),
    )
  }, [semua, jenis, ruangId, mulai, selesai])

  const terpakaiAlat = useMemo(() => {
    if (jenis !== 'alat' || !asetId || !mulai || !selesai) return 0
    return stokTerpakai(semua, asetId, mulai, selesai)
  }, [semua, jenis, asetId, mulai, selesai])

  const stokTersedia = asetTerpilih ? Math.max(0, asetTerpilih.jumlah - terpakaiAlat) : 0

  async function kirim(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    const t0 = new Date(mulai).getTime()
    const t1 = new Date(selesai).getTime()
    if (Number.isNaN(t0) || Number.isNaN(t1)) return setGalat('Waktu mulai dan selesai tidak valid.')
    if (t1 <= t0) return setGalat('Waktu selesai harus setelah waktu mulai.')
    if (t0 < Date.now() - 5 * 60 * 1000) return setGalat('Waktu mulai tidak boleh di masa lalu.')
    if (keperluan.trim().length < 5) return setGalat('Jelaskan keperluan (minimal 5 huruf).')
    if (jenis === 'ruang') {
      if (!ruangId) return setGalat('Pilih ruang.')
      if (bentrokRuang.some((p) => p.status === 'disetujui')) {
        return setGalat('Ruang sudah dipesan pada waktu tersebut. Pilih waktu lain.')
      }
    } else {
      if (!asetId || !asetTerpilih) return setGalat('Pilih alat.')
      const jml = parseInt(jumlahPinjam, 10)
      if (!Number.isFinite(jml) || jml < 1) return setGalat('Jumlah pinjam minimal 1.')
      if (jml > asetTerpilih.jumlah) return setGalat(`Jumlah melebihi stok aset (${asetTerpilih.jumlah} unit).`)
      if (jml > stokTersedia) {
        return setGalat(stokTersedia === 0 ? 'Alat sudah habis dipinjam pada waktu tersebut.' : `Hanya tersisa ${stokTersedia} unit.`)
      }
    }
    setProses(true)
    setGalat('')
    try {
      const data: Record<string, unknown> = {
        jenis, keperluan: keperluan.trim(), mulai, selesai, status: 'diajukan',
        peminjamUid: user.uid, peminjamNama: profil?.nama ?? '',
      }
      if (jenis === 'ruang') {
        data.ruangId = ruangId; data.asetId = null; data.jumlahPinjam = null
      } else {
        data.asetId = asetId; data.jumlahPinjam = parseInt(jumlahPinjam, 10); data.ruangId = null
      }
      const id = await simpanDoc('sarpras_peminjaman', null, data)
      await catat(profil, `ajukan:${jenis}`, 'sarpras_peminjaman', id)
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
      <Field label="Jenis peminjaman">
        <div className="flex gap-2">
          <button type="button" className={jenis === 'ruang' ? btnPrimary : btnGhost} onClick={() => setJenis('ruang')}>Ruangan</button>
          <button type="button" className={jenis === 'alat' ? btnPrimary : btnGhost} onClick={() => setJenis('alat')}>Alat</button>
        </div>
      </Field>
      {jenis === 'ruang' ? (
        <>
          {ruang.length === 0 && <Notice tipe="warn">Belum ada ruang yang terdaftar.</Notice>}
          <Field label="Ruang">
            <select className={inputCls} value={ruangId} onChange={(e) => setRuangId(e.target.value)}>
              {ruang.map((r) => <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>)}
            </select>
          </Field>
        </>
      ) : (
        <>
          {aset.length === 0 && <Notice tipe="warn">Belum ada alat yang bisa dipinjam.</Notice>}
          <Field label="Alat">
            <select className={inputCls} value={asetId} onChange={(e) => { setAsetId(e.target.value); setJumlahPinjam('1') }}>
              {aset.map((a) => (
                <option key={a.id} value={a.id}>{a.nama} ({a.kode}) — stok {a.jumlah} · {namaKategori(a.kategori)}</option>
              ))}
            </select>
          </Field>
          <Field label="Jumlah unit" hint={asetTerpilih ? `Stok: ${asetTerpilih.jumlah}. Tersedia di waktu ini: ${stokTersedia}.` : undefined}>
            <input className={inputCls} type="number" min={1} max={asetTerpilih?.jumlah ?? 1} value={jumlahPinjam} onChange={(e) => setJumlahPinjam(e.target.value)} />
          </Field>
        </>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Mulai">
          <input className={inputCls} type="datetime-local" value={mulai} onChange={(e) => {
            setMulai(e.target.value)
            if (new Date(selesai) <= new Date(e.target.value)) setSelesai(defaultSelesai(e.target.value))
          }} />
        </Field>
        <Field label="Selesai">
          <input className={inputCls} type="datetime-local" value={selesai} onChange={(e) => setSelesai(e.target.value)} />
        </Field>
      </div>
      <Field label="Keperluan">
        <textarea className={inputCls} rows={3} value={keperluan} onChange={(e) => setKeperluan(e.target.value)} />
      </Field>
      {jenis === 'ruang' && bentrokRuang.length > 0 && (
        <Notice tipe={bentrokRuang.some((p) => p.status === 'disetujui') ? 'error' : 'warn'}>
          Ada {bentrokRuang.length} pengajuan lain pada waktu yang sama untuk ruang ini.
        </Notice>
      )}
      {jenis === 'alat' && asetTerpilih && terpakaiAlat > 0 && (
        <Notice tipe={stokTersedia === 0 ? 'error' : 'warn'}>
          {terpakaiAlat} unit sedang dipinjam/diajukan. {stokTersedia > 0 ? `Tersisa ${stokTersedia}.` : 'Stok penuh.'}
        </Notice>
      )}
      <div className="flex gap-2 pt-1">
        <button type="submit" className={btnPrimary} disabled={proses || (jenis === 'ruang' ? ruang.length === 0 : aset.length === 0)}>
          {proses ? 'Mengirim…' : 'Ajukan'}
        </button>
        <button type="button" className={btnGhost} onClick={onSelesai}>Batal</button>
      </div>
    </form>
  )
}

function DetailPinjam(props: {
  p: Peminjaman; ruang?: Ruang; aset?: Aset; semua: Peminjaman[]; admin: boolean; uid?: string; onTutup: () => void
}) {
  const { p, ruang, aset, semua, admin, uid, onTutup } = props
  const { profil } = useAuth()
  const [catatanAdmin, setCatatanAdmin] = useState(p.catatanAdmin ?? '')
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)
  const [konfirmasiBatal, setKonfirmasiBatal] = useState(false)
  const jenis = jenisPinjam(p)
  const milikSaya = p.peminjamUid === uid
  const bisaBatalkan = milikSaya && p.status === 'diajukan'
  const bisaKelola = admin && (p.status === 'diajukan' || p.status === 'disetujui' || p.status === 'pengembalian')

  const bentrokDisetujuiRuang = useMemo(() => {
    if (p.status !== 'diajukan' || jenis !== 'ruang' || !p.ruangId) return [] as Peminjaman[]
    return semua.filter(
      (x) => x.id !== p.id && jenisPinjam(x) === 'ruang' && x.ruangId === p.ruangId && x.status === 'disetujui'
        && bentrokJadwal(p.mulai, p.selesai, x.mulai, x.selesai),
    )
  }, [semua, p, jenis])

  const stokSaatSetujui = useMemo(() => {
    if (p.status !== 'diajukan' || jenis !== 'alat' || !p.asetId || !aset) return null
    const terpakai = stokTerpakai(semua, p.asetId, p.mulai, p.selesai, p.id)
    const sisa = aset.jumlah - terpakai
    const minta = p.jumlahPinjam ?? 1
    return { terpakai, sisa, minta, cukup: sisa >= minta }
  }, [semua, p, jenis, aset])

  async function ubahStatus(status: StatusPeminjaman) {
    setGalat('')
    setProses(true)
    try {
      if (status === 'dibatalkan') {
        await simpanDoc('sarpras_peminjaman', p.id, { status: 'dibatalkan' })
      } else {
        await simpanDoc('sarpras_peminjaman', p.id, { status, catatanAdmin: catatanAdmin.trim() })
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
    ['Jenis', jenis === 'alat' ? 'Alat' : 'Ruangan'],
    ['Diajukan', formatTanggal(p.createdAt)],
    ['Peminjam', p.peminjamNama || '—'],
  ]
  if (jenis === 'ruang') baris.push(['Ruang', ruang ? `${ruang.kode} — ${ruang.nama}` : '—'])
  else {
    baris.push(['Alat', aset ? `${aset.nama} (${aset.kode})` : 'Alat sudah dihapus'])
    baris.push(['Jumlah', String(p.jumlahPinjam ?? 1)])
    if (aset) baris.push(['Kategori', namaKategori(aset.kategori)])
  }
  baris.push(['Waktu', formatRentang(p.mulai, p.selesai)])

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
      {p.catatanPengembalian && (
        <p className="text-sm"><span className="text-muted">Catatan pengembalian: </span>{p.catatanPengembalian}</p>
      )}
      {p.catatanAdmin && (
        <p className="text-sm"><span className="text-muted">Catatan admin: </span>{p.catatanAdmin}</p>
      )}
      {galat && <Notice tipe="error">{galat}</Notice>}
      {bisaKelola && p.status === 'diajukan' && jenis === 'ruang' && bentrokDisetujuiRuang.length > 0 && (
        <Notice tipe="warn">Ada {bentrokDisetujuiRuang.length} peminjaman ruang yang sudah disetujui pada waktu yang sama.</Notice>
      )}
      {bisaKelola && p.status === 'diajukan' && stokSaatSetujui && !stokSaatSetujui.cukup && (
        <Notice tipe="error">Stok tidak cukup: diminta {stokSaatSetujui.minta}, tersisa {stokSaatSetujui.sisa}.</Notice>
      )}
      {bisaKelola && (
        <div className="space-y-3 border-t border-border pt-3">
          <Field label="Catatan admin (opsional)">
            <textarea className={inputCls} rows={2} value={catatanAdmin} onChange={(e) => setCatatanAdmin(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {p.status === 'diajukan' && (
              <>
                <button type="button" className={btnPrimary} disabled={proses || (stokSaatSetujui !== null && !stokSaatSetujui.cukup)} onClick={() => void ubahStatus('disetujui')}>
                  {proses ? '…' : 'Setujui'}
                </button>
                <button type="button" className={btnDanger} disabled={proses} onClick={() => void ubahStatus('ditolak')}>Tolak</button>
              </>
            )}
            {p.status === 'disetujui' && (
              <button type="button" className={btnPrimary} disabled={proses} onClick={() => void ubahStatus('selesai')}>
                {proses ? '…' : 'Tandai selesai / dikembalikan'}
              </button>
            )}
            {p.status === 'pengembalian' && (
              <>
                <button type="button" className={btnPrimary} disabled={proses} onClick={() => void ubahStatus('selesai')}>
                  {proses ? '…' : 'Konfirmasi diterima'}
                </button>
                <button type="button" className={btnGhost} disabled={proses} onClick={() => void ubahStatus('disetujui')}>Tolak pengembalian</button>
              </>
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
              <button type="button" className={btnDanger} disabled={proses} onClick={() => void ubahStatus('dibatalkan')}>Ya, batalkan</button>
              <button type="button" className={btnGhost} onClick={() => setKonfirmasiBatal(false)}>Tidak</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnDanger} onClick={() => setKonfirmasiBatal(true)}>Batalkan pengajuan</button>
              <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
            </div>
          )}
        </div>
      )}
      {!bisaKelola && !bisaBatalkan && (
        <div className="pt-1"><button type="button" className={btnGhost} onClick={onTutup}>Tutup</button></div>
      )}
    </div>
  )
}
