# Task: Use Dedicated Form Pages for Complex Modules and Restore BaseSelect Styling

Lakukan perubahan pada proyek Nuxt.js yang sedang berjalan. Periksa struktur halaman, komponen form, routing, dan implementasi `BaseSelect` terlebih dahulu sebelum melakukan perubahan.

Tujuan utama:

1. Modul dengan form yang panjang atau kompleks tidak lagi menggunakan modal pop-up untuk tambah dan edit data.
2. Form tambah dan edit menggunakan halaman tersendiri agar seluruh field dapat diakses dengan nyaman.
3. Komponen `BaseSelect` menggunakan kembali styling dan fitur dari implementasi `BaseSelect` versi lama yang disebut `BaseSelect old`, termasuk dukungan Select2.

## 1. Ubah Form Panjang Menjadi Halaman Tersendiri

Audit semua modul master data, terutama Product.

Saat ini, form tambah dan edit menggunakan modal pop-up. Karena form Product memiliki banyak field, sebagian field terpotong atau tertutup di bagian atas sehingga tidak dapat diakses dengan nyaman.

### Ketentuan

- Identifikasi modul yang memiliki form panjang, banyak field, beberapa bagian, atau relasi kompleks.
- Untuk modul tersebut, gunakan halaman tersendiri untuk operasi tambah dan edit.
- Prioritaskan modul Product, lalu terapkan pendekatan yang sama pada modul lain jika memang memiliki masalah serupa.
- Modul dengan form sederhana boleh tetap menggunakan modal jika modal tersebut masih nyaman digunakan.
- Jangan mengubah seluruh modul secara membabi buta menjadi halaman tersendiri jika tidak diperlukan.

### Routing

Ikuti pola routing dan struktur folder yang sudah digunakan proyek.

Sebagai contoh, jika sesuai dengan struktur saat ini:

- `/admin/products` — daftar produk.
- `/admin/products/create` — tambah produk.
- `/admin/products/[id]/edit` — edit produk.

Sesuaikan nama route dan folder dengan konvensi proyek yang sebenarnya. Jangan membuat route duplikat jika pola serupa sudah tersedia.

### Halaman Tambah dan Edit

Pastikan halaman tambah dan edit memiliki:

- Judul halaman yang sesuai, seperti Tambah Produk atau Edit Produk.
- Breadcrumb atau navigasi kembali ke daftar data jika pola tersebut digunakan proyek.
- Form yang ditampilkan secara penuh dan dapat di-scroll melalui halaman.
- Tombol Simpan dan Batal yang mudah ditemukan.
- Validasi field yang konsisten dengan implementasi sebelumnya.
- Loading state saat mengambil data atau menyimpan perubahan.
- Pesan error dan notifikasi sukses yang sesuai dengan mekanisme notifikasi proyek.
- Penanganan ketika ID tidak valid atau data yang akan diedit tidak ditemukan.
- Perlindungan terhadap pengiriman form berulang saat proses penyimpanan berlangsung.

Untuk halaman edit, ambil data berdasarkan ID dari route, isi form dengan data tersebut, dan kirim perubahan melalui API yang sudah tersedia.

Untuk halaman tambah, gunakan nilai awal dan validasi yang sesuai dengan kebutuhan setiap field.

### Form Product

Periksa semua field Product yang ada saat ini. Jangan menghilangkan field hanya karena form dipindahkan ke halaman tersendiri.

- Pertahankan seluruh field, relasi, dan aturan validasi yang sudah berjalan.
- Gunakan pengelompokan field yang logis jika membantu keterbacaan, misalnya informasi utama, kategori dan merek, satuan, harga, serta informasi tambahan. Sesuaikan dengan field aktual pada proyek.
- Gunakan layout responsif agar form nyaman digunakan pada desktop maupun layar kecil.
- Pastikan tidak ada field yang terpotong, tertutup, atau sulit dijangkau.
- Pastikan dropdown, date picker, dan komponen input lain tidak terpotong oleh container atau elemen dengan `overflow` yang tidak sesuai.
- Jangan mengubah struktur database atau kontrak API hanya demi memindahkan form.

### Integrasi dengan Daftar Data

Pada halaman daftar Product dan modul lain yang terdampak:

- Tombol tambah mengarah ke halaman create.
- Tombol edit pada setiap baris mengarah ke halaman edit sesuai ID.
- Pertahankan pencarian, filter, pagination, delete, dan fitur lain yang sudah ada.
- Setelah penyimpanan berhasil, arahkan pengguna kembali ke daftar atau lakukan navigasi yang konsisten dengan pola aplikasi.
- Jangan menghapus fungsi modal yang masih digunakan oleh modul lain.

