Periksa dan perbaiki penyebab peringatan Node.js berikut:

`DeprecationWarning: Calling client.query() when the client is already executing a query is deprecated`

Ketentuan:

1. Periksa stack trace untuk menemukan file dan library yang memicu peringatan.
2. Identifikasi apakah penyebabnya berasal dari kode aplikasi, Prisma, PostgreSQL `pg`, Supabase, atau dependensi lainnya.
3. Telusuri penggunaan koneksi database, query paralel, `Promise.all`, transaksi, dan operasi asynchronous yang belum ditunggu.
4. Perbaiki akar masalah tanpa sekadar menyembunyikan peringatan.
5. Jika menggunakan Prisma, pertahankan pola akses database yang sesuai dengan arsitektur proyek.
6. Jangan mengganti library, mengubah schema database, atau mengubah arsitektur tanpa alasan teknis yang jelas.
7. Jangan mengurangi keamanan, mengubah aturan bisnis, atau merusak transaksi FIFO dan pencatatan stok.
8. Jalankan pemeriksaan TypeScript, lint, dan tes yang relevan jika tersedia.
9. Laporkan penyebab, file yang diubah, solusi, dan hasil pengujian. Jangan mengklaim tes berhasil jika belum dijalankan.

Mulai dengan investigasi dan tampilkan akar masalah sebelum melakukan perubahan yang tidak diperlukan.

# Prompt OpenCode: Implementasi Authentication Better Auth — Nuxt 4

## 1. Peran dan Tujuan

Bertindak sebagai **Senior Full-Stack Engineer, Authentication Architect, dan Security Reviewer** yang bertanggung jawab mengimplementasikan autentikasi menggunakan Better Auth pada proyek Nuxt 4 yang sudah ada.

Implementasikan sistem autentikasi dasar dengan fitur:

- Registrasi menggunakan username, email, dan password.
- Login menggunakan username **atau** email dan password melalui satu form.
- Session management yang aman.
- Pembaruan atau perpanjangan session.
- Refresh token jika mekanisme yang sesuai tersedia dan dibutuhkan untuk memenuhi persyaratan.
- Logout dan invalidasi session.
- Integrasi database menggunakan Prisma 7 dan PostgreSQL.
- Validasi input, penanganan error, dan proteksi endpoint.

Jangan membuat ulang proyek dari awal. Pertahankan arsitektur, konvensi kode, komponen UI, dan dependensi yang sudah digunakan.

## 2. Aturan Utama Proyek

Sebelum melakukan perubahan:

1. Baca `AGENTS.md` di root proyek dan `AGENTS.md` pada direktori terkait jika tersedia.
2. Periksa struktur direktori, `package.json`, schema Prisma, konfigurasi Nuxt, konfigurasi database, serta pola API dan komponen form yang sudah ada.
3. Identifikasi versi Better Auth yang kompatibel dengan versi Nuxt, Prisma, dan PostgreSQL yang digunakan.
4. Periksa dokumentasi resmi Better Auth yang sesuai dengan versi paket yang digunakan.
5. Buat rencana implementasi berdasarkan kondisi proyek saat ini.
6. Hindari membuat file, konfigurasi, atau dependensi duplikat.

### Batasan `.env` — Wajib Dipatuhi

**Jangan membaca isi file `.env` dan jangan mengubah, menimpa, menghapus, atau membuat ulang file `.env` yang sudah ada.**

Ketentuan khusus:

- Jangan menjalankan perintah untuk menampilkan isi `.env`, seperti `cat .env`, `less .env`, atau perintah sejenis.
- Jangan membaca nilai rahasia dari `.env` melalui skrip, terminal, atau kode diagnostik.
- Jangan menyalin, mencetak, atau memasukkan nilai rahasia dari environment ke laporan.
- Jangan menggunakan nilai dari `.env` sebagai dasar untuk menulis ulang konfigurasi.
- Jangan menimpa `.env` ketika menambahkan konfigurasi autentikasi.
- Jangan menghapus atau mengganti nilai konfigurasi database yang sudah digunakan proyek.
- Jangan mengubah `.gitignore` dengan cara yang menyebabkan `.env` ikut dilacak Git.
- Jika konfigurasi aktual tidak dapat dipastikan tanpa membaca `.env`, tanyakan kepada pengguna atau gunakan placeholder.
- Jangan menjalankan migrasi database yang berpotensi mengubah atau menghapus data tanpa meninjau dampaknya dan memperoleh persetujuan pengguna.

