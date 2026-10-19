import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useKoleksi } from '../lib/useKoleksi'
import { catat, simpanDoc } from '../lib/data'
import {
  STATUS_USULAN, formatTanggal, namaStatusUsulan,
  type StatusUsulan, type Usulan,
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
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${gayaStatus[v] ?? 'border-border bg-surface-2 text-muted'}`}>
      {namaStatusUsulan(v)}
    </span>
  )
}

const rupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID')

const detik = (u: Usulan) => u.createdAt?.toDate().getTime() ?? 0

export default function UsulanPage() {
  const { user, profil, peran } = useAuth()
  const admin = peran === 'admin'
  const pimpinan = peran === 'pimpinan' || admin
  const bisaAjukan = peran === 'admin' || peran === 'pimpinan' || peran === 'guru'

  const usulan = useKoleksi<Usulan>('sarpras_usulan')

  const [fStatus, setFStatus] = useState<'aktif' | 'semua' | StatusUsulan>('aktif')
  const [saya, setSaya] = useState(false)
  const [baru, setBaru] = useState(false)
  const [pilih, setPilih] = useState<Usulan | null>(null)

  const hitung = (s: StatusUsulan) => usulan.data.filter((u) => u.status === s).length

  const tampil = useMemo(
    () =>
      usulan.data
        .filter((u) => {
          if (fStatus === 'aktif') return u.status === 'diajukan' || u.status === 'disetujui'
          if (fStatus === 'semua') return true
          return u.status === fStatus
        })
        .filter((u) => !saya || u.pengusulUid === user?.uid)
        .sort((a, b) => detik(b) - detik(a)),
    [usulan.data, fStatus, saya, user?.uid],
  )

  const terpilih = pilih ? (usulan.data.find((u) => u.id === pilih.id) ?? pilih) : null

  return (
    <div className="w-full">
      <PageHeader
        judul="Usulan"
        keterangan="Usulan pengadaan barang atau perbaikan"
        aksi={
          bisaAjukan ? (
            <button className={btnPrimary} onClick={() => setBaru(true)}>
              Ajukan usulan
            </button>
          ) : undefined
        }
      />
      {usulan.galat && <Notice tipe="error">{usulan.galat}</Notice>}

      <StatStrip
        items={[
          { label: 'Diajukan', nilai: hitung('diajukan') },
          { label: 'Disetujui', nilai: hitung('disetujui') },
          { label: 'Selesai', nilai: hitung('selesai') },
          { label: 'Ditolak / batal', nilai: hitung('ditolak') + hitung('dibatalkan') },
        ]}
      />

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <select
          className={inputCls}
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value as typeof fStatus)}
        >
          <option value="aktif">Aktif (diajukan & disetujui)</option>
          <option value="semua">Semua status</option>
          {STATUS_USULAN.map((s) => (
            <option key={s.v} value={s.v}>{s.l}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={saya} onChange={(e) => setSaya(e.target.checked)} />
          Usulan saya saja
        </label>
      </div>

      {usulan.loading ? (
        <p className="text-sm text-muted">Memuat…</p>
      ) : tampil.length === 0 ? (
        <div className="card-soft p-6 text-sm text-muted">
          {usulan.data.length === 0
            ? bisaAjukan
              ? 'Belum ada usulan. Ajukan pengadaan atau perbaikan yang dibutuhkan sekolah.'
              : 'Belum ada usulan.'
            : 'Tidak ada usulan yang cocok dengan filter.'}
        </div>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Tanggal</th>
                <th className="px-4 py-2.5 font-medium">Barang / kegiatan</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Perkiraan biaya</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Pengusul</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((u) => (
                <tr
                  key={u.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2"
                  onClick={() => setPilih(u)}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatTanggal(u.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{u.barang}</div>
                    <div className="max-w-xs truncate text-xs text-muted md:hidden">{u.alasan}</div>
                  </td>
                  <td className="hidden px-4 py-2.5 text-muted md:table-cell">
                    {u.perkiraanBiaya != null && u.perkiraanBiaya > 0 ? rupiah(u.perkiraanBiaya) : '—'}
                  </td>
                  <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{u.pengusulNama}</td>
                  <td className="px-4 py-2.5"><LencanaStatus v={u.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {baru && (
        <Modal judul="Ajukan usulan" onTutup={() => setBaru(false)}>
          <FormAjukan profil={profil} uid={user?.uid} onSelesai={() => setBaru(false)} />
        </Modal>
      )}

      {terpilih && (
        <Modal judul="Detail usulan" onTutup={() => setPilih(null)}>
          <DetailUsulan
            u={terpilih}
            admin={admin}
            pimpinan={pimpinan}
            uid={user?.uid}
            profil={profil}
            onTutup={() => setPilih(null)}
          />
        </Modal>
      )}
    </div>
  )
}

function FormAjukan(props: {
  profil: ReturnType<typeof useAuth>['profil']
  uid?: string
  onSelesai: () => void
}) {
  const { profil, uid, onSelesai } = props
  const [barang, setBarang] = useState('')
  const [alasan, setAlasan] = useState('')
  const [biaya, setBiaya] = useState('')
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)

  async function kirim(e: FormEvent) {
    e.preventDefault()
    if (!uid) return
    if (barang.trim().length < 3) return setGalat('Nama barang/kegiatan minimal 3 huruf.')
    if (alasan.trim().length < 5) return setGalat('Jelaskan alasan (minimal 5 huruf).')
    const nilaiBiaya = biaya ? parseInt(biaya.replace(/\D/g, ''), 10) : null
    if (biaya && (nilaiBiaya == null || Number.isNaN(nilaiBiaya) || nilaiBiaya < 0)) {
      return setGalat('Perkiraan biaya tidak valid.')
    }

    setProses(true)
    setGalat('')
    try {
      const id = await simpanDoc('sarpras_usulan', null, {
        barang: barang.trim(),
        alasan: alasan.trim(),
        perkiraanBiaya: nilaiBiaya,
        status: 'diajukan',
        pengusulUid: uid,
        pengusulNama: profil?.nama ?? '',
      })
      await catat(profil, 'ajukan', 'sarpras_usulan', id)
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
      <Field label="Barang / kegiatan yang diusulkan">
        <input
          className={inputCls}
          value={barang}
          onChange={(e) => setBarang(e.target.value)}
          placeholder="Mis. 2 unit AC 1 PK, perbaikan pagar samping"
        />
      </Field>
      <Field label="Alasan / kebutuhan">
        <textarea
          className={inputCls}
          rows={3}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          placeholder="Mengapa dibutuhkan, di mana dipakai, dampak jika tidak ada…"
        />
      </Field>
      <Field label="Perkiraan biaya, Rp (opsional)" hint="Boleh dikosongkan jika belum diketahui.">
        <input
          className={inputCls}
          inputMode="numeric"
          value={biaya}
          onChange={(e) => setBiaya(e.target.value)}
          placeholder="Contoh: 3500000"
        />
      </Field>
      <div className="flex gap-2 pt-1">
        <button type="submit" className={btnPrimary} disabled={proses}>
          {proses ? 'Mengirim…' : 'Ajukan'}
        </button>
        <button type="button" className={btnGhost} onClick={onSelesai}>Batal</button>
      </div>
    </form>
  )
}

function DetailUsulan(props: {
  u: Usulan
  admin: boolean
  pimpinan: boolean
  uid?: string
  profil: ReturnType<typeof useAuth>['profil']
  onTutup: () => void
}) {
  const { u, admin, pimpinan, uid, profil, onTutup } = props
  const [catatanAdmin, setCatatanAdmin] = useState(u.catatanAdmin ?? '')
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)
  const [konfirmasiBatal, setKonfirmasiBatal] = useState(false)

  const milikSaya = u.pengusulUid === uid
  const bisaBatalkan = milikSaya && u.status === 'diajukan'
  const bisaPutuskan = (pimpinan || admin) && u.status === 'diajukan'
  const bisaSelesaikan = admin && u.status === 'disetujui'

  async function ubahStatus(status: StatusUsulan) {
    setGalat('')
    setProses(true)
    try {
      if (status === 'dibatalkan') {
        await simpanDoc('sarpras_usulan', u.id, { status: 'dibatalkan' })
      } else {
        await simpanDoc('sarpras_usulan', u.id, {
          status,
          catatanAdmin: catatanAdmin.trim(),
        })
      }
      await catat(profil, `status:${status}`, 'sarpras_usulan', u.id)
      onTutup()
    } catch {
      setGalat('Gagal menyimpan. Periksa koneksi atau hak akses Anda.')
    } finally {
      setProses(false)
    }
  }

  const baris: [string, string][] = [
    ['Diajukan', formatTanggal(u.createdAt)],
    ['Pengusul', u.pengusulNama || '—'],
    ['Perkiraan biaya', u.perkiraanBiaya != null && u.perkiraanBiaya > 0 ? rupiah(u.perkiraanBiaya) : '—'],
  ]

  return (
    <div className="space-y-3">
      <div><LencanaStatus v={u.status} /></div>
      <p className="text-base font-medium text-[#1a1d33]">{u.barang}</p>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        {baris.map(([a, b]) => (
          <div key={a} className="contents">
            <dt className="text-muted">{a}</dt>
            <dd>{b}</dd>
          </div>
        ))}
      </dl>
      <p className="rounded-lg bg-surface-2 p-3 text-sm">
        <span className="text-muted">Alasan: </span>{u.alasan}
      </p>
      {u.catatanAdmin && u.status !== 'diajukan' && (
        <p className="text-sm">
          <span className="text-muted">Catatan pimpinan/admin: </span>{u.catatanAdmin}
        </p>
      )}

      {galat && <Notice tipe="error">{galat}</Notice>}

      {bisaPutuskan && (
        <div className="space-y-3 border-t border-border pt-3">
          <Field label="Catatan (opsional)">
            <textarea
              className={inputCls}
              rows={2}
              value={catatanAdmin}
              onChange={(e) => setCatatanAdmin(e.target.value)}
              placeholder="Alasan setuju / tolak, sumber dana, catatan…"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
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
            <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
          </div>
        </div>
      )}

      {bisaSelesaikan && (
        <div className="space-y-3 border-t border-border pt-3">
          <Field label="Catatan penyelesaian (opsional)">
            <textarea
              className={inputCls}
              rows={2}
              value={catatanAdmin}
              onChange={(e) => setCatatanAdmin(e.target.value)}
              placeholder="Sudah dibeli / dikerjakan pada…"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={proses}
              onClick={() => void ubahStatus('selesai')}
            >
              {proses ? '…' : 'Tandai selesai'}
            </button>
            <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
          </div>
        </div>
      )}

      {bisaBatalkan && (
        <div className="border-t border-border pt-3">
          {konfirmasiBatal ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">Batalkan usulan ini?</span>
              <button
                type="button"
                className={btnDanger}
                disabled={proses}
                onClick={() => void ubahStatus('dibatalkan')}
              >
                Ya, batalkan
              </button>
              <button type="button" className={btnGhost} onClick={() => setKonfirmasiBatal(false)}>
                Tidak
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnDanger} onClick={() => setKonfirmasiBatal(true)}>
                Batalkan usulan
              </button>
              {!bisaPutuskan && !bisaSelesaikan && (
                <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
              )}
            </div>
          )}
        </div>
      )}

      {!bisaPutuskan && !bisaSelesaikan && !bisaBatalkan && (
        <div className="pt-1">
          <button type="button" className={btnGhost} onClick={onTutup}>Tutup</button>
        </div>
      )}
    </div>
  )
}
