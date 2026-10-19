# CHANGELOG

Riwayat perubahan (tambahkan di bagian atas, jangan menghapus entri lama).

## 0.4.3 — Oktober 2026
- Halaman **Pengaturan** (hanya Admin Sarpras): daftar staf, ubah field `peranSarpras` (pimpinan / guru / petugas / otomatis).
- Panduan di halaman untuk menambah petugas kebersihan (bukan guru) lewat Firebase Console Authentication + dokumen `users`.
- Admin Penilaian tetap otomatis Admin Sarpras (tidak diubah lewat form).

## 0.4.2 — Oktober 2026
- Halaman **Pengembalian** alat: peminjam mengajukan pengembalian untuk alat yang statusnya Disetujui; admin mengonfirmasi diterima atau menolak (status kembali Disetujui).
- Status baru `pengembalian` (Menunggu pengembalian); field `catatanPengembalian`.
- Aturan Firestore: peminjam boleh mengubah `disetujui` → `pengembalian` (+ catatanPengembalian) hanya untuk jenis alat.
- Stok alat tetap terhitung selama status `pengembalian` (belum dikonfirmasi selesai).

## 0.4.1 — Oktober 2026
- Modul Peminjaman diperluas: selain ruangan, staf dapat meminjam **alat** (aset).
- Form ajukan: pilih jenis Ruangan atau Alat; untuk alat pilih aset, jumlah unit, waktu, keperluan.
- Cek stok alat: menghitung unit yang sudah diajukan/disetujui pada rentang waktu yang sama; pengajuan ditolak jika melebihi sisa stok.
- Filter daftar menurut jenis (ruangan/alat); data lama tanpa field `jenis` tetap dianggap peminjaman ruangan.
- Aset kategori Bangunan dan kondisi rusak berat tidak ditawarkan untuk dipinjam.

## 0.4.0 — Oktober 2026
- Modul Peminjaman ruangan: staf mengajukan (ruang, waktu mulai–selesai, keperluan); admin menyetujui/menolak/menandai selesai; peminjam dapat membatalkan pengajuan sendiri.
- Pencegahan bentrok jadwal: peringatan saat mengajukan atau menyetujui jika ada peminjaman lain (diajukan/disetujui) pada ruang dan waktu yang sama; pengajuan ditolak otomatis bila sudah ada yang disetujui.
- Filter status, ruang, dan “peminjaman saya saja”; ringkasan jumlah per status.

## 0.3.0 — Oktober 2026
- Modul Kerusakan: semua staf melapor (ruang, barang opsional, keterangan, foto); admin dan petugas mengubah status (Baru, Dicek, Dalam perbaikan, Selesai), penanganan, dan biaya; admin dapat memperbarui kondisi barang di daftar aset.
- Beranda menampilkan jumlah laporan yang belum selesai.

## 0.2.0 — Oktober 2026
- Modul Ruang: daftar, tambah, ubah, hapus (admin); hapus ditolak bila ruang masih berisi aset.
- Modul Aset: daftar, cari, filter ruang/kategori/kondisi, ringkasan, detail, tambah/ubah/hapus (admin), kode aset otomatis `SDM01-<KATEGORI>-<RUANG>-<NOMOR>`, foto dikecilkan di peramban, cetak daftar.
- Beranda menampilkan ringkasan jumlah. Setiap perubahan dicatat ke `sarpras_log`.
- Kategori sementara berupa daftar tetap di kode (`src/lib/tipe.ts`), belum koleksi `sarpras_kategori`.

## 0.1.0 — Oktober 2026
- Kerangka aplikasi: Vite + React 19 + TypeScript + Tailwind v4, tampilan seragam dengan Penilaian.
- Login Firebase (project sama dengan Penilaian), peran sarpras, tata letak (sidebar dan navigasi bawah).
- `firestore.rules.sarpras`: aturan koleksi `sarpras_*` untuk digabung ke rules Penilaian.
- Konfigurasi Firebase Hosting situs kedua `sdm01-sarpras`.
