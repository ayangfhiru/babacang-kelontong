# TASK: Perbaikan Autentikasi Login, Registrasi, dan Analisis PostgreSQL SSL Warning

Lakukan analisis terhadap struktur proyek yang sedang berjalan sebelum mengubah kode. Fokus pada perbaikan halaman login, registrasi, alur autentikasi, notifikasi, redirect, serta analisis warning SSL PostgreSQL di terminal.

Jangan membuat implementasi baru secara sembarangan. Gunakan struktur, komponen, konfigurasi, dan sistem autentikasi yang sudah tersedia di proyek.

## 1. Analisis Struktur Proyek

Sebelum melakukan perubahan:

1. Periksa struktur folder proyek Nuxt.js.
2. Periksa implementasi Better Auth yang sudah digunakan.
3. Periksa halaman login dan registrasi yang sudah ada.
4. Periksa middleware autentikasi dan otorisasi.
5. Periksa konfigurasi Prisma dan koneksi PostgreSQL.
6. Periksa mekanisme notifikasi yang sudah digunakan, seperti toast atau notification component.
7. Periksa halaman dashboard dan mekanisme redirect setelah login.
8. Periksa konfigurasi environment pada `.env` dan `.env.example`.

Identifikasi penyebab masalah berdasarkan implementasi aktual. Jangan langsung mengasumsikan bahwa masalah berasal dari satu file tertentu.

## 2. Buat Halaman Login Terpisah

Buat halaman login khusus yang tidak berada di dalam layout dashboard.

Gunakan routing Nuxt.js yang sesuai, misalnya:

- `/login` untuk halaman login.
- `/dashboard` untuk halaman dashboard setelah autentikasi berhasil.

Ketentuan implementasi:

- Halaman login harus menggunakan layout autentikasi tersendiri atau layout minimal tanpa sidebar dan navigasi dashboard.
- Jangan menampilkan halaman login sebagai modal atau bagian dari halaman dashboard.
- Pisahkan tanggung jawab halaman autentikasi dari halaman dashboard.
- Gunakan komponen form yang sudah tersedia jika sesuai.
- Gunakan TypeScript dengan tipe data yang eksplisit.
- Terapkan validasi input email dan password.
- Tampilkan pesan validasi yang mudah dipahami.
- Tampilkan indikator loading ketika proses login sedang berlangsung.
- Nonaktifkan tombol submit selama proses autentikasi berjalan untuk mencegah pengiriman berulang.
- Tampilkan pesan kesalahan jika email atau password salah, akun tidak dapat digunakan, atau terjadi kegagalan jaringan.
- Jangan menampilkan detail internal server atau informasi sensitif kepada pengguna.

Pastikan halaman login responsif dan mengikuti desain antarmuka proyek yang sudah ada.

## 3. Perbaiki Proses Login

Integrasikan halaman login dengan implementasi Better Auth yang sudah digunakan.

Alur login yang diharapkan:

1. Pengguna membuka halaman `/login`.
2. Pengguna memasukkan email dan password.
3. Sistem memvalidasi input.
4. Sistem menjalankan proses autentikasi menggunakan Better Auth.
5. Jika autentikasi gagal, tampilkan notifikasi atau pesan kesalahan yang sesuai.
6. Jika autentikasi berhasil, tampilkan notifikasi sukses.
7. Setelah itu, arahkan pengguna ke `/dashboard`.

Contoh pesan notifikasi:

- Sukses: "Login berhasil. Selamat datang kembali!"
- Gagal: "Email atau password yang dimasukkan tidak valid."
- Kesalahan jaringan: "Terjadi kesalahan koneksi. Silakan coba kembali."

Ketentuan tambahan:

- Gunakan mekanisme session dan cookie yang sesuai dengan konfigurasi Better Auth.
- Pastikan redirect dilakukan setelah hasil autentikasi berhasil dikonfirmasi.
- Hindari redirect sebelum session benar-benar tersedia.
- Gunakan mekanisme notifikasi yang sudah ada. Jika belum tersedia, implementasikan solusi sederhana yang konsisten dengan UI proyek.
- Jangan membuat sistem autentikasi kedua jika Better Auth sudah tersedia.
- Jangan menyimpan password dalam localStorage, sessionStorage, atau penyimpanan klien lainnya.
- Jika pengguna yang sudah login membuka `/login`, arahkan ke `/dashboard` sesuai status session.

