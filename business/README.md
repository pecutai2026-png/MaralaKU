# BUMM Marala Management System

Versi online Cloudflare telah disiapkan menggunakan Workers dan SQLite-backed Durable Objects. Panduan upload GitHub, deploy, secret admin awal, dan pemindahan data ada di [DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md). Tidak perlu membuat database D1. Perintah server lokal di bawah tetap berlaku.

## Pembaruan stok mandiri dan menu

Menu utama berurutan Dashboard, Transaksi, Master Data, Stok, Keuangan, Laporan, dan Pengaturan. Kelompok menu dapat dibuka-tutup.

Stok kini terpisah dari Produk & Jasa penjualan. **Master Stok Gudang** berisi nama barang, satuan, minimal/maksimal Teko, minimal/maksimal Gudang, dan HPP per satuan. Setiap barang otomatis tersedia di kedua lokasi. Input stok cukup memilih barang dan jumlah; HPP mengikuti master stok.

**Transfer Stok** mencatat pengurangan lokasi asal dan penambahan lokasi tujuan secara atomik. Stok tidak cukup membatalkan seluruh transfer. Riwayat transfer dipertahankan. Stok Keseluruhan menampilkan saldo per lokasi, gabungan per barang, serta jumlah nilai berdasarkan HPP. Dashboard menampilkan Nilai Seluruh Stok.

Schema versi 2 menambahkan jenis data `stockitems` dan `transfers`. Migrasi mempertahankan ID lokasi dan riwayat stok lama, lalu melepaskan referensi aktif ke unit/produk penjualan. Data asal tetap tercatat sebagai metadata migrasi. `server/inventory.cjs` mengelola master mandiri, migrasi, dan transfer.

Aplikasi terintegrasi dengan server Node.js 24+, SQLite, dan antarmuka Bahasa Indonesia. Tidak membutuhkan pemasangan paket untuk menjalankan server.

## Menjalankan

1. Jalankan `node server/server.cjs` dari folder proyek, atau jalankan `Jalankan-BUMM.ps1` di PowerShell.
2. Buka http://127.0.0.1:4173.
3. Pada pembukaan pertama, buat akun Super Admin dengan password minimal 10 karakter. Tidak ada password bawaan.
4. Untuk membawa data prototipe, buka **Pengaturan → Aplikasi → Impor Data Lama**. Proses membaca data browser pada alamat yang sama dan data contoh proyek. Jika data berada di alamat/perangkat lain, gunakan file cadangan prototipe JSON. Penyimpanan browser lama tidak dihapus.

Server secara bawaan hanya menerima koneksi dari komputer ini. Untuk pemakaian bersama, jalankan pada server yang dapat diakses pengguna, dengan HTTPS melalui reverse proxy. Atur `HOST`, `PORT`, dan `SECURE_COOKIES=1` ketika HTTPS digunakan. Jangan membuka akses umum sebelum admin awal dibuat. Pemasangan PWA tersedia melalui HTTPS atau localhost; transaksi selalu membutuhkan server.

## Struktur dan data

- `index.html`, `integrated.js`, `integrated.css`: antarmuka terintegrasi; gaya dasar `styles.css` dipertahankan.
- `server/server.cjs`: API, sesi, pemeriksaan izin, impor/ekspor, serta penyajian aplikasi.
- `server/store.cjs`: validasi transaksi, relasi, perhitungan, dan database SQLite.
- `server/migrate.cjs`: migrasi tambahan tanpa menghapus sumber lama; setiap sumber asli disimpan dan ditandai dengan SHA-256 agar impor identik tidak berulang.
- `server/workbook.cjs`: pembacaan/penulisan Excel XLSX dan CSV, tanpa ketergantungan eksternal.
- `data/marala.sqlite`: database persisten. Folder ini tidak masuk Git.
- `legacy/`: salinan aplikasi sebelum pengembangan ini. `app.js` asli juga dipertahankan sebagai referensi; halaman utama sekarang memakai `integrated.js`.
- `tests/system.test.cjs`: pengujian aturan bisnis, API, izin, migrasi, dan ekspor.
- `tests/browser.cjs`: pengujian browser dengan Playwright dan Microsoft Edge, memakai database memori terpisah.

Schema versi 1 menggunakan tabel `records` (jenis data, kolom relasi FK, tanggal, nomor unik, payload transaksi, soft delete), `users`, `sessions`, `settings`, `audit`, `imports`, dan `schema_versions`. Relasi unit/produk/invoice disimpan sebagai foreign key. Relasi item invoice, customer, dan stok divalidasi server sebelum penyimpanan. Nomor transaksi tetap unik, termasuk setelah arsip.

## Aturan perhitungan

