export const KONDISI = [
  { v: 'baik', l: 'Baik' },
  { v: 'rusak_ringan', l: 'Rusak ringan' },
  { v: 'rusak_berat', l: 'Rusak berat' },
] as const
export type Kondisi = (typeof KONDISI)[number]['v']

export const KATEGORI = [
  { kode: 'MBL', nama: 'Mebel' },
  { kode: 'ELK', nama: 'Elektronik' },
  { kode: 'OLR', nama: 'Alat olahraga' },
  { kode: 'PRG', nama: 'Alat peraga' },
  { kode: 'BUK', nama: 'Buku' },
  { kode: 'KND', nama: 'Kendaraan' },
  { kode: 'BGN', nama: 'Bangunan' },
  { kode: 'LNY', nama: 'Lainnya' },
] as const

export const SUMBER = ['BOS', 'Yayasan', 'Hibah', 'Wakaf', 'Lainnya'] as const

export const JENIS_RUANG = [
  'Kelas', 'Perpustakaan', 'Laboratorium', 'Aula', 'Musala', 'Toilet',
  'Kantin', 'Lapangan', 'Kantor', 'Gudang', 'Lainnya',
] as const

export interface Ruang {
  id: string
  kode: string
  nama: string
  jenis: string
  gedung?: string
  penanggungJawab?: string
}

export interface Aset {
  id: string
  kode: string
  nama: string
  kategori: string
  ruangId: string
  jumlah: number
  kondisi: Kondisi
  tahun?: number
  sumber?: string
  nilai?: number
  fotoId?: string
  catatan?: string
}

export const namaKondisi = (v: string) => KONDISI.find((k) => k.v === v)?.l ?? v
export const namaKategori = (kode: string) => KATEGORI.find((k) => k.kode === kode)?.nama ?? kode

export const STATUS_KERUSAKAN = [
  { v: 'baru', l: 'Baru' },
  { v: 'dicek', l: 'Dicek' },
  { v: 'dalam_perbaikan', l: 'Dalam perbaikan' },
  { v: 'selesai', l: 'Selesai' },
] as const
export type StatusKerusakan = (typeof STATUS_KERUSAKAN)[number]['v']
export const namaStatus = (v: string) => STATUS_KERUSAKAN.find((s) => s.v === v)?.l ?? v

export const STATUS_PEMINJAMAN = [
  { v: 'diajukan', l: 'Diajukan' },
  { v: 'disetujui', l: 'Disetujui' },
  { v: 'ditolak', l: 'Ditolak' },
  { v: 'selesai', l: 'Selesai' },
  { v: 'dibatalkan', l: 'Dibatalkan' },
] as const
export type StatusPeminjaman = (typeof STATUS_PEMINJAMAN)[number]['v']
export const namaStatusPeminjaman = (v: string) => STATUS_PEMINJAMAN.find((s) => s.v === v)?.l ?? v

/** Stempel waktu Firestore (null sementara sebelum server mengisinya). */
export interface Waktu {
  toDate(): Date
}

export interface Kerusakan {
  id: string
  ruangId: string
  asetId?: string | null
  deskripsi: string
  fotoId?: string | null
  status: StatusKerusakan
  pelaporUid: string
  pelaporNama: string
  createdBy: string
  penanganan?: string
  biaya?: number | null
  tanggalSelesai?: Waktu | null
  createdAt?: Waktu | null
}

/** Peminjaman ruangan. mulai/selesai disimpan sebagai ISO string (YYYY-MM-DDTHH:mm). */
export interface Peminjaman {
  id: string
  ruangId: string
  keperluan: string
  /** ISO lokal tanpa detik, mis. 2026-10-20T08:00 */
  mulai: string
  selesai: string
  status: StatusPeminjaman
  peminjamUid: string
  peminjamNama: string
  catatanAdmin?: string
  createdAt?: Waktu | null
  updatedAt?: Waktu | null
}

export function formatTanggal(w?: Waktu | null) {
  if (!w) return 'baru saja'
  return w.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Tampilkan rentang waktu peminjaman dari string ISO lokal. */
export function formatRentang(mulai: string, selesai: string) {
  const a = new Date(mulai)
  const b = new Date(selesai)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return `${mulai} – ${selesai}`
  const opsiTanggal: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const opsiJam: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  const tglA = a.toLocaleDateString('id-ID', opsiTanggal)
  const tglB = b.toLocaleDateString('id-ID', opsiTanggal)
  const jamA = a.toLocaleTimeString('id-ID', opsiJam)
  const jamB = b.toLocaleTimeString('id-ID', opsiJam)
  if (tglA === tglB) return `${tglA}, ${jamA} – ${jamB}`
  return `${tglA} ${jamA} – ${tglB} ${jamB}`
}

/** Apakah dua rentang waktu saling tumpang tindih (ujung sama tidak dihitung bentrok). */
export function bentrokJadwal(mulaiA: string, selesaiA: string, mulaiB: string, selesaiB: string) {
  const a0 = new Date(mulaiA).getTime()
  const a1 = new Date(selesaiA).getTime()
  const b0 = new Date(mulaiB).getTime()
  const b1 = new Date(selesaiB).getTime()
  if ([a0, a1, b0, b1].some((n) => Number.isNaN(n))) return false
  return a0 < b1 && b0 < a1
}
