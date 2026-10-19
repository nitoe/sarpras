/**
 * Mengecilkan foto di peramban lalu mengubahnya menjadi data URL JPEG.
 * Batas rules: 300.000 karakter; di sini dijaga di bawah 280.000.
 */
const BATAS = 280_000

export async function kecilkanFoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Berkas harus berupa gambar.')
  const bmp = await createImageBitmap(file)
  let sisi = 1024
  for (let percobaan = 0; percobaan < 6; percobaan++) {
    const skala = Math.min(1, sisi / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bmp.width * skala))
    canvas.height = Math.max(1, Math.round(bmp.height * skala))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Peramban tidak mendukung pengolahan gambar.')
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    for (const mutu of [0.72, 0.6, 0.5]) {
      const url = canvas.toDataURL('image/jpeg', mutu)
      if (url.length <= BATAS) {
        bmp.close()
        return url
      }
    }
    sisi = Math.round(sisi * 0.75)
  }
  bmp.close()
  throw new Error('Foto terlalu besar untuk dikecilkan. Coba foto lain.')
}
