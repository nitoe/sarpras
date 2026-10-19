# ANTIREGRESI

Aturan agar perbaikan tidak rusak lagi. Tambahkan di bawah; jangan menghapus entri lama.

1. **Rules tidak di-deploy dari repo ini.** Satu project Firebase hanya punya satu `firestore.rules` (milik repo SDM01Penilaian). Men-deploy rules dari sini akan menimpa aturan Penilaian. `firebase.json` repo ini sengaja hanya berisi `hosting`.
2. **Peran dicek di rules, bukan di tampilan.** `peranDari()` (src/lib/peran.ts) hanya mengatur menu. Bila logika peran diubah, ubah juga `peranSarpras()` di `firestore.rules.sarpras`.
3. **Pemilik akun tidak boleh mengubah `peranSarpras`.** Aturan `users` di Penilaian membatasi pemilik ke `nama`, `gelar`, `updatedAt`. Jangan melonggarkan.
4. **Tampilan mengikuti DESIGN.md Penilaian.** Satu warna merek `#313083`, tanpa gradient, font Inter dari `public/fonts`, tanpa CDN (CSP hanya `'self'`).
5. **Menu modul baru:** tambahkan di `src/lib/menu.ts` dan ubah `aktif` menjadi `true` hanya saat halamannya selesai.
