# Implementasi Fitur Barcode Scanner pada Modul Produk

## Tujuan

Tambahkan fitur pemindaian barcode pada halaman manajemen produk di aplikasi toko kelontong yang sudah ada.

Gunakan teknologi dan struktur proyek yang sudah digunakan, yaitu Nuxt.js, Vue, TypeScript, Tailwind CSS, Prisma, dan database yang telah dikonfigurasi dalam proyek.

Jangan membangun ulang aplikasi dari awal. Lakukan pemeriksaan terhadap struktur kode, halaman produk, API, schema Prisma, dan komponen UI yang sudah tersedia sebelum mulai melakukan perubahan.

## 1. Tombol Scanner Barcode

Tambahkan tombol **Scan Barcode** pada halaman daftar produk.

Ketentuan:

- Tombol ditempatkan di area header atau toolbar halaman produk.
- Gunakan ikon barcode atau scan yang konsisten dengan ikon yang sudah digunakan proyek.
- Gunakan komponen tombol dan gaya UI yang sudah tersedia.
- Ketika tombol diklik, buka modal scanner barcode.
- Jangan mengganti keseluruhan desain halaman produk.
- Jangan menghapus fitur produk yang sudah ada.

## 2. Modal Scanner Barcode

Buat komponen modal scanner barcode yang dapat digunakan kembali.

Contoh lokasi komponen:
`app/components/product/ProductBarcodeScannerModal.vue`

Sesuaikan lokasi dengan konvensi direktori proyek yang sebenarnya.

Fitur modal:

- Menampilkan tampilan kamera secara langsung.
- Mendukung kamera laptop dan kamera HP yang tersedia di browser.
- Jika terdapat beberapa kamera, sediakan pilihan kamera.
- Jika memungkinkan, prioritaskan kamera belakang pada perangkat mobile.
- Tampilkan panduan untuk mengarahkan barcode ke area pemindaian.
- Sediakan tombol untuk memulai scan, menghentikan kamera, dan menutup modal.
- Tampilkan indikator loading saat barcode sedang diproses.
- Tampilkan pesan yang jelas jika izin kamera ditolak, kamera tidak tersedia, atau kamera gagal diinisialisasi.
- Pastikan tampilan modal responsif.
- Gunakan Tailwind CSS dan komponen UI proyek yang sudah ada.

Gunakan library gratis dan open source `html5-qrcode`.

Implementasikan scanner menggunakan API browser ZXing yang sesuai dengan versi library yang terpasang.

Barcode yang perlu didukung meliputi format barcode produk yang umum, terutama:

- EAN-13
- EAN-8
- UPC-A
- UPC-E
- Code 128 jika relevan

Jangan mengasumsikan bahwa semua barcode produk menggunakan format yang sama.

## 3. Alur Setelah Barcode Berhasil Dipindai

Ketika scanner berhasil membaca barcode, lakukan alur berikut:

1. Ambil hasil barcode sebagai string.
2. Hentikan proses scanning sementara agar kode yang sama tidak diproses berulang kali.
3. Hentikan stream kamera jika proses pemeriksaan akan dilanjutkan tanpa tampilan kamera.
4. Tampilkan kode barcode yang berhasil dibaca.
5. Lakukan pencarian produk melalui API backend berdasarkan kode barcode tersebut.
6. Tunggu sampai API mengembalikan hasil.
7. Tentukan tindakan berdasarkan hasil pencarian.

### Kondisi A: Produk Sudah Ada

Jika produk dengan barcode tersebut ditemukan:

- Jangan mengarahkan pengguna ke halaman tambah produk.
- Tampilkan notifikasi bahwa barcode sudah terdaftar.
- Jika API mengembalikan informasi produk, tampilkan nama produk dan kode barcode.
- Gunakan sistem notifikasi yang sudah tersedia dalam proyek, seperti toast atau alert component.
- Sediakan tindakan untuk menutup notifikasi dan kembali ke halaman produk.
- Jangan membuat atau mengubah data produk secara otomatis.

Contoh notifikasi:

"Barcode sudah terdaftar. Produk: Indomie Goreng."

Sesuaikan nama produk dengan data aktual dari database.

### Kondisi B: Produk Belum Ada

Jika API memastikan bahwa barcode belum terdaftar:

