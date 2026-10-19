/** Unduh data sebagai CSV (UTF-8 BOM) agar terbuka rapi di Microsoft Excel / LibreOffice. */

function sel(v: unknown): string {
  if (v == null || v === '') return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Unduh berkas CSV. `baris` = array of row arrays (tanpa header). */
export function unduhCsv(namaFile: string, header: string[], baris: unknown[][]) {
  const lines = [
    header.map(sel).join(','),
    ...baris.map((r) => r.map(sel).join(',')),
  ]
  // BOM supaya Excel Windows mengenali UTF-8
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFile.endsWith('.csv') ? namaFile : `${namaFile}.csv`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function stempelTanggal() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}