## 4. Buat Halaman Registrasi Terpisah

Buat halaman registrasi pada route:

`/register`

Halaman ini harus berdiri sendiri dan tidak menjadi bagian dari halaman dashboard.

Ketentuan implementasi:

- Gunakan layout autentikasi yang konsisten dengan halaman login.
- Sediakan input nama jika skema pengguna dan implementasi Better Auth mendukungnya.
- Sediakan input email dan password.
- Tambahkan konfirmasi password jika sesuai dengan pola form yang digunakan.
- Validasi format email.
- Validasi password sesuai ketentuan Better Auth yang berlaku dalam proyek.
- Pastikan password dan konfirmasi password sama jika konfirmasi password digunakan.
- Tampilkan indikator loading ketika proses registrasi berjalan.
- Tampilkan pesan kesalahan yang jelas apabila registrasi gagal.
- Gunakan tipe data TypeScript yang eksplisit.

Periksa apakah Better Auth sudah menyediakan konfigurasi registrasi email dan password. Gunakan konfigurasi tersebut, bukan membuat endpoint autentikasi baru yang tidak diperlukan.

## 5. Perbaiki Alur Registrasi Berhasil

Alur registrasi yang diharapkan:

1. Pengguna membuka halaman `/register`.
2. Pengguna mengisi form registrasi.
3. Sistem memvalidasi input.
4. Sistem menjalankan registrasi melalui Better Auth.
5. Jika registrasi gagal, tampilkan pesan kesalahan.
6. Jika registrasi berhasil, tampilkan notifikasi sukses.
7. Arahkan pengguna ke halaman `/login`.

Contoh notifikasi:

"Registrasi berhasil! Silakan login menggunakan akun yang telah dibuat."

Ketentuan penting:

- Setelah registrasi berhasil, pengguna harus diarahkan ke `/login`, bukan langsung ke dashboard.
- Jangan menampilkan notifikasi sukses apabila proses registrasi gagal.
- Jika sistem mewajibkan verifikasi email sebelum login, sesuaikan pesan dan alurnya dengan konfigurasi Better Auth.
- Pastikan notifikasi sukses tetap dapat dilihat setelah navigasi dari `/register` ke `/login`.

Untuk mempertahankan notifikasi setelah perpindahan halaman, gunakan mekanisme yang sesuai dengan arsitektur proyek, misalnya state notifikasi bersama atau mekanisme flash notification. Hindari menggunakan penyimpanan browser secara persisten jika tidak diperlukan.

## 6. Navigasi Antarhalaman

Tambahkan navigasi yang jelas:

Pada halaman login:

- Tampilkan tautan "Belum punya akun? Daftar".
- Tautan mengarah ke `/register`.

Pada halaman registrasi:

- Tampilkan tautan "Sudah punya akun? Login".
- Tautan mengarah ke `/login`.

Pastikan navigasi tersebut tidak mengarah kembali ke halaman autentikasi yang tertanam di dashboard.

## 7. Periksa Middleware dan Proteksi Route

Audit middleware autentikasi yang sudah ada.

Ketentuan:

- Halaman `/dashboard` hanya dapat diakses oleh pengguna yang sudah terautentikasi.
- Pengguna yang belum login dan membuka `/dashboard` harus diarahkan ke `/login`.
- Pengguna yang sudah login dan membuka `/login` atau `/register` diarahkan ke `/dashboard`, jika sesuai dengan alur autentikasi proyek.
- Jangan mengandalkan pemeriksaan di sisi klien saja untuk melindungi API atau operasi sensitif.
- Pastikan endpoint server memverifikasi session dan hak akses pengguna sesuai kebutuhan.
- Jangan mengubah mekanisme otorisasi yang sudah benar tanpa alasan teknis yang jelas.

Gunakan API dan pola session Better Auth yang sesuai dengan versi dependensi proyek. Jangan menyalin implementasi dari versi dokumentasi yang berbeda tanpa memeriksa kompatibilitasnya.