- Hentikan kamera sepenuhnya.
- Tutup modal scanner.
- Arahkan pengguna ke halaman tambah produk yang sudah tersedia.
- Isi otomatis field barcode menggunakan hasil pemindaian.
- Pertahankan barcode sebagai string, bukan number, agar angka nol di awal tidak hilang.
- Biarkan pengguna melengkapi nama produk, kategori, merek, satuan, harga, stok, supplier, dan field lain yang diwajibkan form.
- Jangan langsung menyimpan produk tanpa persetujuan pengguna.

Gunakan navigasi Nuxt yang sesuai dengan pola routing proyek.

Jangan mengarang nama route. Periksa halaman tambah produk yang sudah ada dan gunakan route sebenarnya.

Contoh alur konseptual:
`/admin/products/create?barcode=899...`

Contoh di atas hanya ilustrasi. Sesuaikan dengan route aktual proyek.

Jika halaman tambah produk belum menyediakan mekanisme untuk menerima barcode melalui query parameter, tambahkan dukungan tersebut dengan tetap menjaga kompatibilitas terhadap proses tambah produk biasa.

## 4. API Pemeriksaan Barcode

Periksa API produk yang sudah tersedia sebelum membuat endpoint baru.

Jika belum tersedia, buat endpoint khusus untuk memeriksa keberadaan barcode.

Contoh endpoint:
`GET /api/products/barcode/:barcode`

Sesuaikan dengan konvensi routing API Nuxt yang digunakan.

Ketentuan:

- Cari produk berdasarkan field barcode yang sesuai dengan schema Prisma.
- Gunakan Prisma untuk mengakses database.
- Gunakan `findUnique` jika field barcode memang memiliki constraint unik.
- Jika barcode tidak memiliki constraint unik, gunakan pendekatan pencarian yang sesuai dengan schema aktual.
- Kembalikan respons yang konsisten dan bertipe.
- Bedakan kondisi produk ditemukan, produk tidak ditemukan, dan kegagalan server.
- Jangan menganggap semua error API sebagai produk yang tidak ditemukan.
- Jangan mengarahkan pengguna ke halaman tambah produk jika API gagal diakses.
- Jangan mengekspos informasi internal database atau stack trace kepada client.

Contoh respons ketika ditemukan:

{
"success": true,
"exists": true,
"data": {
"id": "uuid-produk",
"name": "Indomie Goreng",
"barcode": "899..."
}
}

Contoh respons ketika tidak ditemukan:

{
"success": true,
"exists": false,
"data": null
}

Sesuaikan bentuk respons dengan pola API yang sudah ada dalam proyek.

## 5. Validasi dan Keamanan Data

- Pastikan pemeriksaan barcode dilakukan melalui backend.
- Jangan mengakses database secara langsung dari komponen client.
- Barcode harus diproses sebagai string.
- Tangani barcode kosong atau hasil pemindaian yang tidak valid.
- Hindari pemanggilan API berulang untuk satu hasil scan.
- Cegah race condition jika pengguna melakukan scan beberapa kali.
- Gunakan validasi server yang sesuai dengan standar proyek.
- Pastikan proses tambah produk tetap melakukan validasi barcode.
- Jangan hanya mengandalkan pemeriksaan ketersediaan barcode di frontend.

Jika field barcode sudah tersedia dalam schema, gunakan field tersebut.

Jika field barcode belum tersedia:

1. Periksa schema Prisma dan form produk yang ada.
2. Tambahkan field barcode dengan tipe string yang sesuai.
3. Evaluasi apakah barcode wajib diisi atau boleh kosong berdasarkan kebutuhan aplikasi.
4. Jika barcode harus unik, gunakan constraint unik database yang sesuai.
5. Pastikan produk yang tidak memiliki barcode tetap dapat disimpan jika aturan bisnis mengizinkannya.
6. Buat migration Prisma apabila perubahan schema memang diperlukan.
7. Periksa dampaknya terhadap data produk yang sudah tersimpan.

Jangan mengubah field atau relasi lain yang tidak berkaitan dengan fitur ini.

## 6. Kompatibilitas Nuxt dan SSR

Karena scanner menggunakan API kamera browser:

