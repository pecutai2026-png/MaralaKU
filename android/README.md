# MaralaKU untuk Android (APK)

Aplikasi ini membuka situs MaralaKU (`maralaUrl` di `gradle.properties`) di layar penuh dengan ikon sendiri. Semua isi, fitur, dan data tetap dari server. Setiap kali situs diperbarui lewat Cloudflare, aplikasi ikut berubah tanpa perlu memasang APK baru.

Aplikasi ini untuk pemilik usaha dan kasir. Pembeli tidak perlu memasang apa pun: mereka memesan lewat link etalase `/u/{kode-usaha}` di browser, dan pesanan masuk ke menu **Pesanan masuk** di aplikasi.

## Mendapatkan APK

APK dibuat otomatis oleh GitHub Actions. Komputer tidak perlu Android Studio.

1. Push perubahan ke repo yang terhubung ke Cloudflare. Workflow `Build APK Android` berjalan sendiri bila folder `android/` berubah. Bisa juga dijalankan manual: tab **Actions** → **Build APK Android** → **Run workflow**.
2. Tunggu sekitar 5 menit sampai tanda centang hijau muncul.
3. Buka **Releases** → **MaralaKU Android (terbaru)**, lalu unduh `MaralaKU.apk`. File yang sama juga ada di bagian **Artifacts** pada halaman run.
4. Kirim file APK ke HP (WhatsApp, Google Drive, atau kabel), buka, lalu pilih **Pasang**. Bila diminta, izinkan pemasangan dari sumber tidak dikenal.

Minimal Android 8.0.

## Yang sudah ditangani aplikasi

- Sesi login tersimpan, jadi tidak perlu masuk ulang setiap membuka aplikasi.
- Link WhatsApp, telepon, peta, dan situs lain dibuka di aplikasinya masing-masing.
- Unduhan (laporan CSV, cadangan data) tersimpan di folder `Download/MaralaKU`.
- Cetak halaman, invoice, QR meja, dan tiket lewat menu cetak Android (printer atau simpan PDF).
- Kamera untuk scan barcode dan QR tiket (izin diminta saat pertama dipakai).
- Unggah berkas, tombol kembali, tampilan saat tidak ada internet, dan garis pemuatan di atas layar.

## Mengganti alamat atau versi

Ubah `android/gradle.properties`:

- `maralaUrl`: alamat situs, misalnya bila nanti memakai domain sendiri.
- `maralaVersionCode`: naikkan (2, 3, …) setiap membagikan APK baru.
- `maralaVersionName`: nama versi yang terlihat pengguna.

## Kunci tanda tangan (disarankan sebelum dibagikan luas)

Tanpa kunci tetap, setiap build memakai kunci sementara yang berbeda. Akibatnya, APK versi baru tidak bisa dipasang di atas versi lama; versi lama harus dihapus dulu, dan pengguna harus login ulang. Karena isi aplikasi datang dari server, APK jarang perlu diganti. Meski begitu, sebaiknya kunci tetap dipasang sebelum APK dibagikan ke banyak orang.

Membuat kunci (sekali saja, di komputer yang memiliki Java):

```bash
keytool -genkeypair -v -keystore marala.jks -alias marala -keyalg RSA -keysize 2048 -validity 10000
```

Lalu di GitHub: **Settings → Secrets and variables → Actions → New repository secret**, isi:

| Nama secret | Isi |
| --- | --- |
| `MARALA_KEYSTORE_BASE64` | isi `marala.jks` dalam base64 (`base64 -w0 marala.jks`) |
| `MARALA_KEYSTORE_PASSWORD` | password keystore |
| `MARALA_KEY_ALIAS` | `marala` |
| `MARALA_KEY_PASSWORD` | password kunci |

Simpan `marala.jks` dan password-nya di tempat aman. Kalau hilang, APK berikutnya tidak bisa menggantikan APK lama. Jangan pernah commit file `.jks` ke repo (sudah diabaikan oleh `.gitignore`).