## 8. Analisis Warning PostgreSQL SSL

Di terminal terdapat warning berikut:

`Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.`

Warning tersebut menjelaskan bahwa mode SSL tertentu pada package `pg-connection-string` saat ini diperlakukan sebagai alias `verify-full`.

Pada versi mayor mendatang, yaitu `pg-connection-string` v3.0.0 dan `pg` v9.0.0, mode tersebut akan mengikuti semantik standar libpq yang berbeda.

Lakukan investigasi dengan langkah berikut.

### A. Temukan sumber konfigurasi SSL

Periksa:

- `DATABASE_URL` pada `.env`.
- `DATABASE_URL` pada `.env.example`.
- Konfigurasi Prisma.
- Konfigurasi koneksi PostgreSQL.
- Penggunaan package `pg` dan `pg-connection-string`.
- Versi dependensi yang terpasang.
- Apakah koneksi database menggunakan PostgreSQL langsung atau connection pooler, misalnya Supabase Pooler.

Cari parameter seperti:

- `sslmode=prefer`
- `sslmode=require`
- `sslmode=verify-ca`

Telusuri konfigurasi yang benar-benar digunakan ketika aplikasi berjalan. Jangan hanya memeriksa `.env.example`.

### B. Identifikasi penyebab sebenarnya

Tentukan:

1. File atau konfigurasi yang memicu warning.
2. Package yang mengeluarkan warning.
3. Versi package yang terpasang.
4. Apakah warning berasal dari konfigurasi Prisma, driver PostgreSQL, atau dependency lain.
5. Apakah koneksi menggunakan Supabase, PostgreSQL lokal, atau layanan lain.
6. Apakah warning tersebut hanya berkaitan dengan perubahan semantik SSL di versi mendatang atau terdapat masalah konfigurasi lain yang perlu diperbaiki.

Gunakan pencarian kode, pemeriksaan dependency tree, dan stack trace jika diperlukan.

Jangan langsung menyimpulkan bahwa koneksi database gagal. Warning ini tidak otomatis berarti koneksi gagal.

### C. Tentukan perbaikan berdasarkan kebutuhan koneksi

Ada dua alternatif yang disebutkan dalam warning.

**Alternatif 1 — Mempertahankan perilaku SSL saat ini**

Jika konfigurasi dan provider database mendukungnya, pertimbangkan penggunaan:

`sslmode=verify-full`

Mode ini mempertahankan perilaku verifikasi penuh, termasuk verifikasi sertifikat dan identitas host sesuai konfigurasi TLS.

**Alternatif 2 — Menggunakan semantik libpq**

Jika memang dibutuhkan kompatibilitas dengan semantik libpq, evaluasi kombinasi:

`uselibpqcompat=true&sslmode=require`

Namun, jangan menerapkan alternatif ini secara otomatis. Pada semantik libpq, `require` tidak selalu memberikan verifikasi identitas server seperti `verify-full`.

Prioritaskan konfigurasi yang sesuai dengan provider database, versi driver, dan kebutuhan keamanan aplikasi.

Jangan menurunkan keamanan koneksi hanya untuk menghilangkan warning.

### D. Jika menggunakan Supabase

Jika proyek menggunakan Supabase PostgreSQL, periksa apakah koneksi menggunakan:

- Direct connection.
- Session pooler.
- Transaction pooler.

Sesuaikan rekomendasi dengan jenis koneksi yang benar-benar digunakan.

Jangan mengubah host, port, username, password, atau metode pooling tanpa alasan yang jelas.

Jika perubahan parameter SSL diperlukan, pertahankan parameter koneksi lainnya.

Jangan menuliskan nilai rahasia dari `.env` ke log, laporan, atau output terminal yang ditampilkan kepada pengguna.

### E. Periksa kompatibilitas Prisma dan driver

Pastikan perubahan konfigurasi sesuai dengan versi Prisma dan driver PostgreSQL yang digunakan.

Jangan memperbarui seluruh dependency ke versi terbaru hanya untuk menghilangkan warning.

