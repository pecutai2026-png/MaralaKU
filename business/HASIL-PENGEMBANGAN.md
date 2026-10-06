# Hasil Pengembangan BUMM Marala

## 1. File yang diubah / ditambahkan

Diubah: `index.html` dan `sw.js`.

Ditambahkan: `integrated.js`, `integrated.css`, `server/server.cjs`, `server/store.cjs`, `server/migrate.cjs`, `server/workbook.cjs`, `package.json`, `.gitignore`, `Jalankan-BUMM.ps1`, `README.md`, `tests/system.test.cjs`, `tests/browser.cjs`, serta hasil visual pada `tests/artifacts/`.

Salinan awal tersimpan dalam `legacy/`. `app.js` dan stylesheet prototipe dipertahankan; halaman utama kini menggunakan antarmuka terintegrasi dan gaya dasar lama.

## 2. Database / schema

SQLite baru tersedia di `data/marala.sqlite`, schema versi 1. Tabel: records, users, sessions, settings, audit, imports, schema_versions. Data transaksi memiliki nomor unik, kolom tanggal untuk query periode, foreign key unit/produk/invoice, dan penanda arsip. Item dan identitas invoice tersimpan sebagai snapshot.

Migrasi data prototipe tersedia melalui Pengaturan → Aplikasi. Migrasi menyimpan sumber asli dan hash untuk mencegah impor identik berulang. Data localStorage lama tidak dihapus. Database kerja belum diisi data contoh secara otomatis; pengguna membuat admin lalu memilih migrasi data yang sesuai.

## 3. Fitur yang dibuat

- Tema terang/gelap konsisten dan tersimpan; tata letak desktop, tablet, dan HP.
- Unit Bisnis sebagai parent Produk & Jasa; tambah/edit, relasi dan filter unit.
- Invoice dengan nama item, jumlah, satuan, harga, diskon item, catatan, diskon invoice, biaya tambahan, rekening, jatuh tempo, jadwal acara, dan snapshot transaksi. Input customer cepat tetap tersedia.
- Detail/cetak invoice dengan enam baris ringkasan sederhana. Riwayat pembayaran dilipat pada detail, opsional pada cetakan.
- Pembayaran bertahap, validasi batas pembayaran, perhitungan sisa otomatis, pencarian dan ekspor.
- Stok Gudang/Teko, Master Stok, mutasi, stock opname, rekomendasi belanja, gabungan lintas lokasi, nilai stok dan status minimum/maksimum.
- Pengeluaran terstruktur, bukti file, impor XLSX/CSV dengan template, preview, validasi per baris, nomor unik, dan transaksi atomik.
- Pengajuan dengan nomor surat, pengaju, unit, lampiran, status, dan pemeriksaan izin approval di server.
- Petty Cash Rp1.000.000 per periode bulan, dana tambahan, pemotongan pengeluaran, saldo berjalan, riwayat antarbulan.
- Laporan omzet, laba/rugi dengan harga pokok, stock opname, serta ekspor Excel/CSV mengikuti filter server.
- Pengaturan identitas/logo, rekening, opsi invoice, tampilan, pemasangan PWA, migrasi dan cadangan.
- Login, tambah/edit/arsip/nonaktifkan pengguna, reset password, role, permission detail, validasi server, session cookie HttpOnly, scrypt, perlindungan lintas origin, pembatasan percobaan login, audit.

## 4. Pengujian

Sembilan kelompok pengujian otomatis lulus: master/relasi, snapshot invoice dan pembayaran, stok/mutasi/opname, petty cash, laporan/periode, XLSX/CSV, migrasi idempoten, API/login/permission/import, serta settings/approval/nonaktif pengguna.

Pengujian browser Microsoft Edge lulus: setup admin, login, migrasi contoh, invoice dengan item/harga editable, pembayaran, pembukaan 26 halaman, tema setelah reload, ukuran desktop 1440px, tablet 768px, dan HP 390px tanpa overflow halaman. Screenshot ditinjau. File XLSX juga berhasil dibaca openpyxl dengan nominal numerik. Semua file JavaScript utama lulus pemeriksaan sintaks.

