# Pembaruan stok dan riwayat Teko — 3 Oktober 2026

- Stock opname dan mutasi: pilih lokasi, lalu barang. Input massal juga memisahkan pilihan per lokasi. Pergantian lokasi menghapus pilihan barang yang tidak sesuai.
- Master Stok Gudang: kolom kategori dapat diisi melalui Edit maupun Input Massal. Data lama tidak diubah otomatis; gunakan filter Belum berkategori untuk melengkapinya.
- Kategori mengikuti master pada Stok Gudang, Stok Teko, Stok Keseluruhan, Mutasi, Transfer, Stock Opname, Rekomendasi Belanja, laporan opname sementara, serta ekspor terkait. Arsip laporan yang sudah disetujui tetap tersimpan.
- Riwayat Teko: nama produk dan jumlah, username penginput, waktu input aktual WIB, username penerima pembayaran, serta waktu pembayaran. Data lama tanpa waktu diberi keterangan Tidak tercatat.
- Filter nama produk dan metode dapat digabung dengan tanggal. Hutang belum lunas mengikuti tanggal pesan; transaksi lunas mengikuti tanggal bayar. Filter Hutang juga menampilkan pelunasan tanpa duplikasi. Hutang belum lunas tidak masuk omzet.
- Filter Transfer tersedia untuk data yang memakai metode tersebut; perubahan ini tidak menambahkan metode baru pada kasir.
- Tidak ada polling otomatis baru. Perhitungan saldo, omzet, HPP, dan approval tetap memakai alur yang ada.

## Penerapan

Paket ini berisi kode saja, tanpa database atau kredensial. Ikuti DEPLOY-CLOUDFLARE.md untuk memperbarui aplikasi yang sama. Pertahankan binding Durable Object dan data produksi; tidak perlu reset atau impor ulang database. Sesudah deploy, muat ulang aplikasi agar pembaruan tampilan digunakan.

Validasi: 55 pengujian regresi, 4 pengujian stok/riwayat baru, dan 7 pengujian Cloudflare lokal berhasil. Build dan dry-run Cloudflare berhasil. Belum dideploy ke Cloudflare produksi.

## Hubungan produk kasir dengan Stok Teko

Di Master Produk Teko, klik **Atur stok** pada produk. Tambahkan barang Stok Teko dan jumlah pemakaian untuk setiap satu produk terjual. Contoh: Es Teh Large memakai 1 cup besar dan 1 sedotan. Jumlah mengikuti satuan master stok, maksimal tiga desimal. Daftar kosong berarti tidak ada pengurangan otomatis. Produk yang dibuat massal dapat diatur melalui Atur stok setelah disimpan.

Pengaturan disalin saat pesanan dibuat. Pesanan lama tidak mendapat pengaturan baru secara retroaktif. Antrian dan hutang belum memotong stok; setelah lunas dan rekap di-approve, stok berkurang. Pembatalan sebelum approval tidak memotong stok. Approval yang gagal karena stok kurang tidak menyimpan pengurangan sebagian. Isi stok melalui transfer/mutasi yang benar sebelum mencoba lagi.

Pembukaan revisi membatalkan mutasi otomatis rekap tersebut; approval ulang membuat mutasi sesuai transaksi yang masih selesai. Pengurangan terlihat pada Mutasi Stok dengan referensi tanggal, nomor rekap tambahan, dan revisi. Stok Gudang tidak terpotong. HPP produk tetap memakai perhitungan sebelumnya, sehingga biaya kemasan tidak dihitung dua kali. Ekspor master Teko menyertakan rincian pemakaian stok.

Saldo stok selama belum approval belum dikurangi penjualan tersebut. Validasi pembaruan hubungan stok: 62 pengujian lokal dan 8 pengujian Cloudflare lokal lolos; dry-run berhasil. Belum deploy produksi.

## Edit Massal dan Atur Stok Massal

- Master Produk Teko memiliki tombol Edit Massal dan Atur Stok Massal.
- Pilih data (maksimal 100), klik Lanjutkan, periksa dan ubah masing-masing bagian, lalu Simpan Semua. Pencarian dan pilihan mengikuti daftar/filter yang sedang dibuka.
- Atur Stok Massal mendukung susunan barang berbeda per produk. Tombol salin susunan produk pertama mengganti susunan seluruh produk pilihan setelah konfirmasi. Daftar kosong menonaktifkan pemakaian stok untuk pesanan baru.
- Edit Massal tersedia pada daftar master, customer/kontak, invoice beserta itemnya, pembayaran, penjualan manual, pengeluaran, pengadaan, pengajuan, Petty Cash, pengguna beserta izin akses, dan antrian yang belum selesai.
- Catatan stok yang sebelumnya tidak dapat diedit (mutasi, opname, transfer), rekap kasir otomatis, dan arsip laporan tidak dibuka untuk edit massal. Halaman pengaturan tunggal tetap memakai form pengaturan yang ada.
- Hanya kolom yang berubah dikirim. Harga/HPP dan data lainnya dipertahankan saat hanya mengatur hubungan stok. Izin lihat/edit dan izin manual perubahan master tetap diperiksa di server. Pengajuan yang berstatus disetujui tetap memerlukan izin approve.
- Semua perubahan disimpan dalam satu transaksi. Jika ada kesalahan, tidak ada baris yang disimpan. Data yang berubah sejak form dibuka harus dimuat ulang untuk menghindari penimpaan perubahan pengguna lain.
- Validasi: 67 pengujian lokal dan 9 Cloudflare lokal berhasil, build dry-run berhasil. Pemeriksaan browser interaktif tidak selesai karena browser uji tidak tersedia; logika form diuji otomatis. Belum deploy online.

