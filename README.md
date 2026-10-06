# Marala lokal

Versi lokal untuk mencoba platform produk digital Marala. Proyek asli di folder GitHub tetap terpisah dan tidak diubah.

## Mengakses

Jalankan `Jalankan-Marala.ps1` dari folder ini dengan PowerShell, atau jalankan `node server.cjs`. Membutuhkan Node.js 24 atau lebih baru; tidak perlu memasang paket tambahan.

- Halaman utama: http://127.0.0.1:4180
- Admin BUMM: http://127.0.0.1:4180/admin
- Masuk usaha: http://127.0.0.1:4180/login
- Akun dan akses usaha: http://127.0.0.1:4180/account

Pertama kali, buka halaman Admin BUMM dan buat nama, email, serta password sendiri (minimal 10 karakter). Tidak ada akun atau password bawaan. Admin BUMM mengelola platform; pemilik usaha memiliki akun terpisah. Untuk mencoba sebagai pelanggan, keluar dari admin atau gunakan jendela privat, pilih jenis usaha, lalu daftar.

## Fitur

- Pilihan toko, kafe/kuliner, atau jasa. Warna mengikuti logo Marala dan setiap pilihan memakai ilustrasi tersimpan lokal. Panel pelanggan tidak menampilkan link Admin BUMM; admin memiliki halaman masuk sendiri di `/admin`.
- Pendaftaran, login pemilik, akun tim, dan database terpisah per usaha. Akun tim dibuat pemilik melalui Manajemen Pengguna; login tim menggunakan kode usaha, username, dan password.
- Pendaftaran pelanggan dan login pemilik menggunakan nomor WhatsApp serta password. Nomor 08…, 628…, dan +628… diseragamkan untuk mencegah duplikasi. Admin melihat nomor peserta dan dapat membuka chat WhatsApp untuk tindak lanjut manual. Nomor belum diverifikasi melalui OTP. Akun lama tanpa nomor WhatsApp tetap bisa masuk dengan kode usaha dan username, lalu mengisi nomor melalui Akun & akses. Login Admin BUMM tetap memakai email.
- Pilihan memakai data contoh atau memulai kosong. Data contoh diberi penanda; isi contoh bukan data produksi sebelumnya.
- Setiap jenis usaha memiliki tujuh menu utama dan Pengaturan Usaha. Toko: dashboard, kasir, produk/harga, stok, hutang, pengeluaran, laporan. Kafe: dashboard, kasir, menu/harga, antrian, riwayat penjualan, pengeluaran, laporan. Jasa: dashboard, invoice, jasa/tarif, pelanggan, pembayaran, pengeluaran, laporan. Pembayaran kasir yang selesai langsung tercatat ke omzet dan HPP; stok produk yang sudah dikaitkan ke barang stok berkurang saat pembayaran berhasil. Hutang dan antrian belum dibayar tidak masuk omzet. Pembatalan transaksi mengembalikan stok dan membatalkan omzet terkait. Rincian laporan berada di kelompok Laporan; pengaturan profil, rekening, invoice, dan akun tim berada di Pengaturan Usaha. Tombol Semua menu dihilangkan. Penyederhanaan ini mengatur navigasi, sementara izin pengguna dan penguncian trial tetap diperiksa server.
- Trial normal 2 hari. Admin dapat mengubah durasi, mengatur promo 5 hari pada tanggal tertentu, memperpanjang peserta, mengakhiri trial, memblokir, atau mengaktifkan berbayar.
- Setelah trial habis, server menolak penambahan, perubahan, dan penghapusan data. Login, lihat data, dan ekspor tetap tersedia. Blokir admin menghentikan akses aplikasi usaha.
- Admin melihat peserta, batas waktu, aktivitas terakhir, jumlah sesi masuk, kunjungan menu, dan penyimpanan melalui server. Data contoh tidak dihitung sebagai transaksi pengguna. Statistik menunjukkan aktivitas aplikasi, bukan durasi penggunaan atau analisis perilaku eksternal.
- Aktivasi memindahkan database dari folder trial ke berbayar di komputer yang sama, sambil mempertahankan data dan akun.

## Penyimpanan

`data/platform.sqlite` menyimpan registrasi, sesi, pengaturan trial, dan statistik. `data/tenants/trial/{id}.sqlite` dan `data/tenants/paid/{id}.sqlite` menyimpan data tiap usaha. Jangan menghapus folder data saat memperbarui aplikasi.

Cadangan lengkap privat tersedia di detail peserta pada admin. Cadangan memuat akun dan data privat. Untuk mencadangkan seluruh instalasi, hentikan server terlebih dahulu lalu salin seluruh folder data. Belum ada penghapusan data trial otomatis, reset password lewat email, atau pengiriman email verifikasi.

Server secara bawaan hanya mendengarkan komputer lokal. Versi ini belum menerapkan domain/subdomain, pembayaran online, atau pemindahan otomatis ke server Hostinger. Penerapan ke hosting perlu konfigurasi layanan Node.js, HTTPS, domain, serta cadangan dan pemulihan data.

## Pemeriksaan

`node --test tests/platform.test.cjs` menguji pendaftaran, pemisahan data, izin admin, trial, ekspor, pemblokiran, aktivasi, login ulang, statistik, dan promo. Tes menggunakan database sementara terpisah dari data pengguna. Pemeriksaan browser juga dilakukan untuk halaman utama, pendaftaran, dashboard usaha, kasir, admin, dan tampilan ponsel; tangkapan layar ada di `tests/artifacts`.