Seluruh pengujian transaksi memakai database memori terpisah, bukan database kerja.

## 5. Error / masalah yang diperbaiki

- Total invoice berulang dan rincian diskon tidak tersimpan: kini ringkas dan tersimpan sebagai snapshot.
- Pembatasan akses hanya berupa tampilan: kini API memeriksa setiap tindakan.
- Perubahan nilai pengajuan yang sudah disetujui: wajib memiliki izin approve.
- Impor beberapa pengeluaran yang bersama-sama melebihi Petty Cash: preview menghitung saldo kumulatif dan penyimpanan rollback jika satu baris gagal.
- Filter ekspor lokasi stok dan laporan opname: mengikuti lokasi/periode serta permission laporan yang tepat.
- Saldo stok historis negatif dan perpindahan master lokasi tanpa mutasi: ditolak.
- Cache prototipe lama: diperbarui; API/transaksi tidak disimpan untuk operasi offline.

## 6. Perhatian sebelum penggunaan

Buka http://127.0.0.1:4173 dan buat Super Admin pertama. Server harus berjalan selama aplikasi dipakai. Aplikasi belum dipublikasikan ke internet; penggunaan bersama memerlukan server/HTTPS.

Migrasi tidak dapat merekonstruksi rincian yang memang tidak pernah disimpan prototipe. Invoice tersebut diberi penanda Data Lama dan tetap dapat dilihat, dicetak, serta dibayar. Harga pokok yang tidak diketahui bernilai nol sehingga laporan historis perlu ditinjau.

Impor Excel mendukung XLSX, belum XLS biner lama. Ekspor menggunakan nilai aktual, bukan formula Excel. Cadangkan folder data ketika server berhenti untuk pemulihan lengkap akun dan transaksi.

### Jadwal absensi mingguan — 4 Oktober 2026
- Pengaturan & Rekap Absen > Atur jadwal: pilih Masuk/Libur untuk Senin–Minggu, jam tiap hari, dan tanggal mulai berlaku (hari ini atau sesudahnya).
- Perubahan menyimpan versi jadwal; tanggal sebelumnya dan jadwal pada absensi yang sudah masuk tetap. Jadwal lama tetap dapat dibaca.
- Rekap dan Excel menyertakan tanggal Libur dan Tidak ada absensi setelah jam pulang terlewati. Hari mendatang ditandai Belum berlangsung. Rentang maksimum 366 hari sekali lihat/unduh.
- Hanya Super Admin mengatur jadwal dan melihat/mengekspor seluruh rekap. Akun lain hanya melihat jadwal dan riwayatnya sendiri. Hari libur tidak dapat absen masuk; sesi yang sudah terbuka tetap dapat absen pulang.
- Pengujian: 76 tes lokal, 10 tes Cloudflare lokal, dan build Cloudflare dry-run lulus. Belum deploy produksi.

### Penguncian tombol absensi harian
Tanggal absen ditampilkan dari server WIB tanpa input yang dapat diedit. Sesudah absen pulang kedua tombol nonaktif; filter riwayat tidak memengaruhi penguncian. Tampilan diperbarui pada pergantian tanggal server, tanpa polling berkala. Server tetap menolak absen ganda. 78 tes lokal dan build Cloudflare dry-run lulus.

### Approval stok tanggal persetujuan — 5 Oktober 2026
- Approval baru memakai tanggal server WIB untuk mutasi keluar; omzet tetap tanggal penjualan. Mutasi menyimpan referensi tanggal penjualan.
- Stok kurang menampilkan nama barang, kebutuhan, saldo, dan kekurangan. Seluruh approval dibatalkan jika stok kurang; dapat diulang setelah stok ditambahkan.
- Pemakaian pada stock opname mengikuti tanggal mutasi approval termasuk penjualan tanggal sebelumnya. Mutasi approval lama tidak diubah.
- 79 tes lokal dan 10 tes Cloudflare lokal lulus. Belum deploy produksi.