- Invoice: total harga − diskon item − diskon invoice + biaya lainnya. Rupiah disimpan sebagai bilangan bulat; jumlah stok dapat memakai maksimal tiga desimal.
- Data item, harga modal, identitas, rekening, dan pengaturan dicatat sebagai snapshot invoice. Perubahan master berikutnya tidak mengubah snapshot lama.
- Pembayaran kumulatif tidak boleh melebihi total invoice; penghapusan pembayaran menghitung kembali sisa tagihan.
- Laporan memakai basis tanggal invoice dan penjualan langsung. Pembayaran invoice tidak ditambahkan lagi sebagai omzet. Jangan memasukkan invoice yang sama sebagai penjualan langsung.
- Laba/rugi = pendapatan − harga pokok − pengeluaran berstatus Dibayar. Harga pokok data lama yang tidak tersedia bernilai nol dan ditandai pada tampilan.
- Stok berasal dari mutasi dan stock opname. Saldo historis negatif ditolak. Lokasi barang yang sudah memiliki riwayat tidak bisa diganti langsung; gunakan mutasi keluar/masuk.
- Stok keseluruhan menampilkan rincian lokasi dan gabungan per barang. Nilai gabungan menjumlah nilai masing-masing lokasi sehingga tetap benar jika harga lokasi berbeda.
- Filter stok menampilkan saldo hingga tanggal akhir. Filter pada mutasi/opname menampilkan pergerakan selama tanggal mulai–akhir.
- Petty Cash mendapat alokasi awal Rp1.000.000 untuk setiap bulan. Saldo bulan sebelumnya tetap dapat dilihat dan tidak otomatis dibawa ke bulan baru. Hanya pengeluaran Dibayar dengan sumber Petty Cash yang mengurangi saldo.
- Persetujuan pengajuan memerlukan permission approve, termasuk perubahan pada pengajuan yang sudah disetujui. Pengajuan tidak otomatis dihitung sebagai pengeluaran; pencairan aktual dicatat melalui Pengeluaran agar tidak terjadi pencatatan ganda.

## Impor dan ekspor

Impor pengeluaran mendukung `.xlsx` (sheet pertama) dan `.csv`, maksimal 2.000 baris. Unduh template dari halaman Pengeluaran. Kolom: `number,date,category,description,unit,amount,method,source,status,notes`. Nama unit harus sudah terdaftar. Tanggal YYYY-MM-DD atau nilai tanggal Excel; nominal tanpa pemisah ribuan. Isi nilai langsung, bukan formula.

Pratinjau menampilkan error per baris, termasuk nomor ganda dan saldo Petty Cash kumulatif. Penyimpanan dilakukan dalam satu transaksi: jika ada error, tidak ada baris yang disimpan. File `.xls` lama belum didukung; simpan ulang sebagai `.xlsx`.

Laporan dan daftar transaksi dapat diunduh ke XLSX/CSV sesuai filter yang aktif. Lampiran transaksi mendukung PNG/JPEG/WebP/PDF hingga 2 MB per file.

## Keamanan dan cadangan

Password di-hash dengan scrypt dan salt acak. Sesi memakai cookie HttpOnly, SameSite=Strict, kedaluwarsa 12 jam, dan token acak yang di-hash pada database. API memeriksa permission di server pada setiap permintaan. Perubahan akun/password membatalkan sesi pengguna terkait. CSRF lintas origin ditolak; percobaan login dibatasi. Frontend meng-escape teks sebelum memasukkannya ke HTML.

Cadangan data JSON tersedia khusus Super Admin di Pengaturan → Aplikasi. Untuk pemulihan lengkap termasuk akun, hentikan server lalu salin seluruh folder `data`. Untuk memulihkan, hentikan server dan gunakan salinan folder `data` yang telah diverifikasi. Cadangan JSON tidak berisi password akun dan bukan pengganti cadangan database penuh.

## Pengujian

Jalankan `node --test tests/system.test.cjs`.

Uji browser: `node tests/browser.cjs`. Memerlukan Playwright dan Microsoft Edge. Variabel `PLAYWRIGHT_PATH` dapat menunjuk lokasi paket Playwright pada komputer lain. Pengujian tidak mengubah database produksi. Screenshot verifikasi tersedia di `tests/artifacts/`.

## Catatan migrasi

Prototipe lama tidak menyimpan relasi unit invoice, seluruh detail item, harga modal, rekening, dan tanggal mutasi asli. Data yang tersedia dipertahankan; field yang tidak diketahui tidak ditebak. Invoice lama ditempatkan pada unit **Data Lama**, rincian yang tidak tersedia diberi keterangan, dan saldo awal stok contoh diberi tanggal 22 September 2026. Invoice migrasi tetap dapat dilihat, dicetak, dan dibayar. Pengeditan rincian yang tidak tersedia dibatasi agar tidak menciptakan data historis palsu.

## Kasir Teko Marala

Menu Teko Marala berisi Kasir, Dashboard Teko, Master Produk Teko, Approval, dan Laporan Bulanan.