- Jangan mengakses `navigator`, `window`, atau `document` saat proses server-side rendering.
- Inisialisasikan kamera hanya ketika modal dibuka di client.
- Gunakan pendekatan client-only yang sesuai dengan struktur Nuxt.
- Pastikan proses kamera berhenti saat modal ditutup.
- Hentikan scanner ketika komponen di-unmount.
- Bersihkan stream kamera dan event listener untuk mencegah kebocoran resource.
- Pastikan scanner tidak tetap berjalan setelah navigasi ke halaman lain.

## 7. Standar Struktur Kode

Ikuti aturan proyek yang sudah ada.

Ketentuan:

- Gunakan TypeScript secara eksplisit.
- Gunakan arrow function dengan `const`, bukan deklarasi `function`.
- Pisahkan deklarasi `interface` dan `type` ke folder tipe yang sesuai dengan struktur proyek.
- Gunakan alias `~` untuk import jika sesuai dengan konfigurasi Nuxt.
- Jika folder menggunakan pola barrel export, tambahkan atau perbarui `index.ts`.
- Simpan helper umum di folder `utils` sesuai kebutuhan.
- Hindari penggunaan `any`.
- Hindari duplikasi kode.
- Gunakan komponen dan sistem notifikasi yang sudah ada.
- Jangan memasang library UI tambahan jika tidak diperlukan.

## 8. Penanganan Error

Tangani kondisi berikut:

- Browser tidak mendukung akses kamera.
- Pengguna menolak izin kamera.
- Tidak ada kamera yang tersedia.
- Kamera sedang digunakan aplikasi lain.
- Barcode tidak terbaca.
- Barcode berhasil dibaca tetapi API gagal diakses.
- Produk sudah terdaftar.
- Produk belum terdaftar.
- Barcode tidak valid.
- Pengguna menutup modal saat proses berlangsung.
- Navigasi ke halaman tambah produk gagal.

Berikan notifikasi yang mudah dipahami pengguna.

Jangan menggunakan `alert()` bawaan browser jika proyek sudah memiliki sistem toast atau notifikasi sendiri.

## 9. Pengujian

Lakukan pengujian terhadap skenario berikut:

1. Membuka modal scanner dari halaman produk.
2. Memberikan izin kamera dan melakukan scan.
3. Memindai barcode produk yang sudah terdaftar.
4. Memindai barcode produk yang belum terdaftar.
5. Memastikan barcode otomatis terisi pada form tambah produk.
6. Memastikan barcode dengan angka nol di awal tidak berubah.
7. Menutup modal dan memastikan kamera berhenti.
8. Menolak izin kamera dan memastikan pesan error tampil.
9. Mematikan API atau membuat API mengembalikan error dan memastikan aplikasi tidak menganggap barcode belum terdaftar.
10. Memastikan produk tanpa barcode tetap mengikuti aturan bisnis yang sudah ditetapkan.
11. Memastikan validasi unik barcode bekerja saat dua permintaan tambah produk terjadi hampir bersamaan.
12. Memastikan tidak ada error TypeScript atau masalah hydration akibat penggunaan API browser.

Jalankan pemeriksaan TypeScript, lint, dan pengujian yang tersedia dalam proyek.

## 10. Batasan Pengerjaan

- Fokus hanya pada fitur scanner barcode dan integrasinya dengan modul produk.
- Jangan membangun ulang halaman produk.
- Jangan mengubah desain global aplikasi.
- Jangan menghapus fitur CRUD produk yang sudah ada.
- Jangan menambahkan modul penjualan atau pembelian dalam pekerjaan ini.
- Jangan mengganti database atau teknologi backend.
- Jangan melakukan migration jika perubahan schema tidak diperlukan.
- Jangan menyatakan implementasi selesai sebelum memeriksa hasil pengujian.

## Hasil Akhir

Setelah implementasi selesai, berikan ringkasan:

1. File yang dibuat dan diubah.
2. Library yang dipasang.
3. Endpoint API yang digunakan atau dibuat.
4. Perubahan schema dan migration jika ada.
5. Alur kerja scanner yang berhasil diterapkan.
6. Hasil pemeriksaan TypeScript, lint, dan pengujian.
7. Kendala yang masih perlu diperbaiki.

Mulai dengan memeriksa struktur proyek dan implementasi modul produk yang sudah ada, kemudian kerjakan fitur ini secara bertahap.
