import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, auth } from './firebase'

/** Hanya dua akun ini (UID + email harus cocok) yang boleh generate aset dari foto. */
export const AKUN_AI_ASET = [
  { uid: '2rAXEqFfWDRqxRTY21PV4h9tC5F2', email: 'arif.nitoe@gmail.com' },
  { uid: 'v4fQXsqCzYUtHrqcDM0u48sxIfn1', email: 'arif.azwar79@gmail.com' },
] as const

const REGION_FUNGSI = 'asia-southeast2'

export type ProviderAi = 'gemini' | 'openai'

/**
 * Penentu tampilan tombol AI. Kosmetik saja — gerbang sebenarnya di Cloud Function.
 * Dicek terhadap sesi Firebase Auth, bukan profil Firestore.
 */
export function bolehGenerateAsetAi(uid: string | undefined): boolean {
  if (!uid) return false
  const sesi = auth.currentUser
  if (!sesi || sesi.uid !== uid) return false
  const email = (sesi.email ?? '').trim().toLowerCase()
  return AKUN_AI_ASET.some((a) => a.uid === sesi.uid && a.email === email)
}

export interface HasilAsetAi {
  nama: string
  kategori: string
  kondisi: 'baik' | 'rusak_ringan' | 'rusak_berat'
  jumlah: number
  tahun: number | null
  sumber: string
  catatan: string
}

function pesan(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = String((err as { message: unknown }).message || '')
    if (m && m !== 'internal') return m
  }
  return 'Gagal menghubungi layanan AI.'
}

/** Baca File menjadi base64 murni (tanpa prefix data:). */
export async function fileKeBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return {
    base64: btoa(binary),
    mimeType: file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg',
  }
}

export async function generateAsetDariFoto(input: {
  provider: ProviderAi
  imageBase64: string
  mimeType?: string
  kategori: { kode: string; nama: string }[]
  sumber: { kode: string; nama?: string }[]
  ruang: { id: string; kode: string; nama: string }[]
}): Promise<HasilAsetAi> {
  if (!bolehGenerateAsetAi(auth.currentUser?.uid)) {
    throw new Error('Fitur ini tidak tersedia untuk akun Anda.')
  }
  const panggil = httpsCallable<typeof input, { aset: HasilAsetAi }>(
    getFunctions(app, REGION_FUNGSI),
    'generateAsetAi',
  )
  try {
    const res = await panggil(input)
    return res.data.aset
  } catch (e) {
    throw new Error(pesan(e))
  }
}