## 2. Pulihkan Styling dan Fitur `BaseSelect` dari `BaseSelect old`

Periksa implementasi `BaseSelect` saat ini serta file atau versi lama yang disebut `BaseSelect old`.

Gunakan implementasi lama sebagai referensi utama untuk styling dan fitur Select2 karena implementasi tersebut lebih lengkap.

### Ketentuan

- Temukan file `BaseSelect old` yang sebenarnya sebelum melakukan perubahan.
- Bandingkan implementasi lama dengan `BaseSelect` yang aktif saat ini.
- Pertahankan atau pulihkan styling dari versi lama, termasuk tampilan input, dropdown, opsi, ukuran, spacing, border, focus state, disabled state, dan error state jika fitur tersebut tersedia pada implementasi lama.
- Pertahankan dukungan Select2 beserta fitur yang memang telah tersedia dan digunakan proyek.
- Jangan membuat ulang tampilan berdasarkan perkiraan jika implementasi lama masih dapat digunakan sebagai acuan.
- Jangan mengganti library Select2 atau menambahkan dependency baru tanpa alasan yang jelas.
- Jangan mengubah komponen menjadi native `<select>` biasa jika hal itu menghilangkan fitur Select2 yang sudah tersedia.

### Kompatibilitas

Pastikan `BaseSelect` tetap kompatibel dengan seluruh penggunaan yang sudah ada.

Periksa:

- Props dan tipe TypeScript.
- `v-model` dan sinkronisasi nilai.
- Penggunaan pada form create dan edit.
- Pilihan yang berasal dari tabel relasional, seperti Category, Brand, Unit, dan Supplier.
- Kondisi nilai kosong dan nilai awal saat edit.
- Loading state dan opsi yang tidak tersedia jika didukung.
- Pesan validasi dan error.
- Perilaku dropdown ketika digunakan di dalam halaman dengan scrolling.

Jika implementasi lama memiliki API props atau event yang berbeda, buat penyesuaian yang kompatibel tanpa merusak pemanggilan komponen yang sudah ada.

Jangan menyalin seluruh implementasi lama secara membabi buta apabila ada perbaikan penting pada versi aktif. Ambil styling dan fitur yang relevan sambil mempertahankan kompatibilitas.

## 3. Ikuti Standar Proyek

- Ikuti instruksi `AGENTS.md`.
- Gunakan Vue, Nuxt, Tailwind CSS, dan TypeScript sesuai pola proyek.
- Berikan tipe eksplisit pada data, props, dan fungsi yang dibuat atau diubah.
- Ikuti konvensi fungsi `const namaFungsi = () => {}` apabila sesuai dengan pola proyek.
- Gunakan komponen form yang sudah tersedia, termasuk `BaseSelect`.
- Gunakan kembali helper, composable, dan mekanisme notifikasi yang sudah ada.
- Jika aturan proyek mewajibkan `index.ts` untuk ekspor folder, perbarui ekspor tersebut sesuai kebutuhan.
- Jangan membuat duplikasi komponen form tanpa alasan yang jelas.
- Jangan menghapus fitur atau file yang masih digunakan.

## 4. Verifikasi

Setelah implementasi:

1. Uji halaman daftar Product.
2. Uji navigasi ke halaman tambah dan edit.
3. Pastikan semua field Product terlihat dan dapat diakses.
4. Uji validasi, penyimpanan, pembatalan, dan pesan error.
5. Pastikan data relasional terpilih dengan benar ketika mengedit produk.
6. Uji `BaseSelect` dengan Select2, termasuk pencarian opsi, pemilihan nilai, dropdown, dan tampilan error jika fitur tersebut tersedia.
7. Periksa modul lain yang menggunakan `BaseSelect` agar tidak mengalami regresi.
8. Jalankan type checking, lint, dan build yang tersedia.
9. Perbaiki error yang timbul akibat perubahan ini.

Jangan menyatakan pengujian berhasil jika belum benar-benar dijalankan.

## 5. Laporan Akhir

Setelah selesai, laporkan:

- Modul yang dipindahkan dari modal ke halaman tersendiri beserta route yang dibuat atau digunakan.
- File yang ditambah atau diubah.
- Fitur dan styling `BaseSelect old` yang dipulihkan.
- Kompatibilitas yang diperiksa pada modul lain.
- Hasil type checking, lint, build, dan pengujian.
- Kendala yang belum terselesaikan jika ada.

**Batasan:** Fokus pada perbaikan pengalaman form dan pemulihan `BaseSelect`. Jangan melakukan refactor besar pada database, API, autentikasi, atau modul lain yang tidak terkait.