Semua variabel environment yang dibutuhkan untuk autentikasi harus didokumentasikan dalam **`.env.example`**. Jika file tersebut sudah ada, tambahkan hanya variabel yang diperlukan dan pertahankan konfigurasi lainnya.

## 3. Registrasi

Buat halaman registrasi dengan field:

- `username`
- `email`
- `password`
- `confirmPassword` untuk validasi form, bukan untuk disimpan ke database.

Ketentuan:

1. Username wajib diisi dan mengikuti aturan format yang jelas.
2. Username harus unik dan tidak membedakan huruf besar/kecil jika kebijakan tersebut diterapkan secara konsisten.
3. Email harus valid dan unik.
4. Password wajib memenuhi kebijakan keamanan yang ditetapkan berdasarkan kemampuan Better Auth.
5. Konfirmasi password harus cocok dengan password.
6. Validasi dilakukan di frontend dan server.
7. Validasi frontend tidak boleh menjadi satu-satunya lapisan keamanan.
8. Password tidak boleh disimpan dalam bentuk plaintext.
9. Gunakan mekanisme hashing password yang disediakan Better Auth.
10. Jangan mengembalikan password, hash password, secret, atau data sensitif lainnya dalam respons API.
11. Tangani username dan email yang sudah digunakan dengan pesan yang sesuai tanpa membocorkan informasi akun secara berlebihan.
12. Jangan memberikan role administrator secara otomatis kepada pengguna yang mendaftar.

Gunakan username plugin atau mekanisme resmi Better Auth yang sesuai dengan versi terpasang. Pastikan konfigurasi plugin benar-benar mendukung kebutuhan registrasi dan autentikasi username.

## 4. Login dengan Username atau Email

Buat satu halaman login dengan field:

- `identifier`
- `password`

Field `identifier` menerima username maupun email.

Implementasikan alur berikut:

1. Pengguna memasukkan username atau email.
2. Sistem mengidentifikasi jenis identifier berdasarkan format input.
3. Jika berupa email, gunakan metode login email yang disediakan Better Auth.
4. Jika berupa username, gunakan metode login username yang didukung plugin resmi Better Auth.
5. Kedua jalur login harus menghasilkan mekanisme session yang konsisten.
6. Jangan membuat endpoint login yang melewati verifikasi password Better Auth.
7. Jangan melakukan pencarian pengguna secara manual lalu membandingkan password dengan cara buatan sendiri.
8. Tangani kredensial salah dengan respons yang aman dan konsisten.
9. Terapkan pembatasan percobaan login atau rate limiting sesuai kemampuan dan arsitektur proyek.
10. Jangan mengungkapkan apakah suatu username atau email terdaftar melalui pesan error yang tidak diperlukan.

Jika username memiliki aturan format yang berbeda dari email, buat helper untuk mengidentifikasi input secara konsisten dan beri tipe TypeScript yang jelas.

## 5. Session dan Refresh Token

Sebelum mengimplementasikan fitur ini, periksa dokumentasi resmi Better Auth untuk versi yang digunakan.

Bedakan dengan jelas:

- Session cookie.
- Session yang disimpan di database.
- Perpanjangan masa berlaku session.
- Refresh token untuk memperoleh atau memperbarui kredensial autentikasi.

Jangan menganggap keempat hal tersebut sebagai mekanisme yang sama.

### Persyaratan session

1. Gunakan session management resmi Better Auth.
2. Konfigurasikan masa berlaku session sesuai kebutuhan aplikasi.
3. Konfigurasikan mekanisme pembaruan masa berlaku session jika didukung.
4. Simpan session di database jika sesuai dengan konfigurasi dan arsitektur proyek.
5. Gunakan cookie `HttpOnly`, `Secure` pada HTTPS, dan `SameSite` yang sesuai.
6. Jangan menyimpan session token atau refresh token di `localStorage` atau `sessionStorage`.
7. Validasi session di server untuk endpoint yang membutuhkan autentikasi.
8. Pastikan logout membatalkan session sesuai mekanisme Better Auth.
9. Tangani session kedaluwarsa, session tidak valid, dan kegagalan pembaruan session.
10. Hindari query database tambahan yang tidak diperlukan pada setiap permintaan autentikasi.

