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
  { v: 'pengembalian', l: 'Menunggu pengembalian' },
  { v: 'ditolak', l: 'Ditolak' },
  { v: 'selesai', l: 'Selesai' },
  { v: 'dibatalkan', l: 'Dibatalkan' },
] as const
export type StatusPeminjaman = (typeof STATUS_PEMINJAMAN)[number]['v']
export const namaStatusPeminjaman = (v: string) => STATUS_PEMINJAMAN.find((s) => s.v === v)?.l ?? v

/** Status yang masih “mengunci” stok alat. */
export const STATUS_STOK_AKTIF: StatusPeminjaman[] = ['diajukan', 'disetujui', 'pengembalian']

export type JenisPeminjaman = 'ruang' | 'alat'

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

/**
 * Peminjaman ruangan atau alat.
 * - jenis 'ruang' (atau kosong untuk data lama): field ruangId wajib.
 * - jenis 'alat': field asetId dan jumlahPinjam wajib; ruangId opsional/kosong.
 * mulai/selesai: ISO lokal tanpa detik (YYYY-MM-DDTHH:mm).
 * Alur alat: diajukan → disetujui → pengembalian (oleh peminjam) → selesai (oleh admin).
 */
export interface Peminjaman {
  id: string
  /** 'ruang' | 'alat'. Data lama tanpa field ini dianggap 'ruang'. */
  jenis?: JenisPeminjaman
  ruangId?: string | null
  asetId?: string | null
  /** Jumlah unit alat yang dipinjam (hanya untuk jenis alat). */
  jumlahPinjam?: number
  keperluan: string
  mulai: string
  selesai: string
  status: StatusPeminjaman
  peminjamUid: string
  peminjamNama: string
  catatanAdmin?: string
  /** Catatan saat peminjam mengajukan pengembalian alat. */
  catatanPengembalian?: string
  createdAt?: Waktu | null
  updatedAt?: Waktu | null
}

export function jenisPinjam(p: Peminjaman): JenisPeminjaman {
  return p.jenis === 'alat' ? 'alat' : 'ruang'
}

// ---- Fase 2: Pemeliharaan & Usulan ------------------------------------------

export const PERIODE_PEMELIHARAAN = [
  { v: 'mingguan', l: 'Mingguan' },
  { v: 'bulanan', l: 'Bulanan' },
  { v: 'triwulan', l: 'Triwulan' },
  { v: 'semester', l: 'Semester' },
  { v: 'tahunan', l: 'Tahunan' },
] as const
export type PeriodePemeliharaan = (typeof PERIODE_PEMELIHARAAN)[number]['v']
export const namaPeriode = (v: string) => PERIODE_PEMELIHARAAN.find((p) => p.v === v)?.l ?? v

export type JenisPemeliharaan = 'ruang' | 'aset'

/**
 * Jadwal pemeliharaan rutin.
 * jatuhTempo / terakhirDilakukan: YYYY-MM-DD.
 * Setelah ditandai selesai, admin/petugas mengisi terakhirDilakukan dan boleh memajukan jatuhTempo.
 */
export interface Pemeliharaan {
  id: string
  jenis: JenisPemeliharaan
  ruangId?: string | null
  asetId?: string | null
  kegiatan: string
  periode: PeriodePemeliharaan | string
  jatuhTempo: string
  terakhirDilakukan?: string | null
  petugasUid?: string | null
  petugasNama?: string
  catatan?: string
  /** nonaktif = jadwal dihentikan tanpa dihapus */
  aktif?: boolean
  createdBy?: string
  createdAt?: Waktu | null
  updatedAt?: Waktu | null
}

export const STATUS_USULAN = [
  { v: 'diajukan', l: 'Diajukan' },
  { v: 'disetujui', l: 'Disetujui' },
  { v: 'ditolak', l: 'Ditolak' },
  { v: 'selesai', l: 'Selesai' },
  { v: 'dibatalkan', l: 'Dibatalkan' },
] as const
export type StatusUsulan = (typeof STATUS_USULAN)[number]['v']
export const namaStatusUsulan = (v: string) => STATUS_USULAN.find((s) => s.v === v)?.l ?? v

/**
 * Usulan pengadaan atau perbaikan.
 * Alur: diajukan → disetujui/ditolak (pimpinan/admin) → selesai (admin); pengusul boleh batalkan saat diajukan.
 */
export interface Usulan {
  id: string
  /** Nama barang atau kegiatan yang diusulkan */
  barang: string
  alasan: string
  perkiraanBiaya?: number | null
  status: StatusUsulan
  pengusulUid: string
  pengusulNama: string
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

/**
 * Jumlah unit alat yang sudah terpakai (masih aktif) pada rentang waktu,
 * tidak termasuk id pengajuan yang diabaikan (untuk cek saat menyetujui sendiri).
 */
export function stokTerpakai(
  semua: Peminjaman[],
  asetId: string,
  mulai: string,
  selesai: string,
  kecualiId?: string,
) {
  return semua
    .filter(
      (p) =>
        p.id !== kecualiId &&
        jenisPinjam(p) === 'alat' &&
        p.asetId === asetId &&
        STATUS_STOK_AKTIF.includes(p.status) &&
        bentrokJadwal(mulai, selesai, p.mulai, p.selesai),
    )
    .reduce((n, p) => n + (p.jumlahPinjam ?? 1), 0)
}
