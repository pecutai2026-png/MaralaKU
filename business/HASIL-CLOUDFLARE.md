# Hasil penyiapan Cloudflare

## Perubahan

- `server/domain.cjs`: logika bisnis bersama untuk SQLite lokal dan Cloudflare, termasuk transaksi bersarang dan preview yang selalu rollback.
- `server/store.cjs`, `server/server.cjs`: adapter SQLite/server lokal tetap tersedia.
- `server/api.cjs`: API bersama, permission, session, laporan, import/export; perubahan pengaturan kini atomik.
- `server/inventory.cjs`, `server/migrate.cjs`: menggunakan logika bersama dan transaksi portable.
- `cloudflare/worker.mjs`, `cloudflare/sqlite.cjs`, `cloudflare/transport.cjs`: backend Cloudflare, penyimpanan persisten, login limiter persisten, cookie Secure, dan admin awal terlindungi secret.
- `server/snapshot.cjs`, `scripts/export-cloud.cjs`: cadangan lengkap privat dan pemulihan database kosong, tanpa mengubah sumber.
- `integrated.js`: kode pengaturan awal, pemulihan data lama, dan unduhan cadangan pemulihan untuk Super Admin.
- `scripts/build-cloud.cjs`, `scripts/package-cloud.cjs`, `wrangler.jsonc`, `package.json`, lockfile: build, paket unggahan, dan konfigurasi deployment.
- `.gitignore`, `sw.js`, dokumentasi, serta pengujian diperbarui.

## Database

Tabel bisnis dan ID lama tetap dipertahankan. Cloudflare menambahkan `cloud_large_values` untuk lampiran/JSON besar dan `login_attempts` untuk pembatasan login yang bertahan setelah restart. Database lokal produksi tidak dimigrasikan atau dihapus. Salinan privat dibuat di `private-exports/marala-cloud.json` dan berhasil dipulihkan ke database pengujian di memori.

## Validasi

- 11 pengujian fungsi lokal lulus.
- 1 pengujian pemulihan snapshot, relasi, riwayat, rollback, dan pencegahan overwrite lulus.
- 4 pengujian runtime Cloudflare lokal lulus: pengaturan awal, permission, pembayaran/transfer bersamaan, impor atomik, export terfilter, lampiran besar, pemulihan akun, dan persistensi setelah restart.
- Pengujian browser lokal mencakup 27 halaman, invoice, pembayaran, transfer, tema, desktop dan HP.
- Pengujian browser Cloudflare: input kode pengaturan, unggah cadangan, login akun lama, dashboard mobile lulus.
- Build Wrangler dry-run berhasil; hanya tujuh aset frontend publik disertakan.

Masalah yang ditemukan dan ditangani: SQLite Cloudflare memakai API transaksi berbeda; JSON lampiran besar perlu dipecah ke beberapa baris; perubahan beberapa pengaturan sebelumnya dapat tersimpan sebagian; konfigurasi emulator terbaru membutuhkan format baru untuk persistensi. Pengujian yang sempat gagal selama penyesuaian sudah diperbaiki dan dijalankan ulang.

## Status deployment

Kode siap untuk tahap unggah dan deployment. Belum diunggah ke GitHub dan belum diterbitkan di Cloudflare. Pemeriksaan GitHub melalui Git memerlukan autentikasi yang belum tersedia pada alat. Paket unggahan dibuat tanpa data usaha dan secret. Ikuti `DEPLOY-CLOUDFLARE.md` untuk langkah berikutnya.

Batasan: paket gratis mengikuti kuota Cloudflare; pemulihan sekali unggah dibatasi 32 MB; database lokal dan online tidak sinkron otomatis. Hasil pengujian lokal tidak menggantikan pemeriksaan setelah deployment pada akun Cloudflare pengguna.
