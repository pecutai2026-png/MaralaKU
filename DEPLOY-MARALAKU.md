# Deploy MaralaKu ke Cloudflare

Paket ini menjalankan platform demo lengkap melalui Workers dan SQLite Durable Objects. Registry akun, trial dan admin berada di satu objek; setiap UUID usaha memiliki objek database sendiri. Aktivasi mengubah status layanan tanpa memindahkan atau menghapus data usaha. Database lokal tidak otomatis masuk ke cloud. Akun cloud baru perlu dibuat.

## Melalui GitHub Desktop

1. Repository: `pecutai2026-png/MaralaKU`.
2. Commit perubahan, lalu Push origin.
3. Cloudflare → Workers & Pages → maralaku → Settings → Build.
4. Root directory: root repository (`/`), bukan `business`.
5. Build command: `npm run build`.
6. Deploy command: `npx wrangler deploy`.
7. Production branch: `main`; aktifkan automatic builds/deployments.

Wrangler root menentukan backend dan direktori aset `dist/public`. Jangan memilih `business` sebagai output statis. Jangan mengunggah data, node_modules, .dev.vars, .env atau backup.

## Membuat admin pertama

1. Cloudflare → maralaku → Settings → Variables and Secrets (runtime, bukan variabel build).
2. Add → Type: Secret → Name: `SETUP_TOKEN`.
3. Isi kode acak pribadi minimal 32 karakter; simpan kode itu. Jangan gunakan password akun atau contoh publik.
4. Simpan dan deploy perubahan secret.
5. Buka alamat aplikasi ditambah `/admin`.
6. Isi nama, email, password dan kode pengaturan yang sama.
7. Setelah admin dibuat, setup tidak bisa dipakai lagi. Login berikutnya hanya email dan password.

Tanpa secret yang benar, orang lain tidak bisa mengambil alih pembuatan admin pertama. Secret tidak dikirim ke browser atau disimpan dalam Git.

## Verifikasi sesudah deploy

- Beranda tampil, Paket Usaha ada di `/paket-usaha`, pesan formulir membuka WhatsApp.
- Daftar usaha baru dengan nomor WA; coba toko, kafe dan jasa.
- Login admin terpisah; peserta dan aktivitas terlihat.
- Kasir: bayar langsung masuk laporan; akun usaha lain tidak melihat transaksi tersebut.
- Admin dapat mengakhiri/perpanjang trial, blokir/buka blokir, aktivasi dan ekspor backup privat.
- Data tetap tersedia sesudah deploy berikutnya. Jangan mengubah nama binding, migration, atau nama registry tanpa rencana migrasi data.

Backup ekspor privat mengandung akun dan data usaha; simpan secara privat. Aktivasi saat ini adalah tindakan admin, bukan integrasi pembayaran atau penagihan otomatis. Kebijakan akses trial mempertahankan kemampuan melihat/mengekspor data dan mengunci perubahan saat waktunya habis.

## Pengujian lokal

Node.js 24 atau lebih baru:

```text
npm ci
npm run cloud:check
npm run test:cloud
npm test
```

`cloud:check` hanya membangun paket dan dry-run; tidak mengubah deploy cloud. Pengujian cloud memakai simulator Cloudflare dan database sementara. Cloudflare SQLite Durable Objects tersedia pada Free plan, dengan kuota layanan yang berlaku. Periksa pemakaian sebelum membuka demo secara luas.

Sumber: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/ dan https://developers.cloudflare.com/workers/configuration/secrets/
