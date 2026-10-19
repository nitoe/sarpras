import { useMemo } from 'react'
import { useKoleksi } from './useKoleksi'
import { SUMBER_BAWAAN, type SumberDana } from './tipe'

/** Daftar sumber dana dari Firestore; fallback ke bawaan jika kosong. */
export function useDaftarSumber() {
  const kol = useKoleksi<SumberDana>('sarpras_sumber')
  const daftar = useMemo(() => {
    if (kol.data.length > 0) {
      return [...kol.data].sort((a, b) => a.kode.localeCompare(b.kode, 'id'))
    }
    return SUMBER_BAWAAN.map((s) => ({
      id: s,
      kode: s,
      nama: s,
      keterangan: '',
    }))
  }, [kol.data])
  return { ...kol, daftar, dariFirestore: kol.data.length > 0 }
}
