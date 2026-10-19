import type { PeranSarpras } from '../types/user'

export interface MenuItem {
  path: string
  label: string
  /** Label singkat untuk navigasi bawah di layar kecil. */
  labelPendek?: string
  /** Peran yang boleh melihat menu ini. */
  untuk: PeranSarpras[]
  /** false = modul belum dibuat, tidak ditampilkan di menu. Ubah jadi true saat halamannya jadi. */
  aktif: boolean
}

const SEMUA: PeranSarpras[] = ['admin', 'pimpinan', 'guru', 'petugas']

export const MENU: MenuItem[] = [
  { path: '/', label: 'Beranda', labelPendek: 'Beranda', untuk: SEMUA, aktif: true },
  { path: '/aset', label: 'Aset', labelPendek: 'Aset', untuk: SEMUA, aktif: true },
  { path: '/ruang', label: 'Ruang', labelPendek: 'Ruang', untuk: SEMUA, aktif: true },
  { path: '/kerusakan', label: 'Kerusakan', labelPendek: 'Rusak', untuk: SEMUA, aktif: true },
  { path: '/peminjaman', label: 'Peminjaman', labelPendek: 'Pinjam', untuk: ['admin', 'pimpinan', 'guru'], aktif: true },
  { path: '/pengembalian', label: 'Pengembalian', labelPendek: 'Kembali', untuk: ['admin', 'pimpinan', 'guru'], aktif: true },
  { path: '/pemeliharaan', label: 'Pemeliharaan', labelPendek: 'Rawat', untuk: SEMUA, aktif: true },
  { path: '/usulan', label: 'Usulan', labelPendek: 'Usulan', untuk: ['admin', 'pimpinan', 'guru'], aktif: true },
  { path: '/pengaturan', label: 'Pengaturan', labelPendek: 'Atur', untuk: ['admin'], aktif: true },
]

export function menuUntuk(peran: PeranSarpras | null): MenuItem[] {
  if (!peran) return []
  return MENU.filter((m) => m.aktif && m.untuk.includes(peran))
}