### Persyaratan refresh token

Jangan membuat refresh token buatan sendiri sebelum memastikan mekanisme yang tersedia.

- Periksa apakah versi Better Auth yang terpasang menyediakan mekanisme resmi untuk kebutuhan refresh token pada autentikasi username/email dan password.
- Jika Better Auth mendukung pembaruan session yang diperlukan, gunakan mekanisme tersebut dan jelaskan apakah kebutuhan refresh token terpisah benar-benar terpenuhi.
- Jika refresh token terpisah memang wajib tetapi tidak didukung secara langsung, jelaskan keterbatasannya terlebih dahulu.
- Jangan menggunakan plugin OAuth atau refresh token OAuth seolah-olah otomatis berlaku untuk login password biasa.
- Jika diperlukan implementasi refresh token khusus, rancang secara aman dengan persetujuan dan dokumentasi yang jelas.

Jika membuat mekanisme refresh token khusus, minimal:

1. Gunakan token acak yang memiliki entropi memadai.
2. Simpan hash token di database, bukan token mentah.
3. Tentukan waktu kedaluwarsa.
4. Rotasi token ketika digunakan jika sesuai dengan desain.
5. Cegah penggunaan ulang token yang sudah dirotasi.
6. Sediakan mekanisme pencabutan token saat logout dan saat terdeteksi penyalahgunaan.
7. Lindungi cookie dari akses JavaScript dan atur kebijakan `Secure`, `HttpOnly`, serta `SameSite` yang sesuai.
8. Terapkan proteksi CSRF sesuai desain autentikasi berbasis cookie.
9. Pastikan penggunaan token bersifat atomik agar permintaan bersamaan tidak menghasilkan penggunaan ulang yang tidak aman.
10. Jangan membuat tabel atau endpoint refresh token tambahan jika mekanisme resmi Better Auth sudah memenuhi kebutuhan.

Jika implementasi khusus diperlukan, dokumentasikan alur login, refresh, rotasi, logout, dan invalidasi token. Jangan mengklaim bahwa aplikasi menggunakan refresh token apabila yang digunakan sebenarnya hanya perpanjangan session.

## 6. Database dan Prisma 7

Gunakan schema Prisma yang sudah ada dan sesuaikan dengan integrasi resmi Better Auth.

Ketentuan:

1. Periksa model pengguna dan model autentikasi yang sudah ada sebelum membuat model baru.
2. Gunakan adapter database yang kompatibel dengan Better Auth dan arsitektur Prisma 7 proyek.
3. Jangan mencampur konfigurasi adapter Prisma dan koneksi PostgreSQL secara sembarangan.
4. Pertahankan konsistensi konfigurasi `@prisma/client`, Prisma CLI, dan adapter database yang digunakan proyek.
5. Pastikan seluruh model dan field yang dibutuhkan Better Auth sesuai dengan schema serta pemetaan database.
6. Gunakan unique constraint pada username dan email sesuai aturan yang dipilih.
7. Tambahkan model session, account, verification, atau model lain hanya jika dibutuhkan oleh konfigurasi resmi.
8. Gunakan tipe data, relasi, dan indeks yang sesuai.
9. Jika proyek memiliki aturan penggunaan UUID atau `@map`, pertahankan konvensi tersebut jika kompatibel.
10. Jangan menghapus atau merombak data pengguna yang sudah ada.
11. Tinjau migration yang dihasilkan sebelum menerapkannya.
12. Jangan menjalankan reset database atau perintah yang berpotensi menghapus data.

Jika ada perubahan schema, berikan ringkasan perubahan dan alasan teknisnya. Pastikan konfigurasi Better Auth dan Prisma benar-benar kompatibel, bukan sekadar menghasilkan kode yang tampak benar.

## 7. Environment Variables

Dokumentasikan seluruh environment variable yang diperlukan di `.env.example`.

Minimal, evaluasi kebutuhan variabel berikut berdasarkan konfigurasi proyek dan dokumentasi Better Auth:

