# Laporan laba rugi manajemen BUMM Marala

Menu **Laporan → Laba Rugi** sekarang menampilkan pendapatan per unit, HPP per unit, laba kotor, biaya operasional per kategori, laba bersih, dan margin. Dashboard dan laporan memakai sumber perhitungan yang sama.

## Cara membuat laporan untuk atasan

1. Pilih tanggal awal dan akhir bulan serta unit bisnis. Kosongkan pencarian untuk laporan menyeluruh.
2. Baca bagian **Periksa sebelum diserahkan**. Lengkapi HPP dan kelompok biaya yang belum diketahui melalui menu asal transaksi. HPP nol tetap ditandai untuk diperiksa, bukan diisi perkiraan.
3. Pastikan rekap kasir yang akan dilaporkan sudah disetujui.
4. Klik **Unduh Excel**. CSV hanya ringkasan dan tidak membawa format atau seluruh lembar pendukung.
5. Periksa lembar **Laba Rugi** dan **Catatan**, kemudian isi ruang pemeriksa bila diperlukan.

## Isi Excel

- Laba Rugi: ringkasan dengan subtotal, margin, periode, penyusun, waktu ekspor, serta ruang pemeriksa.
- Pendapatan: setiap pembayaran invoice dan penjualan langsung. HPP pembayaran ditampilkan di baris yang sama.
- Biaya: pengeluaran dibayar, kelompok, kategori, dan hubungan invoice.
- Detail Biaya: penerima, periode gaji, jumlah, satuan, harga satuan, dan sumber dana.
- Rincian Produk: item kasir setelah alokasi diskon; status menunjukkan apakah sudah masuk omzet. Penjualan langsung yang hanya dicatat total tidak memiliki rincian jumlah produk.
- Aset: nilai perolehan, masa manfaat, nilai sisa, akumulasi penyusutan, dan nilai buku.
- Penyusutan: beban per aset pada setiap akhir bulan dalam periode.
- Petty Cash: saldo awal periode, uang masuk, uang keluar, dan saldo berjalan seluruh unit.
- Catatan: dasar perhitungan dan masalah kelengkapan yang ditemukan.

Angka ringkasan Excel memakai rumus yang terhubung ke lembar pendukung. Nilai tersimpan ikut diekspor agar pembaca dapat melihat hasil sebelum penghitungan ulang. Ekspor adalah potret data saat diunduh, tidak terhubung langsung ke database.

Judul, format Rupiah dan persentase, lebar kolom, pembungkusan teks, pembekuan header, filter, area cetak, header berulang, dan nomor halaman sudah diatur. Ringkasan memakai orientasi portrait, rincian landscape. Tampilan hasil cetak akhir tetap mengikuti Excel dan pengaturan printer.

## Dasar angka

- Ini laporan manajemen mengikuti **uang masuk**, bukan pendapatan berdasarkan tanggal penerbitan invoice.
- DP dan pelunasan dihitung pada tanggal pembayaran masing-masing. HPP invoice dialokasikan proporsional dengan pembulatan kumulatif agar seluruh pembayaran tidak melebihi total HPP.
- Penjualan langsung masuk pada tanggal penjualan. Kasir masuk satu total harian setelah approval.
- HPP tambahan masuk kelompok HPP. Pengeluaran Operasional masuk beban pada tanggal dibayar.
- **Tercakup HPP invoice** digunakan hanya untuk pembayaran biaya yang nominalnya sudah termasuk HPP invoice. Wajib memilih invoice dari unit yang sama. Jumlah yang ditandai tercakup dibatasi total HPP invoice, dan tetap muncul dalam catatan pemeriksaan.
- Pengadaan persediaan dan aset tidak langsung menjadi beban. Pengeluaran melalui Petty Cash tidak dikurangi dua kali.
- Penyusutan garis lurus satu bulan penuh diakui pada akhir bulan, mulai bulan yang ditetapkan, hingga masa manfaat berakhir. Nilai sisa dipertahankan. Karena ada HPP dan penyusutan, laba bukan saldo uang kas.

## Pengaturan awal yang perlu diisi Super Admin

Di **Laporan → Laba Rugi → Pengaturan Laporan**, isi tanggal saldo awal Petty Cash (tanggal pertama bulan, tidak boleh setelah transaksi kas pertama) dan saldo sebenarnya. Saldo ini diterapkan satu kali lalu diteruskan; tambahan dana dicatat lewat Petty Cash.

Sebelum dikonfirmasi, sistem memakai saldo awal lama Rp1.000.000 satu kali dan menampilkan catatan. Sistem tidak menebak alokasi bulanan lama sebagai uang masuk nyata. Pengeluaran baru yang menyebabkan saldo harian negatif ditolak. Konfirmasikan saldo awal dan dana masuk terlebih dahulu.

Nama kelompok pendapatan bisa diatur per unit. Untuk rincian mitra dalam satu unit, isi deskripsi penjualan dengan nama mitra yang jelas; rincian muncul di Pendapatan.

Di **Aset dan penyusutan**, klik **Atur penyusutan** untuk aset pengadaan berstatus Dibayar. Isi masa manfaat, bulan mulai, dan nilai sisa. Pengaturan disimpan terpisah dari transaksi pembelian yang sudah dikunci. Pengaturan ulang dapat mengubah laporan yang dihitung berikutnya; laporan yang sudah diekspor tetap merupakan potret lama.

## Input harian dan data lama

Pengeluaran memiliki saran kategori baku dan pilihan kelompok biaya. Kategori custom tetap boleh untuk menjaga kompatibilitas data lama, tetapi ditandai untuk ditinjau. Nominal dapat diinput total; jika mengisi jumlah dan harga satuan, lengkapi keduanya dan total dihitung server. Penjualan langsung juga mendukung jumlah, harga jual satuan, dan HPP satuan. Kolom tambahan berlaku untuk input massal.

Template impor pengeluaran lama masih diterima. Pengeluaran hasil impor yang belum menentukan kelompok ditandai belum dikonfirmasi dan sementara dihitung sebagai Operasional; edit pengelompokan setelah impor.

Tidak ada penghapusan atau penulisan ulang transaksi lama. Kelompok biaya lama yang kosong, HPP nol, aset tanpa penyusutan, dan kasir belum disetujui diberi catatan. Data produk harian yang tidak pernah dicatat tidak dibuat-buat. Perhitungan nominal mengikuti Rupiah bulat yang sudah dipakai aplikasi.

## Pemeriksaan pengembangan

Pengujian mencakup DP lintas bulan, pembulatan HPP, pemisahan kelompok biaya, total dari jumlah dan harga satuan, batas penyusutan, carryforward Petty Cash, saldo tanggal mundur, izin ekspor/pengaturan, serta fungsi lama invoice, stok, kasir, snapshot dan Cloudflare. UI pengeluaran diuji dengan data contoh dalam database memori terpisah. File Excel diimpor kembali, dihitung ulang, diperiksa error rumus, dan dirender untuk memeriksa seluruh lembar.

Data asli lokal dan Cloudflare tidak dipakai untuk pengujian. Tidak ada deploy online otomatis. Paket kode tetap menggunakan binding/database Cloudflare yang ada; tidak mengubah wrangler.jsonc.