## Perbaikan ukuran arsip approval

Penyebab di kode: laporan internal membawa seluruh invoice tanpa filter periode, termasuk identitas/logo invoice, serta lampiran transaksi yang tidak dipakai dalam tampilan/ekspor laporan. Karena itu periode pendek pun dapat melewati batas arsip 1,8 MB.

Approval kini menyimpan fakta laporan tanpa salinan seluruh invoice dan lampiran biner. Dokumen asli, logo, dan bukti transaksi tetap pada data sumber; tidak dihapus. Rincian arsip disimpan dalam bagian 128 KiB dengan pemeriksaan integritas, dalam satu transaksi atomik. Pengguna tetap memilih satu periode dan approve sekali. Laporan/Excel tetap disusun dari salinan yang disetujui. Arsip lama tetap terbaca dan tidak ditimpa.

Setelah deploy paket ini, muat ulang halaman approval, tampilkan kembali periode yang diinginkan, lalu approve dengan password seperti biasa. Tidak perlu memecah bulan menjadi periode dua hari atau mengimpor ulang database.

Validasi perbaikan: 69 pengujian lokal dan 9 Cloudflare lokal, termasuk arsip melebihi batas lama, periode dua hari dengan logo besar pada invoice lama, ekspor, pemulihan cadangan, penguncian bagian arsip, dan rollback saat gagal menyimpan. Build dry-run berhasil. Belum deploy produksi.

## Kolom Terpakai dari Penjualan pada Stock Opname

Kolom tambahan beserta satuan tampil pada Stock Opname, Laporan Stock Opname, pratinjau Approval Semua Laporan, dan ekspor. Nilai berasal dari mutasi keluar otomatis kasir yang rekapnya berstatus Approved, pada tanggal dan barang/lokasi opname. Mutasi manual, transfer, antrian/hutang belum lunas, dan rekap belum approved tidak dihitung.

0 berarti barang saat ini terhubung namun tidak ada pemakaian disetujui pada hari tersebut. Tanda — berarti tidak ada pencatatan otomatis untuk barang/lokasi itu. Riwayat pemakaian yang sudah tercatat tetap terlihat meskipun hubungan produk kemudian dilepas. Satuan mengikuti stok, bukan otomatis dikonversi ke pcs.

Kolom hanya informasi dan tidak mengurangi saldo lagi. Jika beberapa opname barang yang sama dicatat pada satu hari, total pemakaian harian ditampilkan ulang; jangan dijumlahkan antarbaris. Tanggal mengikuti tanggal mutasi penjualan (tanggal pembayaran/rekap), bukan waktu tombol approve ditekan. Arsip baru membekukan angka ini; arsip lama tidak diubah.

Validasi: 70 pengujian lokal dan 9 Cloudflare lokal lolos; build dry-run berhasil. Belum deploy online.

## Absensi

Menu Absensi tersedia untuk akun aktif: masuk dan pulang menggunakan jam server WIB, riwayat hanya akun sendiri. User tidak dapat mengirim username/jam manual. Jadwal harus diaktifkan dahulu oleh Super Admin. Tidak ada polling otomatis.

Pengaturan & Rekap Absen hanya untuk Super Admin, termasuk perlindungan server. Pilih Atur jadwal pada Rifai/Tanzullah, isi jam tetap per username, dan aktifkan. Jadwal disalin saat absen masuk sehingga perubahan selanjutnya tidak mengubah sesi berjalan atau riwayat. Jam pulang lebih kecil dari masuk berarti shift semalam. Satu sesi per tanggal masuk; sesi terbuka harus ditutup sebelum masuk lagi.

Rekap bisa difilter username dan tanggal masuk. Tampil jam masuk/pulang aktual, durasi, keterlambatan, pulang awal, lewat jadwal, dan lembur disetujui. Durasi belum dikurangi istirahat. Lewat jadwal tidak otomatis lembur: Super Admin meninjau menit lembur, maksimal waktu lewat jadwal, beserta catatan. Belum ada perhitungan gaji, jadwal berbeda per hari, lokasi GPS, atau koreksi jam manual.

Validasi: 73 pengujian lokal dan 10 Cloudflare lokal berhasil; build dry-run berhasil. Belum deploy online. Setelah deploy muat ulang aplikasi dan atur jadwal sebelum pengguna absen.

## Ekspor Rekap Absen

Super Admin dapat mengunduh Excel melalui Pengaturan & Rekap Absen. Ekspor mengikuti filter yang sudah diterapkan. Lembar Ringkasan Absensi menampilkan total per user; Rincian Absensi menampilkan tanggal, jadwal WIB, waktu aktual, durasi, keterlambatan, pulang awal, lewat jadwal, lembur disetujui, serta catatan dan peninjau. Durasi dinyatakan dalam menit dan belum dikurangi istirahat. Tidak menghitung upah atau potongan gaji otomatis. Akun biasa tidak dapat mengakses endpoint ekspor.

Urutan sidebar: Dashboard utama, Absensi, lalu kelompok menu sebelumnya. Pengaturan & Rekap tetap hanya Super Admin.
