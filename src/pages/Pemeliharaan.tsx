import { Notice, PageHeader } from '../components/ui'

/** Placeholder Sesi 1 — UI lengkap di Sesi 2. */
export default function PemeliharaanPage() {
  return (
    <div className="w-full">
      <PageHeader
        judul="Pemeliharaan"
        keterangan="Jadwal perawatan rutin ruang dan aset"
      />
      <Notice tipe="info">
        Modul sedang disiapkan (Fase 2). Daftar jadwal, penandaan selesai, dan
        jatuh tempo akan muncul di langkah berikutnya.
      </Notice>
    </div>
  )
}