1. Isi Master Produk Teko (dapat massal): kategori, nama produk, harga, HPP standar per porsi, status aktif.
2. Kasir memilih kategori, mencentang produk, mengatur jumlah, kemudian memilih Cash atau QRIS. Cash membutuhkan jumlah uang diterima; QRIS membutuhkan konfirmasi manual. Transaksi belum masuk omzet utama. Struk dapat dicetak melalui browser, termasuk Simpan sebagai PDF. Printer harus tersedia pada perangkat pengguna.
3. Buka Approval, pilih bulan, lalu Ajukan pada tanggal penjualan. Isi penerimaan tunai yang dihitung, tanpa uang modal kas. Selisih wajib diberi alasan dan tidak mengubah omzet.
4. Super Admin memeriksa lalu menyetujui. Satu total omzet dan HPP dicatat per tanggal penjualan. Detail produk tetap tersimpan. Pengajuan/approval mengunci transaksi tanggal tersebut.
5. Untuk koreksi: Super Admin Buka Revisi dengan alasan. Total sebelumnya ditarik dari omzet; batalkan transaksi salah dengan alasan lalu input penggantinya. Ajukan dan approve kembali. Riwayat revisi dipertahankan.
6. Laporan Bulanan secara bawaan memilih bulan sebelumnya. Excel berisi sembilan sheet: Ringkasan, Produk Harian Disetujui, Produk Harian Pending, Matriks Disetujui, Matriks Operasional, Rekap Harian, Rekap Produk, Detail Transaksi, Riwayat Revisi. PDF melalui Cetak / Simpan PDF berisi ringkasan dan detail produk harian. Laporan belum final bila masih ada transaksi belum approved.

Dashboard utama memisahkan HPP Teko Marala dan HPP Unit Lain. HPP transaksi adalah snapshot standar saat penjualan, tidak berubah mengikuti perubahan master. Modul ini tidak mengurangi stok bahan secara otomatis. Laporan kasir tidak mengarang rincian produk dari penjualan manual lama.

Untuk akun selain Super Admin, atur izin Kasir Teko, Master Produk Teko, Laporan Teko, Rekap dan Approval Teko di Manajemen Pengguna. Approval/revisi tetap hanya Super Admin, meskipun akun lain diberi izin approve. Aplikasi memerlukan koneksi; QRIS belum terhubung ke penyedia pembayaran. Cetak PDF menggunakan dialog cetak browser.

### Penyempurnaan kasir
Dashboard utama berada paling atas. Dashboard Teko tampil sebelum Kasir dan berisi grafik omzet harian serta lima produk aktif terlaris/paling sedikit terjual (termasuk nol). Kasir menampilkan 12 produk per halaman dengan pencarian dan kategori; keranjang bertahan saat berganti halaman. Riwayat, approval, dashboard, dan laporan/export dapat difilter rentang tanggal maksimal 367 hari untuk laporan. Master produk merupakan daftar produk saat ini, bukan transaksi bertanggal.
Tanggal penjualan baru dikunci ke hari ini dalam WIB, termasuk validasi server. Input pengganti untuk koreksi tidak dapat ditanggalmundurkan. Rekap lama tetap dapat dibuka untuk membatalkan transaksi salah dan diajukan ulang dengan audit.

### Jejak Input dan Riwayat Aktivitas
Data baru mencatat pembuat, waktu dibuat, pengubah terakhir, dan waktu perubahan dari akun login. Identitas aktivitas baru disimpan sebagai snapshot nama/username sehingga tetap terbaca setelah akun berganti nama. Jejak Input pada tabel mengikuti izin lihat modul. Super Admin memiliki Pengaturan → Riwayat Aktivitas dengan filter tanggal WIB dan pencarian akun/data; mencakup input massal, impor, pengaturan, akun, kasir, approval, revisi, dan arsip. Data lama memakai jejak yang tersedia; pencipta yang tidak tercatat ditampilkan sebagai tidak tercatat. Impor merekam pelaku impor, bukan menebak pembuat sumber lama. Catatan berupa siapa/tindakan/waktu/data terkait, bukan perbandingan seluruh nilai sebelum-sesudah. Gunakan akun terpisah untuk setiap petugas. Password dan isi lampiran tidak disalin ke log aktivitas.

## Password pada Manajemen Pengguna

Super Admin melihat kolom Password di antara Username dan Role. Tombol mata membuka password selama 30 detik; klik lagi untuk menyembunyikan. Password lama yang hanya memiliki hash ditandai Perlu reset. Setelah dibuat/reset, password bisa ditampilkan. Login tetap memeriksa hash, sedangkan salinan yang bisa dibuka disimpan dengan AES-256-GCM dan terikat ID akun. API daftar pengguna dan sesi tidak mengirim password.

Setiap pembukaan dicatat sebagai password-view tanpa isi password di Riwayat Aktivitas. Role selain SUPER ADMIN tidak dapat memakai endpoint pembukaan, termasuk akun dengan izin pengelolaan pengguna. Cadangan pemulihan privat menyertakan salinan terenkripsi dan kuncinya agar pemulihan tetap berfungsi; pemilik cadangan lengkap dapat membuka salinan tersebut. Cadangan tetap harus disimpan privat dan tidak dimasukkan ke GitHub.
