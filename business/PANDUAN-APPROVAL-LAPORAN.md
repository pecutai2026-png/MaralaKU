# Approval Semua Laporan

## Alur kerja

1. Buka Laporan → Approval Semua Laporan.
2. Pilih bulan lalu Gunakan Bulan, atau isi tanggal mulai dan akhir. Klik Tampilkan Laporan.
3. Periksa Laba Rugi, Omzet, Stock Opname dan catatan pemeriksaan.
4. Super Admin klik Approve Semua Laporan, masukkan password akun sendiri, lalu Approve & Kunci Arsip.
5. Status berubah menjadi Disetujui. Unduh Excel dari arsip untuk disetor ke atasan.
6. Jika diperlukan, buka izin perubahan master untuk admin melalui Manajemen Pengguna secara manual. Approval tidak memberi izin tersebut otomatis.

## Yang otomatis dan yang tetap

- Selama belum disetujui, HPP invoice dihitung dari HPP master terbaru, kemudian dialokasikan sesuai pembayaran. Nama/harga jual/nominal tagihan invoice tidak ditulis ulang.
- Penjualan yang terhubung ke produk dan memiliki jumlah memakai HPP master × jumlah. Penjualan total manual tanpa produk/jumlah tetap memakai HPP total yang diinput; sistem tidak menebak jumlah dari harga jual. Ada catatan pemeriksaan untuk transaksi tersebut.
- HPP rekap kasir dihitung dari item dan jumlah transaksi dengan HPP master Teko terbaru. Harga jual dan uang masuk tetap sesuai transaksi kasir. Approval kasir harian berbeda dari Approval Semua Laporan.
- Pengeluaran dan Stock Opname mengikuti catatan transaksinya. Perubahan master tidak menulis ulang mutasi/jumlah stok historis.
- Setelah approval, salinan ketiga laporan dan rincian ekspornya tersimpan permanen. Perubahan master, nama unit, biaya, atau transaksi berikutnya tidak mengubah arsip tersebut.
- Laporan biasa dan dashboard menggunakan salinan untuk rentang tanggal yang sama persis dengan arsip, tanpa filter pencarian/unit. Rentang lain atau filter tambahan diberi label laporan sementara. Untuk angka resmi selalu buka arsip approval.

## Izin manual

Untuk akun non-Super Admin, perubahan Master Data (unit, produk/jasa, referral) dan Master Produk Teko membutuhkan izin modul asal **serta** izin **Izin manual ubah master (Tambah/Edit/Hapus)**. Izin tambahan ini kosong secara default, termasuk untuk Admin yang sudah ada. Super Admin memberi tindakan yang diperlukan, misalnya hanya Edit, dan dapat mencabutnya lagi. Customer dan pencatatan transaksi harian tetap memakai izin yang sudah ada.

## Perlindungan arsip

- Server memeriksa role Super Admin dan password saat approval. Lima kesalahan password membatasi percobaan selama 15 menit.
- Jika data berubah setelah pratinjau, approval ditolak: tampilkan laporan kembali dan periksa sebelum mencoba lagi.
- Periode tidak boleh bertumpang tindih dengan arsip yang sudah disetujui. Rentang maksimal 367 hari; arsip terlalu besar perlu dibagi menjadi periode lebih pendek.
- Tidak tersedia edit/hapus/menimpa arsip. Database juga menolak update/delete arsip, termasuk oleh Super Admin melalui aplikasi.
- Nama akun, nomor approval, periode dan waktu tersimpan. Password tidak masuk arsip maupun riwayat aktivitas.
- Arsip ikut cadangan pemulihan. Tidak ada reset data saat pembaruan ini.

Fitur sudah disiapkan lokal. Untuk aplikasi online, gunakan folder paket .publish terbaru dan deploy melalui alur GitHub/Cloudflare yang sama. Tidak ada deploy otomatis ke produksi.
