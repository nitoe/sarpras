import type { AppUser, PeranSarpras } from '../types/user'

const PERAN_VALID: PeranSarpras[] = ['admin', 'pimpinan', 'guru', 'petugas']
const ROLE_GURU = ['admin', 'guru', 'guru_tahsin_tahfizh', 'guru_akademik']

export const NAMA_PERAN: Record<PeranSarpras, string> = {
  admin: 'Admin Sarpras',
  pimpinan: 'Pimpinan',
  guru: 'Guru / Karyawan',
  petugas: 'Petugas',
}

/**
 * Peran efektif di aplikasi sarpras. Aturannya HARUS sama dengan fungsi `peranSarpras()`
 * di firestore.rules.sarpras: admin Penilaian = admin sarpras; selain itu field
 * `peranSarpras`; bila kosong, semua jenis guru = 'guru'. Selain itu: tidak punya akses.
 * Ini hanya untuk tampilan. Penegakan akses yang sebenarnya ada di Firestore rules.
 */
export function peranDari(profil: AppUser | null): PeranSarpras | null {
  if (!profil || profil.aktif === false) return null
  if (profil.role === 'admin') return 'admin'
  // Bila field ada tetapi isinya tidak dikenal, rules menolak akses; tampilan ikut menolak.
  if (profil.peranSarpras) return PERAN_VALID.includes(profil.peranSarpras) ? profil.peranSarpras : null
  if (profil.role && ROLE_GURU.includes(profil.role)) return 'guru'
  return null
}
