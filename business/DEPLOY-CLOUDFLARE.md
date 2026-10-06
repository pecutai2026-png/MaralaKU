# Deploy BUMM Marala ke Cloudflare

## Pembaruan hemat pembacaan — 1 Oktober 2026

Untuk aplikasi yang sudah online, unggah isi paket terbaru ke repository yang sama dan deploy Worker **bumm-marala** yang sama. Pertahankan nama Worker, binding `MARALA_DB`, class `MaralaDatabase`, dan migration `v1`. Tidak perlu membuat database, melakukan setup admin, mengimpor ulang, atau menghapus data.

Lakukan setelah kuota gratis reset (07.00 WIB). Jika aplikasi sudah dapat dibuka, unduh Cadangan Pemulihan terlebih dahulu dan simpan privat. Indeks pencarian tambahan dibuat otomatis saat server pertama berjalan; proses pertama ini dapat memakai pembacaan tambahan satu kali.

Perubahan internal: indeks riwayat audit dan pencarian records; pembayaran invoice mengambil hanya invoice terkait; HPP kasir mengambil tanggal yang diperlukan; pengambilan SQL identik digunakan kembali hanya dalam satu permintaan Cloudflare. Cache dibatasi 8 MB/256 query, dibuang pada penulisan, rollback, dan akhir permintaan. Tidak menyimpan hasil lintas permintaan atau lintas sesi.

Tampilan, input, multi-tab, aturan approval, data historis, dan rumus laporan dipertahankan. Pengujian: 55 tes lokal dan 7 tes Cloudflare lulus. Simulasi 100 pembacaan identik atas 100 baris turun dari 10.000 ke 100 baris hasil query; ini bukan klaim penghematan 99% untuk seluruh produksi. Besar penghematan akun sebenarnya perlu dilihat di Durable Objects → SQL rows read setelah deployment, dibandingkan pada pola penggunaan serupa. Paket gratis tetap mempunyai batas harian.

## Arsitektur yang digunakan

Aplikasi online memakai **Workers + SQLite-backed Durable Objects**, dengan alamat bawaan `workers.dev`. Database dibuat otomatis oleh konfigurasi deployment. **Tidak perlu membuat D1.** Pilihan ini mempertahankan transaksi SQLite yang sudah digunakan untuk pembayaran, petty cash, dan transfer stok, tanpa menulis ulang logika bisnis. Server lokal tetap dapat dijalankan seperti sebelumnya.

