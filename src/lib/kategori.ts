import { useMemo } from 'react'
import { useKoleksi } from './useKoleksi'
import { KATEGORI_BAWAAN, type Kategori } from './tipe'

/** Daftar kategori dari Firestore; fallback ke bawaan jika koleksi kosong. */
export function useDaftarKategori() {
  const kol = useKoleksi<Kategori>('sarpras_kategori')
  const daftar = useMemo(() => {
    if (kol.data.length > 0) {
      return [...kol.data].sort((a, b) => a.kode.localeCompare(b.kode, 'id'))
    }
    return KATEGORI_BAWAAN.map((k) => ({ id: k.kode, kode: k.kode, nama: k.nama }))
  }, [kol.data])
  return { ...kol, daftar, dariFirestore: kol.data.length > 0 }
}