Jika perubahan versi diperlukan:

1. Jelaskan alasan teknisnya.
2. Periksa kompatibilitas versi.
3. Hindari perubahan mayor yang berisiko merusak aplikasi.
4. Pastikan konfigurasi database masih sesuai dengan dokumentasi versi yang digunakan.

## 9. Pengujian Setelah Perbaikan

Jalankan pemeriksaan yang relevan dengan proyek.

Minimal lakukan pengujian berikut:

### Login

- Login menggunakan kredensial yang valid.
- Login menggunakan password yang salah.
- Login menggunakan email dengan format tidak valid.
- Pastikan notifikasi sukses muncul.
- Pastikan redirect menuju `/dashboard`.
- Pastikan session tersedia setelah login.
- Pastikan pengguna yang belum login tidak dapat mengakses dashboard.

### Registrasi

- Registrasi dengan data valid.
- Registrasi menggunakan email yang sudah terdaftar.
- Registrasi dengan format email tidak valid.
- Registrasi dengan password yang tidak memenuhi persyaratan.
- Registrasi dengan password dan konfirmasi password yang berbeda, jika konfirmasi password digunakan.
- Pastikan notifikasi sukses muncul setelah registrasi berhasil.
- Pastikan redirect menuju `/login`.
- Pastikan notifikasi sukses tetap tampil setelah redirect.

### PostgreSQL

- Pastikan aplikasi tetap dapat terhubung ke database.
- Pastikan operasi database yang diperlukan tetap berfungsi.
- Periksa apakah warning SSL masih muncul setelah perubahan.
- Jika warning tetap muncul, telusuri apakah terdapat konfigurasi atau dependency lain yang masih memicunya.
- Jangan menyatakan warning telah diperbaiki jika belum diverifikasi melalui pengujian.

## 10. Standar Kode dan Struktur Proyek

Ikuti aturan berikut selama implementasi:

- Gunakan Nuxt.js, Vue, TypeScript, dan Better Auth yang sudah tersedia.
- Gunakan arrow function untuk fungsi yang dibuat.
- Hindari deklarasi fungsi konvensional jika tidak diperlukan.
- Gunakan tipe data eksplisit.
- Pisahkan deklarasi `interface` dan `type` ke file khusus sesuai struktur proyek.
- Gunakan `index.ts` pada folder yang memerlukan barrel exports.
- Gunakan alias `~` atau alias proyek yang sudah dikonfigurasi.
- Tempatkan helper yang dapat digunakan ulang di folder yang sesuai.
- Gunakan komponen dan pola desain yang sudah ada.
- Hindari duplikasi kode autentikasi.
- Jangan menghapus file atau komponen yang masih digunakan.
- Jangan mengubah skema database jika tidak diperlukan oleh perbaikan ini.
- Jangan menambahkan dependency baru jika fitur yang diperlukan sudah tersedia.
- Jangan mengubah konfigurasi production secara sembarangan.

## 11. Laporan Hasil Implementasi

Setelah menyelesaikan pekerjaan, berikan laporan yang mencakup:

1. Penyebab halaman login dan registrasi sebelumnya tidak sesuai.
2. Daftar file yang dibuat atau diubah.
3. Perubahan alur login dan registrasi.
4. Mekanisme notifikasi dan redirect yang digunakan.
5. Perubahan middleware atau proteksi route.
6. Penyebab warning PostgreSQL SSL berdasarkan hasil investigasi.
7. File dan parameter konfigurasi SSL yang diperbaiki, jika memang diperlukan.
8. Alasan teknis pemilihan konfigurasi SSL.
9. Hasil pemeriksaan TypeScript, lint, build, dan pengujian yang benar-benar dijalankan.
10. Masalah yang masih tersisa, jika ada.

Jangan hanya memberikan rekomendasi atau contoh kode. Implementasikan perbaikan pada proyek yang sedang dibuka.

**Prioritas utama:** autentikasi harus berfungsi dengan benar, halaman login dan registrasi harus terpisah dari dashboard, notifikasi harus tampil pada waktu yang tepat, redirect harus sesuai alur, dan koneksi PostgreSQL harus tetap aman.