SQLite Durable Objects tersedia di Workers Free. Kuota gratis tetap berlaku; bila habis, permintaan dapat gagal sampai kuota direset. Jangan menganggap gratis tanpa batas. Lihat [ketentuan Cloudflare](https://developers.cloudflare.com/durable-objects/platform/pricing/).

## 1. Unggah kode ke GitHub

Repository tujuan: `gusticahyaningdew-source/BUMM-Marala`.

Jika Git di komputer sudah terhubung, unggah kode menggunakan Git. Jika belum, jalankan `node scripts/package-cloud.cjs`, lalu buka folder hasil di `.publish`. Di GitHub pilih **Add file → Upload files** dan unggah **isi folder kode tersebut**, termasuk subfolder `cloudflare`, `server`, `scripts`, `tests`, dan `legacy`. Jangan mengunggah folder induk sebagai satu tingkat tambahan atau mengunggah ZIP sebagai satu file. Pastikan `package.json` dan `wrangler.jsonc` berada di root repository.

Jangan mengunggah folder `data`, `private-exports`, `.wrangler`, `node_modules`, atau berkas `.env`/`.dev.vars`. Paket kode memakai daftar berkas yang diizinkan dan tidak menyertakan data usaha. Repository private disarankan.

## 2. Buat aplikasi Cloudflare

Pada **Workers & Pages → Create application → Continue with GitHub**, pilih repository tersebut setelah kode terunggah.

Isi pengaturan berikut jika ditampilkan:

| Pengaturan | Nilai |
|---|---|
| Nama Worker | `bumm-marala` |
| Root directory | root repository, kosong atau `/` |
| Build command | `pnpm run build` |
| Deploy command | `pnpm run cloud:deploy` |
| Build environment `NODE_VERSION` | `24` |

Versi package manager dikunci melalui `packageManager` dan `pnpm-lock.yaml`. Dependensi hanya diperlukan untuk build/pengujian. Wrangler membaca `wrangler.jsonc`, mengunggah tujuh aset publik, dan membuat database SQLite terkelola. Jangan memilih jalur upload static files saja karena aplikasi mempunyai backend.

Setelah build sukses, Cloudflare menampilkan alamat aplikasi. Pada deployment pertama, aplikasi sengaja terkunci sampai secret pengaturan tersedia; data lokal belum otomatis pindah.

## 3. Tetapkan secret pengaturan awal

Pada Worker `bumm-marala`, buka **Settings → Variables and Secrets**, tambahkan secret (bukan variable publik) bernama **`SETUP_TOKEN`**. Gunakan nilai acak panjang minimal 32 karakter, misalnya dari password manager. Simpan nilai ini secara privat. Jangan memasukkannya ke kode, repository, atau percakapan. Terapkan perubahan konfigurasi agar secret aktif.

Tanpa secret, siapa pun yang membuka URL aplikasi tidak dapat membuat admin pertama. Secret hanya dipakai untuk membuat admin awal atau memulihkan database kosong. Setelah akun berhasil dibuat/dipulihkan, endpoint tersebut tidak bisa menimpa data existing. Secret boleh dihapus setelah selesai.

## 4. Pindahkan data lokal yang sudah ada

Selesaikan input lokal, lalu hentikan sementara aktivitas transaksi selama perpindahan agar tidak ada transaksi tertinggal.

Cara termudah: login sebagai Super Admin pada aplikasi lokal versi terbaru, buka **Pengaturan → Aplikasi → Unduh Cadangan Pemulihan**. Alternatif dari folder proyek:

```powershell
node scripts/export-cloud.cjs
```

Alat membaca database secara read-only dan membuat `private-exports/marala-cloud.json`. Berkas tersebut berisi data usaha dan hash password akun; sesi login lama tidak dipindahkan. Alat tidak menimpa berkas cadangan yang sudah ada. Untuk membuat cadangan baru gunakan nama keluaran berbeda sebagai argumen ketiga:

```powershell
node scripts/export-cloud.cjs data/marala.sqlite private-exports/marala-cloud-baru.json
```

Pada halaman awal aplikasi online:

1. Isi **Kode pengaturan awal Cloudflare** dengan nilai secret Anda.
2. Pilih berkas **Cadangan lokal (.json)**.
3. Klik **Pulihkan Data Lokal**, lalu konfirmasi.
4. Login menggunakan username dan password lama.

**Jangan membuat admin baru terlebih dahulu jika ingin memindahkan data lama.** Pemulihan hanya menerima database online kosong agar tidak menimpa transaksi. Jika gagal, seluruh pemulihan dibatalkan. ID, nomor invoice, snapshot rekening, riwayat stok, dan akun lama dipertahankan. Batas cadangan sekali impor 32 MB; berkas yang lebih besar membutuhkan migrasi bertahap, jangan dipotong manual.

Jika ingin memulai tanpa data lama, isi nama, username, password, dan kode pengaturan, lalu pilih **Buat Admin Utama**.

## 5. Pemeriksaan setelah online

- Cocokkan jumlah invoice, sisa pembayaran, stok per lokasi, dan total nilai stok dengan aplikasi lokal.
- Periksa login admin/staff, hak akses, logo, rekening invoice, cetak, dan export Excel.
- Uji transaksi kecil yang memang dibutuhkan, termasuk pembayaran bertahap dan transfer stok.
- Setelah hasil sesuai, gunakan alamat online sebagai sumber data utama. Versi lokal dan online tidak saling sinkron otomatis.
- Unduh **Cadangan Pemulihan** secara berkala. Berkas pemulihan hanya untuk admin dan harus disimpan privat. Cadangan data biasa tidak mencakup akun.

## Pengembangan dan pengujian

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run cloud:check
pnpm run test:cloud
```

`cloud:check` adalah build dry-run, tidak menerbitkan aplikasi. `test:cloud` memakai runtime Cloudflare lokal dan database pengujian terpisah. Untuk menjalankan versi Cloudflare lokal, buat `.dev.vars` yang tidak di-commit berisi `SETUP_TOKEN` privat, lalu `pnpm run cloud:dev`. Aplikasi lokal biasa tetap berjalan melalui `node server/server.cjs`.

Jangan mengganti nama kelas `MaralaDatabase`, binding `MARALA_DB`, atau identitas objek `bumm-marala-main` tanpa rencana migrasi; ketiganya menunjuk database online yang persisten. Deploy kode berikutnya mempertahankan database tersebut. Endpoint dan berkas API tidak dicache oleh service worker.
