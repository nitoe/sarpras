import type { PeranSarpras } from '../types/user'

export interface MenuItem {
  path: string
  label: string
  /** Peran yang boleh melihat menu ini. */
  untuk: PeranSarpras[]
  /** false = modul belum dibuat, tidak ditampilkan di menu. Ubah jadi true saat halamannya jadi. */
  aktif: boolean
}

const SEMUA: PeranSarpras[] = ['admin', 'pimpinan', 'guru', 'petugas']

export const MENU: MenuItem[] = [
  { path: '/', label: 'Beranda', untuk: SEMUA, aktif: true },
  { path: '/aset', label: 'Aset', untuk: SEMUA, aktif: true },
  { path: '/ruang', label: 'Ruang', untuk: SEMUA, aktif: true },
  { path: '/kerusakan', label: 'Kerusakan', untuk: SEMUA, aktif: true },
  { path: '/peminjaman', label: 'Peminjaman', untuk: ['admin', 'pimpinan', 'guru'], aktif: false },
]

export function menuUntuk(peran: PeranSarpras | null): MenuItem[] {
  if (!peran) return []
  return MENU.filter((m) => m.aktif && m.untuk.includes(peran))
}
