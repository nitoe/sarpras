import { Notice, PageHeader } from '../components/ui'

/** Placeholder Sesi 1 — UI lengkap di Sesi 3. */
export default function UsulanPage() {
  return (
    <div className="w-full">
      <PageHeader
        judul="Usulan"
        keterangan="Usulan pengadaan barang atau perbaikan"
      />
      <Notice tipe="info">
        Modul sedang disiapkan (Fase 2). Form pengajuan, persetujuan pimpinan,
        dan status usulan akan muncul di langkah berikutnya.
      </Notice>
    </div>
  )
}
