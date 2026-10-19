# Changelog

## 0.5.2 — Oktober 2026
- **Halaman Usulan (Sesi 3):** ajukan pengadaan/perbaikan (barang, alasan, perkiraan biaya).
- Alur status: diajukan → disetujui/ditolak (pimpinan & admin) → selesai (admin); pengusul boleh batalkan saat diajukan.
- Filter status + “usulan saya saja”; StatStrip ringkasan.

## 0.5.1 — Oktober 2026
- **Halaman Pemeliharaan (Sesi 2):** daftar jadwal, filter (aktif/terlambat/7 hari/nonaktif, jenis, ruang), StatStrip.
- Admin: tambah/ubah/hapus jadwal (ruang atau aset, kegiatan, periode, jatuh tempo).
- Admin & petugas: tandai selesai + catatan; opsi majukan jatuh tempo otomatis sesuai periode.

## 0.5.0 — Oktober 2026
- **Fase 2 fondasi (Sesi 1):** tipe `Pemeliharaan` & `Usulan`, menu + route, halaman placeholder.
- Aturan Firestore `sarpras_pemeliharaan` (admin kelola; petugas tandai selesai) dan `sarpras_usulan` (staf ajukan; pimpinan setujui/tolak; pengusul batalkan).
- Menu **Pemeliharaan** (semua peran) dan **Usulan** (admin, pimpinan, guru).

## 0.4.6 — Oktober 2026
- Layout full-width: wrapper halaman memakai `w-full` agar konten mengisi area utama saat zoom-out atau layar lebar.

## 0.4.5 — Oktober 2026
- StatStrip lebih rapat; Beranda ringkasan + pintasan menu.

## 0.4.4 — Oktober 2026
- Layout: sidebar sticky, navigasi bawah dengan `labelPendek` dan safe-area.

## 0.4.3 — Oktober 2026
- Halaman **Pengaturan**: admin mengelola `peranSarpras`; panduan petugas non-guru.

## 0.4.2 — Oktober 2026
- Halaman **Pengembalian** alat; status `pengembalian`.

## 0.4.1 — Oktober 2026
- Peminjaman alat + cek stok.

## 0.4.0 — Oktober 2026
- Modul Peminjaman ruangan + pencegahan bentrok.

## 0.3.0 — Oktober 2026
- Modul Kerusakan.

## 0.2.0 — Oktober 2026
- Modul Ruang & Aset.

## 0.1.0 — Oktober 2026
- Kerangka aplikasi, login, rules, hosting.
