export type PeranSarpras = 'admin' | 'pimpinan' | 'guru' | 'petugas'

/** Profil di koleksi `users/{uid}` (dibagi dengan aplikasi Penilaian). */
export interface AppUser {
  uid: string
  email: string
  nama: string
  gelar?: string
  /** Peran di Penilaian: admin, guru, guru_tahsin_tahfizh, guru_akademik, orangtua, dll. */
  role?: string
  /** Peran khusus aplikasi sarpras. Hanya admin yang boleh mengisinya. */
  peranSarpras?: PeranSarpras
  aktif?: boolean
}
