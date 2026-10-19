# Pemasangan — Sarpras

Dilakukan sekali. Aplikasi ditayangkan di **Firebase Hosting** (situs kedua di project yang sama dengan Penilaian). Hostinger hanya dipakai untuk DNS.

## 1. Siapkan komputer
Node.js 20 ke atas, lalu `npm install -g firebase-tools` dan `firebase login`.

## 2. Buat situs Hosting kedua
```bash
firebase hosting:sites:create sdm01-sarpras --project sdm01kukusan-2e735
```
Bila nama sudah dipakai, pilih nama lain dan samakan di `.firebaserc`.
`.firebaserc` sudah memetakan target `sarpras` ke `sdm01-sarpras`.

## 3. Isi .env
Salin nilai dari `.env` Penilaian ke `.env` di repo ini.

## 4. Izinkan domain untuk login
Firebase Console → Authentication → Settings → Authorized domains → tambahkan
`sarpras.sdmuhammadiyah01kks.sch.id` (dan `sdm01-sarpras.web.app` bila belum ada).

## 5. Tempel aturan Firestore (di repo SDM01Penilaian)
Buka `firestore.rules.sarpras`, tempel Bagian A dan Bagian B sesuai petunjuk di dalamnya ke `firestore.rules` Penilaian. Lalu di repo Penilaian: `npm run deploy:rules`.
Jangan men-deploy rules dari repo sarpras (lihat ANTIREGRESI.md butir 1).

## 6. Deploy pertama
```bash
npm run deploy
```
Hasil sementara ada di `https://sdm01-sarpras.web.app`.

## 7. Domain khusus
Firebase Console → Hosting → situs `sdm01-sarpras` → Add custom domain → `sarpras.sdmuhammadiyah01kks.sch.id`. Masukkan catatan DNS (TXT/A atau CNAME) yang ditampilkan ke DNS domain (hPanel Hostinger → Domains → DNS Zone, bila DNS dikelola di sana). Sertifikat HTTPS dibuat otomatis, biasanya dalam beberapa jam.

## 8. Beri peran sarpras
Admin Penilaian otomatis menjadi Admin Sarpras. Semua guru otomatis berperan "guru". Untuk pimpinan atau petugas: di Firebase Console → Firestore → `users/{uid}` tambahkan field `peranSarpras` (teks) berisi `pimpinan` atau `petugas`. Pengguna perlu masuk ulang.

## Catatan
- Login di `sarpras.` terpisah dari `penilaian.`: guru perlu masuk sekali di tiap alamat (akun dan kata sandinya sama).
- Domain `penilaian.` dan portal tidak terpengaruh.
