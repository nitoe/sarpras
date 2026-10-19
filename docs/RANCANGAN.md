# Rancangan Aplikasi Sarpras — SD Muhammadiyah 01 Kukusan

Draf 2, Oktober 2026. Menggantikan draf 1 (docx) setelah memeriksa repo `nitoe/SDM01Penilaian` dan `nitoe/sdm01kks`.

Status: Firebase project yang sama dengan Penilaian sudah disetujui. Tahap 2 (kerangka) selesai; tahap 3 (rules) berupa berkas siap tempel.

## 1. Perubahan dari draf 1

Draf 1 menyebut pola "GitHub Pages + Firebase Auth + Apps Script + Sheets" sebagai pola aplikasi Kelas 5A dan Kuis. Pola itu memang ada, tetapi bukan pola aplikasi Penilaian. Hasil pemeriksaan repo:

| Aplikasi | Teknologi | Alamat |
| --- | --- | --- |
| Penilaian | Vite + React 19 + TypeScript + Tailwind v4; Firebase Authentication + Firestore + Hosting | penilaian.sdmuhammadiyah01kks.sch.id |
| Portal sekolah | TanStack Start + Vite + Nitro (server Node), PostgreSQL; di Hostinger Node.js Web Apps | sdmuhammadiyah01kks.sch.id |

Karena itu, kesimpulan draf 2:

1. **Frontend: tetap Vite + React 19 + TypeScript + Tailwind CSS v4**, sama dengan Penilaian. Tidak memakai TanStack Start seperti portal, karena aplikasi sarpras tidak butuh server Node sendiri.
2. **Data dan login: Firebase pada project yang sama dengan Penilaian** (`sdm01kukusan-2e735`). Guru memakai akun yang sama; tidak ada akun baru. Data sarpras disimpan di koleksi Firestore berawalan `sarpras_`.
3. **Penayangan: Firebase Hosting (situs kedua), bukan file di Hostinger.** Hostinger hanya dipakai untuk DNS (catatan CNAME/TXT untuk `sarpras`). Ini sama dengan cara `penilaian.` dipasang.
4. **Google Sheets tidak menjadi penyimpanan utama.** Sheets tetap hadir sebagai keluaran: rekap bisa diunduh ke Excel/CSV dari aplikasi.

Alasan tidak memakai Sheets + Apps Script: akun guru dan aturan akses sudah ada di Firebase; Apps Script perlu verifikasi token sendiri dan lambat saat "bangun" setelah lama tidak dipakai (padahal aplikasi ini jarang dibuka); Firestore gratis (kuota Spark) lebih dari cukup untuk ratusan sampai ribuan aset.

## 2. Tujuan dan batasan

Mencatat dan melaporkan sarana prasarana: aset, ruang, kerusakan, peminjaman, lalu pemeliharaan dan usulan pengadaan. Bukan pembukuan keuangan sekolah.

## 3. Pengguna dan peran

| Peran | Siapa | Boleh |
| --- | --- | --- |
| admin | Waka Sarpras / operator | Semua: aset, ruang, pengguna, setujui peminjaman, tutup laporan |
| pimpinan | Kepala sekolah, Wakasek | Lihat dashboard dan laporan, setujui usulan pengadaan |
| guru | Guru dan TU | Lapor kerusakan, ajukan peminjaman, lihat aset per ruang |
| petugas | Petugas kebersihan / penjaga | Ubah status perbaikan, isi catatan pemeliharaan |

Admin Penilaian otomatis menjadi admin sarpras. Semua jenis guru otomatis berperan guru. Peran pimpinan dan petugas diberikan lewat field `peranSarpras` pada `users/{uid}` (hanya admin yang bisa mengisi). Peran **dicek di Firestore security rules**, bukan hanya di tampilan. Siswa dan orang tua tidak masuk ke aplikasi.

## 4. Fitur dan fase

**Fase 1:** inventaris aset (kode, kategori, ruang, jumlah, kondisi, tahun, sumber dana, foto); data ruang; lapor kerusakan (Baru → Dicek → Dalam perbaikan → Selesai); peminjaman ruang/alat dengan pencegahan bentrok jadwal.

**Fase 2:** jadwal pemeliharaan rutin; usulan pengadaan dan perbaikan; laporan cetak/Excel; label QR pada aset.

## 5. Data (Firestore)

