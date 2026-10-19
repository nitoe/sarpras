# Sarpras — SD Muhammadiyah 01 Kukusan

Aplikasi sarana dan prasarana sekolah: aset, ruang, laporan kerusakan, peminjaman.

Frontend: **Vite + React 19 + TypeScript + Tailwind CSS v4**
Backend: **Firebase** (Authentication + Firestore + Hosting), project `sdm01kukusan-2e735` (sama dengan Penilaian)

URL tujuan: `https://sarpras.sdmuhammadiyah01kks.sch.id`

Rancangan: [docs/RANCANGAN.md](docs/RANCANGAN.md) · Pemasangan: [docs/DEPLOY.md](docs/DEPLOY.md)

## Menjalankan di komputer

```bash
npm install
cp .env.example .env     # isi nilai Firebase (sama dengan .env Penilaian)
npm run dev
```

## Perintah

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build ke `dist/` |
| `npm run lint` | Periksa kode (oxlint) |
| `npm run deploy` | Build + deploy ke situs Hosting `sdm01-sarpras` |

## Struktur

```
src/
  components/   Layout, ui
  context/      AuthContext
  lib/          firebase, auth, peran, menu
  pages/        Login, Beranda (modul lain menyusul)
  types/
firestore.rules.sarpras   aturan untuk ditempel ke rules Penilaian (tidak di-deploy dari sini)
```
