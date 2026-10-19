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

export function formatTanggal(w?: Waktu | null) {
  if (!w) return 'baru saja'
  return w.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
