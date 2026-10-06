# Pengembangan Pengadaan & Referral — 24 September 2026

## Hasil

- Keuangan: Pengeluaran → Pengadaan → Pengajuan → Petty Cash.
- Master Data: Unit Bisnis → Produk & Jasa → Customer → Referral.
- Kedua modul memakai tabel, modal, pencarian, filter tanggal, pagination, ekspor Excel/CSV, input massal atomik dan jejak akun yang sudah ada.
- Pengadaan memakai izin Pengeluaran; Referral memakai izin Master Data. Tidak mengubah izin akun tersimpan.

## Pengadaan

Nomor otomatis PGD/tahun/urutan. Tanggal, unit bisnis, jenis, quantity, harga, total otomatis, sumber dana, metode, status, deskripsi dan catatan.

Persediaan memilih barang dari Master Stok dan lokasi Gudang/Teko Marala; satuan mengikuti master. Aset menyimpan nama, satuan, kategori, lokasi dan nilai perolehan dalam record pengadaan, tanpa menduplikasi aset ke tabel lain. Master supplier belum tersedia sehingga tidak dibuatkan master baru.

- Draft dan Dibatalkan belum memengaruhi kas/stok/aset.
- Dibayar berarti barang sudah diterima dan pembayaran sudah penuh. Penyimpanan pengadaan, arus kas dan mutasi stok dilakukan dalam satu transaksi database.
- Petty Cash berkurang melalui riwayat arus keluar pengadaan, terpisah dari Pengeluaran operasional.
- Rekening merekam ID rekening dan nilai arus keluar. Aplikasi sebelumnya belum mempunyai saldo buku bank, jadi tidak menampilkan saldo bank rekaan atau memindahkan uang di bank sesungguhnya. Sumber Lainnya juga dicatat sebagai arus keluar.
- Persediaan otomatis membuat satu mutasi Masuk dengan ID pengadaan dan nilai pembelian.
- Pengadaan Dibayar tidak bisa diedit/dihapus. Draft dapat diedit/diarsipkan. Modul ini belum menyediakan retur, pembayaran cicilan, atau pembalikan pengadaan dibayar.
- Nilai stok dengan penerimaan pengadaan menggunakan nilai pembelian dan rata-rata nilai tersisa; transfer membawa nilai persediaan ke lokasi tujuan. Barang tanpa riwayat pengadaan tetap memakai cara penilaian lama. Tidak memperbarui harga master secara paksa.
- Pengadaan tidak masuk records jenis expenses, sehingga tidak menambah beban pada laporan maupun dashboard. Tidak ada penyusutan otomatis.
- Pemakaian stok tetap mengikuti alur existing: HPP pada invoice/penjualan dan HPP standar kasir. Mutasi Keluar tidak otomatis membuat beban tambahan agar HPP tidak dihitung dua kali. Pemakaian operasional yang belum tercakup HPP dicatat melalui Pengeluaran sesuai praktik aplikasi sebelumnya.

## Referral

Customer disimpan melalui customerId dari master existing. Nama ditampilkan dari master terbaru. Marketing berupa teks, nominal angka Rupiah bulat nonnegatif, tanggal dan catatan. Beberapa referral untuk customer yang sama disimpan sebagai ID berbeda. Mendukung edit, arsip, pencarian nama customer, filter customer, marketing, tanggal dan ekspor. Referral bukan transaksi kas/beban otomatis; pembayaran komisi dicatat melalui Pengeluaran.

## Database dan kompatibilitas

Tidak ada tabel baru, reset, migrasi data lama, perubahan nomor existing, ataupun penghapusan data existing. Menggunakan records JSON yang tersedia:

- procurements: transaksi pengadaan dan informasi perolehan aset/persediaan.
- procurementcash: catatan arus kas pengadaan, terhubung procurementId, bankId jika Rekening, date, source, method, unitId, amount dan delta negatif.
- referrals: customerId, marketing, amount, date, notes.
- movements existing ditambah procurementId dan acquisitionValue untuk mutasi otomatis baru.
- Rekam aktivitas/audit existing tetap dipakai. Record internal arus kas tidak dapat diubah lewat endpoint CRUD publik.
- Cadangan existing otomatis menyertakan jenis record baru karena memakai tabel records yang sama.

Laporan masa depan dapat menjumlahkan pengeluaran dibayar + procurementcash untuk arus kas keluar, memisahkan pengadaan berdasarkan type, dan mengelompokkan referral berdasarkan customerId/marketing/date. Tidak menambahkan halaman laporan baru.

## Berkas

Diubah:
- server/domain.cjs: jenis record, referral, petty cash, perlindungan relasi, nilai persediaan.
- server/api.cjs: lookup yang dibutuhkan izin modul dan kolom ekspor.
- server/inventory.cjs: transfer membawa nilai persediaan pengadaan.
- integrated.js: menu, form dinamis, tabel, filter dan input massal.
- integrated.css: menyembunyikan field kondisional.
- sw.js: versi cache baru.
- scripts/package-cloud.cjs: memasukkan dokumen ini dalam paket.

Ditambahkan:
- server/procurement.cjs: validasi dan transaksi pengadaan atomik.
- tests/procurement.test.cjs: skenario pengadaan dan referral.
- HASIL-PENGADAAN-REFERRAL.md: laporan ini.

## Verifikasi

29 pengujian lulus: suite sistem, POS, snapshot, Cloudflare dan pengadaan/referral. Termasuk lima skenario yang diminta: aset 2 juta, gula 500 ribu, servis AC 500 ribu, CRUD referral dan referral kedua untuk customer sama. Tambahan: beda harga beli, transfer nilai stok, saldo tidak cukup, rollback massal, referensi invalid, nominal negatif, tanggal invalid, izin API, ekspor, penguncian transaksi dibayar, rename customer dan filter.

Pemeriksaan browser lokal: menu, halaman, form Pengadaan, perpindahan Aset/Persediaan, total 25 × 20.000 = 500.000, dan filter Referral. Tidak menyimpan transaksi uji ke database kerja; pengujian transaksi memakai database sementara.

Belum deploy online. Unggah seluruh isi paket kode terbaru ke GitHub sesuai alur Cloudflare existing. Jangan mengganti identitas Worker, binding database atau nama Durable Object.