```dotenv
# Base URL aplikasi Nuxt
BETTER_AUTH_URL=http://localhost:3000

# Secret untuk menandatangani dan melindungi data autentikasi.
# Gunakan secret acak yang kuat pada environment aktual.
BETTER_AUTH_SECRET=replace_with_a_secure_random_secret

# URL koneksi database jika memang dibutuhkan oleh konfigurasi proyek.
# Gunakan placeholder, jangan mengambil nilai dari .env.
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

Ketentuan:

- Sesuaikan nama variabel dengan konvensi yang benar-benar dipakai konfigurasi aplikasi.
- Jangan menambahkan variabel yang tidak diperlukan.
- Jika aplikasi sudah menggunakan nama variabel database yang berbeda, pertahankan nama tersebut di kode dan dokumentasikan placeholder yang sesuai di `.env.example`.
- Jangan menulis nilai produksi atau kredensial asli.
- Jangan menganggap placeholder di atas sebagai nilai konfigurasi yang siap digunakan.
- Jangan mengubah `.env` dalam kondisi apa pun.
- Jangan mengklaim `.env` telah diperbarui atau diverifikasi.
- Jangan menampilkan nilai environment aktual di terminal atau laporan.

Setelah selesai, laporkan nama variabel yang perlu disiapkan pengguna secara manual, tanpa meminta atau menampilkan nilai rahasianya.

## 8. Struktur Kode dan TypeScript

Ikuti konvensi proyek yang sudah ada dan aturan dalam `AGENTS.md`.

- Gunakan TypeScript dengan tipe eksplisit.
- Gunakan arrow function, misalnya `const handleLogin = async () => {}`.
- Pisahkan deklarasi `interface` dan `type` ke file yang sesuai dengan struktur proyek.
- Gunakan `~` untuk alias import jika sudah dikonfigurasi.
- Gunakan `utils` untuk helper umum yang benar-benar dapat digunakan ulang.
- Pertahankan pola barrel export `index.ts` yang digunakan proyek.
- Jangan menggunakan `any` tanpa alasan kuat.
- Jangan menggandakan tipe atau helper yang sudah tersedia.
- Jangan mengubah file yang tidak berhubungan dengan autentikasi.

Periksa lokasi konfigurasi yang tepat sebelum membuat file. Jangan memaksakan struktur direktori tertentu jika proyek memiliki konvensi yang berbeda.

## 9. Integrasi Nuxt

Implementasikan integrasi frontend dan backend menggunakan mekanisme yang didukung Nuxt dan Better Auth.

Minimal:

- Halaman register.
- Halaman login.
- Halaman atau komponen yang menampilkan status pengguna yang sudah login.
- Tombol logout.
- Pengambilan session pengguna dari server atau client menggunakan API resmi Better Auth.
- Middleware atau mekanisme proteksi route sesuai kebutuhan.
- Endpoint autentikasi Better Auth pada lokasi yang sesuai dengan versi Nuxt dan integrasi yang digunakan.
- Validasi input menggunakan Zod jika sesuai dengan pola proyek.
- Penanganan loading, error, dan submit ganda.
- Redirect setelah login dan logout sesuai alur aplikasi.

Ketentuan keamanan:

1. Middleware frontend hanya untuk navigasi dan pengalaman pengguna, bukan satu-satunya proteksi.
2. Endpoint server yang dilindungi harus memvalidasi session di server.
3. Jangan mempercayai role atau identitas pengguna yang dikirim dari frontend.
4. Jangan mengembalikan informasi sensitif melalui endpoint session.
5. Jangan menggunakan API Better Auth yang sudah deprecated jika ada API resmi penggantinya.
6. Jangan membuat endpoint autentikasi duplikat yang melewati mekanisme Better Auth.
7. Pastikan penanganan cookie dan request sesuai dengan origin serta konfigurasi aplikasi.

## 10. Pengujian

Lakukan pengujian sesuai fasilitas yang tersedia di proyek.

### Registrasi

- Registrasi berhasil dengan username, email, dan password valid.
- Username duplikat ditolak.
- Email duplikat ditolak.
- Password dan konfirmasi password yang tidak cocok ditolak.
- Input tidak valid ditolak oleh server.

### Login

- Login menggunakan email berhasil.
- Login menggunakan username berhasil.
- Password salah ditolak.
- Username atau email yang tidak valid ditolak.
- Session tersedia setelah login berhasil.

### Session dan refresh

- Session dapat diverifikasi di server.
- Session yang kedaluwarsa ditangani dengan benar.
- Pembaruan session atau refresh token bekerja sesuai desain yang benar-benar diterapkan.
- Refresh token yang tidak valid atau sudah dicabut ditolak jika fitur refresh token terpisah diterapkan.
- Logout menginvalidasi session sesuai mekanisme yang digunakan.
- Pengguna tidak dapat mengakses endpoint terlindungi tanpa session valid.

### Keamanan dan kualitas

- Tidak ada password atau token sensitif dalam respons API.
- Tidak ada secret yang ditulis ke source code.
- Tidak ada perubahan pada `.env`.
- Tidak ada query database yang tidak diperlukan.
- Tidak ada konflik tipe TypeScript yang diperkenalkan.
- Jalankan pemeriksaan TypeScript, lint, dan tes yang tersedia.
- Jangan mengklaim pengujian berhasil jika belum benar-benar dijalankan.

## 11. Batasan Perubahan

Jangan:

- Mengganti framework atau library database tanpa alasan yang kuat.
- Mengubah seluruh sistem autentikasi jika hanya diperlukan integrasi dasar.
- Menghapus data pengguna yang sudah ada.
- Mengubah aturan bisnis atau role yang sudah ditetapkan.
- Membuat refresh token buatan sendiri tanpa kebutuhan yang jelas.
- Menambahkan plugin atau dependensi yang tidak diperlukan.
- Mengubah `.env`.
- Membaca nilai dari `.env`.
- Menghapus lockfile hanya untuk mengatasi masalah instalasi.
- Menyembunyikan error dengan menonaktifkan validasi atau logging yang penting.
- Menyatakan pekerjaan selesai jika masih ada error kritis yang belum ditangani.

## 12. Definition of Done

Implementasi dianggap selesai jika:

1. Registrasi dengan username, email, dan password berfungsi.
2. Login menggunakan username atau email melalui satu form berfungsi.
3. Session dikelola dengan mekanisme resmi Better Auth.
4. Kebutuhan refresh session dan refresh token telah dibedakan serta dijelaskan.
5. Jika refresh token terpisah diwajibkan, mekanismenya benar-benar diimplementasikan atau keterbatasannya dinyatakan secara eksplisit.
6. Logout dan proteksi endpoint berfungsi.
7. Schema database dan konfigurasi adapter sesuai dengan versi yang digunakan.
8. `.env.example` mencantumkan semua variabel yang diperlukan dengan placeholder.
9. `.env` tidak dibaca maupun diubah oleh agen.
10. Tidak ada regresi yang diketahui pada fitur yang sudah ada.
11. Pemeriksaan kualitas dan pengujian yang tersedia telah dijalankan.
12. Hasil pekerjaan dilaporkan secara jujur.

## 13. Format Laporan Akhir

Setelah implementasi, berikan laporan dengan format:

1. **Ringkasan:** fitur autentikasi yang berhasil dibuat.
2. **File yang ditambahkan:** beserta fungsinya.
3. **File yang diubah:** beserta alasan perubahan.
4. **Database:** perubahan schema dan migration jika ada.
5. **Environment:** daftar variabel yang perlu disiapkan di `.env.example`, tanpa membaca atau mengubah `.env`.
6. **Session dan refresh:** mekanisme yang digunakan, masa berlaku, dan perbedaan antara refresh session dan refresh token.
7. **Keamanan:** validasi, cookie, proteksi endpoint, dan pembatasan akses yang diterapkan.
8. **Pengujian:** perintah dan hasil yang benar-benar diperoleh.
9. **Tindakan manual:** konfigurasi yang perlu dilakukan pengguna.
10. **Keterbatasan:** masalah yang belum terselesaikan dan alasannya.

Mulai dengan audit proyek dan dokumentasi Better Auth yang sesuai dengan versi terpasang. Setelah itu, implementasikan fitur dengan perubahan seminimal mungkin, aman, teruji, dan mengikuti konvensi proyek yang sudah ada.
