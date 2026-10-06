# Antrian, Hutang, dan Hapus Rekap Teko

- Kasir tetap memakai pembayaran langsung sebagai alur awal. Nama customer dan WhatsApp opsional untuk Cash/QRIS. Untuk Hutang, nama wajib; WhatsApp opsional.
- Pilih produk lalu klik **Antrikan Pesanan** untuk menyimpan tanpa pembayaran. Tidak perlu mengisi uang diterima atau konfirmasi QRIS. Pesanan mendapat nomor A001 dan seterusnya per tanggal WIB.
- Menu **Antrian Teko** di bawah Kasir menampilkan pesanan belum selesai dari semua tanggal. Filter tersedia untuk tanggal, pencarian, dan status. Status: Menunggu, Diproses, Siap. Rincian dapat diedit dan pesanan dapat dibatalkan dengan alasan.
- Harga produk yang sudah ada pada pesanan dipertahankan saat edit. Produk baru mengikuti harga master ketika ditambahkan. HPP laporan sementara mengikuti master sebagaimana pengaturan sebelumnya.
- Klik **Bayar** untuk melunasi dengan Cash/QRIS, atau **Jadikan Hutang** jika barang dibawa tetapi belum dibayar. Antrian dan hutang belum masuk rekap omzet/HPP.
- Menu **Hutang Teko**, di bawah Riwayat Penjualan, menampilkan siapa yang masih berhutang, rincian, dan sisa pembayaran. Tahap ini mendukung pelunasan penuh, belum cicilan.
- **Terima Pembayaran** mencatat pelunasan pada hari ini (WIB). Pesanan September yang dibayar Oktober masuk rekap Oktober. Tanggal pesanan awal tetap tersimpan. Rekap masih harus diajukan dan disetujui sebelum masuk omzet utama.
- Pelunasan aman dari klik ganda. Transaksi lunas dan struk tersedia di Riwayat Penjualan. Pesanan Lunas/Batal dapat dilihat dengan filter status pada Antrian/Hutang.
- Excel laporan bulanan menyertakan customer dan tanggal pesanan dalam Detail Transaksi serta lembar Pesanan Belum Dibayar (berdasarkan tanggal pesanan dalam periode terpilih). Lembar ini menunjukkan status terkini, bukan saldo hutang historis pada akhir periode.
- Pembayaran Antrian/Hutang tetap dapat diselesaikan ketika rekap tanggal pembayaran sudah diajukan/disetujui. Pembayaran masuk ke **Tambahan 1**, **Tambahan 2**, dan seterusnya, berstatus Belum Diajukan. Tidak perlu membuka revisi rekap lama. Ajukan dan approve masing-masing rekap tambahan; kas yang dihitung hanya penerimaan tunai pada rekap terpilih.
- Super Admin dapat **Hapus** di sebelah Ajukan untuk seluruh rincian pada rekap terpilih. Rekap lain pada tanggal yang sama tidak ikut dihapus. Konfirmasi membutuhkan pengetikan tanggal dan alasan. Rekap Submitted/Approved harus dibuka revisinya dahulu hanya jika ingin mengoreksi rekap itu sendiri. Jejak audit tetap ada. Pesanan terkait pembayaran yang dihapus menjadi Batal; pesanan belum dibayar tidak ikut dihapus.
- Master Produk Teko memiliki filter kategori. Pilihan Semua Kategori menampilkan seluruh produk; pilihan kategori mengikuti master yang terdaftar. Unduh Excel/CSV tetap mencakup seluruh master produk.
- Membatalkan transaksi lunas membatalkan pesanan terkait, bukan membuka hutang baru. Bila uang belum diterima, catat kembali hutang yang benar.
- Arsip laporan final yang pernah di-approve tidak berubah. Perubahan ini tidak memerlukan reset database.
