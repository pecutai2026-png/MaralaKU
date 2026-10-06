# Database Kontak

Buka **Master Data → Database Kontak**.

- Customer aktif tampil otomatis, tanpa disalin. Edit customer dari menu ini juga memperbarui data customer aslinya.
- Tambah Kontak menyimpan orang yang belum menjadi customer. Isi nama, nomor telepon, kategori opsional dan keterangan.
- Pencarian mencakup nama, nomor, kategori dan keterangan. Filter Sumber membedakan customer dan kontak tambahan.
- Nama akun penginput ditampilkan; riwayat lengkap tetap ada di Pengaturan → Riwayat Aktivitas.
- Hak akses mengikuti izin Customer. Hapus hanya tersedia untuk kontak tambahan. Penghapusan customer tetap melalui menu Customer beserta pemeriksaan relasi invoice.

## Upload dari Google Sheets

1. Unduh spreadsheet dari Google Sheets sebagai Excel (.xlsx) atau CSV.
2. Gunakan lembar pertama. Baris pertama berisi judul kolom; idealnya Nama, WhatsApp, Kategori, Keterangan. Template CSV tersedia di aplikasi.
3. Klik Upload Excel / CSV dan pilih file (maksimal 5 MB dan 2.000 baris per unggahan).
4. Periksa pemetaan kolom. Bila judul kolom berbeda, pilih kolom nama dan nomor, lalu Baca Ulang Kolom.
5. Lihat jumlah Siap, Duplikat dan Perlu diperbaiki. Pratinjau menampilkan maksimal 100 baris, mendahulukan masalah.
6. Klik Upload & Simpan. Hanya kontak Siap yang masuk. Perbaiki baris bermasalah pada file asal dan unggah ulang; kontak yang sudah masuk akan dilewati sebagai duplikat.

CSV dengan pemisah koma, titik koma, atau tab didukung. XLSX berisi rumus perlu diubah menjadi nilai sebelum diunggah. Nomor sebaiknya disimpan sebagai teks agar tidak dibulatkan spreadsheet. Hanya satu nomor per baris. Sambungan langsung/sinkronisasi Google Drive tidak termasuk; unggahan dilakukan lewat file.

## Pemeriksaan nomor sama

08…, 628… dan +628… dikenali sebagai nomor Indonesia yang sama, termasuk spasi dan tanda hubung. Nomor baru disimpan dengan kode negara. Nomor internasional memakai +kode negara. Ini pemeriksaan format dan duplikasi, bukan pengecekan apakah akun WhatsApp aktif.

Duplikat diperiksa terhadap customer, kontak tambahan, dan baris lain dalam file. Sistem memeriksa ulang saat menyimpan untuk menangani kontak yang masuk setelah pratinjau. Tidak ada penimpaan data lama secara otomatis. Nama sama dengan nomor berbeda diperbolehkan pada kontak tambahan.

Nomor duplikat yang sudah ada sebelumnya ditandai, tanpa menghapus catatan. Placeholder lama seperti 0 tetap ditampilkan pada customer, tetapi tidak diterima sebagai nomor baru saat impor. Penambahan customer baru juga menolak nomor valid yang sudah digunakan customer lain. Kontak tambahan yang kemudian menjadi customer tetap memiliki catatan asalnya dan akan ditandai bila nomornya sama.

Unduh Excel mengekspor kontak sesuai pencarian/filter, termasuk sumber dan penginput. Kontak tambahan ikut dalam cadangan dan pemulihan database yang sudah tersedia.

## Deploy

Gunakan paket terbaru di folder .publish. Konfigurasi binding database tetap sama; fitur ini menggunakan tabel catatan yang sudah ada, tanpa reset database. Paket berisi kode saja, tidak berisi data kontak atau kredensial. Belum diterbitkan otomatis ke Cloudflare.