| Koleksi | Isi utama |
| --- | --- |
| `sarpras_ruang` | kode, nama, jenis, gedung/lantai, penanggung jawab |
| `sarpras_kategori` | kode, nama |
| `sarpras_aset` | kode aset, nama, kategori, ruangId, jumlah, kondisi, tahun, sumber dana, nilai (opsional), fotoId, catatan |
| `sarpras_kerusakan` | tanggal, pelapor, asetId/ruangId, deskripsi, fotoId, status, penanganan, biaya, tanggal selesai |
| `sarpras_peminjaman` | peminjam, ruang/aset, keperluan, mulai, selesai, status, catatan pengembalian |
| `sarpras_pemeliharaan` | aset/ruang, kegiatan, periode, jatuh tempo, terakhir dilakukan, petugas (fase 2) |
| `sarpras_usulan` | pengusul, barang/kegiatan, alasan, perkiraan biaya, status (fase 2) |
| `sarpras_foto` | gambar terkompres (WebP, maks sekitar 150 KB) |
| `sarpras_log` | waktu, pengguna, tindakan |

Kode aset: `SDM01-<KATEGORI>-<RUANG>-<NOMOR>`, contoh `SDM01-MBL-K5A-001`.

**Foto.** Firebase Storage sejak 2024 umumnya mensyaratkan paket Blaze (perlu kartu). Untuk menghindarinya, foto dikecilkan di peramban lalu disimpan di `sarpras_foto`. Cukup untuk ratusan foto. Jika kelak butuh banyak, pindah ke Storage tanpa mengubah struktur lain. (Dicek ulang di konsol Firebase sebelum diputuskan.)

## 6. Penayangan

1. Di Firebase project `sdm01kukusan-2e735`, buat situs Hosting kedua (mis. `sdm01-sarpras`).
2. Tambahkan domain khusus `sarpras.sdmuhammadiyah01kks.sch.id`.
3. Firebase memberi catatan DNS; masukkan di DNS domain (hPanel Hostinger bila DNS dikelola di sana).
4. Subdomain `penilaian.` dan portal tidak terpengaruh.

## 7. Struktur repo

```
sarpras/
  docs/                 # RANCANGAN.md, DEPLOY.md, DATA_MODEL.md
  public/               # logo dan font (sama dengan Penilaian)
  src/
    components/         # ui.tsx, Layout, Icon (disalin dari Penilaian)
    lib/                # firebase, auth, akses data
    pages/              # beranda, aset, ruang, kerusakan, peminjaman, admin
    types/
    App.tsx  main.tsx  index.css
  firebase.json         # situs Hosting sarpras
  firestore.rules.sarpras   # aturan koleksi sarpras_ (ditempel ke rules Penilaian)
  CHANGELOG.md  ANTIREGRESI.md  README.md
```

Satu project Firebase hanya punya satu berkas rules, milik repo Penilaian. Aturan sarpras disimpan di `firestore.rules.sarpras` untuk ditempel ke rules Penilaian; repo sarpras tidak men-deploy rules supaya aturan Penilaian tidak tertimpa.

## 8. Tampilan

Mengikuti `DESIGN.md` Penilaian: biru `#313083`, Inter, kartu datar bergaris tipis, sidebar kiri biru tua, navigasi bawah di layar kecil, CSP hanya `'self'`. Komponen `ui.tsx` dan token warna disalin.

## 9. Tahapan

1. **Rancangan dikunci** (dokumen ini).
2. **Kerangka aplikasi:** Vite + React + TS + Tailwind v4, tampilan seragam, login Firebase, peran, situs Hosting dan subdomain.
3. **Aturan Firestore:** gabungkan aturan `sarpras_*` dengan aturan Penilaian; uji sebelum deploy.
4. **Inventaris dan ruang** (tambah, ubah, cari, filter kondisi, foto, cetak per ruang).
5. **Lapor kerusakan**, dicoba beberapa guru.
6. **Peminjaman.**
7. **Uji coba bersama, peluncuran.**
8. **Fase 2.**

Persiapan data awal (daftar ruang dan aset dalam template Excel) berjalan paralel sejak tahap 2, karena biasanya paling lama.

## 10. Keputusan yang masih terbuka

- Siapa Admin Sarpras dan siapa yang mengisi data awal.
- Apakah data aset sudah ada (buku inventaris/Excel).
- Apakah ada kebutuhan mendesak selain peminjaman (akreditasi, laporan ke yayasan).
- DNS `sdmuhammadiyah01kks.sch.id` dikelola di hPanel Hostinger atau di tempat lain.
